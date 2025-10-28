import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  useTheme,
  useMediaQuery,
  TableRow,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Pagination,
  Checkbox,
  Box as MuiBox,
  Container,
  InputAdornment
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import BiddingAnalysisChart from '../components/BiddingAnalysisChart';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Business as BusinessIcon,
  OpenInNew as OpenInNewIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const Vendors = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [vendors, setVendors] = useState([]);
  const [registeredCompanies, setRegisteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    bidDate: '',
    siteName: '',
    winningCompany: '', // 낙찰회사 추가
    amount: '',
    item: '',
    quantity: '',
    note: '',
    contractStatus: '미수주', // 수주여부 추가
    companyTypes: ['AL창호'] // 업종 추가
  });
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDateFilter, setStartDateFilter] = useState(''); // 시작일 필터
  const [endDateFilter, setEndDateFilter] = useState(''); // 종료일 필터
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  
  // 업체 등록 관련 상태
  const [companyFormData, setCompanyFormData] = useState({
    companyName: '',
    companyTypes: ['AL창호'] // 배열로 변경하여 다중 선택 가능
  });
  
  // 업체 수정 관련 상태
  const [editingCompany, setEditingCompany] = useState(null);
  
  // 업종별 업체 목록 팝업 상태
  const [companyListDialogOpen, setCompanyListDialogOpen] = useState(false);
  const [selectedCompanyType, setSelectedCompanyType] = useState('');
  
  // 업종별 필터링 상태
  const [filteredByCompanyType, setFilteredByCompanyType] = useState('천우건업(주)'); // 입찰현황 페이지 - 천우건업(주) 기본값
  
  // 인라인 편집 상태
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [hasUpdatedCreatedAt, setHasUpdatedCreatedAt] = useState(false);
  
  // 정렬 상태
  const [sortField, setSortField] = useState('bidDate');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // 정렬 함수
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 업종별 칩 색상 정의
  const getCompanyTypeColor = (type) => {
    switch (type) {
      case 'AL창호':
        return 'primary';
      case 'PL창호':
        return 'secondary';
      case '종합건설':
        return 'success';
      case '천우건업(주)':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // 업종별 통계 계산
  const getCompanyTypeStats = () => {
    const stats = {
      '천우건업(주)': 0,
      '종합건설': 0,
      'AL창호': 0,
      'PL창호': 0
    };

    registeredCompanies.forEach(company => {
      const types = company.companyTypes || [company.companyType] || [];
      types.forEach(type => {
        if (stats.hasOwnProperty(type)) {
          stats[type]++;
        }
      });
    });

    return stats;
  };

  // 최근 업로드 날짜 계산
  const getLatestUploadDate = () => {
    if (vendors.length === 0) return null;
    
    const uploadVendors = vendors.filter(vendor => vendor.note === '관급');
    if (uploadVendors.length === 0) return null;
    
    const uploadDates = uploadVendors
      .map(vendor => {
        if (vendor.createdAt) {
          // Firestore Timestamp 객체인 경우
          if (vendor.createdAt.toDate) {
            return vendor.createdAt.toDate();
          }
          // 일반 Date 객체나 문자열인 경우
          return new Date(vendor.createdAt);
        }
        return null;
      })
      .filter(date => date !== null && !isNaN(date.getTime()));
    
    // createdAt이 없는 기존 데이터가 있으면 지난주 토요일(2025-08-23)로 추정
    if (uploadDates.length === 0 && uploadVendors.length > 0) {
      // 지난주 토요일 날짜 (2025년 8월 23일)
      return new Date('2025-08-23');
    }
    
    if (uploadDates.length === 0) return null;
    
    return new Date(Math.max(...uploadDates.map(date => date.getTime())));
  };

  // 최신 등록 날짜 계산
  const getLatestRegistrationDate = () => {
    if (vendors.length === 0) return null;
    
    // 수동 등록된 데이터 (비고가 '관급'이 아닌 데이터)
    const registrationVendors = vendors.filter(vendor => vendor.note !== '관급');
    if (registrationVendors.length === 0) return null;
    
    const registrationDates = registrationVendors
      .map(vendor => {
        if (vendor.createdAt) {
          // Firestore Timestamp 객체인 경우
          if (vendor.createdAt.toDate) {
            return vendor.createdAt.toDate();
          }
          // 일반 Date 객체나 문자열인 경우
          return new Date(vendor.createdAt);
        }
        return null;
      })
      .filter(date => date !== null && !isNaN(date.getTime()));
    
    if (registrationDates.length === 0) return null;
    
    return new Date(Math.max(...registrationDates.map(date => date.getTime())));
  };

  // 수동 등록 데이터 개수 계산
  const getRegistrationCount = () => {
    return vendors.filter(vendor => vendor.note !== '관급').length;
  };

  // 업로드 데이터 개수 계산
  const getUploadCount = () => {
    return vendors.filter(vendor => vendor.note === '관급').length;
  };

  // 특정 업종의 업체들 필터링
  const getCompaniesByType = (type) => {
    return registeredCompanies.filter(company => {
      const types = company.companyTypes || [company.companyType] || [];
      return types.includes(type);
    });
  };

  // 업종별 카드 클릭 핸들러 (테이블 필터링)
  const handleCompanyTypeCardClick = (type) => {
    setFilteredByCompanyType(type);
    setCurrentPage(1); // 첫 페이지로 이동
  };
  
  // 업종별 카드 더블클릭 핸들러 (업체목록 팝업)
  const handleCompanyTypeCardDoubleClick = (type) => {
    setSelectedCompanyType(type);
    setCompanyListDialogOpen(true);
  };
  
  // 제목 클릭 핸들러 (필터 초기화)
  const handleTitleClick = () => {
    setFilteredByCompanyType('');
    setCurrentPage(1);
  };



  // 금액 천단위 쉼표 포맷팅
  const formatAmount = (amount) => {
    if (!amount) return '0';
    const num = parseFloat(amount.toString().replace(/,/g, ''));
    if (isNaN(num)) return '0';
    return num.toLocaleString();
  };

  // 날짜 포맷팅 (YYYY/MM/DD)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Firestore Timestamp 객체인 경우
      if (dateString && typeof dateString === 'object' && dateString.toDate) {
        const date = dateString.toDate();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
      }
      
      // 문자열로 변환
      const dateStr = dateString.toString();
      
      // 이미 YYYY/MM/DD 형식인 경우 그대로 반환
      if (dateStr.includes('/') && dateStr.length === 10) {
        return dateStr;
      }
      
      // YYYY-MM-DD 형식인 경우 / 로 변경
      if (dateStr.includes('-') && dateStr.length === 10) {
        return dateStr.replace(/-/g, '/');
      }
      
      // 숫자만 있는 경우 (YYYYMMDD)
      if (/^\d{8}$/.test(dateStr)) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}/${month}/${day}`;
      }
      
      // 엑셀 시리얼 번호인 경우 (5자리 숫자)
      if (/^\d{5}$/.test(dateStr)) {
        try {
          // 엑셀 시리얼 번호를 날짜로 변환 (1900-01-01부터의 일수)
          const excelEpoch = new Date(1900, 0, 1);
          const days = parseInt(dateStr) - 2; // 엑셀의 1900년 오류 보정
          const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
          
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}/${month}/${day}`;
        } catch (error) {
          console.warn('엑셀 시리얼 번호 변환 오류:', error, '원본 데이터:', dateStr);
          return '';
        }
      }
      
      // 일반적인 날짜 변환
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in formatDate:', dateString);
        return '';
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error, '원본 데이터:', dateString);
      return '';
    }
  };

  // 업체의 구분(업종) 가져오기
  const getCompanyType = (companyName) => {
    const company = registeredCompanies.find(c => c.companyName === companyName);
    if (!company) return '';
    
    const types = company.companyTypes || [company.companyType] || [];
    return types.join(', ');
  };

  useEffect(() => {
    loadData();
  }, []);

  // 검색어 변경 시 첫 페이지로 이동하고 선택 상태 초기화
  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]);
    setSelectAll(false);
  }, [searchTerm, filteredByCompanyType]);

  // 페이지 변경 시 선택 상태 초기화
  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
  }, [currentPage]);

  // 선택된 항목이 변경될 때 selectAll 상태 업데이트
  useEffect(() => {
    const allVendors = getSortedVendors();
    const allSelected = allVendors.length > 0 && 
      allVendors.every(vendor => selectedItems.includes(vendor.id));
    setSelectAll(allSelected);
  }, [selectedItems, vendors, searchTerm, filteredByCompanyType]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchVendors(), fetchRegisteredCompanies()]);
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
      console.error('데이터 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      console.log('입찰현황 데이터 로딩 시작...');
      const querySnapshot = await getDocs(collection(db, 'bids'));
      const vendorList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('입찰현황 데이터 로딩 완료:', vendorList.length, '개');
      console.log('로딩된 데이터:', vendorList);
      setVendors(vendorList);
    } catch (error) {
      console.error('입찰현황 데이터 로딩 오류:', error);
      throw error;
    }
  };

  const fetchRegisteredCompanies = async () => {
    try {
      console.log('등록업체 데이터 로딩 시작...');
      const querySnapshot = await getDocs(collection(db, 'registeredCompanies'));
      const companyList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('등록업체 데이터 로딩 완료:', companyList.length, '개');
      setRegisteredCompanies(companyList);
    } catch (error) {
      console.error('등록업체 데이터 로딩 오류:', error);
      throw error;
    }
  };

  const handleOpen = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      // 기존 업체의 업종 정보 가져오기
      const existingCompany = registeredCompanies.find(c => c.companyName === vendor.companyName);
      const companyTypes = existingCompany ? (existingCompany.companyTypes || [existingCompany.companyType] || ['AL창호']) : ['AL창호'];
      
      setFormData({
        companyName: vendor.companyName || '',
        bidDate: vendor.bidDate || '',
        siteName: vendor.siteName || '',
        winningCompany: vendor.winningCompany || '', // 낙찰회사 추가
        amount: vendor.amount || '',
        item: vendor.item || '',
        quantity: vendor.quantity || '',
        note: vendor.note || '',
        contractStatus: vendor.contractStatus || '미수주',
        companyTypes: companyTypes
      });
    } else {
      setEditingVendor(null);
      setFormData({
        companyName: '',
        bidDate: '',
        siteName: '',
        winningCompany: '', // 낙찰회사 추가
        amount: '',
        item: '',
        quantity: '',
        note: '',
        contractStatus: '미수주',
        companyTypes: filteredByCompanyType === '천우건업(주)' ? ['천우건업(주)'] : ['AL창호'],
        // 천우건업(주) 전용 필드들
        bidRate: '',
        bidAmount: '',
        resultRank: '',
        winningAmount: '',
        winningRate: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingVendor(null);
    // formData 초기화
    setFormData({
      companyName: '',
      bidDate: '',
      siteName: '',
      winningCompany: '',
      amount: '',
      item: '',
      quantity: '',
      note: '',
      contractStatus: '미수주',
      companyTypes: ['AL창호'],
      // 천우건업(주) 전용 필드들
      bidRate: '',
      bidAmount: '',
      resultRank: '',
      winningAmount: '',
      winningRate: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (filteredByCompanyType !== '천우건업(주)' && !formData.companyName.trim()) {
      alert('업체명을 입력해주세요.');
      return;
    }
    if (!formData.bidDate) {
      alert(filteredByCompanyType === '천우건업(주)' ? '투찰일자를 입력해주세요.' : '낙찰일을 입력해주세요.');
      return;
    }
    if (!formData.siteName.trim()) {
      alert('현장명을 입력해주세요.');
      return;
    }
    if (filteredByCompanyType !== '천우건업(주)' && formData.companyTypes.length === 0) {
      alert('최소 하나의 업종을 선택해주세요.');
      return;
    }
    
    try {
      if (editingVendor) {
        await updateDoc(doc(db, 'bids', editingVendor.id), {
          ...formData,
          updatedAt: new Date()
        });
        alert('거래처가 성공적으로 수정되었습니다.');
      } else {
        await addDoc(collection(db, 'bids'), {
          ...formData,
          createdAt: new Date()
        });
        
        // 새로 등록한 업체를 registeredCompanies에도 추가
        const existingCompany = registeredCompanies.find(c => c.companyName === formData.companyName);
        if (!existingCompany) {
          await addDoc(collection(db, 'registeredCompanies'), {
            companyName: formData.companyName,
            companyTypes: formData.companyTypes,
            createdAt: new Date()
          });
          console.log('새 업체가 registeredCompanies에 추가되었습니다:', formData.companyName);
        }
        
        alert('거래처가 성공적으로 등록되었습니다.');
      }
      
      // 데이터 새로고침 후 팝업 닫기
      await Promise.all([fetchVendors(), fetchRegisteredCompanies()]);
      handleClose();
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    const companyTypes = vendor.companyTypes || [vendor.companyType] || [];
    setFormData({
      companyName: vendor.companyName || '',
      bidDate: vendor.bidDate || '',
      siteName: vendor.siteName || '',
      winningCompany: vendor.winningCompany || '',
      amount: vendor.amount || '',
      quantity: vendor.quantity || '',
      note: vendor.note || '',
      contractStatus: vendor.contractStatus || '미수주',
      companyTypes: companyTypes,
      // 천우건업(주) 전용 필드들
      bidRate: vendor.bidRate || '',
      bidAmount: vendor.bidAmount || '',
      resultRank: vendor.resultRank || '',
      winningAmount: vendor.winningAmount || '',
      winningRate: vendor.winningRate || ''
    });
    setOpen(true);
  };

  const handleDelete = async (vendorId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'bids', vendorId));
        fetchVendors();
      } catch (error) {
        console.error('Error deleting vendor:', error);
      }
    }
  };

  const handleContractStatusToggle = async (vendorId, currentStatus) => {
    const newStatus = currentStatus === '미수주' ? '수주' : '미수주';
    
    try {
      await updateDoc(doc(db, 'bids', vendorId), {
        contractStatus: newStatus
      });
      
      // 로컬 상태 업데이트
      setVendors(prev => prev.map(vendor => 
        vendor.id === vendorId 
          ? { ...vendor, contractStatus: newStatus }
          : vendor
      ));
    } catch (error) {
      console.error('수주여부 변경 오류:', error);
      alert('수주여부 변경 중 오류가 발생했습니다.');
    }
  };

  // 인라인 편집 시작
  const handleInlineEditStart = (vendorId, field, currentValue) => {
    setEditingField(`${vendorId}-${field}`);
    setEditingValue(currentValue || '');
  };

  // 인라인 편집 저장
  const handleInlineEditSave = async (vendorId, field) => {
    try {
      const updateData = { [field]: editingValue };
      await updateDoc(doc(db, 'bids', vendorId), updateData);
      setEditingField(null);
      setEditingValue('');
      fetchVendors();
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  // 인라인 편집 취소
  const handleInlineEditCancel = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        // 수정
        await updateDoc(doc(db, 'registeredCompanies', editingCompany.id), {
          ...companyFormData,
          updatedAt: new Date()
        });
      } else {
        // 추가
        await addDoc(collection(db, 'registeredCompanies'), {
          ...companyFormData,
          createdAt: new Date()
        });
      }
      setCompanyFormData({ companyName: '', companyTypes: ['AL창호'] });
      setEditingCompany(null);
      setCompanyDialogOpen(false);
      fetchRegisteredCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
    }
  };

  const handleCompanyEdit = (company) => {
    setEditingCompany(company);
    setCompanyFormData({
      companyName: company.companyName,
      companyTypes: company.companyTypes || [company.companyType] || ['AL창호'] // 기존 단일 타입 호환성
    });
    setCompanyDialogOpen(true);
  };

  const handleCompanyDelete = async (companyId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'registeredCompanies', companyId));
        fetchRegisteredCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  const handleCompanyDialogClose = () => {
    setCompanyDialogOpen(false);
    setEditingCompany(null);
    setCompanyFormData({ companyName: '', companyTypes: ['AL창호'] });
  };

  const handleCompanyTypeToggle = (type) => {
    setCompanyFormData(prev => ({
      ...prev,
      companyTypes: prev.companyTypes.includes(type)
        ? prev.companyTypes.filter(t => t !== type)
        : [...prev.companyTypes, type]
    }));
  };

  // 거래처 등록 팝업용 업종 토글 핸들러
  const handleVendorCompanyTypeToggle = (type) => {
    setFormData(prev => ({
      ...prev,
      companyTypes: prev.companyTypes.includes(type)
        ? prev.companyTypes.filter(t => t !== type)
        : [...prev.companyTypes, type]
    }));
  };

  const handleDownload = () => {
    const data = vendors.map((vendor, index) => ({
      'NO.': index + 1,
      '구분': getCompanyType(vendor.companyName) || '',
      '업체명': vendor.companyName || '',
      '낙찰일': formatDate(vendor.bidDate) || '',
      '현장명': vendor.siteName || '',
      '낙찰회사': vendor.winningCompany || '', // 낙찰회사 추가
      '금액': formatAmount(vendor.amount) || '',
      '품목': vendor.item || '',
      '물량': vendor.quantity || '',
      '비고': vendor.note || '',
      '수주여부': vendor.contractStatus || '미수주'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '입찰현황');
    XLSX.writeFile(wb, `입찰현황_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 9행부터 데이터 읽기 (헤더 제외)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          range: 8, // 0부터 시작하므로 9행은 인덱스 8
          header: 1 // 첫 번째 행을 헤더로 사용하지 않고 인덱스로 처리
        });

        // 등록된 회사명 목록
        const registeredCompanyNames = registeredCompanies.map(company => company.companyName);

        // T열(업체명), V열(현장명), AK열(금액), AA열(날짜)에서 데이터 추출
        const vendorsToAdd = [];
        const uniqueCombinations = new Set(); // 중복 제거용
        const duplicateItems = []; // 중복된 항목 추적
        const updatedItems = []; // 업데이트된 항목 추적

        jsonData.forEach(row => {
          // T열(19), V열(21), AK열(36), AA열(26) - 0부터 시작하는 인덱스
          const companyName = row[19] || ''; // T열
          const siteName = row[21] || '';    // V열
          
          // 등록된 회사만 필터링
          if (companyName && siteName && registeredCompanyNames.includes(companyName)) {
            const combination = `${companyName}-${siteName}`;
            
            if (!uniqueCombinations.has(combination)) {
              uniqueCombinations.add(combination);
              
              // 같은 회사, 같은 현장의 금액 합산
              const sameCompanySiteData = jsonData.filter(item => 
                item[19] === companyName && // T열
                item[21] === siteName       // V열
              );
              
              const totalAmount = sameCompanySiteData.reduce((sum, item) => {
                const amount = parseFloat(item[36] || 0) || 0; // AK열
                return sum + amount;
              }, 0);

              // 가장 최근 날짜 찾기
              const dates = sameCompanySiteData
                .map(item => item[26]) // AA열
                .filter(date => date)
                .sort((a, b) => new Date(b) - new Date(a));
              
              const latestDate = dates[0] || '';

              // 기존 데이터에서 중복 확인
              const existingVendor = vendors.find(v => 
                v.companyName === companyName && 
                v.siteName === siteName
              );

              if (existingVendor) {
                // 중복된 경우: 기존 데이터를 업데이트할지 물어보기
                duplicateItems.push({
                  companyName,
                  siteName,
                  existingAmount: existingVendor.amount,
                  newAmount: totalAmount.toString(),
                  existingDate: existingVendor.bidDate,
                  newDate: latestDate,
                  vendorId: existingVendor.id
                });
              } else {
                // 새로운 데이터
                vendorsToAdd.push({
                  companyName: companyName,
                  siteName: siteName,
                  winningCompany: '', // 낙찰회사 추가
                  amount: totalAmount.toString(),
                  bidDate: latestDate,
                  item: '',
                  quantity: '',
                  note: '관급', // 업로드한 데이터는 비고에 "관급" 표시
                  contractStatus: '미수주',
                  createdAt: new Date() // 현재 날짜로 업로드 날짜 설정
                });
              }
            }
          }
        });

        // 중복 처리 확인
        if (duplicateItems.length > 0) {
          const duplicateMessage = duplicateItems.map(item => 
            `• ${item.companyName} - ${item.siteName}\n  기존: ${item.existingAmount}원 (${item.existingDate})\n  신규: ${item.newAmount}원 (${item.newDate})`
          ).join('\n\n');
          
          const shouldUpdate = window.confirm(
            `다음 ${duplicateItems.length}개 항목이 이미 존재합니다.\n\n${duplicateMessage}\n\n기존 데이터를 새 데이터로 업데이트하시겠습니까?\n\n'확인': 기존 데이터 업데이트\n'취소': 중복 항목 무시하고 새 항목만 추가`
          );

          if (shouldUpdate) {
            // 기존 데이터 업데이트
            for (const item of duplicateItems) {
              try {
                const vendorRef = doc(db, 'bids', item.vendorId);
                await updateDoc(vendorRef, {
                  amount: item.newAmount,
                  bidDate: item.newDate,
                  note: '관급 (업데이트됨)',
                  updatedAt: new Date()
                });
                updatedItems.push(item);
              } catch (error) {
                console.error(`업데이트 실패: ${item.companyName} - ${item.siteName}`, error);
              }
            }
          }
        }

        // 새로운 데이터 추가
        for (const vendor of vendorsToAdd) {
          await addDoc(collection(db, 'bids'), vendor);
        }

        // 결과 메시지
        let resultMessage = '';
        if (vendorsToAdd.length > 0) {
          resultMessage += `${vendorsToAdd.length}개의 새로운 입찰현황 데이터가 추가되었습니다.`;
        }
        if (updatedItems.length > 0) {
          resultMessage += `\n${updatedItems.length}개의 기존 데이터가 업데이트되었습니다.`;
        }
        if (duplicateItems.length > 0 && updatedItems.length === 0) {
          resultMessage += `\n${duplicateItems.length}개의 중복 항목이 무시되었습니다.`;
        }
        
        alert(resultMessage || '업로드할 새로운 데이터가 없습니다.');
        fetchVendors();
        setUploadDialogOpen(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    }
  };

  // 중복 데이터 제거 함수
  const handleRemoveDuplicates = async () => {
    if (vendors.length === 0) {
      alert('제거할 데이터가 없습니다.');
      return;
    }

    // 중복 찾기 (업체명 + 현장명 조합으로)
    const duplicateGroups = {};
    const duplicatesToRemove = [];

    vendors.forEach(vendor => {
      const key = `${vendor.companyName}-${vendor.siteName}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(vendor);
    });

    // 2개 이상인 그룹에서 중복 찾기
    Object.values(duplicateGroups).forEach(group => {
      if (group.length > 1) {
        // 가장 최근 데이터를 남기고 나머지 제거
        const sortedGroup = group.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA; // 최신순 정렬
        });
        
        // 첫 번째(최신)를 제외하고 나머지를 중복으로 처리
        duplicatesToRemove.push(...sortedGroup.slice(1));
      }
    });

    if (duplicatesToRemove.length === 0) {
      alert('중복된 데이터가 없습니다.');
      return;
    }

    // 중복 항목 정보 표시
    const duplicateMessage = duplicatesToRemove.map(item => 
      `• ${item.companyName} - ${item.siteName} (${item.amount}원, ${formatDate(item.bidDate)})`
    ).join('\n');

    const shouldRemove = window.confirm(
      `${duplicatesToRemove.length}개의 중복 데이터를 발견했습니다.\n\n${duplicateMessage}\n\n가장 최근 데이터를 남기고 나머지를 삭제하시겠습니까?`
    );

    if (!shouldRemove) return;

    try {
      // 중복 데이터 삭제
      for (const duplicate of duplicatesToRemove) {
        await deleteDoc(doc(db, 'bids', duplicate.id));
      }

      alert(`${duplicatesToRemove.length}개의 중복 데이터가 삭제되었습니다.`);
      await fetchVendors(); // 데이터 새로고침
    } catch (error) {
      console.error('중복 데이터 삭제 오류:', error);
      alert('중복 데이터 삭제 중 오류가 발생했습니다.');
    }
  };


  const getSortedVendors = () => {
    // 전체 데이터에서 검색어 필터링
    let filteredVendors = vendors.filter(vendor => 
      !searchTerm || 
      vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.winningCompany?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.item?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // 날짜 필터링 추가
    filteredVendors = filteredVendors.filter(vendor => {
      // 시작일 필터링
      const matchesStartDate = !startDateFilter || 
        (vendor.bidDate && vendor.bidDate >= startDateFilter);
      
      // 종료일 필터링
      const matchesEndDate = !endDateFilter || 
        (vendor.bidDate && vendor.bidDate <= endDateFilter);
      
      return matchesStartDate && matchesEndDate;
    });
    
    // 업종별 필터링 (임시 비활성화)
    if (filteredByCompanyType) {
      console.log('업종별 필터링 적용됨:', filteredByCompanyType);
      filteredVendors = filteredVendors.filter(vendor => {
        const company = registeredCompanies.find(c => c.companyName === vendor.companyName);
        if (!company) {
          console.log('업체를 찾을 수 없음:', vendor.companyName);
          // 임시로 모든 데이터를 표시하도록 수정
          return true;
        }
        
        const types = company.companyTypes || [company.companyType] || [];
        const hasType = types.includes(filteredByCompanyType);
        console.log('업체 필터링:', vendor.companyName, '타입:', types, '필터:', filteredByCompanyType, '결과:', hasType);
        return hasType;
      });
    }

    console.log('=== 정렬 시작 ===');
    console.log('전체 데이터 수:', vendors.length);
    console.log('필터링된 데이터 수:', filteredVendors.length);
    console.log('정렬 필드:', sortField, '정렬 방향:', sortDirection);

    // 전체 데이터를 정렬 (페이지네이션과 무관)
    const sortedVendors = filteredVendors.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      // 구분 필드 처리
      if (sortField === 'companyType') {
        aValue = getCompanyType(a.companyName);
        bValue = getCompanyType(b.companyName);
      }

      // 숫자 필드 처리 (금액, 물량)
      if (sortField === 'amount' || sortField === 'quantity') {
        aValue = parseFloat(aValue.toString().replace(/[^\d.-]/g, '')) || 0;
        bValue = parseFloat(bValue.toString().replace(/[^\d.-]/g, '')) || 0;
      }

      // 날짜 필드 처리
      if (sortField === 'bidDate') {
        console.log('날짜 정렬:', aValue, 'vs', bValue);
        
        // 0000/00/00 형식은 가장 앞으로 (오름차순) 또는 가장 뒤로 (내림차순)
        if (aValue === '0000/00/00' && bValue === '0000/00/00') return 0;
        if (aValue === '0000/00/00') return sortDirection === 'asc' ? -1 : 1;
        if (bValue === '0000/00/00') return sortDirection === 'asc' ? 1 : -1;
        
        // 빈 값은 맨 뒤로
        if (!aValue || aValue === '') return 1;
        if (!bValue || bValue === '') return -1;
        
        // 문자열 비교로 날짜 정렬 (YYYY/MM/DD 형식은 문자열 비교로도 정렬 가능)
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }

      // 문자열 비교
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      } else {
        if (aValue > bValue) return -1;
        if (aValue < bValue) return 1;
        return 0;
      }
    });

    console.log('=== 정렬 완료 ===');
    console.log('정렬된 데이터 수:', sortedVendors.length);
    console.log('정렬된 데이터 샘플:', sortedVendors.slice(0, 3).map(v => ({ 
      companyName: v.companyName, 
      bidDate: v.bidDate,
      [sortField]: v[sortField] 
    })));

    return sortedVendors;
  };

  // 페이지네이션을 적용한 데이터 가져오기
  const getPaginatedVendors = () => {
    // 1. 전체 데이터를 정렬
    const sortedVendors = getSortedVendors();
    
    // 2. 정렬된 전체 데이터에서 현재 페이지 부분만 추출
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedVendors = sortedVendors.slice(startIndex, endIndex);
    
    console.log('=== 페이지네이션 ===');
    console.log('전체 정렬된 데이터 수:', sortedVendors.length);
    console.log('현재 페이지:', currentPage);
    console.log('페이지당 항목 수:', itemsPerPage);
    console.log('시작 인덱스:', startIndex, '끝 인덱스:', endIndex);
    console.log('현재 페이지 데이터 수:', paginatedVendors.length);
    console.log('현재 페이지 데이터:', paginatedVendors);
    
    return paginatedVendors;
  };

  // 총 페이지 수 계산
  const getTotalPages = () => {
    const totalItems = getSortedVendors().length;
    return Math.ceil(totalItems / itemsPerPage);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= getTotalPages()) {
      setCurrentPage(newPage);
    }
  };

  // 체크박스 관련 핸들러들
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      // 전체 리스트의 모든 항목 선택 (페이지별이 아닌)
      const allVendors = getSortedVendors();
      setSelectedItems(allVendors.map(vendor => vendor.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectItem = (vendorId) => {
    setSelectedItems(prev => {
      if (prev.includes(vendorId)) {
        return prev.filter(id => id !== vendorId);
      } else {
        return [...prev, vendorId];
      }
    });
  };

  // 선택된 항목들 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (window.confirm(`선택된 ${selectedItems.length}개의 항목을 정말 삭제하시겠습니까?`)) {
      try {
        // 선택된 모든 항목 삭제
        const deletePromises = selectedItems.map(vendorId => 
          deleteDoc(doc(db, 'bids', vendorId))
        );
        
        await Promise.all(deletePromises);
        
        // 상태 초기화
        setSelectedItems([]);
        setSelectAll(false);
        
        // 데이터 새로고침
        fetchVendors();
        
        alert(`${selectedItems.length}개의 항목이 성공적으로 삭제되었습니다.`);
      } catch (error) {
        console.error('일괄 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 검색어 초기화
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // 날짜 필터 초기화
  const handleClearDateFilter = () => {
    setStartDateFilter('');
    setEndDateFilter('');
  };

  // 전체 필터 초기화
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSelectedItems([]);
    setSelectAll(false);
  };

  // 로딩 중이면 스피너 표시
  if (loading) {
    return (
      <Box sx={{ p: 3, marginTop: '64px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  // 에러가 있으면 에러 메시지 표시
  if (error) {
    return (
      <Box sx={{ p: 3, marginTop: '64px' }}>
        <Typography variant="h6" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button variant="contained" onClick={loadData}>
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative',
      pt: isMobile ? 5.5 : 5.5
    }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: 2,
          pb: 3,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%'
        }}
      >
        <Box sx={{ 
          p: 3, 
          pb: '60px',
          borderRadius: 2,
          boxShadow: 3,
          bgcolor: 'background.paper'
        }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              cursor: 'pointer',
              '&:hover': { 
                color: 'primary.main',
                textDecoration: 'underline'
              }
            }}
            onClick={handleTitleClick}
          >
            전자입찰현황
            {filteredByCompanyType && (
              <Chip 
                label={`${filteredByCompanyType} 필터링됨`} 
                size="small" 
                sx={{ 
                  ml: 1, 
                  fontSize: '0.7rem',
                  backgroundColor: filteredByCompanyType === '천우건업(주)' ? '#9c27b0' : undefined,
                  color: filteredByCompanyType === '천우건업(주)' ? 'white' : undefined,
                  '&:hover': filteredByCompanyType === '천우건업(주)' ? {
                    backgroundColor: '#7b1fa2'
                  } : undefined
                }}
                color={filteredByCompanyType === '천우건업(주)' ? undefined : "primary"}
              />
            )}
          </Typography>
          
          {/* 하이퍼링크 버튼들 */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNewIcon />}
            onClick={() => window.open('https://www.igunsul.net/', '_blank')}
            sx={{ 
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': { 
                borderColor: '#1565c0',
                bgcolor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            아이건설넷
          </Button>
          
                            <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => window.open('https://data.g2b.go.kr/index.do?w2xPath=/kn/layout/nara/popupLayout.xml&w2xHome=/kn/layout/nara/', '_blank')}
                    sx={{ 
                      borderColor: '#2e7d32',
                      color: '#2e7d32',
                      '&:hover': { 
                        borderColor: '#1b5e20',
                        bgcolor: 'rgba(46, 125, 50, 0.04)'
                      }
                    }}
                  >
                    관급조달
                  </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {selectedItems.length > 0 && (
            <Button
              variant="contained"
              color="error"
              onClick={handleBulkDelete}
              startIcon={<DeleteIcon />}
              size="small"
            >
              선택 삭제 ({selectedItems.length})
            </Button>
          )}
          <IconButton onClick={() => setCompanyDialogOpen(true)} title="업체명 등록">
            <BusinessIcon />
          </IconButton>
          <IconButton onClick={() => setUploadDialogOpen(true)} title="파일 업로드">
            <UploadIcon />
          </IconButton>
          <IconButton onClick={handleRemoveDuplicates} title="중복 데이터 제거">
            <DeleteSweepIcon />
          </IconButton>
          <IconButton onClick={handleDownload}>
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={() => handleOpen()}>
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 업종별 통계 */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Grid container spacing={1} sx={{ flex: 1 }}>
          {Object.entries(getCompanyTypeStats()).map(([type, count]) => (
            <Grid item xs={12} key={type}>
              {type === '천우건업(주)' ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Chip 
                    label={type}
                    onClick={() => handleCompanyTypeCardClick(type)}
                    sx={{ 
                      fontWeight: 'bold', 
                      fontSize: '1rem', 
                      px: 2, 
                      py: 1,
                      borderRadius: '8px', // 네모 형태로 각을 살짝 둥글게
                      backgroundColor: '#9c27b0', // 보라색 배경
                      color: 'white', // 흰색 텍스트
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#7b1fa2' // 호버 시 더 진한 보라색
                      },
                      '& .MuiChip-label': {
                        borderRadius: '6px'
                      }
                    }}
                  />
                </Box>
              ) : (
                <Card 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    border: 1, 
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: getCompanyTypeColor(type) === 'primary' ? 'primary.main' :
                                  getCompanyTypeColor(type) === 'secondary' ? 'secondary.main' :
                                  'success.main',
                      boxShadow: 2,
                      transform: 'translateY(-2px)'
                    }
                  }}
                  onClick={() => handleCompanyTypeCardClick(type)}
                  onDoubleClick={() => handleCompanyTypeCardDoubleClick(type)}
                >
                  <CardContent sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    py: 1,
                    px: 2,
                    '&:last-child': { pb: 1 }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={type}
                        color={getCompanyTypeColor(type)}
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        업체
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary', ml: 1 }}>
                        {count}개
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Grid>
          ))}
          </Grid>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', ml: 2, whiteSpace: 'nowrap' }}>
            클릭: 테이블 필터링 | 더블클릭: 업체 목록 팝업 | 제목 클릭: 필터 초기화
          </Typography>
        </Box>
      </Box>

      {/* 천우건업(주) 탭에서 입찰 분석 차트 표시 */}
      {filteredByCompanyType === '천우건업(주)' && (
        <Box sx={{ mb: 3 }}>
          <BiddingAnalysisChart vendors={vendors.filter(vendor => 
            vendor.companyTypes && vendor.companyTypes.includes('천우건업(주)') && selectedItems.includes(vendor.id)
          )} />
        </Box>
      )}

      {/* 검색 및 필터 섹션 */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* 검색 입력칸 */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="업체명, 현장명, 발주자, 품목으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleClearSearch}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          {/* 시작일 필터 */}
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="시작일 (이후)"
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          
          {/* 종료일 필터 */}
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="종료일 (이전)"
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          
          {/* 필터 초기화 버튼 */}
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearAllFilters}
              size="small"
            >
              필터 초기화
            </Button>
          </Grid>
          
          {/* 선택된 항목 수 표시 */}
          <Grid item xs={12} md={2}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{
                textAlign: 'center',
                py: 1
              }}
            >
              선택: {selectedItems.length}개 / 전체: {getSortedVendors().length}개
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" sx={{ 
          '& .MuiTableCell-root': {
            fontSize: '1rem',
            fontWeight: 'normal'
          },
          '& .MuiTableCell-head': {
            fontSize: '1rem',
            fontWeight: 'bold'
          }
        }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ py: 0.5 }}>
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  indeterminate={selectedItems.length > 0 && selectedItems.length < getPaginatedVendors().length}
                />
              </TableCell>
              {filteredByCompanyType === '천우건업(주)' ? (
                <>
                  <TableCell
                    onClick={() => handleSort('siteName')}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }, py: 0.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      현장명
                      {sortField === 'siteName' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('winningCompany')}
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                      py: 1,
                      // 1500px 미만에서 숨김
                      '@media (max-width: 1499px)': {
                        display: 'none !important'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      발주자
                      {sortField === 'winningCompany' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('amount')}
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }, 
                      py: 0.5,
                      // 1500px 미만에서 숨김
                      '@media (max-width: 1499px)': {
                        display: 'none !important'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      기초금액
                      {sortField === 'amount' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell
                    onClick={() => handleSort('companyName')}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }, py: 0.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      업체명
                      {sortField === 'companyName' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('bidDate')}
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                      py: 1,
                      // 테블릿에서 숨김
                      '@media (min-width: 768px) and (max-width: 1024px)': {
                        display: 'none'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      납품기한일자
                      {sortField === 'bidDate' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell
                    onClick={() => handleSort('siteName')}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }, py: 0.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      계약건명
                      {sortField === 'siteName' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('amount')}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }, py: 0.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      금액
                      {sortField === 'amount' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                </>
              )}
              {filteredByCompanyType === '천우건업(주)' ? (
                <>
                  <TableCell sx={{ py: 1 }}>투찰율</TableCell>
                  <TableCell sx={{ py: 1 }}>투찰금액</TableCell>
                  <TableCell 
                    onClick={() => handleSort('bidDate')}
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                      py: 1,
                      // 테블릿에서 숨김
                      '@media (min-width: 768px) and (max-width: 1024px)': {
                        display: 'none'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      투찰일자
                      {sortField === 'bidDate' && (
                        sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>결과순위</TableCell>
                  <TableCell sx={{ py: 1 }}>낙찰금액</TableCell>
                  <TableCell 
                    sx={{ 
                      py: 1,
                      // 1500px 미만에서 숨김
                      '@media (max-width: 1499px)': {
                        display: 'none !important'
                      }
                    }}
                  >
                    낙찰율
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>관리</TableCell>
                </>
              ) : (
                <>
                  <TableCell sx={{ py: 1 }}>관리</TableCell>
                </>
              )}
              <TableCell 
                sx={{ 
                  py: 1,
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}
              >
                비고
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getPaginatedVendors().map((vendor) => (
              <TableRow key={vendor.id} sx={{ '& td': { py: 1 } }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.includes(vendor.id)}
                    onChange={() => handleSelectItem(vendor.id)}
                  />
                </TableCell>
                {filteredByCompanyType === '천우건업(주)' ? (
                  <>
                    <TableCell sx={{
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {vendor.siteName && vendor.siteName.length > 15 
                        ? `${vendor.siteName.substring(0, 15)}...` 
                        : vendor.siteName}
                    </TableCell>
                    <TableCell sx={{
                      // 1500px 미만에서 숨김
                      '@media (max-width: 1499px)': {
                        display: 'none !important'
                      }
                    }}>{vendor.winningCompany || '-'}</TableCell>
                    <TableCell sx={{
                      // 1500px 미만에서 숨김
                      '@media (max-width: 1499px)': {
                        display: 'none !important'
                      }
                    }}>{formatAmount(vendor.amount)}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{vendor.companyName || '-'}</TableCell>
                    <TableCell sx={{
                      // 테블릿에서 숨김
                      '@media (min-width: 768px) and (max-width: 1024px)': {
                        display: 'none'
                      }
                    }}>{formatDate(vendor.bidDate)}</TableCell>
                    <TableCell sx={{
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {vendor.siteName && vendor.siteName.length > 15 
                        ? `${vendor.siteName.substring(0, 15)}...` 
                        : vendor.siteName || '-'}
                    </TableCell>
                    <TableCell>{formatAmount(vendor.amount)}</TableCell>
                  </>
                )}
                {filteredByCompanyType === '천우건업(주)' ? (
                  <>
                    <TableCell 
                      onClick={() => handleInlineEditStart(vendor.id, 'bidRate', vendor.bidRate)}
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    >
                      {editingField === `${vendor.id}-bidRate` ? (
                        <TextField
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleInlineEditSave(vendor.id, 'bidRate')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleInlineEditSave(vendor.id, 'bidRate');
                            } else if (e.key === 'Escape') {
                              handleInlineEditCancel();
                            }
                          }}
                          autoFocus
                          size="small"
                          variant="outlined"
                          placeholder="예: 95.5%"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              height: '32px',
                              fontSize: '0.875rem'
                            }
                          }}
                        />
                      ) : (
                        vendor.bidRate || '-'
                      )}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleInlineEditStart(vendor.id, 'bidAmount', vendor.bidAmount)}
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    >
                      {editingField === `${vendor.id}-bidAmount` ? (
                        <TextField
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleInlineEditSave(vendor.id, 'bidAmount')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleInlineEditSave(vendor.id, 'bidAmount');
                            } else if (e.key === 'Escape') {
                              handleInlineEditCancel();
                            }
                          }}
                          autoFocus
                          size="small"
                          variant="outlined"
                          type="number"
                          placeholder="투찰금액 입력"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              height: '32px',
                              fontSize: '0.875rem'
                            }
                          }}
                        />
                      ) : (
                        vendor.bidAmount ? formatAmount(vendor.bidAmount) : '-'
                      )}
                    </TableCell>
                    <TableCell sx={{
                      // 테블릿에서 숨김
                      '@media (min-width: 768px) and (max-width: 1024px)': {
                        display: 'none'
                      }
                    }}>{formatDate(vendor.bidDate)}</TableCell>
                    <TableCell 
                      onClick={() => handleInlineEditStart(vendor.id, 'resultRank', vendor.resultRank)}
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    >
                      {editingField === `${vendor.id}-resultRank` ? (
                        <TextField
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleInlineEditSave(vendor.id, 'resultRank')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleInlineEditSave(vendor.id, 'resultRank');
                            } else if (e.key === 'Escape') {
                              handleInlineEditCancel();
                            }
                          }}
                          autoFocus
                          size="small"
                          variant="outlined"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              height: '32px',
                              fontSize: '0.875rem'
                            }
                          }}
                        />
                      ) : (
                        vendor.resultRank || '-'
                      )}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleInlineEditStart(vendor.id, 'winningAmount', vendor.winningAmount)}
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                    >
                      {editingField === `${vendor.id}-winningAmount` ? (
                        <TextField
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleInlineEditSave(vendor.id, 'winningAmount')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleInlineEditSave(vendor.id, 'winningAmount');
                            } else if (e.key === 'Escape') {
                              handleInlineEditCancel();
                            }
                          }}
                          autoFocus
                          size="small"
                          variant="outlined"
                          type="number"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              height: '32px',
                              fontSize: '0.875rem'
                            }
                          }}
                        />
                      ) : (
                        vendor.winningAmount ? formatAmount(vendor.winningAmount) : '-'
                      )}
                    </TableCell>
                    <TableCell 
                      onClick={() => handleInlineEditStart(vendor.id, 'winningRate', vendor.winningRate)}
                      sx={{ 
                        cursor: 'pointer', 
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                        // 1500px 미만에서 숨김
                        '@media (max-width: 1499px)': {
                          display: 'none !important'
                        }
                      }}
                    >
                      {editingField === `${vendor.id}-winningRate` ? (
                        <TextField
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleInlineEditSave(vendor.id, 'winningRate')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleInlineEditSave(vendor.id, 'winningRate');
                            } else if (e.key === 'Escape') {
                              handleInlineEditCancel();
                            }
                          }}
                          autoFocus
                          size="small"
                          variant="outlined"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              height: '32px',
                              fontSize: '0.875rem'
                            }
                          }}
                        />
                      ) : (
                        vendor.winningRate || '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(vendor)}
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(vendor.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(vendor)}
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(vendor.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </>
                )}
                <TableCell sx={{
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}>
                  {filteredByCompanyType === '천우건업(주)' ? (
                    <Typography variant="body2">
                      {vendor.note}
                    </Typography>
                  ) : (
                    <Typography variant="body2">
                      {vendor.note}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 페이지네이션 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 2 }}>
        {/* 데이터 현황 */}
        <Box sx={{ minWidth: '400px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'bold', fontSize: '0.8rem' }}>
                최근 업로드:
              </Typography>
              <Typography variant="body2" sx={{ 
                color: 'text.primary', 
                fontWeight: 'medium',
                bgcolor: 'primary.light',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem'
              }}>
                {getLatestUploadDate() 
                  ? formatDate(getLatestUploadDate().toISOString().split('T')[0])
                  : '업로드된 데이터 없음'
                }
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                ({getUploadCount()}개)
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'bold', fontSize: '0.8rem' }}>
                최신 등록:
              </Typography>
              <Typography variant="body2" sx={{ 
                color: 'text.primary', 
                fontWeight: 'medium',
                bgcolor: 'success.light',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem'
              }}>
                {getLatestRegistrationDate() 
                  ? formatDate(getLatestRegistrationDate().toISOString().split('T')[0])
                  : '등록된 데이터 없음'
                }
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                ({getRegistrationCount()}개)
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            총 {getSortedVendors().length}개 중 {Math.min((currentPage - 1) * itemsPerPage + 1, getSortedVendors().length)}-{Math.min(currentPage * itemsPerPage, getSortedVendors().length)}개 표시
          </Typography>
          <Pagination 
            count={getTotalPages()} 
            page={currentPage} 
            onChange={(event, page) => handlePageChange(page)}
            color="primary"
            shape="rounded"
            showFirstButton 
            showLastButton
            size="small"
          />
        </Box>
      </Box>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#181f2e',
            color: '#fff',
            borderRadius: 4,
            minHeight: '480px',
            width: '100%',
            // 스크롤바 숨기기
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#232b3b', 
          color: '#90caf9',
          fontWeight: 700,
          fontSize: '1.3rem',
          py: 2,
          textAlign: 'center'
        }}>
          {editingVendor ? '거래처 수정' : '거래처 등록'}
        </DialogTitle>
        <DialogContent sx={{ 
          pt: 4, 
          pb: 2, 
          mt: 6,
          // 스크롤바 숨기기
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            {filteredByCompanyType !== '천우건업(주)' && (
              <TextField
                fullWidth
                label="업체명"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                margin="normal"
                required
                placeholder="업체명을 입력하세요"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
            )}
            <TextField
              fullWidth
              label={filteredByCompanyType === '천우건업(주)' ? "투찰일자" : "낙찰일"}
              type="date"
              value={formData.bidDate}
              onChange={(e) => setFormData({ ...formData, bidDate: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              fullWidth
              label="현장명"
              value={formData.siteName}
              onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
              margin="normal"
              required
              placeholder="현장명을 입력하세요"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              fullWidth
              label={filteredByCompanyType === '천우건업(주)' ? "발주자" : "낙찰회사"}
              value={formData.winningCompany}
              onChange={(e) => setFormData({ ...formData, winningCompany: e.target.value })}
              margin="normal"
              placeholder={filteredByCompanyType === '천우건업(주)' ? "발주자명을 입력하세요" : "낙찰받은 회사명을 입력하세요"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              fullWidth
              label={filteredByCompanyType === '천우건업(주)' ? "기초금액" : "금액"}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              margin="normal"
              placeholder={filteredByCompanyType === '천우건업(주)' ? "기초금액을 입력하세요" : "금액을 입력하세요 (선택사항)"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            {filteredByCompanyType === '천우건업(주)' ? (
              <>
                <TextField
                  fullWidth
                  label="투찰율"
                  value={formData.bidRate || ''}
                  onChange={(e) => setFormData({ ...formData, bidRate: e.target.value })}
                  margin="normal"
                  placeholder="투찰율을 입력하세요 (예: 95.5%)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
                <TextField
                  fullWidth
                  label="투찰금액"
                  value={formData.bidAmount || ''}
                  onChange={(e) => setFormData({ ...formData, bidAmount: e.target.value })}
                  margin="normal"
                  type="number"
                  placeholder="투찰금액을 입력하세요"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
                <TextField
                  fullWidth
                  label="결과순위"
                  value={formData.resultRank || ''}
                  onChange={(e) => setFormData({ ...formData, resultRank: e.target.value })}
                  margin="normal"
                  placeholder="결과순위를 입력하세요 (예: 1위, 2위)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
                <TextField
                  fullWidth
                  label="낙찰금액"
                  value={formData.winningAmount || ''}
                  onChange={(e) => setFormData({ ...formData, winningAmount: e.target.value })}
                  margin="normal"
                  type="number"
                  placeholder="낙찰금액을 입력하세요"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
                <TextField
                  fullWidth
                  label="낙찰율"
                  value={formData.winningRate || ''}
                  onChange={(e) => setFormData({ ...formData, winningRate: e.target.value })}
                  margin="normal"
                  placeholder="낙찰율을 입력하세요 (예: 95.5%)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="품목"
                  value={formData.item || ''}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  margin="normal"
                  placeholder="품목을 입력하세요 (선택사항)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
                <TextField
                  fullWidth
                  label="물량"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  margin="normal"
                  placeholder="물량을 입력하세요 (선택사항)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              </>
            )}
            <TextField
              fullWidth
              label="비고"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              margin="normal"
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <FormControl fullWidth margin="normal" sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#4caf50' }
              },
              '& .MuiInputLabel-root': { color: '#ccc' },
              '& .MuiInputBase-input': { color: '#fff' }
            }}>
              <InputLabel>수주여부</InputLabel>
              <Select
                value={formData.contractStatus}
                onChange={(e) => setFormData({ ...formData, contractStatus: e.target.value })}
                label="수주여부"
              >
                <MenuItem value="미수주">미수주</MenuItem>
                <MenuItem value="수주">수주</MenuItem>
              </Select>
            </FormControl>
            
            {/* 업종 선택 - 천우건업(주) 필터링 시 숨김 */}
            {filteredByCompanyType !== '천우건업(주)' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#ccc', fontWeight: 'bold' }}>
                  업종 선택
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {['AL창호', 'PL창호', '종합건설', '천우건업(주)'].map((type) => {
                    const isSelected = formData.companyTypes.includes(type);
                    const isMultiSelect = ['AL창호', 'PL창호'].includes(type);
                    
                    return (
                      <Chip
                        key={type}
                        label={type}
                        color={isSelected ? getCompanyTypeColor(type) : 'default'}
                        onClick={() => {
                          if (isMultiSelect) {
                            // AL창호, PL창호는 중복 선택 가능
                            handleVendorCompanyTypeToggle(type);
                          } else {
                            // 천우건업(주), 종합건설은 단일 선택
                            if (isSelected) {
                              // 이미 선택된 경우 선택 해제
                              setFormData({
                                ...formData,
                                companyTypes: formData.companyTypes.filter(t => t !== type)
                              });
                            } else {
                              // 다른 단일 선택 항목들 제거 후 선택
                              const otherSingleSelect = ['천우건업(주)', '종합건설'].filter(t => t !== type);
                              const filteredTypes = formData.companyTypes.filter(t => !otherSingleSelect.includes(t));
                              setFormData({
                                ...formData,
                                companyTypes: [...filteredTypes, type]
                              });
                            }
                          }
                        }}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: isSelected ? undefined : 'rgba(255,255,255,0.08)'
                          }
                        }}
                      />
                    );
                  })}
                </Box>
                {formData.companyTypes.length === 0 && (
                  <Typography variant="body2" sx={{ color: 'error.main', mt: 1, fontSize: '0.8rem' }}>
                    최소 하나의 업종을 선택해주세요.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          bgcolor: '#232b3b', 
          px: 3, 
          py: 2,
          gap: 2
        }}>
          <Button 
            onClick={handleClose}
            sx={{
              color: '#ccc',
              borderColor: '#666',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: 'rgba(255,255,255,0.08)'
              }
            }}
            variant="outlined"
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{
              bgcolor: '#4caf50',
              color: '#fff',
              '&:hover': {
                bgcolor: '#45a049'
              }
            }}
          >
            {editingVendor ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 파일 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>입찰현황 파일 업로드</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Excel 파일을 업로드하여 입찰현황 데이터를 일괄 등록할 수 있습니다.
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              지원 형식: .xlsx, .xls<br/>
              <strong>9행부터 데이터를 읽습니다.</strong><br/>
              등록된 업체만 필터링하여 업로드됩니다.<br/>
              T열: 업체명, V열: 현장명, AK열: 금액, AA열: 날짜<br/>
              같은 회사, 같은 현장의 금액은 자동 합산됩니다.<br/>
              업로드된 데이터는 비고에 "관급"으로 표시됩니다.
            </Typography>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="upload-file"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="upload-file">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
              >
                파일 선택
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>취소</Button>
        </DialogActions>
      </Dialog>

      {/* 업체 등록 다이얼로그 */}
      <Dialog 
        open={companyDialogOpen} 
        onClose={handleCompanyDialogClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            // 스크롤바 숨기기
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }
        }}
      >
        <DialogTitle>{editingCompany ? '업체 수정' : '업체 등록'}</DialogTitle>
        <DialogContent sx={{
          // 스크롤바 숨기기
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <Box component="form" onSubmit={handleCompanySubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="업체명"
              value={companyFormData.companyName}
              onChange={(e) => setCompanyFormData({ ...companyFormData, companyName: e.target.value })}
              margin="normal"
              required
            />
            <Typography variant="body2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
              업체 유형
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['AL창호', 'PL창호', '종합건설', '천우건업(주)'].map((type) => {
                const isSelected = companyFormData.companyTypes.includes(type);
                const isMultiSelect = ['AL창호', 'PL창호'].includes(type);
                
                return (
                  <Chip
                    key={type}
                    label={type}
                    color={isSelected ? getCompanyTypeColor(type) : 'default'}
                    onClick={() => {
                      if (isMultiSelect) {
                        // AL창호, PL창호는 중복 선택 가능
                        handleCompanyTypeToggle(type);
                      } else {
                        // 천우건업(주), 종합건설은 단일 선택
                        if (isSelected) {
                          // 이미 선택된 경우 선택 해제
                          setCompanyFormData({
                            ...companyFormData,
                            companyTypes: companyFormData.companyTypes.filter(t => t !== type)
                          });
                        } else {
                          // 다른 단일 선택 항목들 제거 후 선택
                          const otherSingleSelect = ['천우건업(주)', '종합건설'].filter(t => t !== type);
                          const filteredTypes = companyFormData.companyTypes.filter(t => !otherSingleSelect.includes(t));
                          setCompanyFormData({
                            ...companyFormData,
                            companyTypes: [...filteredTypes, type]
                          });
                        }
                      }
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                );
              })}
            </Box>
            {companyFormData.companyTypes.length === 0 && (
              <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>
                최소 하나의 업체 유형을 선택해주세요.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCompanyDialogClose}>취소</Button>
          <Button 
            onClick={handleCompanySubmit} 
            variant="contained"
            disabled={companyFormData.companyTypes.length === 0}
          >
            {editingCompany ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 업종별 업체 목록 팝업 */}
      <Dialog 
        open={companyListDialogOpen} 
        onClose={() => setCompanyListDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            // 스크롤바 숨기기
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={selectedCompanyType}
              color={getCompanyTypeColor(selectedCompanyType)}
              sx={{ fontWeight: 'bold' }}
            />
            <Typography variant="h6">
              업체 목록 ({getCompaniesByType(selectedCompanyType).length}개)
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{
          // 스크롤바 숨기기
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {getCompaniesByType(selectedCompanyType).length > 0 ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {getCompaniesByType(selectedCompanyType).map((company) => (
                <Grid item xs={12} sm={6} key={company.id}>
                  <Card sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {company.companyName}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(company.companyTypes || [company.companyType] || []).map((type, index) => (
                              <Chip 
                                key={index}
                                label={type} 
                                size="small" 
                                color={getCompanyTypeColor(type)}
                              />
                            ))}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              handleCompanyEdit(company);
                              setCompanyListDialogOpen(false);
                            }}
                            sx={{ color: 'primary.main' }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleCompanyDelete(company.id)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 3, textAlign: 'center' }}>
              {selectedCompanyType} 업종에 등록된 업체가 없습니다.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompanyListDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Container>
    </Box>
  );
};

export default Vendors; 