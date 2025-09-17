import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { parseSilmulExcel, aggregateDataBySelectedSites, formatNumber, formatCurrency } from '../utils/excelUtils.jsx';
import * as XLSX from 'xlsx';

// 파일 업로드 로그 타입 정의
const UploadLog = {
  fileName: '',
  uploadTime: new Date(),
  totalRows: 0,
  matchedRows: 0,
  unmatchedRows: 0,
  details: []
};

const QuantityCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // 이전 페이지 정보 저장
  const [previousPath, setPreviousPath] = useState('/sites');
  
  const [siteData, setSiteData] = useState(null);
  const [quantityItems, setQuantityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  

  
  const [newItem, setNewItem] = useState({
    name: '',
    specification: '',
    unit: '',
    contractQuantity: '',
    contractPrice: '',
    contractAmount: '',
    actualQuantity: '',
    actualPrice: '',
    actualAmount: '',
    quantityDifference: '',
    amountDifference: '',
    note: ''
  });

  // 실물량 업로드 관련 상태
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [tempSilmulData, setTempSilmulData] = useState(null);
  const [factorySiteName, setFactorySiteName] = useState('');
  const [foundSiteNames, setFoundSiteNames] = useState([]);
  const [selectedSiteNames, setSelectedSiteNames] = useState([]);
  const [showSiteSelectionDialog, setShowSiteSelectionDialog] = useState(false);
  const [unmatchedSilmulItems, setUnmatchedSilmulItems] = useState([]);
  const [uploadLogs, setUploadLogs] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 업로드 로그 삭제 함수
  const deleteUploadLog = (index) => {
    setUploadLogs(prev => prev.filter((_, i) => i !== index));
  };

  // 페이지네이션 로직
  const totalPages = Math.ceil(quantityItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = quantityItems.slice(startIndex, endIndex);

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };



  // 현장 데이터 로드
  useEffect(() => {
    const loadSiteData = async () => {
      try {
        setLoading(true);
        
        // 이전 페이지 정보 저장
        if (location.state?.from) {
          setPreviousPath(location.state.from);
        } else if (location.state?.fromPage === 'claims') {
          // 청구페이지에서 온 경우
          setPreviousPath('/claims');
        } else if (document.referrer) {
          // referrer가 있으면 해당 정보 활용
          const referrer = new URL(document.referrer);
          if (referrer.pathname !== '/quantity-check') {
            setPreviousPath(referrer.pathname);
          }
        }
        
        if (location.state?.selectedSiteId) {
          const siteDoc = await getDoc(doc(db, 'sites', location.state.selectedSiteId));
          if (siteDoc.exists()) {
            const data = siteDoc.data();
            setSiteData({ id: siteDoc.id, ...data });
            
            // 기존 실물량 데이터 로드
            if (data.quantityCheckItems) {
              setQuantityItems(data.quantityCheckItems);
            } else {
              // 기존 물량 데이터를 기반으로 실물량 항목 생성
              const baseItems = data.items?.filter(item => 
                !item.isTotal && !item.isVat && !item.isTotalWithVat && !item.isAdjustment
              ) || [];
              
              const quantityItems = baseItems.map(item => ({
                name: item.name || '',
                specification: item.specification || '',
                unit: item.unit || '',
                contractQuantity: item.quantity || 0,
                contractPrice: item.price || 0,
                contractAmount: item.amount || 0,
                actualQuantity: '',
                actualPrice: '',
                actualAmount: '',
                quantityDifference: '',
                amountDifference: '',
                note: ''
              }));
              
              setQuantityItems(quantityItems);
            }
          }
        }
      } catch (error) {
        console.error('현장 데이터 로드 오류:', error);
        setError('현장 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadSiteData();
  }, [location.state]);

  // 차이값 자동 계산
  const calculateDifferences = (contractQty, contractPrice, actualQty, actualPrice) => {
    const contractQtyNum = parseFloat(contractQty) || 0;
    const contractPriceNum = parseFloat(contractPrice) || 0;
    const actualQtyNum = parseFloat(actualQty) || 0;
    const actualPriceNum = parseFloat(actualPrice) || 0;
    
    const quantityDifference = actualQtyNum - contractQtyNum;
    const amountDifference = (actualQtyNum * actualPriceNum) - (contractQtyNum * contractPriceNum);
    
    return { quantityDifference, amountDifference };
  };

  // 단순 차이값 계산 함수
  const calculateDifference = (contractValue, actualValue) => {
    const contractNum = parseFloat(contractValue) || 0;
    const actualNum = parseFloat(actualValue) || 0;
    return actualNum - contractNum;
  };
  


  // 천단위 쉼표 포맷팅 함수 (정수 반올림)
  const formatNumber = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return Math.round(num).toLocaleString();
  };

  // 금액 전용 포맷팅 함수 (정수 반올림)
  const formatAmount = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return Math.round(num).toLocaleString();
  };

  // 단가 전용 포맷팅 함수 (정수 반올림)
  const formatPrice = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return Math.round(num).toLocaleString();
  };

  // 자재비 실금액 차이 계산 함수
  const calculateMaterialCostDifference = () => {
    const contractTotal = quantityItems.reduce((sum, item) => {
      return sum + (parseFloat(item.contractAmount) || 0);
    }, 0);
    
    const actualTotal = quantityItems.reduce((sum, item) => {
      return sum + (parseFloat(item.actualAmount) || 0);
    }, 0);
    
    const difference = contractTotal - actualTotal;
    
    return {
      contractTotal,
      actualTotal,
      difference,
      differenceFormatted: difference >= 0 ? `+${difference.toLocaleString()}` : difference.toLocaleString()
    };
  };

  // 실물량 항목 업데이트
  const handleItemUpdate = (index, field, value) => {
    const updatedItems = [...quantityItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // 실물수량이나 단가가 삭제되면 관련 데이터도 함께 삭제
    if (field === 'actualQuantity' && (!value || value === '')) {
      updatedItems[index].actualQuantity = '';
      updatedItems[index].actualAmount = '';
      updatedItems[index].quantityDifference = '';
      updatedItems[index].amountDifference = '';
    } else if (field === 'actualPrice' && (!value || value === '')) {
      updatedItems[index].actualPrice = '';
      updatedItems[index].actualAmount = '';
      updatedItems[index].amountDifference = '';
    } else {
      // 실금액 자동 계산 (실물수량 × 단가)
      if (field === 'actualQuantity' || field === 'actualPrice') {
        const actualQtyNum = parseFloat(updatedItems[index].actualQuantity) || 0;
        const actualPriceNum = parseFloat(updatedItems[index].actualPrice) || 0;
        updatedItems[index].actualAmount = (actualQtyNum * actualPriceNum).toFixed(0);
        
        // 차이값 자동 계산
        const { quantityDifference, amountDifference } = calculateDifferences(
          updatedItems[index].contractQuantity,
          updatedItems[index].contractPrice,
          updatedItems[index].actualQuantity,
          updatedItems[index].actualPrice
        );
        updatedItems[index].quantityDifference = quantityDifference;
        updatedItems[index].amountDifference = amountDifference;
      }
    }
    
    setQuantityItems(updatedItems);
  };

  // 실물량 데이터 저장
  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (siteData?.id) {
        await updateDoc(doc(db, 'sites', siteData.id), {
          quantityCheckItems: quantityItems,
          quantityCheckUpdatedAt: new Date(),
          quantityCheckUpdatedBy: currentUser?.uid || 'unknown'
        });
        
        setSuccess('실물량 데이터가 성공적으로 저장되었습니다.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('실물량 데이터 저장 오류:', error);
      setError('실물량 데이터 저장 중 오류가 발생했습니다.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };



  // 파일 업로드 핸들러
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadProgress('📁 파일을 읽는 중...');
      setUploadStatus('loading');

      // 파일 유효성 검사
      if (!file || !(file instanceof Blob)) {
        throw new Error('유효하지 않은 파일입니다.');
      }

      // 파일 분석 중 메시지
      setUploadProgress('🔍 Excel 파일을 분석하고 있습니다...');
      await new Promise(resolve => setTimeout(resolve, 300));

      // 실물량 데이터 파싱 - 원본 파일을 전달
      setUploadProgress('📊 실물량 데이터를 파싱하고 있습니다...');
      const silmulData = await parseSilmulExcel(file);
      setTempSilmulData(silmulData);
      
      // 현장명 검색 중 메시지
      setUploadProgress('🔎 현장명을 검색하고 있습니다...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 검색 키워드로 필터링된 현장명 찾기
      const filteredSiteNames = silmulData.siteData
        .filter(site => 
          searchKeyword === '' || 
          site.siteName.toLowerCase().includes(searchKeyword.toLowerCase())
        )
        .map(site => site.siteName);

      setFoundSiteNames(filteredSiteNames);
      setFactorySiteName(searchKeyword);

      if (filteredSiteNames.length > 0) {
        setShowSiteSelectionDialog(true);
      } else {
        setUploadProgress(`"${searchKeyword}" 키워드로 검색된 현장이 없습니다.`);
        setUploadStatus('error');
      }

    } catch (error) {
      console.error('파일 업로드 오류:', error);
      setUploadProgress('파일 업로드 중 오류가 발생했습니다.');
      setUploadStatus('error');
    }
  };

  // 현장명 선택 확인 핸들러
  const handleSiteSelectionConfirm = async () => {
    if (selectedSiteNames.length > 0) {
      console.log('✅ 사용자가 선택한 현장명들:', selectedSiteNames);
      console.log('🔍 tempSilmulData:', tempSilmulData);
      console.log('🔍 tempSilmulData.siteData:', tempSilmulData?.siteData);
      
      setShowSiteSelectionDialog(false);
      setUploadProgress(`선택된 ${selectedSiteNames.length}개 현장명으로 데이터를 합산하고 있습니다...`);
      setUploadStatus('loading');
      
      if (tempSilmulData && tempSilmulData.siteData) {
        // 데이터 집계 중 메시지
        setUploadProgress(`📊 실물량 데이터를 집계하고 있습니다... (${selectedSiteNames.length}개 현장)`);
        
        // 약간의 지연을 두어 사용자가 진행 상태를 확인할 수 있도록 함
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const aggregatedData = aggregateDataBySelectedSites(tempSilmulData.siteData, selectedSiteNames);
        console.log('🔍 aggregateDataBySelectedSites 결과:', aggregatedData);
        console.log('🔍 aggregatedData.items:', aggregatedData.items);
        console.log('🔍 현재 quantityItems:', quantityItems);
        
        // 데이터 처리 중 메시지
        setUploadProgress(`🔄 실물량 데이터를 처리하고 있습니다... (${aggregatedData.items.length}개 항목)`);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (aggregatedData.items.length > 0) {
          console.log('🔍 실물량 데이터를 매칭 없이 직접 추가합니다:', aggregatedData.items);
          
          // 항목 변환 중 메시지
          setUploadProgress(`📝 실물량 항목을 변환하고 있습니다... (${aggregatedData.items.length}개 항목)`);
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // 매칭 없이 실물량 데이터를 그대로 추가 (같은 항목끼리 합쳐진 상태)
          const newItems = aggregatedData.items.map(item => {
            console.log('🔍 실물량 항목 추가:', item);
            console.log('🔍 계산된 수량:', item.quantity, '단가:', item.unitPrice, '금액:', item.amount);
            console.log('🔍 원본 데이터:', { fSum: item.fSum, gFirst: item.gValues?.[0], jSum: item.jSum });
            return {
              name: item.itemName || item.name || '',
              specification: item.specification || '',
              unit: item.unit || '',
              contractQuantity: '',
              contractPrice: '',
              contractAmount: '',
              actualQuantity: item.quantity || 0,
              actualPrice: item.unitPrice || 0,
              actualAmount: item.amount || 0,
              quantityDifference: '',
              amountDifference: '',
              note: '업로드된 실물량 데이터 (집계됨)'
            };
          });
          
          console.log('🔍 추가될 실물량 항목들:', newItems);
          
          // 데이터 저장 중 메시지
          setUploadProgress(`💾 실물량 데이터를 저장하고 있습니다...`);
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const finalItems = [...quantityItems, ...newItems];
          console.log('🔍 최종 quantityItems:', finalItems);
          
          setQuantityItems(finalItems);
          setUnmatchedSilmulItems([]);
          
          const addedCount = newItems.length;
          
          // 업로드 로그 생성
          const uploadLog = {
            fileName: tempSilmulData.fileName || '실물량_데이터.xlsx',
            uploadTime: new Date(),
            totalRows: aggregatedData.items.length,
            matchedRows: 0,
            unmatchedRows: addedCount,
            details: [
              `선택된 현장: ${selectedSiteNames.join(', ')}`,
              `추가된 실물량 항목: ${addedCount}개`,
              `매칭 없이 직접 추가됨`
            ]
          };
          
          setUploadLogs(prev => [uploadLog, ...prev]);
          
          let progressMessage = `성공! ${addedCount}개 실물량 항목이 추가되었습니다.`;
          setUploadProgress(progressMessage);
          setUploadStatus('success');
        } else {
          setUploadProgress(`선택된 현장명들에서 실물량 데이터를 찾을 수 없습니다.`);
          setUploadStatus('error');
        }
      } else {
        setUploadProgress(`실물량 데이터가 없습니다.`);
        setUploadStatus('error');
      }
      
      setTimeout(() => setShowUploadDialog(false), 3000);
    }
  };

  // 새 항목 추가
  const handleAddItem = () => {
    setNewItem({
      name: '',
      specification: '',
      unit: '',
      contractQuantity: '',
      contractPrice: '',
      contractAmount: '',
      actualQuantity: '',
      actualPrice: '',
      actualAmount: '',
      quantityDifference: '',
      amountDifference: '',
      note: ''
    });
    setShowAddDialog(true);
  };

  // 새 항목 저장
  const handleSaveNewItem = () => {
    if (newItem.name.trim()) {
      const { quantityDifference, amountDifference } = calculateDifferences(
        newItem.contractQuantity,
        newItem.contractPrice,
        newItem.actualQuantity,
        newItem.actualPrice
      );
      
      const itemToAdd = {
        ...newItem,
        quantityDifference,
        amountDifference
      };
      
      setQuantityItems([...quantityItems, itemToAdd]);
      setShowAddDialog(false);
    }
  };

  // 항목 삭제
  const handleDeleteItem = (index) => {
    const updatedItems = quantityItems.filter((_, i) => i !== index);
    setQuantityItems(updatedItems);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: '#181c23'
      }}>
        <CircularProgress size={60} sx={{ color: '#90caf9' }} />
      </Box>
    );
  }

  if (!siteData) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: '#181c23',
        color: '#fff'
      }}>
        <Typography variant="h6">현장 정보를 찾을 수 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: 'calc(100vh - 64px)', 
      bgcolor: '#181c23', 
      color: '#fff',
      p: { xs: 2, md: 4 },
      mt: '64px',
      pb: 64,
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: '#1a1d21',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#444',
        borderRadius: '4px',
        '&:hover': {
          background: '#666',
        },
      },
    }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, position: 'relative' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', flex: 1 }}>
          실물량파악
        </Typography>
        
        {/* 뒤로가기 버튼 - 위쪽 오른쪽 */}
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            console.log('뒤로가기 버튼 클릭됨');
            console.log('현재 history.length:', window.history.length);
            console.log('previousPath:', previousPath);
            console.log('document.referrer:', document.referrer);
            console.log('location.state:', location.state);
            
            // 청구페이지에서 온 경우 특별 처리
            if (location.state?.fromPage === 'claims') {
              console.log('청구페이지에서 온 경우 - /claims로 직접 이동');
              navigate('/claims');
              return;
            }
            
            // Progress 페이지에서 온 경우 특별 처리 (기성현황 월별로 이동하는 문제 방지)
            if (location.state?.fromPage === 'progress' || previousPath === '/progress') {
              console.log('Progress 페이지에서 온 경우 - /sites로 이동');
              navigate('/sites');
              return;
            }
            
            // 브라우저 히스토리에서 이전 페이지가 Progress인지 확인
            try {
              const currentUrl = window.location.href;
              const referrer = document.referrer;
              
              if (referrer && referrer.includes('/progress')) {
                console.log('referrer가 Progress 페이지 - /sites로 이동');
                navigate('/sites');
                return;
              }
            } catch (error) {
              console.log('referrer 확인 중 오류:', error);
            }
            
            // 여러 방법으로 뒤로가기 시도
            if (window.history.length > 1) {
              console.log('window.history.back() 실행');
              window.history.back();
            } else if (previousPath && previousPath !== '/quantity-check') {
              console.log('previousPath로 이동:', previousPath);
              navigate(previousPath);
            } else {
              console.log('/sites로 이동');
              navigate('/sites');
            }
          }}
          sx={{ 
            color: '#90caf9', 
            borderColor: '#90caf9',
            '&:hover': { 
              borderColor: '#64b5f6',
              bgcolor: 'rgba(144, 202, 249, 0.1)'
            },
            minWidth: '120px',
            height: '40px'
          }}
        >
          뒤로가기
        </Button>
      </Box>

      {/* 현장 정보 카드 */}
      <Card sx={{ mb: 3, bgcolor: '#232734', border: '1px solid #444' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid xs={12} md={4}>
              <Typography variant="h6" sx={{ color: '#90caf9', mb: 1 }}>
                현장명
              </Typography>
              <Typography variant="body1" sx={{ color: '#fff' }}>
                {siteData.name}
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="h6" sx={{ color: '#90caf9', mb: 1 }}>
                계약금액
              </Typography>
              <Typography variant="body1" sx={{ color: '#fff' }}>
                {siteData.contractAmount ? 
                  Number(siteData.contractAmount).toLocaleString() + '원' : 
                  '미입력'
                }
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="h6" sx={{ color: '#90caf9', mb: 1 }}>
                계약기간
              </Typography>
              <Typography variant="body1" sx={{ color: '#fff' }}>
                {siteData.startDate && siteData.endDate ? 
                  `${siteData.startDate} ~ ${siteData.endDate}` : 
                  '미입력'
                }
              </Typography>
            </Grid>
            <Grid xs={12} md={4}>
              <Typography variant="h6" sx={{ color: '#90caf9', mb: 1 }}>
                상태
              </Typography>
              <Chip 
                label={siteData.status || '미정'} 
                color={siteData.status === '완료' ? 'success' : 
                       siteData.status === '진행중' ? 'primary' : 
                       siteData.status === '예정' ? 'warning' : 'default'}
                sx={{ color: '#fff' }}
              />
            </Grid>
            
            {/* 실물량 업로드 섹션 */}
            <Grid xs={12} md={8}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                gap: 2, 
                alignItems: { xs: 'stretch', md: 'flex-end' },
                mt: { xs: 2, md: 0 }
              }}>
                <TextField
                  label="공장 현장명 검색 키워드"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="예: 공장, 공사, 건설 등"
                  size="small"
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-root': { color: '#fff' },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                    '& .MuiFormHelperText-root': { color: '#bbb' }
                  }}
                  helperText="업로드할 파일에서 특정 키워드가 포함된 현장명만 필터링"
                />
                
                <input
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  id="silmul-file-upload"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="silmul-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<DownloadIcon />}
                    sx={{ 
                      color: '#ff9800', 
                      borderColor: '#ff9800',
                      minWidth: '120px',
                      height: '40px'
                    }}
                  >
                    실물량 업로드
                  </Button>
                </label>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 자재비 실금액 차이 카드 */}
      <Card sx={{ mb: 3, bgcolor: '#232734', border: '1px solid #444' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
            자재비 실금액 차이
          </Typography>
          <Grid container spacing={3}>
            <Grid xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#1a1d21', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: '#bbb', mb: 1 }}>
                  계약금액 합계
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {calculateMaterialCostDifference().contractTotal.toLocaleString()}원
                </Typography>
              </Box>
            </Grid>
            <Grid xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#1a1d21', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: '#bbb', mb: 1 }}>
                  실금액 합계
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {calculateMaterialCostDifference().actualTotal.toLocaleString()}원
                </Typography>
              </Box>
            </Grid>
            <Grid xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#1a1d21', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: '#bbb', mb: 1 }}>
                  금액차이 (계약금액 - 실금액)
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: calculateMaterialCostDifference().difference >= 0 ? '#4caf50' : '#f44336', 
                    fontWeight: 'bold' 
                  }}
                >
                  {calculateMaterialCostDifference().differenceFormatted}원
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 알림 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* 실물량 테이블 */}
      <Paper sx={{ bgcolor: '#232734', border: '1px solid #444' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ color: '#fff' }}>
              실물량 내역
            </Typography>
            <Typography variant="body2" sx={{ color: '#bbb', mt: 0.5 }}>
              총 {quantityItems.length}개 항목 
              {quantityItems.length > itemsPerPage && 
                ` (${currentPage}/${totalPages} 페이지, ${startIndex + 1}-${Math.min(endIndex, quantityItems.length)}번째 표시)`
              }
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              sx={{ color: '#90caf9', borderColor: '#90caf9' }}
            >
              항목 추가
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </Box>
        </Box>
        
        <TableContainer>
          <Table size="small">
                         <TableHead>
                              <TableRow sx={{ bgcolor: '#1a1d21' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '12%' }}>규격</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '12%' }}>품명</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '6%' }}>단위</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '8%' }}>계약수량</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '8%' }}>단가</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '10%' }}>계약금액</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '8%' }}>실물수량</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '8%' }}>단가</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '10%' }}>실금액</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '8%' }}>물량차이</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '12%' }}>금액차이</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '8%' }}>비고</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '4%' }}>작업</TableCell>
                </TableRow>
             </TableHead>
            <TableBody>
                             {currentItems.map((item, index) => {
                               const actualIndex = startIndex + index;
                               return (
                 <TableRow key={actualIndex} sx={{ '&:hover': { bgcolor: '#2a2d31' } }}>
                   <TableCell sx={{ color: '#fff', py: 0.5 }}>
                     <TextField
                       value={item.specification}
                       onChange={(e) => handleItemUpdate(actualIndex, 'specification', e.target.value)}
                       size="small"
                       sx={{
                         '& .MuiInputBase-root': { color: '#fff' },
                         '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                       }}
                     />
                   </TableCell>
                   <TableCell sx={{ color: '#fff', py: 0.5 }}>
                     <TextField
                       value={item.name}
                       onChange={(e) => handleItemUpdate(actualIndex, 'name', e.target.value))
                       size="small"
                       sx={{
                         '& .MuiInputBase-root': { color: '#fff' },
                         '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                       }}
                     />
                   </TableCell>
                  <TableCell sx={{ color: '#fff', py: 0.5 }}>
                    <TextField
                      value={item.unit}
                      onChange={(e) => handleItemUpdate(actualIndex, 'unit', e.target.value))
                      size="small"
                      sx={{
                        '& .MuiInputBase-root': { color: '#fff' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                      }}
                    />
                  </TableCell>
                                                                           <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <TextField
                        value={formatNumber(item.contractQuantity)}
                        onChange={(e) => handleItemUpdate(actualIndex, 'contractQuantity', e.target.value))
                        size="small"
                        inputProps={{ style: { textAlign: 'right' } }}
                        sx={{
                          '& .MuiInputBase-root': { color: '#fff' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                        }}
                      />
                    </TableCell>
                                      <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <TextField
                        value={formatPrice(item.contractPrice)}
                        onChange={(e) => handleItemUpdate(actualIndex, 'contractPrice', e.target.value))
                        size="small"
                        inputProps={{ style: { textAlign: 'right' } }}
                        sx={{
                          '& .MuiInputBase-root': { color: '#fff' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                        }}
                      />
                    </TableCell>
                                                                           <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <TextField
                        value={formatAmount(item.contractAmount)}
                        size="small"
                        disabled
                        inputProps={{ style: { textAlign: 'right' } }}
                        sx={{
                          '& .MuiInputBase-root': { color: '#fff' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                        }}
                      />
                    </TableCell>
                                                                           <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <TextField
                        value={formatNumber(item.actualQuantity)}
                        onChange={(e) => handleItemUpdate(actualIndex, 'actualQuantity', e.target.value))
                        size="small"
                        inputProps={{ style: { textAlign: 'right' } }}
                        sx={{
                          '& .MuiInputBase-root': { color: '#fff' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                        }}
                      />
                    </TableCell>
                                      <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <TextField
                        value={formatPrice(item.actualPrice)}
                        onChange={(e) => handleItemUpdate(actualIndex, 'actualPrice', e.target.value))
                        size="small"
                        inputProps={{ style: { textAlign: 'right' } }}
                        sx={{
                          '& .MuiInputBase-root': { color: '#fff' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                        }}
                      />
                    </TableCell>
                                                                           <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <TextField
                        value={formatAmount(item.actualAmount)}
                        size="small"
                        disabled
                        inputProps={{ style: { textAlign: 'right' } }}
                        sx={{
                          '& .MuiInputBase-root': { color: '#fff' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                        }}
                      />
                    </TableCell>
                                                                           <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <TextField
                        value={formatNumber(item.quantityDifference)}
                        size="small"
                        disabled
                        inputProps={{ style: { textAlign: 'right' } }}
                        sx={{
                          '& .MuiInputBase-root': { 
                            color: item.quantityDifference > 0 ? '#4caf50' : 
                                   item.quantityDifference < 0 ? '#f44336' : '#fff'
                          },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                        }}
                      />
                    </TableCell>
                                     <TableCell sx={{ color: '#fff', py: 0.5 }}>
                     <TextField
                       value={formatAmount(item.amountDifference)}
                       size="small"
                       disabled
                       inputProps={{ style: { textAlign: 'right' } }}
                       sx={{
                         '& .MuiInputBase-root': { 
                           color: item.amountDifference > 0 ? '#4caf50' : 
                                  item.amountDifference < 0 ? '#f44336' : '#fff'
                         },
                         '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                       }}
                     />
                   </TableCell>
                  <TableCell sx={{ color: '#fff', py: 0.5 }}>
                    <TextField
                      value={item.note}
                      onChange={(e) => handleItemUpdate(actualIndex, 'note', e.target.value))
                      size="small"
                      sx={{
                        '& .MuiInputBase-root': { color: '#fff' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <IconButton
                      onClick={() => handleDeleteItem(actualIndex)}
                      sx={{ color: '#f44336' }}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
                             })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 페이지네이션 */}
        {quantityItems.length > itemsPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#fff',
                  borderColor: '#555',
                  '&:hover': {
                    backgroundColor: '#333'
                  }
                },
                '& .Mui-selected': {
                  backgroundColor: '#43e97b',
                  color: '#000',
                  '&:hover': {
                    backgroundColor: '#32d667'
                  }
                }
              }}
            />
          </Box>
        )}

      </Paper>

      {/* 업로드 로그 테이블 - 최신 1개만 표시 */}
      {uploadLogs.length > 0 && (
        <Paper sx={{ bgcolor: '#232734', border: '1px solid #444', mt: 3 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#90caf9' }}>
              최신 업로드 로그
            </Typography>
            <Typography variant="body2" sx={{ color: '#bbb' }}>
              가장 최근 업로드 기록입니다.
            </Typography>
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1a1d21' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '15%' }}>파일명</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '15%' }}>업로드 시간</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '10%' }}>전체 행</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '10%' }}>매칭된 행</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '10%' }}>새로 추가된 행</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '35%' }}>상세 정보</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '5%' }}>액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uploadLogs.slice(0, 1).map((log, index) => (
                  <TableRow key={index} sx={{ '&:hover': { bgcolor: '#2a2d31' } }}>
                    <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <Typography variant="body2">
                        {log.fileName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <Typography variant="body2">
                        {log.uploadTime.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#fff', py: 0.5 }}>
                      <Typography variant="body2" sx={{ textAlign: 'right' }}>
                        {log.totalRows}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#4caf50', py: 0.5 }}>
                      <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                        {log.matchedRows}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#ff9800', py: 0.5 }}>
                      <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                        {log.unmatchedRows}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#bbb', py: 0.5 }}>
                      <Box>
                        {log.details.map((detail, detailIndex) => (
                          <Typography key={detailIndex} variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                            • {detail}
                          </Typography>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#fff', py: 0.5, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => deleteUploadLog(index)}
                        sx={{
                          color: '#f44336',
                          borderColor: '#f44336',
                          minWidth: 'auto',
                          px: 1,
                          py: 0.5,
                          fontSize: '0.75rem',
                          '&:hover': {
                            borderColor: '#d32f2f',
                            bgcolor: 'rgba(244, 67, 54, 0.1)'
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 실물량 업로드 다이얼로그 */}
      <Dialog 
        open={showUploadDialog} 
        onClose={() => setShowUploadDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#232734', color: '#fff' }
        }}
      >
        <DialogTitle>실물량 데이터 업로드</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
                검색 필터 설정
              </Typography>
              <TextField
                label="공장 현장명 검색 키워드"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="예: 공장, 공사, 건설 등"
                fullWidth
                helperText="업로드할 파일에서 특정 키워드가 포함된 현장명만 필터링합니다."
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                  '& .MuiFormHelperText-root': { color: '#bbb' }
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
                파일 선택
              </Typography>
              <input
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                id="silmul-file-upload"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="silmul-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<DownloadIcon />}
                  sx={{ color: '#ff9800', borderColor: '#ff9800' }}
                >
                  실물량 엑셀 파일 선택
                </Button>
              </label>
              <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
                지원 형식: .xlsx, .xls
              </Typography>
            </Grid>

            {uploadProgress && (
              <Grid item xs={12}>
                <Alert 
                  severity={uploadStatus === 'success' ? 'success' : 
                           uploadStatus === 'error' ? 'error' : 'info'}
                  sx={{ bgcolor: '#1a1d21' }}
                  icon={uploadStatus === 'loading' ? <CircularProgress size={20} /> : undefined}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {uploadStatus === 'loading' && (
                      <CircularProgress size={16} sx={{ color: '#90caf9' }} />
                    )}
                    <Typography variant="body2">
                      {uploadProgress}
                    </Typography>
                  </Box>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)} sx={{ color: '#bbb' }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 새 항목 추가 다이얼로그 */}
      <Dialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#232734', color: '#fff' }
        }}
      >
        <DialogTitle>새 항목 추가</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="품명"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="규격"
                value={newItem.specification}
                onChange={(e) => setNewItem({...newItem, specification: e.target.value})}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="단위"
                value={newItem.unit}
                onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="계약수량"
                type="number"
                value={newItem.contractQuantity}
                onChange={(e) => setNewItem({...newItem, contractQuantity: e.target.value})}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="계약단가"
                type="number"
                value={newItem.contractPrice}
                onChange={(e) => setNewItem({...newItem, contractPrice: e.target.value})}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="실물수량"
                type="number"
                value={newItem.actualQuantity}
                onChange={(e) => setNewItem({...newItem, actualQuantity: e.target.value})}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="실물단가"
                type="number"
                value={newItem.actualPrice}
                onChange={(e) => setNewItem({...newItem, actualPrice: e.target.value})}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="비고"
                value={newItem.note}
                onChange={(e) => setNewItem({...newItem, note: e.target.value})}
                fullWidth
                multiline
                rows={2}
                sx={{
                  '& .MuiInputBase-root': { color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#bbb' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)} sx={{ color: '#bbb' }}>
            취소
          </Button>
          <Button 
            onClick={handleSaveNewItem}
            variant="contained"
            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
          >
            추가
          </Button>
        </DialogActions>
             </Dialog>



      {/* 현장 선택 다이얼로그 */}
      <Dialog 
        open={showSiteSelectionDialog} 
        onClose={() => setShowSiteSelectionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#232734', color: '#fff' }}>
          현장 선택 ({foundSiteNames.length}개 발견)
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#232734', color: '#fff' }}>
          <Typography variant="body2" sx={{ color: '#bbb', mb: 2 }}>
            "{factorySiteName}"을 포함한 현장들을 발견했습니다. 분석할 현장들을 선택해주세요.
          </Typography>
          
          {uploadProgress && uploadStatus === 'loading' && (
            <Alert 
              severity="info"
              sx={{ bgcolor: '#1a1d21', mb: 2 }}
              icon={<CircularProgress size={20} />}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: '#90caf9' }} />
                <Typography variant="body2">
                  {uploadProgress}
                </Typography>
              </Box>
            </Alert>
          )}
          
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {foundSiteNames.map((siteName, index) => (
              <Box 
                key={index}
                sx={{ 
                  p: 1, 
                  mb: 1, 
                  border: selectedSiteNames.includes(siteName) ? '2px solid #90caf9' : '1px solid #444',
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: selectedSiteNames.includes(siteName) ? 'rgba(144, 202, 249, 0.1)' : 'transparent',
                  '&:hover': { 
                    bgcolor: selectedSiteNames.includes(siteName) ? 'rgba(144, 202, 249, 0.2)' : '#1a1d21',
                    borderColor: selectedSiteNames.includes(siteName) ? '#90caf9' : '#666'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                onClick={() => {
                  if (selectedSiteNames.includes(siteName)) {
                    setSelectedSiteNames(selectedSiteNames.filter(name => name !== siteName));
                  } else {
                    setSelectedSiteNames([...selectedSiteNames, siteName]);
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {selectedSiteNames.includes(siteName) && (
                    <CheckCircleIcon sx={{ color: '#90caf9', fontSize: 20 }} />
                  )}
                  <Typography sx={{ 
                    color: selectedSiteNames.includes(siteName) ? '#90caf9' : '#fff',
                    fontWeight: selectedSiteNames.includes(siteName) ? 'bold' : 'normal'
                  }}>
                    {siteName}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setSelectedSiteNames(foundSiteNames)}
              sx={{ color: '#90caf9', borderColor: '#90caf9' }}
            >
              전체 선택
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedSiteNames([])}
              sx={{ color: '#90caf9', borderColor: '#90caf9' }}
            >
              전체 해제
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#232734' }}>
          <Button 
            onClick={() => setShowSiteSelectionDialog(false)}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSiteSelectionConfirm}
            variant="contained"
            disabled={selectedSiteNames.length === 0}
            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
          >
            선택 완료 ({selectedSiteNames.length}개)
          </Button>
        </DialogActions>
      </Dialog>

     </Box>
   );
 };

export default QuantityCheck;
