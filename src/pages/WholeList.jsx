import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Checkbox,
  FormControlLabel,
  TableSortLabel,
  Autocomplete
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { useNavigate } from 'react-router-dom';
import { exportToExcel } from '../utils/excelUtils';

const STATUS_OPTIONS = ['계획', '진행중', '완료', '미정'];
const CONTRACT_TYPE_OPTIONS = ['하도급계약', '납품계약', '일반계약', '계약없음', '원도급'];

// 정렬 함수 (개선된 버전)
const sortData = (data, orderBy, order) => {
  return [...data].sort((a, b) => {
    let aValue = a[orderBy];
    let bValue = b[orderBy];

    // null/undefined 처리
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // 날짜 필드 처리
    if (orderBy === 'createdAt' || orderBy === 'updatedAt') {
      aValue = aValue ? (aValue.seconds || new Date(aValue).getTime() / 1000) : 0;
      bValue = bValue ? (bValue.seconds || new Date(bValue).getTime() / 1000) : 0;
    }
    
    // 날짜 문자열 필드 처리 (startDate, endDate)
    if (orderBy === 'startDate' || orderBy === 'endDate') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }
    
    // 숫자 필드 처리 (계약금액, 선급금, 누계기성)
    if (orderBy === 'contractAmount' || orderBy === 'advance' || orderBy === 'totalProgress') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    // 불린 필드 처리 (isFavorite, subcontractGuardian)
    if (orderBy === 'isFavorite' || orderBy === 'subcontractGuardian') {
      aValue = Boolean(aValue);
      bValue = Boolean(bValue);
    }

    // 문자열 필드 처리 (한글 정렬을 위해 localeCompare 사용)
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue, 'ko', { numeric: true });
      return order === 'desc' ? -comparison : comparison;
    }

    // 숫자/날짜 비교
    if (order === 'desc') {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  });
};

const scrollFocus = (ref) => () => {
  const timeoutId = setTimeout(() => {
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
  
  // cleanup 함수 반환
  return () => clearTimeout(timeoutId);
};

const WholeList = () => {
  const [sites, setSites] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [vendors, setVendors] = useState([]); // 거래처 데이터 상태 추가
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // 현재 년도로 초기화
  const navigate = useNavigate();

  // 년도 변경 시 페이지 리셋
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setPage(0); // 년도 변경 시 첫 페이지로 이동
  };

  // 공사기간이 1년을 넘어가는지 확인하는 함수
  const isLongTermProject = (site) => {
    const startDate = site.startDate ? 
      (site.startDate.toDate ? site.startDate.toDate() : new Date(site.startDate)) : null;
    const endDate = site.endDate ? 
      (site.endDate.toDate ? site.endDate.toDate() : new Date(site.endDate)) : null;
    
    if (!startDate || !endDate) return false;
    
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    // 시작년도와 종료년도가 다르면 장기 프로젝트
    return startYear !== endYear;
  };

  // 거래처 데이터 로드
  const loadVendors = async () => {
    try {
      const vendorsQuery = query(collection(db, 'vendorManagement'), orderBy('companyName', 'asc'));
      const querySnapshot = await getDocs(vendorsQuery);
      const vendorsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vendorsData);
    } catch (error) {
      console.error('거래처 데이터 로드 오류:', error);
    }
  };

  // Firebase에서 데이터 실시간 가져오기
  useEffect(() => {
    const q = query(collection(db, 'sites'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sitesData = [];
      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        
        // 기존 상태값을 새로운 옵션에 맞게 마이그레이션
        if (data.status === '진행상황') {
          data.status = '진행중';
        } else if (data.status === '계획') {
          data.status = '계획';
        }
        
        sitesData.push(data);
      });
      setSites(sitesData);
      setLoading(false);
    });

    // 거래처 데이터도 함께 로드
    loadVendors();

    return () => unsubscribe();
  }, []);

  // 정렬 처리
  const handleRequestSort = (property) => {
    const isAsc = sortBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
    setPage(0); // 정렬 변경 시 첫 페이지로 이동
  };

  // 년도별 필터링 함수
  const getSitesByYear = (year) => {
    return sites.filter(site => {
      // 시작일(착공일), 계약일, 생성일, 종료일이 해당 년도에 포함되는지 확인
      const startDate = site.startDate ? 
        (site.startDate.toDate ? site.startDate.toDate() : new Date(site.startDate)) : null;
      const contractDate = site.contractDate ? 
        (site.contractDate.toDate ? site.contractDate.toDate() : new Date(site.contractDate)) : null;
      const createdAt = site.createdAt ? 
        (site.createdAt.toDate ? site.createdAt.toDate() : new Date(site.createdAt)) : null;
      const endDate = site.endDate ? 
        (site.endDate.toDate ? site.endDate.toDate() : new Date(site.endDate)) : null;
      
      // 시작일, 계약일, 생성일, 종료일 중 하나라도 해당 년도에 포함되면 포함
      return (startDate && startDate.getFullYear() === year) ||
             (contractDate && contractDate.getFullYear() === year) ||
             (createdAt && createdAt.getFullYear() === year) ||
             (endDate && endDate.getFullYear() === year);
    });
  };

  // 선택된 년도의 현장들
  const filteredSites = getSitesByYear(selectedYear);
  
  // 정렬된 데이터 (사용자 선택에 따라)
  const sortedSites = sortData([...filteredSites], sortBy, order);

  // 페이지 변경
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // 페이지당 행 수 변경
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 편집 다이얼로그 열기
  const handleEdit = (site) => {
    setSelectedSite(site);
    setEditDialog(true);
  };

  // 편집 다이얼로그 닫기
  const handleCloseEdit = () => {
    setEditDialog(false);
    setSelectedSite(null);
  };

  // 데이터 저장
  const handleSave = async (formData) => {
    try {
      if (selectedSite) {
        // 수정
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          ...formData,
          updatedAt: new Date()
        });
        setSnackbar({ open: true, message: '현장 정보가 수정되었습니다.', severity: 'success' });
      } else {
        // 추가
        await addDoc(collection(db, 'sites'), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        setSnackbar({ open: true, message: '새 현장이 추가되었습니다.', severity: 'success' });
      }
      handleCloseEdit();
    } catch (error) {
      setSnackbar({ open: true, message: '오류가 발생했습니다: ' + error.message, severity: 'error' });
    }
  };

  // 데이터 삭제
  const handleDelete = async (siteId) => {
    if (window.confirm('정말로 이 현장을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'sites', siteId));
        setSnackbar({ open: true, message: '현장이 삭제되었습니다.', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다: ' + error.message, severity: 'error' });
      }
    }
  };

  // 엑셀 다운로드
  // 전체현장 엑셀 다운로드 함수 (ExcelJS - 예쁜 스타일)
  const handleExportExcel = async () => {
    try {
      console.log('📊 전체현장 엑셀 다운로드 시작');
      
      if (!sites || sites.length === 0) {
        alert('다운로드할 현장 데이터가 없습니다.');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('전체현장목록');

      // 제목 행 추가 (년도 포함)
      const titleRow = worksheet.addRow([`천우건업(주) 전체현장 현황 - ${selectedYear}년`]);
      titleRow.font = { size: 16, bold: true, color: { argb: 'FF2E7D32' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A1:K1');
      
      // 빈 행 추가
      worksheet.addRow([]);
      
      // 날짜 행 추가
      const dateRow = worksheet.addRow([`작성일: ${new Date().toLocaleDateString('ko-KR')}`]);
      dateRow.font = { size: 12, color: { argb: 'FF666666' } };
      dateRow.alignment = { horizontal: 'right' };
      worksheet.mergeCells('A3:K3');
      
      // 빈 행 추가
      worksheet.addRow([]);

      // 헤더 행 추가
      const headers = [
        '번호', '현장명', '계약구분', '진행상황', '계약금액', 
        '시작일', '종료일', '담당자', '연락처', '회사명', '비고'
      ];
      
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // 데이터 행 추가 (필터링된 현장들만)
      filteredSites.forEach((site, index) => {
        const contractAmount = Number(site.contractAmount) || 0;
        const formattedAmount = contractAmount > 0 ? contractAmount.toLocaleString() : '';
        
        const startDate = site.startDate ? 
          (site.startDate.toDate ? site.startDate.toDate() : new Date(site.startDate)) : null;
        const endDate = site.endDate ? 
          (site.endDate.toDate ? site.endDate.toDate() : new Date(site.endDate)) : null;
        
        const startDateStr = startDate ? startDate.toLocaleDateString('ko-KR') : '';
        const endDateStr = endDate ? endDate.toLocaleDateString('ko-KR') : '';

        const dataRow = worksheet.addRow([
          index + 1, // 번호
          site.name || '', // 현장명
          site.contractType || '', // 계약구분
          site.status || '', // 진행상황
          formattedAmount, // 계약금액
          startDateStr, // 시작일
          endDateStr, // 종료일
          site.manager || '', // 담당자
          site.phone || '', // 연락처
          site.companyName || '', // 회사명
          site.note || '' // 비고
        ]);

        // 행 스타일 적용
        dataRow.font = { size: 11 };
        dataRow.alignment = { 
          horizontal: 'center', 
          vertical: 'middle' 
        };
        dataRow.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };

        // 번호, 현장명, 계약구분, 진행상황은 왼쪽 정렬
        dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        dataRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' }; // 계약금액은 오른쪽 정렬
        dataRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' }; // 담당자는 왼쪽 정렬
        dataRow.getCell(10).alignment = { horizontal: 'left', vertical: 'middle' }; // 회사명은 왼쪽 정렬
        dataRow.getCell(11).alignment = { horizontal: 'left', vertical: 'middle' }; // 비고는 왼쪽 정렬

        // 진행상황에 따른 색상 적용
        const statusCell = dataRow.getCell(4);
        switch (site.status) {
          case '예정':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE3F2FD' }
            };
            break;
          case '진행':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF3E5F5' }
            };
            break;
          case '완료':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE8F5E8' }
            };
            break;
          case '미정':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF3E0' }
            };
            break;
        }
      });

      // 컬럼 너비 설정
      worksheet.columns = [
        { width: 8 },  // 번호
        { width: 25 }, // 현장명
        { width: 12 }, // 계약구분
        { width: 10 }, // 진행상황
        { width: 15 }, // 계약금액
        { width: 12 }, // 시작일
        { width: 12 }, // 종료일
        { width: 12 }, // 담당자
        { width: 15 }, // 연락처
        { width: 20 }, // 회사명
        { width: 30 }  // 비고
      ];

      // 파일명 생성 (년도 포함)
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `천우건업(주)_전체현장현황_${selectedYear}년_${dateStr}.xlsx`;

      // 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ 전체현장 엑셀 다운로드 완료');
      alert('전체현장 엑셀 파일이 다운로드되었습니다.');
      
    } catch (error) {
      console.error('❌ 전체현장 엑셀 다운로드 실패:', error);
      alert('엑셀 다운로드에 실패했습니다.');
    }
  };

  // 엑셀 업로드
  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUploadExcel = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let updateCount = 0;
        let errorCount = 0;

        // 데이터 변환 및 Firebase에 저장
        for (const row of jsonData) {
          try {
            const siteData = {
              name: row['현장명'] || '',
              status: row['진행상황'] || '',
              contractType: row['계약구분'] || '',
              contractAmount: row['계약금액'] || '',
              advance: row['선급금'] || '',
              totalProgress: row['누계기성'] || '',
              address: row['주소'] || '',
              startDate: row['착공일'] || '',
              endDate: row['준공예정일'] || '',
              companyName: row['회사명'] || '',
              manager: row['소장'] || '',
              phone: row['연락처'] || '',
              team: row['시공팀'] || '',
              desc: row['기타사항'] || '',
              installment: row['차수'] || '',
              subcontractGuardian: row['하도급지킴이'] === 'Y',
              isFavorite: row['주요현장'] === 'Y',
              updatedAt: new Date()
            };

            // 현장명으로 기존 데이터 검색
            const existingSite = sites.find(site => site.name === siteData.name);
            
            if (existingSite) {
              // 기존 데이터 업데이트
              await updateDoc(doc(db, 'sites', existingSite.id), siteData);
              updateCount++;
            } else {
              // 새 데이터 추가
              await addDoc(collection(db, 'sites'), {
                ...siteData,
                createdAt: new Date()
              });
              successCount++;
            }
          } catch (error) {
            console.error('데이터 처리 중 오류:', error);
            errorCount++;
          }
        }

        const message = `업로드 완료: ${successCount}개 추가, ${updateCount}개 수정${errorCount > 0 ? `, ${errorCount}개 오류` : ''}`;
        setSnackbar({ 
          open: true, 
          message: message, 
          severity: errorCount > 0 ? 'warning' : 'success' 
        });
        setUploadDialog(false);
        setSelectedFile(null);
      } catch (error) {
        setSnackbar({ open: true, message: '업로드 중 오류가 발생했습니다: ' + error.message, severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // 현장 상세 페이지로 이동


  // 주요현장(별) 토글
  const handleToggleFavorite = async (site) => {
    try {
      await updateDoc(doc(db, 'sites', site.id), {
        isFavorite: !site.isFavorite,
        updatedAt: new Date()
      });
      setSnackbar({ open: true, message: site.isFavorite ? '주요현장에서 해제되었습니다.' : '주요현장으로 등록되었습니다.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: '주요현장 변경 중 오류가 발생했습니다: ' + error.message, severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        mt: { xs: '0px', md: '90px' },
        bgcolor: '#181a20',
        // 스마트폰 전용 스타일
        '@media (max-width: 767px)': {
          bgcolor: '#f5f5f5',
          minHeight: '100vh'
        }
      }}
    >
      {/* 스마트폰 전용 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', md: 'center' }, 
        mb: { xs: 2, md: 3 },
        p: { xs: 2, md: 0 },
        gap: { xs: 2, md: 0 },
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          bgcolor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          mx: 1
        }
      }}>
        {/* 상단: 뒤로가기 + 제목 + 년도 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/sites')}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/sites');
            }}
            sx={{ 
              fontWeight: 600,
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                minWidth: 'auto',
                px: 2,
                py: 1,
                fontSize: '0.9rem'
              }
            }}
          >
            <Box sx={{ 
              display: { xs: 'none', sm: 'inline' },
              '@media (max-width: 767px)': { display: 'inline' }
            }}>
              돌아가기
            </Box>
          </Button>
          
          <Typography 
            variant="h4" 
            component="h1"
            sx={{
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#2E7D32',
                flex: 1,
                textAlign: 'center'
              }
            }}
          >
            전체 현장 목록
          </Typography>
          
          {/* 년도 네비게이션 - 스마트폰에서 간소화 */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              gap: 0.5
            }
          }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleYearChange(selectedYear - 1)}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleYearChange(selectedYear - 1);
              }}
              sx={{ 
                minWidth: '50px', 
                fontSize: '0.8rem',
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  minWidth: '40px',
                  fontSize: '0.7rem',
                  px: 1
                }
              }}
            >
              {selectedYear - 1}
            </Button>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#2E7D32',
                minWidth: '120px',
                textAlign: 'center',
                fontSize: '2rem',
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  fontSize: '1.2rem',
                  minWidth: '60px'
                }
              }}
            >
              {selectedYear}년
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleYearChange(selectedYear + 1)}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleYearChange(selectedYear + 1);
              }}
              sx={{ 
                minWidth: '50px', 
                fontSize: '0.8rem',
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  minWidth: '40px',
                  fontSize: '0.7rem',
                  px: 1
                }
              }}
            >
              {selectedYear + 1}
            </Button>
          </Box>
        </Box>
        
        {/* 하단: 액션 버튼들 - 스마트폰에서 세로 배치 */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexDirection: { xs: 'column', md: 'row' },
          // 스마트폰에서만 적용
          '@media (max-width: 767px)': {
            gap: 1,
            '& .MuiButton-root': {
              fontSize: '0.8rem',
              py: 1.5,
              borderRadius: '8px'
            }
          }
        }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialog(true)}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setUploadDialog(true);
            }}
            sx={{
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                order: 1
              }
            }}
          >
            <Box sx={{ 
              display: { xs: 'none', sm: 'inline' },
              '@media (max-width: 767px)': { display: 'inline' }
            }}>
              엑셀 업로드
            </Box>
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleExportExcel();
            }}
            sx={{
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                order: 2
              }
            }}
          >
            <Box sx={{ 
              display: { xs: 'none', sm: 'inline' },
              '@media (max-width: 767px)': { display: 'inline' }
            }}>
              엑셀 다운로드
            </Box>
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditDialog(true)}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditDialog(true);
            }}
            sx={{
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                order: 3,
                bgcolor: '#2E7D32',
                '&:hover': {
                  bgcolor: '#1B5E20'
                }
              }
            }}
          >
            <Box sx={{ 
              display: { xs: 'none', sm: 'inline' },
              '@media (max-width: 767px)': { display: 'inline' }
            }}>
              새 현장 추가
            </Box>
          </Button>
        </Box>
      </Box>

      {/* 스마트폰 전용 데이터 테이블 */}
      <Paper sx={{ 
        width: '100%', 
        overflow: 'hidden',
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          mx: 1,
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }
      }}>
        <TableContainer sx={{ 
          maxHeight: 900,
          // 스마트폰에서만 적용
          '@media (max-width: 767px)': {
            maxHeight: '70vh'
          }
        }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {/* 스마트폰에서는 핵심 컬럼만 표시 */}
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  width: '60px', 
                  py: 1,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '40px',
                    px: 0.5
                  }
                }}>
                  번호
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '40px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'isFavorite'}
                    direction={sortBy === 'isFavorite' ? order : 'asc'}
                    onClick={() => handleRequestSort('isFavorite')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    주요
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    minWidth: '120px'
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    현장명
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '60px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'status'}
                    direction={sortBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    진행상황
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '80px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'contractType'}
                    direction={sortBy === 'contractType' ? order : 'asc'}
                    onClick={() => handleRequestSort('contractType')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    계약구분
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '80px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'contractAmount'}
                    direction={sortBy === 'contractAmount' ? order : 'asc'}
                    onClick={() => handleRequestSort('contractAmount')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    계약금액
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '60px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'advance'}
                    direction={sortBy === 'advance' ? order : 'asc'}
                    onClick={() => handleRequestSort('advance')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    선급금
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '60px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'totalProgress'}
                    direction={sortBy === 'totalProgress' ? order : 'asc'}
                    onClick={() => handleRequestSort('totalProgress')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    누계기성
                  </TableSortLabel>
                </TableCell>
                {/* 스마트폰에서는 숨김 */}
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  },
                  // 스마트폰에서도 숨김
                  '@media (max-width: 767px)': {
                    display: 'none'
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'address'}
                    direction={sortBy === 'address' ? order : 'asc'}
                    onClick={() => handleRequestSort('address')}
                  >
                    주소
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  },
                  // 스마트폰에서도 숨김
                  '@media (max-width: 767px)': {
                    display: 'none'
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'startDate'}
                    direction={sortBy === 'startDate' ? order : 'asc'}
                    onClick={() => handleRequestSort('startDate')}
                  >
                    착공일
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  },
                  // 스마트폰에서도 숨김
                  '@media (max-width: 767px)': {
                    display: 'none'
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'endDate'}
                    direction={sortBy === 'endDate' ? order : 'asc'}
                    onClick={() => handleRequestSort('endDate')}
                  >
                    준공예정일
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '80px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'companyName'}
                    direction={sortBy === 'companyName' ? order : 'asc'}
                    onClick={() => handleRequestSort('companyName')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    회사명
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '60px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'manager'}
                    direction={sortBy === 'manager' ? order : 'asc'}
                    onClick={() => handleRequestSort('manager')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    소장
                  </TableSortLabel>
                </TableCell>
                {/* 스마트폰에서는 숨김 */}
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  },
                  // 스마트폰에서도 숨김
                  '@media (max-width: 767px)': {
                    display: 'none'
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'phone'}
                    direction={sortBy === 'phone' ? order : 'asc'}
                    onClick={() => handleRequestSort('phone')}
                  >
                    연락처
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '60px',
                    px: 0.5
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'team'}
                    direction={sortBy === 'team' ? order : 'asc'}
                    onClick={() => handleRequestSort('team')}
                    sx={{
                      // 스마트폰에서만 적용
                      '@media (max-width: 767px)': {
                        fontSize: '0.7rem'
                      }
                    }}
                  >
                    시공팀
                  </TableSortLabel>
                </TableCell>
                {/* 스마트폰에서는 숨김 */}
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  },
                  // 스마트폰에서도 숨김
                  '@media (max-width: 767px)': {
                    display: 'none'
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'installment'}
                    direction={sortBy === 'installment' ? order : 'asc'}
                    onClick={() => handleRequestSort('installment')}
                  >
                    차수
                  </TableSortLabel>
                </TableCell>
                {/* 스마트폰에서는 숨김 */}
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  },
                  // 스마트폰에서도 숨김
                  '@media (max-width: 767px)': {
                    display: 'none'
                  }
                }}>
                  <TableSortLabel
                    active={sortBy === 'subcontractGuardian'}
                    direction={sortBy === 'subcontractGuardian' ? order : 'asc'}
                    onClick={() => handleRequestSort('subcontractGuardian')}
                  >
                    하도급지킴이
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '0.7rem',
                    width: '60px',
                    px: 0.5
                  }
                }}>
                  작업
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedSites
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((site, index) => {
                  return (
                    <TableRow key={site.id} hover>
                      <TableCell sx={{ 
                        fontSize: '0.8rem', 
                        textAlign: 'center', 
                        py: 1,
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          py: 0.5,
                          px: 0.5
                        }
                      }}>
                        {page * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          px: 0.5
                        }
                      }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleToggleFavorite(site)}
                          sx={{
                            // 스마트폰에서만 적용
                            '@media (max-width: 767px)': {
                              padding: '4px'
                            }
                          }}
                        >
                          {site.isFavorite ? (
                            <StarIcon sx={{ 
                              color: 'gold',
                              // 스마트폰에서만 적용
                              '@media (max-width: 767px)': {
                                fontSize: '1rem'
                              }
                            }} />
                          ) : (
                            <StarBorderIcon sx={{
                              // 스마트폰에서만 적용
                              '@media (max-width: 767px)': {
                                fontSize: '1rem'
                              }
                            }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ 
                        color: isLongTermProject(site) ? '#ffeb3b' : 'inherit',
                        fontWeight: isLongTermProject(site) ? 'bold' : 'normal',
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          px: 0.5,
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }
                      }}>
                        {site.name}
                      </TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          px: 0.5
                        }
                      }}>
                        <Chip
                          label={site.status}
                          color={
                            site.status === '완료' ? 'success' :
                            site.status === '진행중' ? 'primary' :
                            site.status === '중단' ? 'error' : 'default'
                          }
                          size="small"
                          sx={{
                            // 스마트폰에서만 적용
                            '@media (max-width: 767px)': {
                              fontSize: '0.6rem',
                              height: '20px'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          px: 0.5,
                          maxWidth: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }
                      }}>
                        {site.contractType}
                      </TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          px: 0.5,
                          textAlign: 'right'
                        }
                      }}>
                        {Number(site.contractAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          px: 0.5,
                          textAlign: 'right'
                        }
                      }}>
                        {Number(site.advance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          px: 0.5,
                          textAlign: 'right'
                        }
                      }}>
                        {Number(site.totalProgress || 0).toLocaleString()}
                      </TableCell>
                      {/* 스마트폰에서는 숨김 */}
                      <TableCell sx={{
                        // 아이패드에서 숨김
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          display: 'none'
                        },
                        // 스마트폰에서도 숨김
                        '@media (max-width: 767px)': {
                          display: 'none'
                        }
                      }}>{site.address}</TableCell>
                      <TableCell sx={{
                        // 아이패드에서 숨김
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          display: 'none'
                        },
                        // 스마트폰에서도 숨김
                        '@media (max-width: 767px)': {
                          display: 'none'
                        }
                      }}>{site.startDate}</TableCell>
                      <TableCell sx={{
                        // 아이패드에서 숨김
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          display: 'none'
                        },
                        // 스마트폰에서도 숨김
                        '@media (max-width: 767px)': {
                          display: 'none'
                        }
                      }}>{site.endDate}</TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          px: 0.5,
                          maxWidth: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }
                      }}>
                        {site.companyName}
                      </TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          px: 0.5,
                          maxWidth: '60px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }
                      }}>
                        {site.manager}
                      </TableCell>
                      {/* 스마트폰에서는 숨김 */}
                      <TableCell sx={{
                        // 아이패드에서 숨김
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          display: 'none'
                        },
                        // 스마트폰에서도 숨김
                        '@media (max-width: 767px)': {
                          display: 'none'
                        }
                      }}>{site.phone}</TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          fontSize: '0.7rem',
                          px: 0.5,
                          maxWidth: '60px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }
                      }}>
                        {site.team}
                      </TableCell>
                      {/* 스마트폰에서는 숨김 */}
                      <TableCell sx={{
                        // 아이패드에서 숨김
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          display: 'none'
                        },
                        // 스마트폰에서도 숨김
                        '@media (max-width: 767px)': {
                          display: 'none'
                        }
                      }}>{site.installment}</TableCell>
                      {/* 스마트폰에서는 숨김 */}
                      <TableCell sx={{
                        // 아이패드에서 숨김
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          display: 'none'
                        },
                        // 스마트폰에서도 숨김
                        '@media (max-width: 767px)': {
                          display: 'none'
                        }
                      }}>
                        {site.subcontractGuardian ? (
                          <Chip label="Y" color="primary" size="small" onClick={() => {}} />
                        ) : (
                          <Chip label="N" color="default" size="small" onClick={() => {}} />
                        )}
                      </TableCell>
                      <TableCell sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          px: 0.5
                        }
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5,
                          // 스마트폰에서만 적용
                          '@media (max-width: 767px)': {
                            gap: 0.25
                          }
                        }}>
                          <Tooltip title="수정">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEdit(site)}
                              sx={{
                                // 스마트폰에서만 적용
                                '@media (max-width: 767px)': {
                                  padding: '4px'
                                }
                              }}
                            >
                              <EditIcon sx={{
                                // 스마트폰에서만 적용
                                '@media (max-width: 767px)': {
                                  fontSize: '1rem'
                                }
                              }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="삭제">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDelete(site.id)}
                              sx={{
                                // 스마트폰에서만 적용
                                '@media (max-width: 767px)': {
                                  padding: '4px'
                                }
                              }}
                            >
                              <DeleteIcon sx={{
                                // 스마트폰에서만 적용
                                '@media (max-width: 767px)': {
                                  fontSize: '1rem'
                                }
                              }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        {/* 스마트폰 전용 페이지 번호 네비게이션 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          py: 2,
          gap: 1,
          flexWrap: 'wrap',
          // 스마트폰에서만 적용
          '@media (max-width: 767px)': {
            py: 1,
            gap: 0.5,
            px: 1
          }
        }}>
          <Button
            variant="outlined"
            disabled={page === 0}
            onClick={() => handleChangePage(null, page - 1)}
            sx={{ 
              minWidth: '40px', 
              py: 0.5,
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                minWidth: '35px',
                py: 0.25,
                fontSize: '0.8rem'
              }
            }}
          >
            이전
          </Button>
          
          {/* 페이지 번호들 - 스마트폰에서는 최대 5개만 표시 */}
          {Array.from({ length: Math.ceil(sortedSites.length / rowsPerPage) }, (_, i) => {
            // 스마트폰에서는 현재 페이지 주변 5개만 표시
            const totalPages = Math.ceil(sortedSites.length / rowsPerPage);
            const showPage = totalPages <= 5 || 
              (i >= Math.max(0, page - 2) && i <= Math.min(totalPages - 1, page + 2));
            
            if (!showPage) return null;
            
            return (
              <Button
                key={i}
                variant={page === i ? "contained" : "outlined"}
                onClick={() => handleChangePage(null, i)}
                sx={{ 
                  minWidth: '40px',
                  py: 0.5,
                  bgcolor: page === i ? '#2E7D32' : 'transparent',
                  color: page === i ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: page === i ? '#1B5E20' : 'rgba(46, 125, 50, 0.1)'
                  },
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    minWidth: '30px',
                    py: 0.25,
                    fontSize: '0.8rem'
                  }
                }}
              >
                {i + 1}
              </Button>
            );
          })}
          
          <Button
            variant="outlined"
            disabled={page >= Math.ceil(sortedSites.length / rowsPerPage) - 1}
            onClick={() => handleChangePage(null, page + 1)}
            sx={{ 
              minWidth: '40px', 
              py: 0.5,
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                minWidth: '35px',
                py: 0.25,
                fontSize: '0.8rem'
              }
            }}
          >
            다음
          </Button>
        </Box>
      </Paper>

      {/* 편집 다이얼로그 */}
      <EditDialog
        open={editDialog}
        site={selectedSite}
        onClose={handleCloseEdit}
        onSave={handleSave}
        vendors={vendors}
      />

      {/* 엑셀 업로드 다이얼로그 */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>엑셀 파일 업로드</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            • 기존 현장명과 동일한 경우 데이터가 업데이트됩니다.<br/>
            • 새로운 현장명의 경우 새 현장으로 추가됩니다.<br/>
            • 하도급지킴이와 주요현장은 'Y' 또는 'N'으로 입력하세요.<br/>
            • 날짜는 YYYY-MM-DD 형식으로 입력하세요.
          </Typography>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            style={{ marginTop: 16 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>취소</Button>
          <Button 
            onClick={handleUploadExcel} 
            variant="contained"
            disabled={!selectedFile}
          >
            업로드
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// 편집 다이얼로그 컴포넌트
const EditDialog = ({ open, site, onClose, onSave, vendors }) => {
  const [form, setForm] = useState({
    name: '',
    status: '',
    contractType: '',
    contractAmount: '',
    advance: '',
    totalProgress: '',
    address: '',
    startDate: '',
    endDate: '',
    companyName: '',
    manager: '',
    phone: '',
    team: '',
    desc: '',
    installment: '',
    subcontractGuardian: false,
    isFavorite: false
  });

  const inputRef1 = useRef();
  const inputRef2 = useRef();
  const inputRef3 = useRef();
  const inputRef4 = useRef();
  const inputRef5 = useRef();
  const inputRef6 = useRef();
  const inputRef7 = useRef();
  const inputRef8 = useRef();
  const inputRef9 = useRef();
  const inputRef10 = useRef();
  const inputRef11 = useRef();
  const inputRef12 = useRef();
  const inputRef13 = useRef();
  const inputRef14 = useRef();
  const inputRef15 = useRef();
  const inputRef16 = useRef();
  const inputRef17 = useRef();
  const inputRef18 = useRef();
  const inputRef19 = useRef();
  const inputRef20 = useRef();

  useEffect(() => {
    if (site) {
      setForm(site);
    } else {
      setForm({
        name: '',
        status: '',
        contractType: '',
        contractAmount: '',
        advance: '',
        totalProgress: '',
        address: '',
        startDate: '',
        endDate: '',
        companyName: '',
        manager: '',
        phone: '',
        team: '',
        desc: '',
        installment: '',
        subcontractGuardian: false,
        isFavorite: false
      });
    }
  }, [site]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = () => {
    onSave(form);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      sx={{
        '@media (min-width: 768px) and (max-width: 1024px)': {
          '& .MuiDialog-paper': {
            height: 'calc(100% - 30px)',
            maxHeight: 'calc(100% - 30px)'
          }
        },
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          '& .MuiDialog-paper': {
            margin: '16px',
            maxHeight: 'calc(100% - 32px)',
            height: 'calc(100% - 32px)',
            borderRadius: '12px'
          }
        }
      }}
    >
      <DialogTitle sx={{
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          fontSize: '1.2rem',
          fontWeight: 'bold',
          pb: 1
        }
      }}>
        {site ? '현장 정보 수정' : '새 현장 추가'}
      </DialogTitle>
      <DialogContent sx={{
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          px: 2,
          py: 1
        }
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2, 
          mt: 2,
          // 스마트폰에서만 적용
          '@media (max-width: 767px)': {
            gap: 1.5,
            mt: 1
          }
        }}>
          {/* 스마트폰에서는 세로 배치 */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              gap: 1.5
            }
          }}>
            <TextField
              name="name"
              label="현장명"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              inputRef={inputRef1}
              onFocus={scrollFocus(inputRef1)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
            <FormControl fullWidth>
              <Select 
                name="status" 
                value={form.status} 
                onChange={handleChange}
                sx={{
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    '& .MuiSelect-select': {
                      fontSize: '0.9rem'
                    }
                  }
                }}
              >
                {STATUS_OPTIONS.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              gap: 1.5
            }
          }}>
            <FormControl fullWidth>
              <Select 
                name="contractType" 
                value={form.contractType} 
                onChange={handleChange}
                sx={{
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    '& .MuiSelect-select': {
                      fontSize: '0.9rem'
                    }
                  }
                }}
              >
                {CONTRACT_TYPE_OPTIONS.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="installment"
              label="차수"
              value={form.installment}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef2}
              onFocus={scrollFocus(inputRef2)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
          </Box>

          {/* 스마트폰에서는 세로 배치 */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              gap: 1.5
            }
          }}>
            <TextField
              name="contractAmount"
              label="계약금액"
              value={form.contractAmount}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef3}
              onFocus={scrollFocus(inputRef3)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
            <TextField
              name="advance"
              label="선급금"
              value={form.advance}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef4}
              onFocus={scrollFocus(inputRef4)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
            <TextField
              name="totalProgress"
              label="누계기성"
              value={form.totalProgress}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef5}
              onFocus={scrollFocus(inputRef5)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
          </Box>

          <TextField
            name="address"
            label="주소"
            value={form.address}
            onChange={handleChange}
            fullWidth
            inputRef={inputRef6}
            onFocus={scrollFocus(inputRef6)}
            sx={{
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                '& .MuiInputBase-input': {
                  fontSize: '0.9rem'
                }
              }
            }}
          />

          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              gap: 1.5
            }
          }}>
            <TextField
              name="startDate"
              label="착공일"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputRef={inputRef7}
              onFocus={scrollFocus(inputRef7)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
            <TextField
              name="endDate"
              label="준공예정일"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputRef={inputRef8}
              onFocus={scrollFocus(inputRef8)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
          </Box>

          {/* 스마트폰에서는 세로 배치 */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              gap: 1.5
            }
          }}>
            <Autocomplete
              options={vendors.map(vendor => vendor.companyName)}
              value={form.companyName}
              onChange={(event, newValue) => {
                const e = { target: { name: 'companyName', value: newValue || '' } };
                handleChange(e);
              }}
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="회사명 (거래처 선택 또는 입력)"
                  inputRef={inputRef9}
                  onFocus={scrollFocus(inputRef9)}
                  sx={{
                    // 스마트폰에서만 적용
                    '@media (max-width: 767px)': {
                      '& .MuiInputBase-input': {
                        fontSize: '0.9rem'
                      }
                    }
                  }}
                />
              )}
            />
            <TextField
              name="manager"
              label="소장"
              value={form.manager}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef10}
              onFocus={scrollFocus(inputRef10)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
            <TextField
              name="phone"
              label="연락처"
              value={form.phone}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef11}
              onFocus={scrollFocus(inputRef11)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
          </Box>

          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              gap: 1.5
            }
          }}>
            <TextField
              name="team"
              label="시공팀"
              value={form.team}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef12}
              onFocus={scrollFocus(inputRef12)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
            <TextField
              name="desc"
              label="기타사항"
              value={form.desc}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              inputRef={inputRef13}
              onFocus={scrollFocus(inputRef13)}
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiInputBase-input': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
          </Box>

          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' },
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              gap: 1.5
            }
          }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="subcontractGuardian"
                  checked={form.subcontractGuardian}
                  onChange={handleChange}
                />
              }
              label="하도급지킴이"
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="isFavorite"
                  checked={form.isFavorite}
                  onChange={handleChange}
                />
              }
              label="주요현장"
              sx={{
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.9rem'
                  }
                }
              }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          px: 2,
          py: 1,
          gap: 1
        }
      }}>
        <Button 
          onClick={onClose}
          sx={{
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              fontSize: '0.9rem',
              py: 1
            }
          }}
        >
          취소
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          sx={{
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              fontSize: '0.9rem',
              py: 1,
              bgcolor: '#2E7D32',
              '&:hover': {
                bgcolor: '#1B5E20'
              }
            }
          }}
        >
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WholeList; 