import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
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
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Upload as UploadIcon,
  Assignment as ContractIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import * as XLSX from 'xlsx';

const SiteManagement = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sites, setSites] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [formData, setFormData] = useState({
    siteCode: '', // 고유 번호 필드 추가
    name: '',
    address: '',
    manager: '',
    company: '', // 회사명 필드 추가
    phone: '',
    email: '',
    status: 'active',
    contractType: '하도급계약', // 계약구분 필드 추가
    startDate: '',
    endDate: '',
    description: '',
  });

  // 물량내역 관련 상태
  const [items, setItems] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedItems, setUploadedItems] = useState([]);
  const [selectedSiteForUpload, setSelectedSiteForUpload] = useState('');

  const statusOptions = [
    { value: 'active', label: '진행중', color: 'success' },
    { value: 'pending', label: '대기중', color: 'warning' },
    { value: 'completed', label: '완료', color: 'info' },
    { value: 'suspended', label: '중단', color: 'error' },
  ];

  const contractTypeOptions = [
    '하도급계약', '납품계약', '일반계약', '계약없음', '원도급', '관급'
  ];

  // 고유 번호 자동 생성 함수
  const generateSiteCode = async () => {
    try {
      const sitesQuery = query(collection(db, 'sites'), orderBy('siteCode', 'desc'));
      const snapshot = await getDocs(sitesQuery);
      
      if (snapshot.empty) {
        return 'SITE001';
      }
      
      const lastSite = snapshot.docs[0].data();
      const lastCode = lastSite.siteCode || 'SITE000';
      const lastNumber = parseInt(lastCode.replace('SITE', ''));
      const nextNumber = lastNumber + 1;
      
      return `SITE${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('고유 번호 생성 실패:', error);
      return `SITE${String(Date.now()).slice(-6)}`;
    }
  };

  const getEstimateStatusColor = (status) => {
    if (!status) return '#757575';
    
    switch (status) {
      case '제출':
        return '#43a047';
      case '미제출':
        return '#f44336';
      case '예정':
        return '#2e7d32';
      case '미정':
        return '#d32f2f';
      case '입찰':
        return '#ff9800';
      case '현설':
        return '#2196f3';
      case '기타':
        return '#9c27b0';
      default:
        return '#757575';
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const sitesQuery = query(
        collection(db, 'sites'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(sitesQuery);
      const sitesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSites(sitesData);
    } catch (error) {
      console.error('현장 목록 조회 실패:', error);
      setError('현장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (site = null) => {
    if (site) {
      setSelectedSite(site);
      setFormData({
        siteCode: site.siteCode || '',
        name: site.name,
        address: site.address,
        manager: site.manager,
        company: site.company || '',
        phone: site.phone,
        email: site.email,
        status: site.status,
        contractType: site.contractType || '하도급계약',
        startDate: site.startDate,
        endDate: site.endDate,
        description: site.description,
      });
    } else {
      setSelectedSite(null);
      // 새 현장 등록 시 고유 번호 자동 생성
      generateSiteCode().then(code => {
        setFormData({
          siteCode: code,
          name: '',
          address: '',
          manager: '',
          company: '',
        phone: '',
        email: '',
        status: 'active',
        contractType: '하도급계약',
        startDate: '',
        endDate: '',
        description: '',
        });
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSite(null);
    setFormData({
      siteCode: '',
      name: '',
      address: '',
      manager: '',
      company: '',
      phone: '',
      email: '',
      status: 'active',
      contractType: '하도급계약',
      startDate: '',
      endDate: '',
      description: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 확인 다이얼로그
    const action = selectedSite ? '수정' : '등록';
    const confirmMessage = selectedSite 
      ? `현장을 수정하시겠습니까?` 
      : `현장을 등록하시겠습니까?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const siteData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      // 거래처 연동: 현장 관리자와 회사명을 vendors 컬렉션에 자동 추가
      await syncVendorData(formData.manager, formData.name);

      if (selectedSite) {
        // 현장 정보 수정
        await updateDoc(doc(db, 'sites', selectedSite.id), siteData);
      } else {
        // 새 현장 추가
        siteData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'sites'), siteData);
      }

      handleCloseDialog();
      fetchSites();
      
      // 성공 메시지 - 현장명과 계획 포함
      const statusLabel = statusOptions.find(option => option.value === formData.status)?.label || '진행중';
      const successMessage = selectedSite 
        ? `${formData.name} [${statusLabel}] 현장수정 완료했습니다.`
        : `${formData.name} [${statusLabel}] 현장등록 완료했습니다.`;
      
      alert(successMessage);
      
      // 입력칸 초기화
      setFormData({
        siteCode: '',
        name: '',
        address: '',
        manager: '',
        company: '',
        phone: '',
        email: '',
        status: 'active',
        contractType: '하도급계약',
        startDate: '',
        endDate: '',
        description: '',
      });
    } catch (error) {
      console.error('현장 저장 실패:', error);
      const failMessage = selectedSite 
        ? '현장 수정에 실패했습니다.'
        : '현장 등록에 실패했습니다.';
      alert(failMessage);
      setError(failMessage);
    } finally {
      setLoading(false);
    }
  };

  // 현장관리에서 소장과 회사명을 견적페이지와 연동
  const syncVendorData = async (manager, company) => {
    console.log('=== 현장관리 데이터 저장 ===');
    console.log('소장:', manager);
    console.log('회사명:', company);
    
    // 견적페이지에서 사용할 수 있도록 데이터 저장
    if (manager && manager.trim()) {
      try {
        // 견적페이지에서 사용할 의뢰자 데이터 생성
        const requesterData = {
          name: manager.trim(),
          company: company && company.trim() ? company.trim() : '',
          source: 'site_management',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 의뢰자가 있는지 확인
        const existingQuery = query(
          collection(db, 'requesters'),
          where('name', '==', manager.trim())
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          console.log('새로운 의뢰자 추가:', requesterData);
          await addDoc(collection(db, 'requesters'), requesterData);
        } else {
          console.log('기존 의뢰자 업데이트:', requesterData);
          const existingDoc = existingSnapshot.docs[0];
          await updateDoc(doc(db, 'requesters', existingDoc.id), {
            company: requesterData.company,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('의뢰자 데이터 저장 오류:', error);
      }
    }
  };

  const handleDelete = async (siteId) => {
    if (!window.confirm('정말로 이 현장을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteDoc(doc(db, 'sites', siteId));
      fetchSites();
    } catch (error) {
      console.error('현장 삭제 실패:', error);
      setError('현장 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 물량내역 업로드 관련 함수들
  const handleOpenUploadDialog = async (site) => {
    setSelectedSiteForUpload(site);
    setUploadedItems([]);
    setUploadDialogOpen(true);
    
    // 기존 물량데이터 불러오기
    try {
      const existingItemsQuery = query(
        collection(db, 'siteItems'), 
        where('siteId', '==', site.id),
        orderBy('sequence', 'asc')
      );
      const existingItemsSnapshot = await getDocs(existingItemsQuery);
      
      if (!existingItemsSnapshot.empty) {
        const existingItems = existingItemsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          specification: doc.data().specification || '',
          unit: doc.data().unit || '',
          quantity: Number(doc.data().quantity) || 0,
          unitPrice: Number(doc.data().unitPrice) || 0,
          totalPrice: Number(doc.data().price) || 0,
          sequence: doc.data().sequence || 0
        }));
        
        setUploadedItems(existingItems);
        console.log('기존 물량데이터 불러옴:', existingItems);
      }
    } catch (error) {
      console.error('기존 물량데이터 불러오기 실패:', error);
    }
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedSiteForUpload('');
    setUploadedItems([]);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // "내역서" 시트 찾기
        const sheetName = workbook.SheetNames.find(name => name.includes('내역서'));
        if (!sheetName) {
          alert('엑셀 파일에서 "내역서" 시트를 찾을 수 없습니다.');
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 5번째 줄부터 데이터 추출 (A, B, C, D, K, L 열)
        const extractedItems = [];
        for (let i = 4; i < jsonData.length; i++) { // 5번째 줄부터 (인덱스 4)
          const row = jsonData[i];
          if (row && row.length > 11) { // L열까지 있으려면 최소 12개 열 필요
            const itemName = row[0]; // A열 (인덱스 0) - 품명
            const specification = row[1]; // B열 (인덱스 1) - 규격
            const unit = row[2]; // C열 (인덱스 2) - 단위
            const quantity = row[3]; // D열 (인덱스 3) - 수량
            const unitPrice = row[10]; // K열 (인덱스 10) - 단가
            const totalPrice = row[11]; // L열 (인덱스 11) - 금액

            // 빈 행이 아닌 경우만 추가
            if (itemName && (quantity || unitPrice || totalPrice)) {
              extractedItems.push({
                id: Date.now() + i,
                name: itemName || '',
                specification: specification || '', // B열 - 규격
                unit: unit || '', // C열 - 단위
                quantity: quantity || 0,
                unitPrice: unitPrice || 0,
                totalPrice: totalPrice || 0
              });
            }
          }
        }

        setUploadedItems(extractedItems);
        console.log('추출된 물량내역:', extractedItems);
      } catch (error) {
        console.error('엑셀 파일 처리 오류:', error);
        alert('엑셀 파일 처리 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveItems = async () => {
    if (!selectedSiteForUpload || uploadedItems.length === 0) {
      alert('저장할 데이터가 없습니다.');
      return;
    }

    setLoading(true);
    try {
      // 기존 물량데이터 삭제
      const existingItemsQuery = query(
        collection(db, 'siteItems'), 
        where('siteId', '==', selectedSiteForUpload.id)
      );
      const existingItemsSnapshot = await getDocs(existingItemsQuery);
      
      // 기존 데이터 삭제
      const deletePromises = existingItemsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // 새로운 물량데이터 저장
      const savePromises = uploadedItems.map((item, index) => {
        const itemData = {
          siteId: selectedSiteForUpload.id,
          siteName: selectedSiteForUpload.name,
          name: item.name || '',
          specification: item.specification || '',
          unit: item.unit || '',
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0,
          unitPrice: Number(item.unitPrice || item.price) || 0,
          sequence: index + 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return addDoc(collection(db, 'siteItems'), itemData);
      });

      await Promise.all(savePromises);

      // 현장 데이터에 물량데이터 참조 업데이트
      const siteRef = doc(db, 'sites', selectedSiteForUpload.id);
      await updateDoc(siteRef, {
        hasItems: true,
        itemCount: uploadedItems.length,
        updatedAt: new Date()
      });

      alert('물량내역이 성공적으로 저장되었습니다.');
      handleCloseUploadDialog();
      fetchSites(); // 현장 목록 새로고침
    } catch (error) {
      console.error('물량내역 저장 오류:', error);
      alert('물량내역 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (index, field, value) => {
    const updatedItems = [...uploadedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setUploadedItems(updatedItems);
  };

  const handleDeleteItem = (index) => {
    const updatedItems = uploadedItems.filter((_, i) => i !== index);
    setUploadedItems(updatedItems);
  };

  // 물량내역 초기화 함수
  const handleClearItems = async () => {
    if (!selectedSiteForUpload) {
      alert('현장을 선택해주세요.');
      return;
    }

    if (!confirm('물량내역을 모두 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      // siteItems 컬렉션에서 해당 현장의 물량데이터 삭제
      const existingItemsQuery = query(
        collection(db, 'siteItems'), 
        where('siteId', '==', selectedSiteForUpload.id)
      );
      const existingItemsSnapshot = await getDocs(existingItemsQuery);
      
      // 기존 데이터 삭제
      const deletePromises = existingItemsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // 현장 데이터에서 물량데이터 참조 제거
      await updateDoc(doc(db, 'sites', selectedSiteForUpload.id), {
        hasItems: false,
        itemCount: 0,
        updatedAt: new Date()
      });

      // 로컬 상태 업데이트
      setSites(prev => prev.map(site => 
        site.id === selectedSiteForUpload.id 
          ? { ...site, hasItems: false, itemCount: 0 }
          : site
      ));

      // 업로드된 아이템들도 초기화
      setUploadedItems([]);

      alert('물량내역이 성공적으로 초기화되었습니다.');
    } catch (error) {
      console.error('물량내역 초기화 오류:', error);
      alert('물량내역 초기화 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 납품계약서 만들기 함수
  const handleCreateContract = (site) => {
    const contractData = {
      현장명: site.name || '',
      주소: site.address || '',
      담당자: site.manager || '',
      회사명: site.company || '',
      연락처: site.phone || '',
      이메일: site.email || '',
      시작일: site.startDate || '',
      종료일: site.endDate || '',
      계약구분: site.contractType || '',
      상태: statusOptions.find(option => option.value === site.status)?.label || '',
      설명: site.description || '',
      물량내역: site.items || []
    };

    console.log('납품계약서 데이터:', contractData);
    
    // 데이터를 JSON 형태로 다운로드하거나 클립보드에 복사
    const jsonData = JSON.stringify(contractData, null, 2);
    
    // 클립보드에 복사
    navigator.clipboard.writeText(jsonData).then(() => {
      alert(`${site.name} 현장의 납품계약서 데이터가 클립보드에 복사되었습니다.\n\n제공해주실 템플릿에 이 데이터를 활용해주세요.`);
    }).catch(() => {
      // 클립보드 복사 실패 시 다운로드로 대체
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${site.name}_납품계약서_데이터.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`${site.name} 현장의 납품계약서 데이터가 파일로 다운로드되었습니다.`);
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      p: isMobile ? 0 : 3,
      m: 0,
      ml: isMobile ? '30px' : 0,
      boxSizing: 'border-box',
      mt: isMobile ? 0 : '130px'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: isMobile ? 2 : 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold' }}>
          현장 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
          sx={{
            minHeight: isMobile ? '48px' : 'auto',
            fontSize: isMobile ? '1rem' : '0.875rem'
          }}
        >
          새 현장 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ 
        overflowX: 'auto',
        '& .MuiTable-root': {
          minWidth: isMobile ? '100%' : 'auto'
        }
      }}>
        <Table sx={{ 
          '& .MuiTableCell-root': { 
            borderBottom: '1px solid #e0e0e0',
            padding: isMobile ? '8px 4px' : '16px',
            fontSize: isMobile ? '0.75rem' : '0.875rem'
          }
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                height: isMobile ? '50px' : '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '0.875rem'
              }}>고유번호</TableCell>
              <TableCell sx={{ 
                height: isMobile ? '50px' : '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '0.875rem'
              }}>현장명</TableCell>
              {!isMobile && <TableCell sx={{ 
                height: '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold'
              }}>주소</TableCell>}
              <TableCell sx={{ 
                height: isMobile ? '50px' : '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '0.875rem'
              }}>담당자</TableCell>
              {!isMobile && <TableCell sx={{ 
                height: '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold'
              }}>연락처</TableCell>}
              <TableCell sx={{ 
                height: isMobile ? '50px' : '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '0.875rem'
              }}>계약구분</TableCell>
              <TableCell sx={{ 
                height: isMobile ? '50px' : '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '0.875rem'
              }}>상태</TableCell>
              <TableCell sx={{ 
                height: isMobile ? '50px' : '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '0.875rem'
              }}>견적</TableCell>
              {!isMobile && <TableCell sx={{ 
                height: '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold'
              }}>시작일</TableCell>}
              {!isMobile && <TableCell sx={{ 
                height: '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold'
              }}>종료일</TableCell>}
              <TableCell sx={{ 
                height: isMobile ? '50px' : '60px', 
                verticalAlign: 'middle',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '0.875rem'
              }}>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell sx={{ 
                  height: isMobile ? '50px' : '60px', 
                  verticalAlign: 'middle',
                  fontSize: isMobile ? '0.7rem' : '0.875rem'
                }}>
                  <Chip
                    label={site.siteCode || '미지정'}
                    size="small"
                    sx={{
                      backgroundColor: site.siteCode ? '#2196f3' : '#f44336',
                      color: 'white',
                      fontSize: isMobile ? '0.6rem' : '0.75rem',
                      fontWeight: 'bold',
                      height: isMobile ? '20px' : '24px'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ 
                  height: isMobile ? '50px' : '60px', 
                  verticalAlign: 'middle',
                  fontSize: isMobile ? '0.7rem' : '0.875rem',
                  fontWeight: 'bold'
                }}>{site.name}</TableCell>
                {!isMobile && <TableCell sx={{ 
                  height: '60px', 
                  verticalAlign: 'middle'
                }}>{site.address}</TableCell>}
                <TableCell sx={{ 
                  height: isMobile ? '50px' : '60px', 
                  verticalAlign: 'middle',
                  fontSize: isMobile ? '0.7rem' : '0.875rem'
                }}>{site.manager}</TableCell>
                {!isMobile && <TableCell sx={{ 
                  height: '60px', 
                  verticalAlign: 'middle'
                }}>{site.phone}</TableCell>}
                <TableCell sx={{ 
                  height: isMobile ? '50px' : '60px', 
                  verticalAlign: 'middle',
                  fontSize: isMobile ? '0.7rem' : '0.875rem'
                }}>
                  <Chip
                    label={site.contractType || '하도급계약'}
                    sx={{
                      backgroundColor: site.contractType === '납품계약' ? '#4caf50' : '#2196f3',
                      color: 'white',
                      fontSize: isMobile ? '0.6rem' : '0.75rem',
                      height: isMobile ? '20px' : '24px'
                    }}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ 
                  height: isMobile ? '50px' : '60px', 
                  verticalAlign: 'middle'
                }}>
                  <Chip
                    label={statusOptions.find(option => option.value === site.status)?.label}
                    color={statusOptions.find(option => option.value === site.status)?.color}
                    size="small"
                    sx={{
                      fontSize: isMobile ? '0.6rem' : '0.75rem',
                      height: isMobile ? '20px' : '24px'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ 
                  height: isMobile ? '50px' : '60px', 
                  verticalAlign: 'middle'
                }}>
                  {site.estimateStatus && (
                    <Chip
                      label={site.estimateStatus}
                      size="small"
                      sx={{
                        backgroundColor: getEstimateStatusColor(site.estimateStatus),
                        color: 'white',
                        fontSize: isMobile ? '0.6rem' : '0.75rem',
                        height: isMobile ? '20px' : '24px'
                      }}
                      title={`견적 상태: ${site.estimateStatus}`}
                    />
                  )}
                </TableCell>
                {!isMobile && <TableCell sx={{ 
                  height: '60px', 
                  verticalAlign: 'middle'
                }}>{site.startDate}</TableCell>}
                {!isMobile && <TableCell sx={{ 
                  height: '60px', 
                  verticalAlign: 'middle'
                }}>{site.endDate}</TableCell>}
                <TableCell sx={{ 
                  height: isMobile ? '50px' : '60px', 
                  verticalAlign: 'middle'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: isMobile ? 0.25 : 0.5, 
                    flexWrap: 'wrap', 
                    alignItems: 'center'
                  }}>
                    {site.contractType === '납품계약' && (
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ 
                          backgroundColor: '#4caf50',
                          color: 'white',
                          fontSize: isMobile ? '0.6rem' : '0.7rem',
                          minWidth: 'auto',
                          px: isMobile ? 0.5 : 1,
                          py: isMobile ? 0.25 : 0.5,
                          height: isMobile ? '24px' : 'auto',
                          '&:hover': {
                            backgroundColor: '#45a049'
                          }
                        }}
                        onClick={() => handleCreateContract(site)}
                        startIcon={<ContractIcon sx={{ fontSize: isMobile ? '12px' : '14px' }} />}
                      >
                        납품계약서
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/sites/${site.id}`)}
                      sx={{
                        padding: isMobile ? '4px' : '8px',
                        '& .MuiSvgIcon-root': {
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }
                      }}
                    >
                      <LocationIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(site)}
                      sx={{
                        padding: isMobile ? '4px' : '8px',
                        '& .MuiSvgIcon-root': {
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenUploadDialog(site)}
                      title="물량내역 업로드"
                      sx={{
                        padding: isMobile ? '4px' : '8px',
                        '& .MuiSvgIcon-root': {
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }
                      }}
                    >
                      <UploadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(site.id)}
                      sx={{
                        padding: isMobile ? '4px' : '8px',
                        '& .MuiSvgIcon-root': {
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {sites.length === 0 && (
              <TableRow>
                <TableCell colSpan={isMobile ? 6 : 10} align="center" sx={{ 
                  height: isMobile ? '50px' : '60px', 
                  verticalAlign: 'middle',
                  fontSize: isMobile ? '0.8rem' : '0.875rem'
                }}>
                  등록된 현장이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            margin: isMobile ? 0 : 'auto',
            borderRadius: isMobile ? 0 : 1,
            width: isMobile ? '100%' : 'auto',
            height: isMobile ? '100%' : 'auto',
            maxWidth: isMobile ? '100%' : 'md',
            maxHeight: isMobile ? '100%' : '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: isMobile ? 1 : 2,
          fontSize: isMobile ? '1.2rem' : '1.5rem',
          fontWeight: 'bold'
        }}>
          {selectedSite ? '현장 정보 수정' : '새 현장 등록'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ 
            pb: isMobile ? 1 : 2,
            '& .MuiGrid-item': {
              paddingBottom: isMobile ? 1 : 2
            }
          }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="고유번호"
                  name="siteCode"
                  value={formData.siteCode}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  helperText="자동으로 생성되며 수정 가능합니다"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="현장명"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="주소"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="담당자"
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="회사명"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="연락처"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="이메일"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="상태"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="계약구분"
                  name="contractType"
                  value={formData.contractType}
                  onChange={handleInputChange}
                  required
                >
                  {contractTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="시작일"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="종료일"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ 
            p: isMobile ? 2 : 3,
            gap: isMobile ? 1 : 2,
            flexDirection: isMobile ? 'column' : 'row',
            '& .MuiButton-root': {
              width: isMobile ? '100%' : 'auto',
              minHeight: isMobile ? '48px' : 'auto',
              fontSize: isMobile ? '1rem' : '0.875rem'
            }
          }}>
            <Button 
              onClick={handleCloseDialog}
              variant="outlined"
              fullWidth={isMobile}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth={isMobile}
            >
              {loading ? <CircularProgress size={24} /> : '저장'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 물량내역 업로드 다이얼로그 */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={handleCloseUploadDialog} 
        maxWidth="lg" 
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            margin: isMobile ? 0 : 'auto',
            borderRadius: isMobile ? 0 : 1,
            width: isMobile ? '100%' : 'auto',
            height: isMobile ? '100%' : 'auto',
            maxWidth: isMobile ? '100%' : 'lg',
            maxHeight: isMobile ? '100%' : '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: isMobile ? 1 : 2,
          fontSize: isMobile ? '1.2rem' : '1.5rem',
          fontWeight: 'bold'
        }}>
          물량내역 업로드 - {selectedSiteForUpload?.name}
        </DialogTitle>
        <DialogContent sx={{ 
          pb: isMobile ? 1 : 2
        }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              엑셀 파일의 "내역서" 시트에서 A, B, C, D, K, L열의 데이터를 추출합니다. (5번째 줄부터)
            </Typography>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <label htmlFor="excel-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ mb: 2 }}
              >
                엑셀 파일 선택
              </Button>
            </label>
          </Box>

          {uploadedItems.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                추출된 물량내역 ({uploadedItems.length}개)
              </Typography>
              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: 400,
                  overflow: 'auto',
                  scrollbarWidth: 'none', // Firefox
                  '&::-webkit-scrollbar': { display: 'none' } // Chrome, Safari
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>항목명</TableCell>
                      <TableCell>물량</TableCell>
                      <TableCell>단가</TableCell>
                      <TableCell>금액</TableCell>
                      <TableCell>관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadedItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.name}
                            onChange={(e) => handleEditItem(index, 'name', e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleEditItem(index, 'quantity', Number(e.target.value))}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleEditItem(index, 'unitPrice', Number(e.target.value))}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.totalPrice}
                            onChange={(e) => handleEditItem(index, 'totalPrice', Number(e.target.value))}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteItem(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>
            취소
          </Button>
          <Button
            onClick={handleClearItems}
            variant="outlined"
            color="error"
            disabled={!selectedSiteForUpload}
          >
            초기화
          </Button>
          <Button
            onClick={handleSaveItems}
            variant="contained"
            disabled={uploadedItems.length === 0 || loading}
          >
            {loading ? <CircularProgress size={24} /> : '저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SiteManagement; 