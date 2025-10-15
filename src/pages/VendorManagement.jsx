import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Sort as SortIcon,
  Business as BusinessIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where, getDocs as getFirestoreDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const VendorManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length === 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    } else if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      // 11자리를 초과하면 11자리까지만 사용
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  // 사업자번호 포맷팅 함수
  const formatBusinessNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 길이에 따라 포맷팅 (000-00-00000)
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 5) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
    }
  };

  // 회사명 정규화 함수 (정확한 매칭을 위해 최소한의 정규화만)
  const normalizeCompanyName = (companyName) => {
    if (!companyName) return '';
    
    return companyName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // 여러 공백을 하나로 (예: "삼성  전자" -> "삼성 전자")
      .trim();
  };

  // 회사명으로 기존 거래처 정보 찾기
  const findExistingCompanyInfo = async (companyName) => {
    if (!companyName || !companyName.trim()) return null;
    
    try {
      const searchName = companyName.trim().toLowerCase();
      
      // 모든 거래처 데이터 가져오기
      const vendorsQuery = query(collection(db, 'vendors'), orderBy('companyName', 'asc'));
      const querySnapshot = await getDocs(vendorsQuery);
      
      // 정확한 회사명 매칭으로 거래처 찾기
      for (const doc of querySnapshot.docs) {
        const vendorData = doc.data();
        if (vendorData.companyName) {
          const existingName = vendorData.companyName.trim().toLowerCase();
          if (searchName === existingName) {
            return {
              ceo: vendorData.ceo || '',
              businessNumber: vendorData.businessNumber || '',
              address: vendorData.address || ''
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('기존 회사 정보 검색 오류:', error);
      return null;
    }
  };

  // 회사명 자동완성 목록 가져오기
  const getCompanySuggestions = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    
    try {
      const vendorsQuery = query(collection(db, 'vendors'), orderBy('companyName', 'asc'));
      const querySnapshot = await getDocs(vendorsQuery);
      
      const suggestions = [];
      const searchLower = searchTerm.toLowerCase();
      
      for (const doc of querySnapshot.docs) {
        const vendorData = doc.data();
        if (vendorData.companyName) {
          const companyLower = vendorData.companyName.toLowerCase();
          // 정확한 부분 문자열 매칭만 허용
          if (companyLower.includes(searchLower)) {
            suggestions.push(vendorData.companyName);
          }
        }
      }
      
      // 중복 제거 및 정렬
      return [...new Set(suggestions)].slice(0, 5);
    } catch (error) {
      console.error('회사명 자동완성 오류:', error);
      return [];
    }
  };

  // 상태 관리
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadProgress, setUploadProgress] = useState({ show: false, current: 0, total: 0 });

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 자동완성 상태
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    companyName: '',
    ceo: '',
    businessNumber: '',
    address: '',
    companyPhone: '', // 회사번호 추가
    note: ''
  });

  // 거래처 데이터 실시간 로드
  const loadVendors = () => {
    try {
      setLoading(true);
      console.log('=== 거래처 데이터 실시간 로드 시작 ===');
      // 정렬은 클라이언트 사이드에서 처리하므로 기본 정렬만 사용
      const vendorsQuery = query(collection(db, 'vendors'), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(vendorsQuery, (snapshot) => {
        const vendorsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('거래처 데이터 실시간 업데이트:', vendorsData.length, '개');
        console.log('거래처 데이터 샘플:', vendorsData.slice(0, 3));
        setVendors(vendorsData);
        setLoading(false);
      }, (error) => {
        console.error('거래처 데이터 실시간 로드 오류:', error);
        setSnackbar({ open: true, message: '거래처 데이터를 불러오는데 실패했습니다.', severity: 'error' });
        setLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('거래처 데이터 로드 초기화 오류:', error);
      setSnackbar({ open: true, message: '거래처 데이터를 불러오는데 실패했습니다.', severity: 'error' });
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = loadVendors();
    
    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      phone: '',
      email: '',
      companyName: '',
      ceo: '',
      businessNumber: '',
      address: '',
      companyPhone: '', // 회사번호 추가
      note: ''
    });
    setEditingVendor(null);
  };

  // 회사명 입력 시 자동으로 사업자번호와 주소 채우기 (디바운싱 적용)
  const handleCompanyNameChange = async (companyName) => {
    // 폼 데이터 업데이트
    setFormData(prev => ({
      ...prev,
      companyName: companyName
    }));

    // 자동완성 목록 업데이트
    if (companyName && companyName.trim().length >= 2 && !editingVendor) {
      const suggestions = await getCompanySuggestions(companyName);
      setCompanySuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }

    // 회사명이 입력되었고, 수정 모드가 아닐 때만 자동 채우기 실행
    if (companyName && companyName.trim() && !editingVendor) {
      // 디바운싱: 1초 후에 검색 실행
      setTimeout(async () => {
        // 현재 입력된 회사명과 일치하는지 다시 확인
        if (formData.companyName === companyName) {
          try {
            const existingInfo = await findExistingCompanyInfo(companyName);
            if (existingInfo) {
              setFormData(prev => ({
                ...prev,
                companyName: companyName,
                ceo: existingInfo.ceo,
                businessNumber: existingInfo.businessNumber,
                address: existingInfo.address
              }));
              
              // 사용자에게 알림
              setSnackbar({ 
                open: true, 
                message: `기존 회사 정보가 자동으로 입력되었습니다. (${companyName})`, 
                severity: 'info' 
              });
            }
          } catch (error) {
            console.error('회사 정보 자동 채우기 오류:', error);
          }
        }
      }, 1000);
    }
  };

  // 자동완성 항목 선택
  const handleSuggestionSelect = async (selectedCompany) => {
    setFormData(prev => ({
      ...prev,
      companyName: selectedCompany
    }));
    setShowSuggestions(false);
    
    // 선택된 회사명으로 기존 정보 자동 채우기
    try {
      const existingInfo = await findExistingCompanyInfo(selectedCompany);
      if (existingInfo) {
        setFormData(prev => ({
          ...prev,
          companyName: selectedCompany,
          ceo: existingInfo.ceo,
          businessNumber: existingInfo.businessNumber,
          address: existingInfo.address
        }));
        
        setSnackbar({ 
          open: true, 
          message: `기존 회사 정보가 자동으로 입력되었습니다. (${selectedCompany})`, 
          severity: 'info' 
        });
      }
    } catch (error) {
      console.error('회사 정보 자동 채우기 오류:', error);
    }
  };

  // 다이얼로그 열기
  const handleOpenDialog = (vendor = null) => {
    if (vendor) {
      setFormData({
        ...vendor,
        phone: formatPhoneNumber(vendor.phone || ''), // 기존 전화번호도 포맷팅
        businessNumber: formatBusinessNumber(vendor.businessNumber || ''), // 기존 사업자번호도 포맷팅
        companyPhone: formatPhoneNumber(vendor.companyPhone || '') // 기존 회사번호도 포맷팅
      });
      setEditingVendor(vendor);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
    setShowSuggestions(false);
    setCompanySuggestions([]);
  };

  // 거래처 저장
  // 놓친 데이터들을 거래처관리로 마이그레이션하는 함수
  const migrateMissedData = async () => {
    try {
      console.log('=== 놓친 데이터 마이그레이션 시작 ===');
      let migratedCount = 0;
      
      // 1. sites 컬렉션에서 놓친 데이터 찾기
      console.log('1. sites 컬렉션 확인...');
      const sitesQuery = query(collection(db, 'sites'), orderBy('name', 'asc'));
      const sitesSnapshot = await getDocs(sitesQuery);
      
      for (const siteDoc of sitesSnapshot.docs) {
        const siteData = siteDoc.data();
        if (siteData.manager && siteData.manager.trim()) {
          // 기존에 같은 이름 + 회사명 + 직위의 거래처가 있는지 확인
          const existingVendorQuery = query(
            collection(db, 'vendors'),
            where('name', '==', siteData.manager.trim())
          );
          const existingVendorSnapshot = await getDocs(existingVendorQuery);
          
          // 이름이 같은 경우, 회사명과 직위도 체크
          let isDuplicate = false;
          if (!existingVendorSnapshot.empty) {
            for (const vendorDoc of existingVendorSnapshot.docs) {
              const vendorData = vendorDoc.data();
              if (vendorData.companyName === (siteData.companyName && siteData.companyName.trim() ? siteData.companyName.trim() : '') &&
                  vendorData.position === '') {
                isDuplicate = true;
                console.log(`중복 거래처 발견: ${siteData.manager} (${siteData.companyName})`);
                break;
              }
            }
          }
          
          if (!isDuplicate) {
            const vendorData = {
              name: siteData.manager.trim(),
              position: '',
              companyName: siteData.companyName && siteData.companyName.trim() ? siteData.companyName.trim() : '',
              source: 'migration_sites',
              createdAt: siteData.createdAt || new Date(),
              updatedAt: new Date()
            };
            
            await addDoc(collection(db, 'vendors'), vendorData);
            migratedCount++;
            console.log(`sites에서 거래처 추가: ${siteData.manager}`);
          }
        }
      }
      
      // 2. estimates 컬렉션에서 놓친 데이터 찾기
      console.log('2. estimates 컬렉션 확인...');
      const estimatesQuery = query(collection(db, 'estimates'), orderBy('receptionDate', 'desc'));
      const estimatesSnapshot = await getDocs(estimatesQuery);
      
      for (const estimateDoc of estimatesSnapshot.docs) {
        const estimateData = estimateDoc.data();
        if (estimateData.requester && estimateData.requester.trim()) {
          // 의뢰자에서 이름과 직위 분리 (괄호 안의 회사명 제거)
          let cleanRequester = estimateData.requester.trim();
          const companyMatch = cleanRequester.match(/\(([^)]+)\)$/);
          if (companyMatch) {
            cleanRequester = cleanRequester.replace(/\([^)]+\)$/, '').trim();
          }
          
          const parts = cleanRequester.split(' ');
          const personName = parts[0];
          const title = parts.length >= 2 ? parts.slice(1).join(' ') : '';
          
          // 기존에 같은 이름 + 회사명 + 직위의 거래처가 있는지 확인
          const existingVendorQuery = query(
            collection(db, 'vendors'),
            where('name', '==', personName)
          );
          const existingVendorSnapshot = await getDocs(existingVendorQuery);
          
          // 이름이 같은 경우, 회사명과 직위도 체크
          let isDuplicate = false;
          if (!existingVendorSnapshot.empty) {
            for (const vendorDoc of existingVendorSnapshot.docs) {
              const vendorData = vendorDoc.data();
              if (vendorData.companyName === (estimateData.company && estimateData.company.trim() ? estimateData.company.trim() : '') &&
                  vendorData.position === title) {
                isDuplicate = true;
                console.log(`중복 거래처 발견: ${personName} (${estimateData.company}) - ${title}`);
                break;
              }
            }
          }
          
          if (!isDuplicate) {
            const vendorData = {
              name: personName,
              position: title,
              companyName: estimateData.company && estimateData.company.trim() ? estimateData.company.trim() : '',
              source: 'migration_estimates',
              createdAt: estimateData.createdAt || new Date(),
              updatedAt: new Date()
            };
            
            await addDoc(collection(db, 'vendors'), vendorData);
            migratedCount++;
            console.log(`estimates에서 거래처 추가: ${personName}`);
          }
        }
      }
      
      // 3. requesters 컬렉션에서 놓친 데이터 찾기
      console.log('3. requesters 컬렉션 확인...');
      const requestersQuery = query(collection(db, 'requesters'), orderBy('name', 'asc'));
      const requestersSnapshot = await getDocs(requestersQuery);
      
      for (const requesterDoc of requestersSnapshot.docs) {
        const requesterData = requesterDoc.data();
        if (requesterData.name && requesterData.name.trim()) {
          // 기존에 같은 이름 + 회사명 + 직위의 거래처가 있는지 확인
          const existingVendorQuery = query(
            collection(db, 'vendors'),
            where('name', '==', requesterData.name.trim())
          );
          const existingVendorSnapshot = await getDocs(existingVendorQuery);
          
          // 이름이 같은 경우, 회사명과 직위도 체크
          let isDuplicate = false;
          if (!existingVendorSnapshot.empty) {
            for (const vendorDoc of existingVendorSnapshot.docs) {
              const vendorData = vendorDoc.data();
              if (vendorData.companyName === (requesterData.company && requesterData.company.trim() ? requesterData.company.trim() : '') &&
                  vendorData.position === (requesterData.title && requesterData.title.trim() ? requesterData.title.trim() : '')) {
                isDuplicate = true;
                console.log(`중복 거래처 발견: ${requesterData.name} (${requesterData.company}) - ${requesterData.title}`);
                break;
              }
            }
          }
          
          if (!isDuplicate) {
            const vendorData = {
              name: requesterData.name.trim(),
              position: requesterData.title && requesterData.title.trim() ? requesterData.title.trim() : '',
              companyName: requesterData.company && requesterData.company.trim() ? requesterData.company.trim() : '',
              source: 'migration_requesters',
              createdAt: requesterData.createdAt || new Date(),
              updatedAt: new Date()
            };
            
            await addDoc(collection(db, 'vendors'), vendorData);
            migratedCount++;
            console.log(`requesters에서 거래처 추가: ${requesterData.name}`);
          }
        }
      }
      
      console.log('=== 마이그레이션 완료 ===');
      console.log(`총 ${migratedCount}개의 거래처가 추가되었습니다.`);
      
      return migratedCount;
    } catch (error) {
      console.error('마이그레이션 오류:', error);
      throw error;
    }
  };

  // 견적페이지와 연동하는 함수
  const syncWithEstimates = async (name, position, companyName) => {
    if (name && name.trim()) {
      try {
        // 견적페이지에서 사용할 의뢰자 데이터 생성
        const requesterData = {
          name: name.trim(),
          title: position && position.trim() ? position.trim() : '',
          fullName: position && position.trim() ? `${name.trim()} ${position.trim()}` : name.trim(),
          company: companyName && companyName.trim() ? companyName.trim() : '',
          source: 'vendor_management',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 의뢰자가 있는지 확인
        const existingQuery = query(
          collection(db, 'requesters'),
          where('name', '==', name.trim())
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          console.log('새로운 의뢰자 추가:', requesterData);
          await addDoc(collection(db, 'requesters'), requesterData);
        } else {
          console.log('기존 의뢰자 업데이트:', requesterData);
          const existingDoc = existingSnapshot.docs[0];
          await updateDoc(doc(db, 'requesters', existingDoc.id), {
            title: requesterData.title,
            fullName: requesterData.fullName,
            company: requesterData.company,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('의뢰자 데이터 저장 오류:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim() && !formData.companyName.trim()) {
        setSnackbar({ open: true, message: '이름 또는 회사명 중 하나는 입력해야 합니다.', severity: 'warning' });
        return;
      }

      if (editingVendor) {
        // 수정
        await updateDoc(doc(db, 'vendors', editingVendor.id), formData);
        // 견적페이지와 연동
        await syncWithEstimates(formData.name, formData.position, formData.companyName);
        setSnackbar({ open: true, message: '거래처가 수정되었습니다.', severity: 'success' });
      } else {
        // 추가
        await addDoc(collection(db, 'vendors'), {
          ...formData,
          createdAt: new Date()
        });
        // 견적페이지와 연동
        await syncWithEstimates(formData.name, formData.position, formData.companyName);
        setSnackbar({ open: true, message: '거래처가 추가되었습니다.', severity: 'success' });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('거래처 저장 오류:', error);
      setSnackbar({ open: true, message: '거래처 저장에 실패했습니다.', severity: 'error' });
    }
  };

  // 거래처 삭제
  const handleDelete = async (vendor) => {
    if (window.confirm(`"${vendor.name}" 거래처를 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, 'vendors', vendor.id));
        setSnackbar({ open: true, message: '거래처가 삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('거래처 삭제 오류:', error);
        setSnackbar({ open: true, message: '거래처 삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  // 정렬 변경
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // 정렬 변경 시 첫 페이지로 이동
  };

  // 검색어 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 중복 데이터 제거 함수
  const removeDuplicates = (vendorsList) => {
    const seen = new Map();
    const uniqueVendors = [];
    
    vendorsList.forEach(vendor => {
      // 이름만으로 중복 체크 (회사나 직위가 다르면 다른 사람)
      const key = `${vendor.name || ''}`;
      
      if (!seen.has(key)) {
        // 같은 이름을 가진 첫 번째 사람
        seen.set(key, vendor);
        uniqueVendors.push(vendor);
      } else {
        // 같은 이름을 가진 다른 사람이 있는 경우
        const existing = seen.get(key);
        
        // 회사나 직위가 다르면 다른 사람으로 인식하여 추가
        if (existing.position !== vendor.position || existing.companyName !== vendor.companyName) {
          uniqueVendors.push(vendor);
        } else {
          // 정말로 동일한 사람인 경우 (이름, 직위, 회사가 모두 같음)
          // 데이터 품질이 더 높은 것을 유지
          const existingScore = calculateDataQualityScore(existing);
          const newScore = calculateDataQualityScore(vendor);
          
          if (newScore > existingScore) {
            // 새로운 데이터가 더 높은 품질이면 교체
            const index = uniqueVendors.findIndex(v => v.id === existing.id);
            if (index !== -1) {
              uniqueVendors[index] = vendor;
              seen.set(key, vendor);
            }
          }
        }
      }
    });
    
    return uniqueVendors;
  };

  // 정렬 함수
  const sortVendors = (vendorsList, field, direction) => {
    return [...vendorsList].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];

      // null/undefined 처리
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // 날짜 필드 처리
      if (field === 'createdAt') {
        aValue = aValue ? (aValue.seconds ? new Date(aValue.seconds * 1000) : new Date(aValue)) : new Date(0);
        bValue = bValue ? (bValue.seconds ? new Date(bValue.seconds * 1000) : new Date(bValue)) : new Date(0);
      }

      // 문자열 필드 처리 (한글 정렬을 위해 localeCompare 사용)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'ko', { numeric: true });
        return direction === 'desc' ? -comparison : comparison;
      }

      // 날짜/숫자 비교
      if (direction === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  };

  // 검색 필터링 및 정렬
  const filteredVendors = sortVendors(
    removeDuplicates(vendors.filter(vendor =>
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone?.includes(searchTerm) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.companyPhone?.includes(searchTerm) ||
      vendor.address?.toLowerCase().includes(searchTerm.toLowerCase())
    )),
    sortField,
    sortDirection
  );

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVendors = filteredVendors.slice(startIndex, endIndex);

  // 페이지 변경 함수
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // 페이지당 항목 수 변경 함수
  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(parseInt(event.target.value));
    setCurrentPage(1); // 페이지당 항목 수가 변경되면 첫 페이지로 이동
  };

  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // 전체 페이지가 5개 이하면 모든 페이지 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 현재 페이지 주변의 페이지들만 표시
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  // 엑셀 다운로드
  const handleDownload = () => {
    // 데이터가 없어도 기본 헤더를 포함한 데이터 생성
    const data = filteredVendors.length > 0 ? filteredVendors.map((vendor, index) => {
      // 전체 목록에서의 순서 번호 계산 (최신 순서)
      const globalIndex = filteredVendors.length - index;
      return {
        'NO.': globalIndex,
        '이름': vendor.name || '',
        '직위': vendor.position || '',
        '번호': vendor.phone || '',
        '주소': vendor.address || '',
        '메일': vendor.email || '',
        '대표자': vendor.ceo || '',
        '사업자번호': vendor.businessNumber || '',
        '회사번호': vendor.companyPhone || '',
        '비고': vendor.note || ''
      };
    }) : [
      {
        'NO.': '',
        '이름': '',
        '직위': '',
        '번호': '',
        '주소': '',
        '메일': '',
        '대표자': '',
        '사업자번호': '',
        '회사번호': '',
        '비고': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    
    // 테두리 스타일 설정
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell_address]) {
          ws[cell_address] = { v: '', t: 's' };
        }
        ws[cell_address].s = {
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '거래처목록');
    XLSX.writeFile(wb, `거래처목록_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 데이터 품질 점수 계산 함수
  const calculateDataQualityScore = (vendorData) => {
    let score = 0;
    
    // 필수 필드 (높은 가중치)
    if (vendorData.name && vendorData.name.trim()) score += 10;
    if (vendorData.companyName && vendorData.companyName.trim()) score += 10;
    
    // 중요 필드 (중간 가중치)
    if (vendorData.phone && vendorData.phone.trim()) score += 8;
    if (vendorData.email && vendorData.email.trim()) score += 6;
    if (vendorData.position && vendorData.position.trim()) score += 5;
    
    // 추가 정보 필드 (낮은 가중치)
    if (vendorData.ceo && vendorData.ceo.trim()) score += 4;
    if (vendorData.businessNumber && vendorData.businessNumber.trim()) score += 4;
    if (vendorData.address && vendorData.address.trim()) score += 3;
    if (vendorData.note && vendorData.note.trim()) score += 2;
    
    return score;
  };

  // 이름과 회사명 정규화 함수
  const normalizeVendorData = (vendorData) => {
    return {
      name: vendorData.name?.trim().toLowerCase() || '',
      companyName: vendorData.companyName?.trim().toLowerCase() || ''
    };
  };

  // 중복 데이터 처리 함수
  const handleDuplicateData = (existingVendors, newVendorData) => {
    const normalizedNew = normalizeVendorData(newVendorData);
    
    // 정확한 매칭과 유사한 매칭 모두 확인
    const exactDuplicates = existingVendors.filter(vendor => {
      const normalizedExisting = normalizeVendorData(vendor);
      return normalizedExisting.name === normalizedNew.name && 
             normalizedExisting.companyName === normalizedNew.companyName;
    });
    
    // 유사한 매칭 (이름이 같고 회사명이 유사한 경우)
    const similarDuplicates = existingVendors.filter(vendor => {
      const normalizedExisting = normalizeVendorData(vendor);
      if (normalizedExisting.name !== normalizedNew.name) return false;
      
      // 회사명 유사도 체크 (공백 제거 후 비교)
      const existingCompany = normalizedExisting.companyName.replace(/\s+/g, '');
      const newCompany = normalizedNew.companyName.replace(/\s+/g, '');
      
      return existingCompany === newCompany || 
             existingCompany.includes(newCompany) || 
             newCompany.includes(existingCompany);
    });
    
    const duplicates = exactDuplicates.length > 0 ? exactDuplicates : similarDuplicates;
    
    if (duplicates.length === 0) {
      return { action: 'add', data: newVendorData };
    }
    
    // 중복이 있는 경우 데이터 품질이 더 높은 것을 유지
    const existingData = duplicates[0];
    const existingScore = calculateDataQualityScore(existingData);
    const newScore = calculateDataQualityScore(newVendorData);
    
    if (newScore > existingScore) {
      // 새로운 데이터가 더 높은 품질이면 기존 데이터를 업데이트
      return { 
        action: 'update', 
        id: existingData.id, 
        data: newVendorData 
      };
    } else if (newScore === existingScore) {
      // 점수가 같으면 더 최근에 생성된 것을 유지
      const existingCreatedAt = existingData.createdAt?.toDate?.() || existingData.createdAt || new Date(0);
      const newCreatedAt = newVendorData.createdAt || new Date();
      
      if (newCreatedAt > existingCreatedAt) {
        return { 
          action: 'update', 
          id: existingData.id, 
          data: newVendorData 
        };
      } else {
        return { action: 'skip' };
      }
    } else {
      // 기존 데이터가 더 높은 품질이면 새로운 데이터는 무시
      return { action: 'skip' };
    }
  };

  // 기존 데이터 중복 정리 함수
  const cleanupDuplicateData = async () => {
    try {
      setSnackbar({ 
        open: true, 
        message: '중복 데이터 정리를 시작합니다...', 
        severity: 'info' 
      });

      // 모든 거래처 데이터 로드
      const vendorsQuery = query(collection(db, 'vendors'), orderBy('name', 'asc'));
      const vendorsSnapshot = await getDocs(vendorsQuery);
      const allVendors = vendorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 진행률 표시 시작
      setUploadProgress({ show: true, current: 0, total: allVendors.length });

      // 중복 그룹 찾기
      const duplicateGroups = [];
      const processedIds = new Set();

      for (let i = 0; i < allVendors.length; i++) {
        // 진행률 업데이트
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));

        if (processedIds.has(allVendors[i].id)) continue;

        const currentVendor = allVendors[i];
        const normalizedCurrent = normalizeVendorData(currentVendor);
        const duplicates = [currentVendor];

        // 같은 이름과 회사명을 가진 다른 거래처들 찾기
        for (let j = i + 1; j < allVendors.length; j++) {
          if (processedIds.has(allVendors[j].id)) continue;

          const otherVendor = allVendors[j];
          const normalizedOther = normalizeVendorData(otherVendor);

          // 정확한 매칭 또는 유사한 매칭 확인
          if (normalizedCurrent.name === normalizedOther.name) {
            const currentCompany = normalizedCurrent.companyName.replace(/\s+/g, '');
            const otherCompany = normalizedOther.companyName.replace(/\s+/g, '');
            
            if (currentCompany === otherCompany || 
                currentCompany.includes(otherCompany) || 
                otherCompany.includes(currentCompany)) {
              duplicates.push(otherVendor);
              processedIds.add(otherVendor.id);
            }
          }
        }

        if (duplicates.length > 1) {
          duplicateGroups.push(duplicates);
        }
        processedIds.add(currentVendor.id);
      }

      let deletedCount = 0;
      let updatedCount = 0;

      // 각 중복 그룹 처리
      for (const group of duplicateGroups) {
        // 데이터 품질 점수 계산
        const scoredGroup = group.map(vendor => ({
          ...vendor,
          score: calculateDataQualityScore(vendor)
        }));

        // 점수순으로 정렬 (높은 점수가 먼저)
        scoredGroup.sort((a, b) => b.score - a.score);

        // 가장 높은 점수의 데이터를 유지하고 나머지는 삭제
        const keepVendor = scoredGroup[0];
        const deleteVendors = scoredGroup.slice(1);

        // 삭제할 데이터들 처리
        for (const deleteVendor of deleteVendors) {
          await deleteDoc(doc(db, 'vendors', deleteVendor.id));
          deletedCount++;
        }

        // 유지할 데이터에 더 많은 정보가 있다면 업데이트
        if (scoredGroup.length > 1) {
          const bestData = scoredGroup[0];
          const mergedData = { ...bestData };
          
          // 다른 데이터에서 누락된 정보 보충
          for (let i = 1; i < scoredGroup.length; i++) {
            const otherData = scoredGroup[i];
            if (!mergedData.phone && otherData.phone) mergedData.phone = otherData.phone;
            if (!mergedData.email && otherData.email) mergedData.email = otherData.email;
            if (!mergedData.position && otherData.position) mergedData.position = otherData.position;
            if (!mergedData.businessNumber && otherData.businessNumber) mergedData.businessNumber = otherData.businessNumber;
            if (!mergedData.address && otherData.address) mergedData.address = otherData.address;
            if (!mergedData.note && otherData.note) mergedData.note = otherData.note;
          }

          // 데이터가 변경되었다면 업데이트
          if (JSON.stringify(mergedData) !== JSON.stringify(bestData)) {
            await updateDoc(doc(db, 'vendors', bestData.id), {
              ...mergedData,
              updatedAt: new Date()
            });
            updatedCount++;
          }
        }
      }

      // 진행률 표시 종료
      setUploadProgress({ show: false, current: 0, total: 0 });

      const message = `중복 데이터 정리 완료: ${deletedCount}개 삭제${updatedCount > 0 ? `, ${updatedCount}개 업데이트` : ''}`;
      setSnackbar({ 
        open: true, 
        message: message, 
        severity: 'success' 
      });

      // 거래처 목록 다시 로드
      await loadVendors();

    } catch (error) {
      console.error('중복 데이터 정리 오류:', error);
      // 진행률 표시 종료
      setUploadProgress({ show: false, current: 0, total: 0 });
      setSnackbar({ 
        open: true, 
        message: `중복 데이터 정리 실패: ${error.message}`, 
        severity: 'error' 
      });
    }
  };

  // 엑셀 업로드
  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
        let skipCount = 0;
        let errorCount = 0;

        // 업로드 진행률 표시 시작
        setUploadProgress({ show: true, current: 0, total: jsonData.length });

        // 기존 거래처 데이터 로드
        const existingVendorsQuery = query(collection(db, 'vendors'), orderBy('name', 'asc'));
        const existingVendorsSnapshot = await getDocs(existingVendorsQuery);
        const existingVendors = existingVendorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // 진행률 업데이트
          setUploadProgress(prev => ({ ...prev, current: i + 1 }));
          try {
            const vendorData = {
              name: row['이름'] || '',
              position: row['직위'] || '',
              phone: row['번호'] || '',
              email: row['메일'] || '',
              companyName: row['회사명'] || '',
              ceo: row['대표자'] || '',
              businessNumber: row['사업자번호'] || '',
              address: row['주소'] || '',
              companyPhone: row['회사번호'] || '',
              note: row['비고'] || '',
              createdAt: new Date()
            };

            if (vendorData.name && vendorData.companyName) {
              const duplicateResult = handleDuplicateData(existingVendors, vendorData);
              
              switch (duplicateResult.action) {
                case 'add':
                  await addDoc(collection(db, 'vendors'), vendorData);
                  successCount++;
                  break;
                case 'update':
                  await updateDoc(doc(db, 'vendors', duplicateResult.id), {
                    ...duplicateResult.data,
                    updatedAt: new Date()
                  });
                  updateCount++;
                  break;
                case 'skip':
                  skipCount++;
                  break;
              }
            }
          } catch (error) {
            console.error('행 업로드 오류:', error);
            errorCount++;
          }
        }

        // 업로드 진행률 표시 종료
        setUploadProgress({ show: false, current: 0, total: 0 });

        const message = `업로드 완료: ${successCount}개 추가, ${updateCount}개 수정${skipCount > 0 ? `, ${skipCount}개 중복 건너뛰기` : ''}${errorCount > 0 ? `, ${errorCount}개 오류` : ''}. 중복된 이름과 회사명은 데이터가 더 많은 것을 유지합니다.`;
        setSnackbar({ 
          open: true, 
          message: message, 
          severity: errorCount > 0 ? 'warning' : 'success' 
        });
        loadVendors();
      } catch (error) {
        console.error('파일 업로드 오류:', error);
        // 업로드 진행률 표시 종료
        setUploadProgress({ show: false, current: 0, total: 0 });
        setSnackbar({ open: true, message: '파일 업로드에 실패했습니다.', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (isMobile) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
          거래처 관리
        </Typography>
        <Typography variant="body2" sx={{ color: '#ccc' }}>
          PC에서 이용해주세요.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative'
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
          backgroundColor: '#1a1a1a', 
          color: '#fff',
          borderRadius: 2,
          boxShadow: 3
        }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon sx={{ fontSize: '2rem', color: '#4caf50' }} />
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#fff' }}>
            거래처 관리
          </Typography>
          <Chip 
            label={`총 ${filteredVendors.length}개`} 
            sx={{ backgroundColor: '#4caf50', color: '#fff' }} 
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="엑셀 파일을 업로드합니다. 이름과 회사명이 중복된 경우 데이터가 더 많은 것을 유지합니다.">
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              component="label"
              sx={{
                borderColor: '#666',
                color: '#fff',
                '&:hover': { borderColor: '#4caf50' }
              }}
            >
              업로드
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
            </Button>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#4caf50' }
            }}
          >
            다운로드
          </Button>
          <Tooltip title="중복된 거래처 데이터를 정리합니다. 이름과 회사명이 같은 경우 데이터가 더 많은 것을 유지합니다.">
            <Button
              variant="outlined"
              onClick={cleanupDuplicateData}
              sx={{
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': { borderColor: '#f57c00' }
              }}
            >
              중복정리
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': { backgroundColor: '#45a049' }
            }}
          >
            거래처 추가
          </Button>
          
          
        </Box>
      </Box>

      {/* 검색 및 정렬 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="거래처 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#666' },
              '&.Mui-focused fieldset': { borderColor: '#4caf50' }
            },
            '& .MuiInputBase-input': { color: '#fff' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#666' }} />
              </InputAdornment>
            )
          }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#ccc' }}>정렬</InputLabel>
          <Select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              setSortField(field);
              setSortDirection(direction);
            }}
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#4caf50' }
              }
            }}
          >
            <MenuItem value="name-asc">이름 ↑</MenuItem>
            <MenuItem value="name-desc">이름 ↓</MenuItem>
            <MenuItem value="companyName-asc">회사명 ↑</MenuItem>
            <MenuItem value="companyName-desc">회사명 ↓</MenuItem>
            <MenuItem value="createdAt-desc">최신순</MenuItem>
            <MenuItem value="createdAt-asc">오래된순</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 거래처 테이블 */}
      <TableContainer component={Paper} sx={{ backgroundColor: '#2a2a2a' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#333' }}>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600, 
                width: 80,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 표시
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  width: '10%'
                }
              }}>NO.</TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600, 
                cursor: 'pointer',
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 표시
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  width: '15%'
                }
              }} onClick={() => handleSort('name')}>
                이름 
                <SortIcon sx={{ 
                  fontSize: '1rem', 
                  ml: 0.5,
                  transform: sortField === 'name' && sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s'
                }} />
              </TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 표시
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  width: '12%'
                }
              }}>직책</TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 표시
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  width: '15%'
                }
              }}>번호</TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 표시
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  width: '18%'
                }
              }}>메일</TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600, 
                cursor: 'pointer',
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 표시
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  width: '15%'
                }
              }} onClick={() => handleSort('companyName')}>
                회사명 
                <SortIcon sx={{ 
                  fontSize: '1rem', 
                  ml: 0.5,
                  transform: sortField === 'companyName' && sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s'
                }} />
              </TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 숨김
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  display: 'none'
                }
              }}>대표자</TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 숨김
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  display: 'none'
                }
              }}>사업자번호</TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 숨김
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  display: 'none'
                }
              }}>주소</TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 숨김
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  display: 'none'
                }
              }}>비고</TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600, 
                width: 120,
                py: 1,
                fontSize: '0.9rem',
                // 아이패드에서 표시
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  width: '15%'
                }
              }}>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentVendors.map((vendor, index) => {
              // 최신 등록 순서대로 번호 계산 (마지막 번호부터)
              const globalIndex = filteredVendors.length - filteredVendors.findIndex(v => v.id === vendor.id);
              return (
                <TableRow key={vendor.id} sx={{ '&:hover': { backgroundColor: '#333' }, '& td': { py: 1, fontSize: '0.9rem' } }}>
                  <TableCell sx={{ 
                    color: '#fff',
                    // 아이패드에서 표시
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      display: 'table-cell'
                    }
                  }}>{globalIndex}</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 500,
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'table-cell'
                  }
                }}>{vendor.name}</TableCell>
                <TableCell sx={{ 
                  color: '#fff',
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'table-cell'
                  }
                }}>{vendor.position}</TableCell>
                <TableCell sx={{ 
                  color: '#fff',
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'table-cell'
                  }
                }}>{vendor.phone}</TableCell>
                <TableCell sx={{ 
                  color: '#fff',
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'table-cell'
                  }
                }}>{vendor.email}</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 500,
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'table-cell'
                  }
                }}>{vendor.companyName}</TableCell>
                <TableCell sx={{ 
                  color: '#fff',
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  }
                }}>{vendor.ceo}</TableCell>
                <TableCell sx={{ 
                  color: '#fff',
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  }
                }}>{vendor.businessNumber}</TableCell>
                <TableCell sx={{ 
                  color: '#fff',
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  }
                }}>{vendor.address}</TableCell>
                <TableCell sx={{ 
                  color: '#fff',
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  }
                }}>{vendor.note}</TableCell>
                <TableCell sx={{
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'table-cell'
                  }
                }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="수정">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(vendor)}
                        sx={{ color: '#4caf50' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(vendor)}
                        sx={{ color: '#f44336' }}
                      >
                        <DeleteIcon fontSize="small" />
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

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mt: 3, 
          p: 2, 
          backgroundColor: '#2a2a2a',
          borderRadius: 1
        }}>
          {/* 페이지당 항목 수 선택 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ color: '#ccc', fontSize: '0.875rem' }}>
              페이지당:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  }
                }}
              >
                <MenuItem value={5}>5개</MenuItem>
                <MenuItem value={10}>10개</MenuItem>
                <MenuItem value={20}>20개</MenuItem>
                <MenuItem value={50}>50개</MenuItem>
              </Select>
            </FormControl>
            <Typography sx={{ color: '#ccc', fontSize: '0.875rem' }}>
              총 {filteredVendors.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredVendors.length)}개
            </Typography>
          </Box>

          {/* 페이지 네비게이션 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 첫 페이지 버튼 */}
            <IconButton
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              sx={{
                color: currentPage === 1 ? '#666' : '#4caf50',
                '&:hover': { backgroundColor: currentPage === 1 ? 'transparent' : '#4caf50' + '20' }
              }}
            >
              <FirstPageIcon />
            </IconButton>

            {/* 이전 페이지 버튼 */}
            <IconButton
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              sx={{
                color: currentPage === 1 ? '#666' : '#4caf50',
                '&:hover': { backgroundColor: currentPage === 1 ? 'transparent' : '#4caf50' + '20' }
              }}
            >
              <NavigateBeforeIcon />
            </IconButton>

            {/* 페이지 번호들 */}
            {getPageNumbers().map((page) => (
              <Button
                key={page}
                onClick={() => handlePageChange(page)}
                variant={currentPage === page ? 'contained' : 'outlined'}
                sx={{
                  minWidth: 40,
                  height: 40,
                  backgroundColor: currentPage === page ? '#4caf50' : 'transparent',
                  color: currentPage === page ? '#fff' : '#4caf50',
                  borderColor: '#4caf50',
                  '&:hover': {
                    backgroundColor: currentPage === page ? '#45a049' : '#4caf50' + '20'
                  }
                }}
              >
                {page}
              </Button>
            ))}

            {/* 다음 페이지 버튼 */}
            <IconButton
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              sx={{
                color: currentPage === totalPages ? '#666' : '#4caf50',
                '&:hover': { backgroundColor: currentPage === totalPages ? 'transparent' : '#4caf50' + '20' }
              }}
            >
              <NavigateNextIcon />
            </IconButton>

            {/* 마지막 페이지 버튼 */}
            <IconButton
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              sx={{
                color: currentPage === totalPages ? '#666' : '#4caf50',
                '&:hover': { backgroundColor: currentPage === totalPages ? 'transparent' : '#4caf50' + '20' }
              }}
            >
              <LastPageIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* 거래처 추가/수정 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: { backgroundColor: '#2a2a2a' }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>
          {editingVendor ? '거래처 수정' : '거래처 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField
              label="이름"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              label="직위"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
              label="번호"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
              placeholder="000-0000-0000 또는 000-000-0000"
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
              label="메일"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            <Box sx={{ position: 'relative', gridColumn: '1 / -1' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '4fr 3fr 3fr', gap: 2 }}>
                <TextField
                  label="회사명"
                  value={formData.companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  onFocus={() => {
                    if (companySuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // 약간의 지연을 두어 클릭 이벤트가 처리되도록 함
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="회사명 입력 시 기존 정보 자동 입력"
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
                  label="대표자"
                  value={formData.ceo}
                  onChange={(e) => setFormData({ ...formData, ceo: e.target.value })}
                  placeholder="대표자명"
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
                  label="사업자번호"
                  value={formData.businessNumber}
                  onChange={(e) => setFormData({ ...formData, businessNumber: formatBusinessNumber(e.target.value) })}
                  placeholder="000-00-00000"
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
              </Box>
              {showSuggestions && companySuggestions.length > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    borderRadius: 1,
                    maxHeight: 200,
                    overflowY: 'auto',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  {companySuggestions.map((suggestion, index) => (
                    <Box
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        color: '#fff',
                        borderBottom: index < companySuggestions.length - 1 ? '1px solid #555' : 'none',
                        '&:hover': {
                          backgroundColor: '#4caf50',
                          color: '#fff'
                        }
                      }}
                    >
                      {suggestion}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            <TextField
              label="주소"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              sx={{
                gridColumn: '1 / -1',
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
              label="회사번호"
              value={formData.companyPhone}
              onChange={(e) => setFormData({ ...formData, companyPhone: formatPhoneNumber(e.target.value) })}
              placeholder="000-0000-0000 또는 000-000-0000"
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
              label="비고"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              multiline
              rows={3}
              sx={{
                gridColumn: '1 / -1',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #444' }}>
          <Button onClick={handleCloseDialog} sx={{ color: '#ccc' }}>
            취소
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': { backgroundColor: '#45a049' }
            }}
          >
            {editingVendor ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 업로드 진행률 다이얼로그 */}
      <Dialog
        open={uploadProgress.show}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: { backgroundColor: '#2a2a2a' }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>
          업로드 진행 중...
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
              {uploadProgress.current} / {uploadProgress.total} 처리 중...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(uploadProgress.current / uploadProgress.total) * 100}
              sx={{
                backgroundColor: '#444',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#4caf50'
                }
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
        </Box>
      </Container>
    </Box>
  );
};

export default VendorManagement; 