import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  InputAdornment,
  Snackbar,
  Paper,
  Divider,
  Autocomplete,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Star as StarIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  CloudUpload as CloudUploadIcon,
  FileUpload as FileUploadIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { isMasterUser } from '../utils/masterUtils';
import { formatNumber } from '../utils/formatUtils';
import ExcelJS from 'exceljs';

// 전화번호 포맷팅 함수 (전역 함수)
const formatPhoneNumber = (value) => {
  // null, undefined, 빈 문자열 처리
  if (!value || value === null || value === undefined) {
    return '';
  }
  
  // 문자열로 변환
  const stringValue = String(value);
  
  // 숫자만 추출
  const numbers = stringValue.replace(/\D/g, '');
  
  // 숫자가 없으면 빈 문자열 반환
  if (numbers.length === 0) {
    return '';
  }
  
  // 3자리 이하
  if (numbers.length <= 3) {
    return numbers;
  }
  // 4-7자리 (예: 010-1234)
  else if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  }
  // 8-10자리 (예: 010-1234-5678)
  else if (numbers.length <= 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  }
  // 11자리 (예: 010-1234-5678)
  else if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }
  // 11자리 초과시 11자리까지만 사용
  else {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }
};

const GiftListTab = ({ selectedYear: propSelectedYear, selectedHoliday: propSelectedHoliday }) => {
  const { currentUser } = useAuth();
  const isMaster = isMasterUser(currentUser);
  
  // 상태 관리
  const [giftData, setGiftData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [filteredVendorCount, setFilteredVendorCount] = useState(0);
  const [filteredGiftData, setFilteredGiftData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(propSelectedYear || new Date().getFullYear());
  const [selectedHoliday, setSelectedHoliday] = useState(propSelectedHoliday || '설날');
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  
  // 섹션 관리 상태 - Firebase에서 불러오기
  const [sections, setSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sectionEditingStates, setSectionEditingStates] = useState({});
  
  // 카드 편집 상태
  const [editingCard, setEditingCard] = useState(null);
  const [editingCardName, setEditingCardName] = useState('');
  const [editingCardCompany, setEditingCardCompany] = useState('');
  const [editingCardPosition, setEditingCardPosition] = useState('');
  const [editingCardPhone, setEditingCardPhone] = useState('');
  const [editingCardAddress, setEditingCardAddress] = useState('');
  const [editingCardQuantity, setEditingCardQuantity] = useState(1);
  const [editingCardNote, setEditingCardNote] = useState('');
  const [editingCardGiftName, setEditingCardGiftName] = useState('');
  
  // 선택 상태 관리
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  
  // 섹션 드래그앤드롭 상태
  const [draggedSection, setDraggedSection] = useState(null);
  const [dragOverSectionId, setDragOverSectionId] = useState(null);
  
  // 섹션 높이 편집 상태
  const [editingSectionHeight, setEditingSectionHeight] = useState(null);
  const [editingHeight, setEditingHeight] = useState('');
  
  // 섹션별 검색 상태
  const [sectionSearchTerms, setSectionSearchTerms] = useState({});



  
  // 폼 데이터
  const [formData, setFormData] = useState({
    recipient: '',
    company: '',
    position: '',
    giftType: '',
    amount: '',
    giftDate: null,
    status: '예정',
    note: '',
    year: new Date().getFullYear(),
    holiday: '설날'
  });

  // 거래처 폼 데이터
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    company: '',
    ceo: '',
    businessNumber: '',
    address: '',
    note: ''
  });

  // 거래처 데이터 로드 (실시간 업데이트)
  const loadVendorData = async () => {
    try {
      // 실시간 업데이트를 위한 onSnapshot 사용
      const unsubscribe = onSnapshot(collection(db, 'vendors'), (snapshot) => {
        const vendors = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVendorData(vendors);
        console.log('거래처 데이터 실시간 업데이트:', vendors.length, '개');
      });
      
      // 컴포넌트 언마운트 시 구독 해제
      return unsubscribe;
    } catch (error) {
      console.error('거래처 데이터 로드 오류:', error);
    }
  };

  // 명절선물 데이터 로드
  const loadGiftData = async () => {
    try {
      setLoading(true);
      const giftSnapshot = await getDocs(collection(db, 'gifts'));
      const gifts = giftSnapshot.docs.map(doc => {
        const docData = doc.data();
        let giftDate = docData.giftDate;
        if (giftDate) {
          if (giftDate.toDate) {
            giftDate = giftDate.toDate().toISOString().split('T')[0];
          }
        }
        return {
          id: doc.id,
          ...docData,
          giftDate
        };
      });
      setGiftData(gifts);
      
      // 마지막에 저장된 명절로 기본값 설정
      if (gifts.length > 0) {
        // 최신 데이터부터 정렬 (createdAt 기준)
        const sortedGifts = gifts.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
        
        const latestGift = sortedGifts[0];
        if (latestGift.holiday) {
          setSelectedHoliday(latestGift.holiday);
        }
        if (latestGift.year) {
          setSelectedYear(latestGift.year);
        }
      }
    } catch (error) {
      console.error('명절선물 데이터 로드 오류:', error);
      setSnackbar({ open: true, message: '데이터 로드 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 데이터 필터링
  const filteredData = useMemo(() => {
    let filtered = giftData.filter(item => {
      const matchesSearch = !searchTerm || 
        item.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYear = item.year === selectedYear;
      const matchesHoliday = item.holiday === selectedHoliday;
      
      return matchesSearch && matchesYear && matchesHoliday;
    });
    
    return filtered;
  }, [giftData, searchTerm, selectedYear, selectedHoliday]);

  // Firebase에서 섹션 데이터 실시간 로드
  const loadSectionsData = () => {
    console.log('섹션 데이터 실시간 로드 시작:', { selectedYear, selectedHoliday });
    
    // 현재 선택된 연도와 명절에 맞는 섹션만 쿼리
    const sectionsQuery = query(
      collection(db, 'giftSections'),
      where('year', '==', selectedYear),
      where('holiday', '==', selectedHoliday)
    );
    
    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(sectionsQuery, (sectionsSnapshot) => {
      try {
        const sectionsData = sectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // order 필드로 정렬 (order가 없는 경우 999로 설정하여 맨 뒤로)
        const sortedSections = sectionsData.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 999;
          const orderB = b.order !== undefined ? b.order : 999;
          return orderA - orderB;
        });
        
        console.log('실시간 섹션 데이터 업데이트 (정렬됨):', sortedSections);
        setSections(sortedSections);
      } catch (error) {
        console.error('섹션 데이터 처리 오류:', error);
        setSections([]);
      }
    }, (error) => {
      console.error('섹션 데이터 구독 오류:', error);
      setSections([]);
    });
    
    return unsubscribe;
  };

  // Firebase에서 카드 데이터 실시간 로드
  const loadCardsData = () => {
    console.log('카드 데이터 실시간 로드 시작:', { selectedYear, selectedHoliday });
    
    // 현재 선택된 연도와 명절에 맞는 카드만 쿼리
    const cardsQuery = query(
      collection(db, 'giftCards'),
      where('year', '==', selectedYear),
      where('holiday', '==', selectedHoliday)
    );
    
    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(cardsQuery, (cardsSnapshot) => {
      try {
        const cardsData = cardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('실시간 카드 데이터 업데이트:', cardsData);
        
        // 섹션별로 카드 그룹화
        const cardsBySection = {};
        cardsData.forEach(card => {
          if (!cardsBySection[card.sectionId]) {
            cardsBySection[card.sectionId] = [];
          }
          cardsBySection[card.sectionId].push(card);
        });
        
        // 섹션 내에서 정렬: 새카드는 맨 뒤로, 기존 카드는 직책별로 정렬
        Object.keys(cardsBySection).forEach(sectionId => {
          const sectionCards = cardsBySection[sectionId];
          if (sectionCards.length > 0) {
            const sortedCards = sectionCards.sort((a, b) => {
              // 새카드인지 확인 (isNewCard가 true이거나 이름이 '새 카드'인 경우)
              const isNewCardA = a.isNewCard === true || a.name === '새 카드';
              const isNewCardB = b.isNewCard === true || b.name === '새 카드';
              
              // 새카드는 항상 맨 뒤로
              if (isNewCardA && !isNewCardB) return 1; // 새카드를 뒤로
              if (!isNewCardA && isNewCardB) return -1; // 기존 카드를 앞으로
              
              // 둘 다 새카드이거나 둘 다 기존 카드인 경우
              if (isNewCardA && isNewCardB) {
                // 새카드끼리는 생성 시간 순으로 정렬 (최신이 맨 뒤)
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return aTime - bTime;
              }
              
              // 기존 카드들끼리는 기존 정렬 로직 적용
              // 직책이 "회사"인지 확인
              const isCompanyA = a.position === '회사';
              const isCompanyB = b.position === '회사';
              
              // 직책이 회사인 카드들을 앞쪽에 배치
              if (isCompanyA && !isCompanyB) return -1; // 회사 카드를 먼저
              if (!isCompanyA && isCompanyB) return 1;  // 개인 카드를 나중에
              
              // 같은 타입 내에서 이름으로 가나다 순 정렬
              const nameA = (a.name || '').trim();
              const nameB = (b.name || '').trim();
              return nameA.localeCompare(nameB, 'ko');
            });
            
            cardsBySection[sectionId] = sortedCards;
          }
        });
        
        console.log('실시간 섹션별 카드 그룹화:', cardsBySection);
        
        // 섹션에 카드 데이터 추가
        setSections(prev => {
          const updatedSections = prev.map(section => ({
            ...section,
            cards: cardsBySection[section.id] || []
          }));
          console.log('실시간 업데이트된 섹션들:', updatedSections);
          return updatedSections;
        });
      } catch (error) {
        console.error('카드 데이터 처리 오류:', error);
      }
    }, (error) => {
      console.error('카드 데이터 구독 오류:', error);
    });
    
    return unsubscribe;
  };

  useEffect(() => {
    let unsubscribeVendor = null;
    let unsubscribeSections = null;
    let unsubscribeCards = null;
    
    const initializeData = async () => {
      unsubscribeVendor = await loadVendorData();
      loadGiftData();
      unsubscribeSections = loadSectionsData();
      unsubscribeCards = loadCardsData();
    };
    
    initializeData();
    
    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      if (unsubscribeVendor && typeof unsubscribeVendor === 'function') {
        unsubscribeVendor();
      }
      if (unsubscribeSections && typeof unsubscribeSections === 'function') {
        unsubscribeSections();
      }
      if (unsubscribeCards && typeof unsubscribeCards === 'function') {
        unsubscribeCards();
      }
    };
  }, [selectedYear, selectedHoliday]); // 연도/명절 변경 시에도 리스너 재설정

  // props가 변경될 때 상태 업데이트
  useEffect(() => {
    if (propSelectedYear) {
      setSelectedYear(propSelectedYear);
    }
    if (propSelectedHoliday) {
      setSelectedHoliday(propSelectedHoliday);
    }
  }, [propSelectedYear, propSelectedHoliday]);

  // 다이얼로그 열기
  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      let giftDate = null;
      if (item.giftDate) {
        try {
          giftDate = new Date(item.giftDate);
        } catch (error) {
          console.error('날짜 파싱 오류:', error);
        }
      }
      
      setFormData({
        recipient: item.recipient || '',
        company: item.company || '',
        position: item.position || '',
        giftType: item.giftType || '',
        amount: item.amount || '',
        giftDate: giftDate,
        status: item.status || '예정',
        note: item.note || '',
        year: item.year || selectedYear,
        holiday: item.holiday || selectedHoliday
      });
    } else {
      setEditingItem(null);
      setFormData({
        recipient: '',
        company: '',
        position: '',
        giftType: '',
        amount: '',
        giftDate: null,
        status: '예정',
        note: '',
        year: selectedYear,
        holiday: selectedHoliday
      });
    }
    setOpenDialog(true);
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
    setFormData({
      recipient: '',
      company: '',
      position: '',
      giftType: '',
      amount: '',
      giftDate: null,
      status: '예정',
      note: '',
      year: new Date().getFullYear(),
      holiday: '설날'
    });
  };

  // 저장
  const handleSave = async () => {
    if (!formData.recipient.trim() || !formData.company.trim()) {
      setSnackbar({ open: true, message: '수령자와 회사명을 입력해주세요.', severity: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const normalizedData = {
        ...formData,
        giftDate: formData.giftDate ? formData.giftDate.toISOString().split('T')[0] : null,
        amount: formData.amount ? parseFloat(formData.amount) : 0,
        // 현재 선택된 명절과 년도를 기본값으로 사용
        holiday: formData.holiday || selectedHoliday,
        year: formData.year || selectedYear
      };

      if (editingItem) {
        await updateDoc(doc(db, 'gifts', editingItem.id), {
          ...normalizedData,
          updatedAt: serverTimestamp()
        });
        setSnackbar({ open: true, message: '수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, 'gifts'), {
          ...normalizedData,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'unknown'
        });
        setSnackbar({ open: true, message: '등록되었습니다.', severity: 'success' });
      }
      handleCloseDialog();
      loadGiftData();
    } catch (error) {
      console.error('저장 오류:', error);
      setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    if (!isMaster) {
      setSnackbar({ open: true, message: '마스터만 삭제할 수 있습니다.', severity: 'error' });
      return;
    }
    
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'gifts', id));
        setSnackbar({ open: true, message: '삭제되었습니다.', severity: 'success' });
        loadGiftData();
      } catch (error) {
        console.error('삭제 오류:', error);
        setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다.', severity: 'error' });
      }
    }
  };

  // 엑셀 다운로드 (ExcelJS 사용, 섹션별로 구분)
  const handleDownload = async () => {
    try {
      // 새 워크북 생성
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('명절선물목록');
      
      // 제목 설정
      const title = `${selectedYear}년 ${selectedHoliday} 선물 리스트`;
      const titleRow = worksheet.addRow([title]);
      titleRow.height = 30;
      
      // 제목 셀 병합 (A1~I1)
      worksheet.mergeCells('A1:I1');
      const titleCell = worksheet.getCell('A1');
      titleCell.font = {
        name: '맑은 고딕',
        size: 18,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      titleCell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' } // 파란색 배경
      };
      titleCell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } }
      };
      
      // 총계 계산
      let totalPeople = 0;
      let totalAmount = 0;
      
      // 선물개수 총합에서 제외할 섹션들
      const excludeFromCount = ['직원', '팀별', '대마팀', '대마', '현장', '현장별', '중복', '신세계', '상품권'];
      
      sections.forEach(section => {
        const cards = section.cards || [];
        const sectionPeople = cards.length;
        const sectionQuantity = cards.reduce((sum, card) => sum + (card.quantity || 1), 0);
        const sectionAmount = (section.unitPrice || 0) * sectionQuantity;

        // 특정 섹션들은 선물개수 총합에서 제외
        if (!excludeFromCount.includes(section.title)) {
          totalPeople += sectionPeople;
        }
        
        // 금액은 모든 섹션에서 합산
        totalAmount += sectionAmount;
      });
      
      // 총계 행 추가
      const totalRow = worksheet.addRow([`총계: ${totalPeople.toLocaleString()}명, 총 금액: ${totalAmount.toLocaleString()}원`]);
      totalRow.height = 25;
      
      // 총계 셀 병합 (A2~I2)
      worksheet.mergeCells('A2:I2');
      const totalCell = worksheet.getCell('A2');
      totalCell.font = {
        name: '맑은 고딕',
        size: 14,
        bold: true,
        color: { argb: 'FF000000' }
      };
      totalCell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      totalCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      totalCell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } }
      };
      
      // 빈 행 추가
      const emptyRow = worksheet.addRow(['']);
      emptyRow.height = 10;
      
      let currentRow = 4; // 총계 다음 행부터 시작
      
      // 각 섹션별로 처리
      sections.forEach((section, sectionIndex) => {
        if (!section.cards || section.cards.length === 0) return;
        
        // 섹션 제목 행 추가
        const sectionTitleRow = worksheet.addRow([`📋 ${section.title}`]);
        sectionTitleRow.height = 25;
        
        // 섹션 제목 셀 병합 (A~I열)
        worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
        const sectionTitleCell = worksheet.getCell(`A${currentRow}`);
        sectionTitleCell.font = {
          name: '맑은 고딕',
          size: 14,
          bold: true,
          color: { argb: 'FFFFFFFF' }
        };
        sectionTitleCell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
        sectionTitleCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' } // 파란색 배경
        };
        sectionTitleCell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          right: { style: 'medium', color: { argb: 'FF000000' } }
        };
        
        currentRow++;
        
        // 헤더 행 추가
        const headers = ['번호', '이름', '회사명', '직책', '전화번호', '주소', '선물', '개수', '비고'];
        const headerRow = worksheet.addRow(headers);
        headerRow.height = 25;
        
        // 헤더 셀들 스타일 적용
        headers.forEach((header, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.font = {
            name: '맑은 고딕',
            size: 12,
            bold: true,
            color: { argb: 'FF000000' }
          };
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };
          cell.border = {
            top: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            right: { style: 'medium', color: { argb: 'FF000000' } }
          };
        });
        
        currentRow++;
        
        // 섹션 내 카드들을 정렬: 직책이 회사인 카드들을 이름 가나다 순으로 앞쪽에, 나머지를 이름 가나다 순으로 뒤쪽에
        const sortedCards = (section.cards || []).sort((a, b) => {
          // 직책이 "회사"인지 확인
          const isCompanyA = a.position === '회사';
          const isCompanyB = b.position === '회사';
          
          // 직책이 회사인 카드들을 앞쪽에 배치
          if (isCompanyA && !isCompanyB) return -1; // 회사 카드를 먼저
          if (!isCompanyA && isCompanyB) return 1;  // 개인 카드를 나중에
          
          // 같은 타입 내에서 이름으로 가나다 순 정렬
          const nameA = (a.name || '').trim();
          const nameB = (b.name || '').trim();
          return nameA.localeCompare(nameB, 'ko');
        });
        
        // 데이터 행 추가
        sortedCards.forEach((card, cardIndex) => {
          const dataRow = worksheet.addRow([
            cardIndex + 1,
            card.name || '',
            card.company || '',
            card.position || '',
            card.phone || '',
            card.address || '',
            card.giftName || section.giftName || '', // 카드의 선물종류 또는 섹션의 선물종류
            card.quantity || 1,
            card.note || ''
          ]);
          dataRow.height = 20;
          
          // 데이터 셀 스타일 적용
          for (let col = 1; col <= 9; col++) {
            const cell = worksheet.getCell(currentRow, col);
            cell.font = {
              name: '맑은 고딕',
              size: 11,
              color: { argb: 'FF000000' }
            };
            cell.alignment = {
              horizontal: 'center',
              vertical: 'middle'
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
          }
          
          currentRow++;
        });
        
        // 섹션 간 구분을 위한 빈 행 추가 (마지막 섹션이 아닌 경우)
        if (sectionIndex < (sections?.length || 0) - 1) {
          const emptyRow = worksheet.addRow(['', '', '', '', '', '', '', '', '']);
          emptyRow.height = 10;
          currentRow++;
        }
      });
      
      // 열 너비 설정
      worksheet.columns = [
        { width: 8 },  // A열 (번호)
        { width: 15 }, // B열 (이름)
        { width: 20 }, // C열 (회사명)
        { width: 15 }, // D열 (직책)
        { width: 15 }, // E열 (전화번호)
        { width: 25 }, // F열 (주소)
        { width: 15 }, // G열 (선물)
        { width: 8 },  // H열 (개수)
        { width: 20 }  // I열 (비고)
      ];
      
      // 파일 다운로드
      const fileName = `${selectedYear}년_${selectedHoliday}_선물리스트_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Blob 생성 및 다운로드
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
      
      setSnackbar({ 
        open: true, 
        message: '엑셀 파일이 다운로드되었습니다.', 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      setSnackbar({ 
        open: true, 
        message: '엑셀 파일 다운로드 중 오류가 발생했습니다.', 
        severity: 'error' 
      });
    }
  };


  // 거래처 다이얼로그 열기
  const handleOpenVendorDialog = (vendor = null) => {
    console.log('handleOpenVendorDialog 호출됨:', vendor);
    if (vendor) {
      console.log('vendor 데이터:', vendor);
      console.log('vendor.company:', vendor.company);
      console.log('vendor.companyName:', vendor.companyName);
      setEditingVendor(vendor);
      const formData = {
        name: vendor.name || '',
        position: vendor.position || '',
        phone: formatPhoneNumber(vendor.phone || ''), // 기존 전화번호도 포맷팅
        email: vendor.email || '',
        company: vendor.company || vendor.companyName || '', // companyName도 확인
        ceo: vendor.ceo || '',
        businessNumber: vendor.businessNumber || '',
        address: vendor.address || '',
        note: vendor.note || ''
      };
      console.log('설정할 formData:', formData);
      setVendorFormData(formData);
    } else {
      setEditingVendor(null);
      setVendorFormData({
        name: '',
        position: '',
        phone: '',
        email: '',
        company: '',
        ceo: '',
        businessNumber: '',
        address: '',
        note: ''
      });
    }
    setVendorDialogOpen(true);
  };

  // 거래처 다이얼로그 닫기
  const handleCloseVendorDialog = () => {
    setVendorDialogOpen(false);
    setEditingVendor(null);
    setVendorFormData({
      name: '',
      position: '',
      phone: '',
      email: '',
      company: '',
      ceo: '',
      businessNumber: '',
      address: '',
      note: ''
    });
  };

  // 거래처 저장
  const handleSaveVendor = async () => {
    if (!vendorFormData.name.trim() || !vendorFormData.company.trim()) {
      setSnackbar({ open: true, message: '담당자명과 회사명을 입력해주세요.', severity: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const normalizedData = {
        ...vendorFormData,
        name: vendorFormData.name.trim(),
        company: vendorFormData.company.trim(),
        position: vendorFormData.position.trim(),
        phone: vendorFormData.phone.trim(),
        email: vendorFormData.email.trim(),
        ceo: vendorFormData.ceo.trim(),
        businessNumber: vendorFormData.businessNumber.trim(),
        address: vendorFormData.address.trim(),
        note: vendorFormData.note.trim()
      };

      if (editingVendor) {
        await updateDoc(doc(db, 'vendors', editingVendor.id), {
          ...normalizedData,
          updatedAt: serverTimestamp()
        });
        setSnackbar({ open: true, message: '거래처가 수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, 'vendors'), {
          ...normalizedData,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'unknown'
        });
        setSnackbar({ open: true, message: '거래처가 등록되었습니다.', severity: 'success' });
      }
      handleCloseVendorDialog();
    } catch (error) {
      console.error('거래처 저장 오류:', error);
      setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 거래처 삭제
  const handleDeleteVendor = async (vendorId) => {
    if (!isMaster) {
      setSnackbar({ open: true, message: '마스터만 삭제할 수 있습니다.', severity: 'error' });
      return;
    }
    
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'vendors', vendorId));
        setSnackbar({ open: true, message: '거래처가 삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('거래처 삭제 오류:', error);
        setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다.', severity: 'error' });
      }
    }
  };

  // 드래그앤드롭 상태
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);

  // 거래처 드래그 시작
  const handleDragStart = (e, vendor) => {
    console.log('드래그된 거래처 데이터:', vendor); // 디버깅용
    setDraggedItem({ type: 'vendor', data: vendor });
    e.dataTransfer.effectAllowed = 'move';
  };

  // 카드 드래그 시작
  const handleCardDragStart = (e, card, sourceSectionId) => {
    console.log('카드 드래그 시작:', { card, sourceSectionId });
    e.stopPropagation();
    setDraggedCard({ card, sourceSectionId });
    e.dataTransfer.effectAllowed = 'move';
  };

  // 드래그 오버
  const handleDragOver = (e, sectionId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(sectionId);
  };

  // 드래그 리브
  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  // 드롭
  const handleDrop = async (e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('드롭 이벤트:', { sectionId, draggedItem, draggedCard });
    
    try {
      if (draggedItem && draggedItem.type === 'vendor') {
        // 거래처를 섹션에 추가
        const cardName = draggedItem.data.name;
        const cardCompany = draggedItem.data.company || draggedItem.data.companyName || draggedItem.data.company_name || '회사명 없음';
        
        // 중복 체크
        if (checkCardDuplicate(cardName, cardCompany, sectionId)) {
          setSnackbar({ 
            open: true, 
            message: '중복입니다', 
            severity: 'warning' 
          });
          return;
        }
        
        // 전체 섹션의 최대 카드 번호 찾기 (1-100번 저장, 새카드는 101번부터)
        let maxCardNumber = 0;
        sections.forEach(section => {
          if (section?.cards) {
            section.cards.forEach(card => {
              if (card.cardNumber && card.cardNumber > maxCardNumber) {
                maxCardNumber = card.cardNumber;
              }
            });
          }
        });
        
        // 새 카드 번호는 전체 최대 번호 + 1 (101번부터 시작)
        const newCardNumber = maxCardNumber + 1;
        
        const newCardData = {
          type: 'vendor',
          name: cardName,
          company: cardCompany,
          phone: draggedItem.data.phone || '전화번호 없음',
          position: draggedItem.data.position || '',
          quantity: 1,
          note: '',
          sectionId: sectionId,
          year: selectedYear,
          holiday: selectedHoliday,
          isNewCard: true, // 드래그앤드롭으로 추가된 카드도 마지막에 배치
          cardNumber: newCardNumber, // 고유한 카드 번호 추가
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'unknown'
        };
        
        const docRef = await addDoc(collection(db, 'giftCards'), newCardData);
        const newCard = { id: docRef.id, ...newCardData };
        
        // 거래처 자동 추가
        await checkAndAddVendor(cardName, cardCompany, draggedItem.data.position || '', draggedItem.data.phone || '', draggedItem.data.address || '');
        
        // Firebase 실시간 리스너가 자동으로 UI를 업데이트하므로 로컬 상태 업데이트 제거
        
        setSnackbar({ open: true, message: '거래처가 추가되었습니다.', severity: 'success' });
      } else if (draggedCard) {
        // 카드를 다른 섹션으로 이동
        await updateDoc(doc(db, 'giftCards', draggedCard.card.id), {
          sectionId: sectionId,
          updatedAt: serverTimestamp()
        });
        
        // Firebase 실시간 리스너가 자동으로 UI를 업데이트하므로 로컬 상태 업데이트 제거
        
        setSnackbar({ open: true, message: '카드가 이동되었습니다.', severity: 'success' });
      }
    } catch (error) {
      console.error('드롭 처리 오류:', error);
      setSnackbar({ open: true, message: '드롭 처리 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      // 드래그 상태 초기화
      setDraggedItem(null);
      setDraggedCard(null);
      setDragOverSection(null);
    }
  };

  // 카드 삭제
  const handleDeleteCard = async (sectionId, cardId) => {
    try {
      await deleteDoc(doc(db, 'giftCards', cardId));
      
      // Firebase 실시간 리스너가 자동으로 UI를 업데이트하므로 로컬 상태 업데이트 제거
      
      setSnackbar({ open: true, message: '카드가 삭제되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('카드 삭제 오류:', error);
      setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 카드 선택/해제
  const handleToggleCardSelection = (cardId) => {
    console.log('카드 선택 토글:', cardId, '선택 모드:', selectMode);
    if (!selectMode) return;
    
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
        console.log('카드 선택 해제:', cardId);
      } else {
        newSet.add(cardId);
        console.log('카드 선택:', cardId);
      }
      return newSet;
    });
  };

  // 전체 선택
  const handleSelectAll = () => {
    const allCardIds = (sections || []).flatMap(section => (section.cards || []).map(card => card.id));
    setSelectedCards(new Set(allCardIds));
  };

  // 전체 선택 해제
  const handleDeselectAll = () => {
    setSelectedCards(new Set());
  };

  // 선택된 카드들 삭제
  const handleDeleteSelectedCards = async () => {
    if (selectedCards.size === 0) return;
    
    try {
      // 선택된 카드들을 Firebase에서 삭제
      const deletePromises = Array.from(selectedCards).map(cardId => 
        deleteDoc(doc(db, 'giftCards', cardId))
      );
      await Promise.all(deletePromises);
      
      // Firebase 실시간 리스너가 자동으로 UI를 업데이트하므로 로컬 상태 업데이트 제거
      
      setSelectedCards(new Set());
      setSelectMode(false);
      setSnackbar({ open: true, message: `${selectedCards.size}개 카드가 삭제되었습니다.`, severity: 'success' });
    } catch (error) {
      console.error('선택된 카드들 삭제 오류:', error);
      setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 선택 모드 토글
  const handleToggleSelectMode = () => {
    console.log('선택 모드 토글:', !selectMode);
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedCards(new Set());
    }
  };
  
  // 섹션별 검색 핸들러
  const handleSectionSearch = (sectionId, searchTerm) => {
    setSectionSearchTerms(prev => ({
      ...prev,
      [sectionId]: searchTerm
    }));
  };
  
  // 섹션별 필터링된 카드
  const getFilteredCards = (section) => {
    if (!section) return [];
    const searchTerm = sectionSearchTerms[section.id] || '';
    let cards = section.cards || [];
    
    // 검색어가 있으면 필터링
    if (searchTerm) {
      cards = cards.filter(card => 
        card.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 검색 결과에서도 원래 번호 순서 유지 (cardNumber 기준 정렬)
    return cards.sort((a, b) => {
      // 새카드인지 확인 (isNewCard가 true이거나 이름이 '새 카드'인 경우)
      const isNewCardA = a.isNewCard === true || a.name === '새 카드';
      const isNewCardB = b.isNewCard === true || b.name === '새 카드';
      
      // 새카드는 항상 맨 뒤로
      if (isNewCardA && !isNewCardB) return 1; // 새카드를 뒤로
      if (!isNewCardA && isNewCardB) return -1; // 기존 카드를 앞으로
      
      // 둘 다 새카드이거나 둘 다 기존 카드인 경우
      if (isNewCardA && isNewCardB) {
        // 새카드끼리는 생성 시간 순으로 정렬 (최신이 맨 뒤)
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return aTime - bTime;
      }
      
      // 기존 카드들끼리는 기존 정렬 로직 적용
      // 직책이 "회사"인지 확인
      const isCompanyA = a.position === '회사';
      const isCompanyB = b.position === '회사';
      
      // 직책이 회사인 카드들을 앞쪽에 배치
      if (isCompanyA && !isCompanyB) return -1; // 회사 카드를 먼저
      if (!isCompanyA && isCompanyB) return 1;  // 개인 카드를 나중에
      
      // 같은 타입 내에서 이름으로 가나다 순 정렬
      const nameA = (a.name || '').trim();
      const nameB = (b.name || '').trim();
      return nameA.localeCompare(nameB, 'ko');
    });
  };

  // 섹션 높이 편집 시작
  const handleEditSectionHeight = (sectionId) => {
    console.log('섹션 높이 편집 시작:', sectionId);
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setEditingSectionHeight(sectionId);
      setEditingHeight(section.height?.toString() || '200');
    }
  };

  // 섹션 높이 저장
  const handleSaveSectionHeight = async () => {
    if (editingHeight && editingSectionHeight) {
      const newHeight = parseInt(editingHeight) || 200;
      console.log(`섹션 ${editingSectionHeight} 높이 변경: ${newHeight}px`);
      
      try {
        await updateDoc(doc(db, 'giftSections', editingSectionHeight), {
          height: newHeight,
          updatedAt: serverTimestamp()
        });
        
        setSections(prev => {
          const updatedSections = prev.map(section => 
            section.id === editingSectionHeight 
              ? { ...section, height: newHeight }
              : section
          );
          console.log('업데이트된 섹션들:', updatedSections);
          return updatedSections;
        });
        
        setSnackbar({ open: true, message: '섹션 높이가 변경되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('섹션 높이 업데이트 오류:', error);
        setSnackbar({ open: true, message: '높이 변경 중 오류가 발생했습니다.', severity: 'error' });
      }
    }
    setEditingSectionHeight(null);
    setEditingHeight('');
  };

  // 섹션 높이 편집 취소
  const handleCancelHeightEdit = () => {
    setEditingSectionHeight(null);
    setEditingHeight('');
  };

  // 섹션 제목 편집 시작
  const handleEditSectionTitle = (sectionId) => {
    console.log('섹션 편집 시작:', sectionId);
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      // 먼저 모든 편집 상태를 초기화
      setSectionEditingStates({});
      setEditingSection(null);
      setEditingTitle('');
      
      // 약간의 지연 후 해당 섹션만 편집 모드로 설정
      setTimeout(() => {
        setEditingSection(sectionId);
        setEditingTitle(section.title);
        setSectionEditingStates(prev => ({
          ...prev,
          [sectionId]: true
        }));
        console.log('편집 상태 설정 완료:', sectionId);
      }, 10);
    }
  };

  // 섹션 제목 저장
  const handleSaveSectionTitle = async () => {
    if (editingTitle.trim() && editingSection) {
      try {
        await updateDoc(doc(db, 'giftSections', editingSection), {
          title: editingTitle.trim(),
          updatedAt: serverTimestamp()
        });
        
        setSections(prev => prev.map(section => 
          section.id === editingSection 
            ? { ...section, title: editingTitle.trim() }
            : section
        ));
        
        setSnackbar({ open: true, message: '섹션 제목이 수정되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('섹션 제목 저장 오류:', error);
        setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
      }
    }
    setEditingSection(null);
    setEditingTitle('');
    setSectionEditingStates({});
  };


  // 카드 편집 시작
  const handleEditCard = (cardId, sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    const card = section?.cards.find(c => c.id === cardId);
    if (card) {
      setEditingCard(cardId);
      setEditingCardName(card.name || '');
      setEditingCardCompany(card.company || '');
      setEditingCardPosition(card.position || '');
      // 전화번호 안전하게 처리
      try {
        const formattedPhone = formatPhoneNumber(card.phone || '');
        setEditingCardPhone(formattedPhone);
      } catch (error) {
        console.error('전화번호 초기화 오류:', error);
        setEditingCardPhone(card.phone || '');
      }
      setEditingCardAddress(card.address || '');
      setEditingCardQuantity(card.quantity || 1);
      setEditingCardNote(card.note || '');
      // 카드에 선물종류가 있으면 사용하고, 없으면 섹션의 선물종류 사용
      setEditingCardGiftName(card.giftName || section.giftName || '');
    }
  };




  // 거래처 중복확인 및 자동 추가 (이름, 회사명이 있으면 거래처 등록)
  const checkAndAddVendor = async (personName, companyName, position = '', phone = '', address = '') => {
    console.log('=== 거래처 자동 추가 시작 ===');
    console.log('입력 데이터:', { personName, companyName, position, phone, address });
    
    // 이름, 회사명이 있으면 거래처 등록 (직책은 선택사항)
    if (!personName || !companyName || 
        personName.trim() === '' || companyName.trim() === '') {
      console.log('거래처 자동 추가 조건 불만족:', { personName, companyName });
      return;
    }
    
    try {
      // 실시간으로 거래처 데이터 가져오기
      const vendorsQuery = query(collection(db, 'vendors'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(vendorsQuery);
      const currentVendorData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('현재 거래처 데이터:', currentVendorData.length, '개');
      console.log('기존 거래처 목록:', currentVendorData.map(v => `${v.name} (${v.company})`));
      
      // 1순위: 이름과 직책으로 거래처 찾기
      let existingVendor = currentVendorData.find(vendor => 
        vendor.name?.toLowerCase() === personName.toLowerCase() &&
        vendor.position?.toLowerCase() === position.toLowerCase()
      );
      
      // 2순위: 이름과 회사명으로 거래처 찾기 (직책이 없는 경우)
      if (!existingVendor) {
        existingVendor = currentVendorData.find(vendor => 
          vendor.name?.toLowerCase() === personName.toLowerCase() &&
          vendor.company?.toLowerCase() === companyName.toLowerCase()
        );
      }
      
      if (!existingVendor) {
        // 거래처가 없으면 새로 추가
        const newVendorData = {
          name: personName,
          company: companyName,
          position: position,
          phone: phone || '',
          address: address || '',
          email: '',
          ceo: '',
          businessNumber: '',
          note: '카드에서 자동 등록됨',
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'unknown'
        };
        
        console.log('새 거래처 데이터 생성:', newVendorData);
        const docRef = await addDoc(collection(db, 'vendors'), newVendorData);
        const newVendor = { id: docRef.id, ...newVendorData };
        
        console.log('✅ 새 거래처 추가 완료:', newVendor);
        console.log('거래처 ID:', docRef.id);
        setSnackbar({ open: true, message: `새 거래처가 자동으로 등록되었습니다: ${personName} (${companyName})`, severity: 'success' });
      } else {
        console.log('기존 거래처 발견:', existingVendor);
        
        // 기존 거래처의 정보를 업데이트할지 확인
        const updateData = {};
        let hasUpdate = false;
        
        // 회사명 업데이트
        if (companyName && existingVendor.company !== companyName) {
          updateData.company = companyName;
          hasUpdate = true;
        }
        
        // 직책 업데이트
        if (position && existingVendor.position !== position) {
          updateData.position = position;
          hasUpdate = true;
        }
        
        // 전화번호 업데이트
        if (phone && existingVendor.phone !== phone) {
          updateData.phone = phone;
          hasUpdate = true;
        }
        
        // 주소 업데이트
        if (address && existingVendor.address !== address) {
          updateData.address = address;
          hasUpdate = true;
        }
        
        // 업데이트할 데이터가 있으면 Firebase에 저장
        if (hasUpdate) {
          try {
            updateData.updatedAt = serverTimestamp();
            console.log('기존 거래처 업데이트 데이터:', updateData);
            await updateDoc(doc(db, 'vendors', existingVendor.id), updateData);
            
            console.log('✅ 기존 거래처 정보 업데이트 완료:', { name: personName, ...updateData });
            setSnackbar({ open: true, message: `거래처 정보가 업데이트되었습니다: ${personName}`, severity: 'success' });
          } catch (error) {
            console.error('거래처 정보 업데이트 오류:', error);
          }
        }
      }
    } catch (error) {
      console.error('거래처 추가 오류:', error);
      setSnackbar({ open: true, message: '거래처 추가 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 카드 편집 저장
  const handleSaveCardEdit = async () => {
    if (editingCard) {
      try {
        // 현재 편집 중인 카드의 섹션 찾기
        const currentSection = sections.find(section => 
          section.cards && section.cards.some(card => card.id === editingCard)
        );
        
        if (currentSection) {
          // 현재 편집 중인 카드를 제외하고 중복 체크
          const isDuplicate = currentSection.cards.some(card => 
            card.id !== editingCard &&
            card.name?.trim().toLowerCase() === editingCardName?.trim().toLowerCase() &&
            card.company?.trim().toLowerCase() === editingCardCompany?.trim().toLowerCase()
          );
          
          if (isDuplicate) {
            setSnackbar({ 
              open: true, 
              message: '중복입니다', 
              severity: 'warning' 
            });
            return;
          }
        }
        
        // 이름이 '새 카드'에서 실제 이름으로 변경되었거나, 회사명이 '회사명 없음'에서 실제 회사명으로 변경된 경우 거래처 연동
        const isNameChanged = editingCardName && editingCardName.trim() !== '' && editingCardName !== '새 카드';
        const isCompanyChanged = editingCardCompany && editingCardCompany.trim() !== '' && editingCardCompany !== '회사명 없음';
        
        if (isNameChanged && isCompanyChanged) {
          console.log('거래처 자동 추가 시도 (이름/회사명 변경됨):', { 
            name: editingCardName, 
            company: editingCardCompany, 
            position: editingCardPosition,
            phone: editingCardPhone,
            address: editingCardAddress
          });
          await checkAndAddVendor(editingCardName, editingCardCompany, editingCardPosition, editingCardPhone, editingCardAddress);
        } else {
          console.log('거래처 자동 추가 조건 불만족:', { 
            name: editingCardName, 
            company: editingCardCompany,
            isNameChanged,
            isCompanyChanged,
            isNewCard: editingCardName === '새 카드',
            isNoCompany: editingCardCompany === '회사명 없음'
          });
        }
        
        await updateDoc(doc(db, 'giftCards', editingCard), {
          name: editingCardName,
          company: editingCardCompany,
          position: editingCardPosition,
          phone: editingCardPhone,
          address: editingCardAddress,
          quantity: editingCardQuantity,
          note: editingCardNote,
          isNewCard: false, // 편집된 카드는 새카드가 아님
          updatedAt: serverTimestamp()
        });
        
        // Firebase 실시간 리스너가 자동으로 UI를 업데이트하므로 로컬 상태 업데이트 제거
        
        setSnackbar({ open: true, message: '카드가 수정되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('카드 저장 오류:', error);
        setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
      }
      
      setEditingCard(null);
      setEditingCardName('');
      setEditingCardCompany('');
      setEditingCardPosition('');
      setEditingCardPhone('');
      setEditingCardAddress('');
      setEditingCardQuantity(1);
      setEditingCardNote('');
    }
  };

  // 카드 편집 취소
  const handleCancelCardEdit = () => {
    setEditingCard(null);
    setEditingCardName('');
    setEditingCardCompany('');
    setEditingCardPosition('');
    setEditingCardPhone('');
    setEditingCardAddress('');
    setEditingCardQuantity(1);
    setEditingCardNote('');
    setEditingCardGiftName('');
  };

  // 카드 중복 체크 함수
  const checkCardDuplicate = (name, company, sectionId) => {
    const targetSection = sections.find(section => section.id === sectionId);
    if (!targetSection || !targetSection.cards) return false;
    
    return targetSection.cards.some(card => 
      card.name?.trim().toLowerCase() === name?.trim().toLowerCase() &&
      card.company?.trim().toLowerCase() === company?.trim().toLowerCase()
    );
  };

  // 섹션에 카드 추가
  const handleAddCardToSection = async (sectionId) => {
    console.log('=== 새 카드 추가 시작 ===');
    console.log('섹션 ID:', sectionId);
    console.log('현재 섹션들:', sections.map(s => ({ id: s.id, title: s.title, cardCount: s.cards?.length || 0 })));
    
    try {
      const targetSection = sections.find(s => s.id === sectionId);
      console.log('대상 섹션:', targetSection);
      
      if (!targetSection) {
        console.error('섹션을 찾을 수 없습니다:', sectionId);
        setSnackbar({ open: true, message: '섹션을 찾을 수 없습니다.', severity: 'error' });
        return;
      }
      
      // 전체 섹션의 최대 카드 번호 찾기 (1-100번 저장, 새카드는 101번부터)
      let maxCardNumber = 0;
      sections.forEach(section => {
        if (section?.cards) {
          section.cards.forEach(card => {
            if (card.cardNumber && card.cardNumber > maxCardNumber) {
              maxCardNumber = card.cardNumber;
            }
          });
        }
      });
      
      // 새 카드 번호는 전체 최대 번호 + 1 (101번부터 시작)
      const newCardNumber = maxCardNumber + 1;
      console.log('전체 최대 번호:', maxCardNumber, '새 카드 번호:', newCardNumber);
      
      const newCardData = {
        type: 'manual',
        name: '새 카드',
        company: '회사명 없음',
        position: '',
        quantity: 1,
        note: '',
        sectionId: sectionId,
        year: selectedYear,
        holiday: selectedHoliday,
        isNewCard: true, // 새 카드 표시
        cardNumber: newCardNumber, // 고유한 카드 번호 추가
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'unknown'
      };
      
      console.log('새 카드 데이터:', newCardData);
      console.log('Firebase에 카드 추가 시도...');
      
      const docRef = await addDoc(collection(db, 'giftCards'), newCardData);
      const newCard = { id: docRef.id, ...newCardData };
      
      console.log('✅ Firebase에 카드 추가 완료:', newCard);
      console.log('새 카드 ID:', docRef.id);
      
      // Firebase 실시간 리스너가 자동으로 UI를 업데이트하므로 로컬 상태 업데이트 제거
      
      console.log('로컬 상태 업데이트 완료');
      
      // 새로 추가된 카드를 바로 편집 모드로 설정하고 스크롤
      setTimeout(() => {
        handleEditCard(newCard.id, sectionId);
        
        // 새 카드로 스크롤
        const cardElement = document.getElementById(`card-${newCard.id}`);
        if (cardElement) {
          cardElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    } catch (error) {
      console.error('❌ 카드 추가 오류:', error);
      console.error('오류 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setSnackbar({ open: true, message: `카드 추가 중 오류가 발생했습니다: ${error.message}`, severity: 'error' });
    }
  };

  // 섹션 제목 편집 취소
  const handleCancelEdit = () => {
    console.log('섹션 편집 취소');
    setEditingSection(null);
    setEditingTitle('');
    setSectionEditingStates({});
  };

  // 섹션 추가
  const handleAddSection = async () => {
    try {
      const newSectionData = {
        title: `새 그룹 ${(sections?.length || 0) + 1}`,
        cards: [],
        unitPrice: 0,
        year: selectedYear,
        holiday: selectedHoliday,
        order: sections?.length || 0, // 마지막 순서로 설정
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'unknown'
      };
      
      const docRef = await addDoc(collection(db, 'giftSections'), newSectionData);
      setSections(prev => [...prev, { 
        id: docRef.id, 
        ...newSectionData
      }]);
      
      setSnackbar({ open: true, message: '새 그룹이 추가되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('섹션 추가 오류:', error);
      setSnackbar({ open: true, message: '섹션 추가 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 섹션 삭제
  const handleDeleteSection = async (sectionId) => {
    if (!isMaster) {
      setSnackbar({ open: true, message: '마스터만 삭제할 수 있습니다.', severity: 'error' });
      return;
    }
    
    if (window.confirm('정말 삭제하시겠습니까? 해당 섹션의 모든 카드도 함께 삭제됩니다.')) {
      try {
        // 섹션의 모든 카드 삭제
        const section = sections.find(s => s.id === sectionId);
        if (section && section.cards) {
          const deleteCardPromises = section.cards.map(card => 
            deleteDoc(doc(db, 'giftCards', card.id))
          );
          await Promise.all(deleteCardPromises);
        }
        
        // 섹션 삭제
        await deleteDoc(doc(db, 'giftSections', sectionId));
        
        // Firebase 실시간 리스너가 자동으로 UI를 업데이트하므로 로컬 상태 업데이트 제거
        setSnackbar({ open: true, message: '섹션이 삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('섹션 삭제 오류:', error);
        setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다.', severity: 'error' });
      }
    }
  };


  // 섹션 드래그 시작
  const handleSectionDragStart = (e, section) => {
    e.stopPropagation();
    setDraggedSection(section);
    e.dataTransfer.effectAllowed = 'move';
    console.log('섹션 드래그 시작:', section.title);
  };

  // 섹션 드래그 오버
  const handleSectionDragOver = (e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSection && draggedSection.id !== sectionId) {
      setDragOverSectionId(sectionId);
    }
  };

  // 섹션 드래그 리브
  const handleSectionDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSectionId(null);
  };

  // 섹션 드롭
  const handleSectionDrop = async (e, targetSectionId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedSection || draggedSection.id === targetSectionId) {
      setDraggedSection(null);
      setDragOverSectionId(null);
      return;
    }

    console.log('섹션 드롭:', draggedSection.title, '->', targetSectionId);
    
    try {
      const newSections = [...sections];
      const draggedIndex = newSections.findIndex(s => s.id === draggedSection.id);
      const targetIndex = newSections.findIndex(s => s.id === targetSectionId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // 섹션 순서 변경
        const [draggedItem] = newSections.splice(draggedIndex, 1);
        newSections.splice(targetIndex, 0, draggedItem);
        
        // 새로운 순서로 섹션들 업데이트
        const updatePromises = newSections.map((section, index) => {
          return updateDoc(doc(db, 'giftSections', section.id), {
            order: index,
            updatedAt: serverTimestamp()
          });
        });
        
        await Promise.all(updatePromises);
        
        // Firebase 실시간 리스너가 자동으로 UI를 업데이트하므로 수동 로드 제거
        
        setSnackbar({ 
          open: true, 
          message: '섹션 순서가 저장되었습니다.', 
          severity: 'success' 
        });
      }
    } catch (error) {
      console.error('섹션 순서 저장 오류:', error);
      setSnackbar({ 
        open: true, 
        message: '섹션 순서 저장 중 오류가 발생했습니다.', 
        severity: 'error' 
      });
    }
    
    setDraggedSection(null);
    setDragOverSectionId(null);
  };




  // 엑셀 업로드 처리 (B,G열: 이름, C,H열: 선물종류)
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // B, G열에서 이름, C, H열에서 선물종류 추출
        const giftData = [];
        jsonData.forEach((row, index) => {
          if (index === 0) return; // 헤더 스킵
          
          const nameB = row[1]; // B열 (이름)
          const giftTypeC = row[2]; // C열 (선물종류)
          const nameG = row[6]; // G열 (이름)
          const giftTypeH = row[7]; // H열 (선물종류)

          if (nameB && giftTypeC) {
            giftData.push({ name: nameB, giftType: giftTypeC });
          }
          if (nameG && giftTypeH) {
            giftData.push({ name: nameG, giftType: giftTypeH });
          }
        });

        // 섹션별 최대 카드 번호 관리용 맵
        const sectionMaxNumbers = {};
        sections.forEach(section => {
          let maxNumber = 0;
          if (section.cards) {
            section.cards.forEach(card => {
              if (card.cardNumber && card.cardNumber > maxNumber) {
                maxNumber = card.cardNumber;
              }
            });
          }
          sectionMaxNumbers[section.id] = maxNumber;
        });
        
        console.log('섹션별 최대 번호:', sectionMaxNumbers);
        
        // 선물종류별로 그룹화 (중복 제거)
        const giftGroups = {};
        giftData.forEach(({ name, giftType }) => {
          if (!giftGroups[giftType]) {
            giftGroups[giftType] = [];
          }
          // 같은 선물종류 내에서 중복 제거
          if (!giftGroups[giftType].includes(name)) {
            giftGroups[giftType].push(name);
          }
        });

        // 중복 확인 및 상세 정보 수집
        const allExistingCards = (sections || []).flatMap(section => 
          (section.cards || []).map(card => ({
            ...card,
            sectionTitle: section.title
          }))
        );
        
        const duplicateInfo = [];
        const newNames = [];

        Object.entries(giftGroups).forEach(([giftType, names]) => {
          names.forEach(name => {
            // 기존 데이터베이스에서 같은 이름 찾기
            const existingCards = allExistingCards.filter(card => card.name === name);
            
            if (existingCards.length > 0) {
              // 중복 정보 수집
              existingCards.forEach(existingCard => {
                duplicateInfo.push({
                  name: name,
                  uploadGiftType: giftType,
                  existingInfo: {
                    giftType: existingCard.giftType || existingCard.type,
                    company: existingCard.company || '회사명 없음',
                    position: existingCard.position || '직책 없음',
                    sectionTitle: existingCard.sectionTitle,
                    note: existingCard.note || ''
                  }
                });
              });
            } else {
              newNames.push({ name, giftType });
            }
          });
        });

        // 중복된 이름이 있으면 상세 정보와 함께 확인
        if (duplicateInfo.length > 0) {
          // 중복 정보를 이름별로 그룹화
          const groupedDuplicates = {};
          duplicateInfo.forEach(dup => {
            if (!groupedDuplicates[dup.name]) {
              groupedDuplicates[dup.name] = [];
            }
            groupedDuplicates[dup.name].push(dup);
          });

          // 상세 정보 메시지 생성
          let detailMessage = '다음 이름들이 이미 데이터베이스에 존재합니다:\n\n';
          
          Object.entries(groupedDuplicates).forEach(([name, duplicates]) => {
            detailMessage += `📋 ${name}\n`;
            detailMessage += `   업로드할 선물: ${duplicates[0].uploadGiftType}\n`;
            
            duplicates.forEach((dup, index) => {
              detailMessage += `   기존 정보 ${index + 1}:\n`;
              detailMessage += `     - 선물: ${dup.existingInfo.giftType}\n`;
              detailMessage += `     - 회사: ${dup.existingInfo.company}\n`;
              detailMessage += `     - 직책: ${dup.existingInfo.position}\n`;
              detailMessage += `     - 섹션: ${dup.existingInfo.sectionTitle}\n`;
              if (dup.existingInfo.note) {
                detailMessage += `     - 비고: ${dup.existingInfo.note}\n`;
              }
            });
            detailMessage += '\n';
          });
          
          detailMessage += '같은 사람인가요? 확인하면 추가됩니다.';

          const confirmed = window.confirm(detailMessage);
          if (confirmed) {
            // 중복된 이름들도 추가
            duplicateInfo.forEach(dup => {
              newNames.push({ 
                name: dup.name, 
                giftType: dup.uploadGiftType,
                isDuplicate: true,
                existingInfo: dup.existingInfo
              });
            });
          }
        }

        // 각 선물종류별로 섹션에 추가 (중복 제거)
        const groupedNewNames = {};
        newNames.forEach(({ name, giftType }) => {
          if (!groupedNewNames[giftType]) {
            groupedNewNames[giftType] = [];
          }
          // 같은 선물종류 내에서 중복 제거
          if (!groupedNewNames[giftType].includes(name)) {
            groupedNewNames[giftType].push(name);
          }
        });

        // 새로운 섹션들을 생성할 배열
        const newSections = [];

        for (const [giftType, names] of Object.entries(groupedNewNames)) {
          // 기존 섹션에서 해당 선물종류 찾기 (정확한 매칭)
          let targetSection = sections.find(section => 
            section.title.toLowerCase() === giftType.toLowerCase()
          );

          // 해당 선물종류 섹션이 없으면 새로 생성
          if (!targetSection) {
            const newSectionData = {
              title: `${giftType}`,
              cards: [],
              unitPrice: 0,
              year: selectedYear,
              holiday: selectedHoliday,
              order: (sections?.length || 0) + newSections.length, // 적절한 순서 설정
              isUploaded: true,
              uploadDate: new Date().toISOString(),
              createdAt: serverTimestamp(),
              createdBy: currentUser?.email || 'unknown'
            };
            
            const docRef = await addDoc(collection(db, 'giftSections'), newSectionData);
            const newSection = { id: docRef.id, ...newSectionData };
            
            // 카드들을 Firebase에 추가 (중복 항목을 맨 위로)
            const sortedNames = names.sort((a, b) => {
              // 중복된 항목(isDuplicate: true)을 맨 위로
              if (a.isDuplicate && !b.isDuplicate) return -1;
              if (!a.isDuplicate && b.isDuplicate) return 1;
              return 0;
            });
            
            const cardPromises = sortedNames.map(async (nameData, index) => {
              const name = typeof nameData === 'string' ? nameData : nameData.name;
              const isDuplicate = typeof nameData === 'object' ? nameData.isDuplicate : false;
              const existingInfo = typeof nameData === 'object' ? nameData.existingInfo : null;
              
              // 섹션별 순차 번호 할당 (기존 최대 번호 다음부터)
              const cardNumber = sectionMaxNumbers[docRef.id] + index + 1;
              
              const cardData = {
                type: 'gift',
                name: name,
                giftType: giftType,
                quantity: 1,
                note: isDuplicate ? `[중복] 기존: ${existingInfo?.giftType} (${existingInfo?.company})` : '',
                company: existingInfo?.company || '회사명 없음',
                position: existingInfo?.position || '',
                sectionId: docRef.id,
                year: selectedYear,
                holiday: selectedHoliday,
                isDuplicate: isDuplicate,
                duplicateInfo: existingInfo,
                cardNumber: cardNumber, // 회사명 가나다순으로 할당된 번호
                createdAt: serverTimestamp(),
                createdBy: currentUser?.email || 'unknown'
              };
              
              const cardDocRef = await addDoc(collection(db, 'giftCards'), cardData);
              return { id: cardDocRef.id, ...cardData };
            });
            
            const newCards = await Promise.all(cardPromises);
            newSection.cards = newCards;
            newSections.push(newSection);
          } else {
            // 기존 섹션에 모든 카드 추가 (중복 항목을 맨 위로)
            const sortedNames = names.sort((a, b) => {
              // 중복된 항목(isDuplicate: true)을 맨 위로
              if (a.isDuplicate && !b.isDuplicate) return -1;
              if (!a.isDuplicate && b.isDuplicate) return 1;
              return 0;
            });
            
            const cardPromises = sortedNames.map(async (nameData, index) => {
              const name = typeof nameData === 'string' ? nameData : nameData.name;
              const isDuplicate = typeof nameData === 'object' ? nameData.isDuplicate : false;
              const existingInfo = typeof nameData === 'object' ? nameData.existingInfo : null;
              
              // 섹션별 순차 번호 할당 (기존 최대 번호 다음부터)
              const cardNumber = sectionMaxNumbers[targetSection.id] + index + 1;
              
              const cardData = {
                type: 'gift',
                name: name,
                giftType: giftType,
                quantity: 1,
                note: isDuplicate ? `[중복] 기존: ${existingInfo?.giftType} (${existingInfo?.company})` : '',
                company: existingInfo?.company || '회사명 없음',
                position: existingInfo?.position || '',
                sectionId: targetSection.id,
                year: selectedYear,
                holiday: selectedHoliday,
                isDuplicate: isDuplicate,
                duplicateInfo: existingInfo,
                cardNumber: cardNumber, // 섹션별 순차 번호
                createdAt: serverTimestamp(),
                createdBy: currentUser?.email || 'unknown'
              };
              
              const cardDocRef = await addDoc(collection(db, 'giftCards'), cardData);
              return { id: cardDocRef.id, ...cardData };
            });
            
            const newCards = await Promise.all(cardPromises);
            
            // 기존 섹션 업데이트
            await updateDoc(doc(db, 'giftSections', targetSection.id), {
              isUploaded: true,
              uploadDate: new Date().toISOString(),
              updatedAt: serverTimestamp()
            });
            
            setSections(prev => prev.map(section => 
              section.id === targetSection.id
                ? { 
                    ...section, 
                    cards: [...newCards, ...section.cards], // 중복 항목을 맨 위로
                    unitPrice: section.unitPrice || 0,
                    isUploaded: true,
                    uploadDate: new Date().toISOString()
                  }
                : section
            ));
          }
        }

        // 새로운 섹션들을 추가
        if (newSections.length > 0) {
          setSections(prev => [...prev, ...newSections]);
        }

        const totalUploaded = Object.values(groupedNewNames).flat().length;
        const sectionCount = newSections.length + (Object.keys(groupedNewNames).length - newSections.length);
        
        setSnackbar({ 
          open: true, 
          message: `${totalUploaded}개 데이터가 ${sectionCount}개 섹션에 업로드되었습니다.`, 
          severity: 'success' 
        });
      } catch (error) {
        console.error('엑셀 파싱 오류:', error);
        setSnackbar({ open: true, message: '엑셀 파일을 읽는 중 오류가 발생했습니다.', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case '완료': return 'success';
      case '진행중': return 'warning';
      case '예정': return 'default';
      default: return 'default';
    }
  };

  // 년도 옵션 생성
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      '&::-webkit-scrollbar': {
        display: 'none'
      },
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* 헤더 - 제목 제거 (대외비관리와 같은 줄에 배치) */}

      {/* 좌우 레이아웃 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        height: 'calc(100vh - 250px)',
        '@media (max-width: 768px)': {
          flexDirection: 'column',
          height: 'auto'
        }
      }}>
        {/* 왼쪽: 데이터베이스 (30%) */}
        <Box sx={{ 
          flex: '0 0 30%', 
          minWidth: 0,
          '@media (max-width: 768px)': {
            flex: 'none',
            height: '400px'
          }
        }}>
          <Paper sx={{ 
            height: '100%', 
            bgcolor: '#2d2d2d', 
            border: '1px solid #444',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid #444',
              bgcolor: '#1a1a1a'
            }}>
              <Typography variant="h6" sx={{ 
                color: '#ff4444', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <BusinessIcon />
                데이터베이스({vendorData.length})
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <DatabaseTab 
                vendorData={vendorData}
                onVendorSelect={(vendor) => {
                  setFormData(prev => ({
                    ...prev,
                    recipient: vendor.name || '',
                    company: vendor.company || '',
                    position: vendor.position || ''
                  }));
                  handleOpenDialog();
                }}
                onVendorAdd={() => handleOpenVendorDialog()}
                onVendorEdit={(vendor) => handleOpenVendorDialog(vendor)}
                onVendorDelete={(vendorId) => handleDeleteVendor(vendorId)}
                onDragStart={handleDragStart}
                onFilteredCountChange={setFilteredVendorCount}
              />
            </Box>
          </Paper>
        </Box>

        {/* 오른쪽: 명절선물 관리 (70%) */}
        <Box sx={{ 
          flex: '0 0 70%', 
          minWidth: 0,
          '@media (max-width: 768px)': {
            flex: 'none',
            height: '500px'
          },
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <Paper sx={{ 
            height: '100%', 
            bgcolor: '#2d2d2d', 
            border: '1px solid #444',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid #444',
              bgcolor: '#1a1a1a'
            }}>
              <Typography variant="h6" sx={{ 
                color: '#ff4444', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <StarIcon />
                명절선물 관리
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <GiftManagementTab
                filteredData={filteredData}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedHoliday={selectedHoliday}
                setSelectedHoliday={setSelectedHoliday}
                onAdd={() => handleOpenDialog()}
                onEdit={handleOpenDialog}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onExcelUpload={handleExcelUpload}
                loading={loading}
                sections={sections}
                setSections={setSections}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                dragOverSection={dragOverSection}
                handleAddSection={handleAddSection}
                handleEditSectionTitle={handleEditSectionTitle}
                handleSaveSectionTitle={handleSaveSectionTitle}
                handleCancelEdit={handleCancelEdit}
                handleDeleteSection={handleDeleteSection}
                editingSection={editingSection}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                handleCardDragStart={handleCardDragStart}
                handleDeleteCard={handleDeleteCard}
                selectedCards={selectedCards}
                selectMode={selectMode}
                handleToggleCardSelection={handleToggleCardSelection}
                handleSelectAll={handleSelectAll}
                handleDeselectAll={handleDeselectAll}
                handleDeleteSelectedCards={handleDeleteSelectedCards}
                handleToggleSelectMode={handleToggleSelectMode}
                editingCard={editingCard}
                editingCardQuantity={editingCardQuantity}
                editingCardNote={editingCardNote}
                setEditingCardQuantity={setEditingCardQuantity}
                setEditingCardNote={setEditingCardNote}
                handleEditCard={handleEditCard}
                handleSaveCardEdit={handleSaveCardEdit}
                handleCancelCardEdit={handleCancelCardEdit}
                sectionEditingStates={sectionEditingStates}
                draggedSection={draggedSection}
                dragOverSectionId={dragOverSectionId}
                handleSectionDragStart={handleSectionDragStart}
                handleSectionDragOver={handleSectionDragOver}
                handleSectionDragLeave={handleSectionDragLeave}
                handleSectionDrop={handleSectionDrop}
                editingSectionHeight={editingSectionHeight}
                editingHeight={editingHeight}
                setEditingHeight={setEditingHeight}
                handleEditSectionHeight={handleEditSectionHeight}
                handleSaveSectionHeight={handleSaveSectionHeight}
                handleCancelHeightEdit={handleCancelHeightEdit}
                sectionSearchTerms={sectionSearchTerms}
                handleSectionSearch={handleSectionSearch}
                getFilteredCards={getFilteredCards}
                handleAddCardToSection={handleAddCardToSection}
                editingCardName={editingCardName}
                setEditingCardName={setEditingCardName}
                editingCardCompany={editingCardCompany}
                setEditingCardCompany={setEditingCardCompany}
                editingCardPosition={editingCardPosition}
                setEditingCardPosition={setEditingCardPosition}
                editingCardPhone={editingCardPhone}
                setEditingCardPhone={setEditingCardPhone}
                editingCardAddress={editingCardAddress}
                setEditingCardAddress={setEditingCardAddress}
                editingCardGiftName={editingCardGiftName}
                setEditingCardGiftName={setEditingCardGiftName}
                setSnackbar={setSnackbar}
              />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? '명절선물 수정' : '명절선물 등록'}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="수령자"
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="회사명"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="직책"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="선물종류"
                  value={formData.giftType}
                  onChange={(e) => setFormData({ ...formData, giftType: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="금액"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="선물일"
                  value={formData.giftDate}
                  onChange={(newValue) => setFormData({ ...formData, giftDate: newValue })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>년도</InputLabel>
                  <Select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    label="년도"
                  >
                    {yearOptions.map(year => (
                      <MenuItem key={year} value={year}>{year}년</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>명절</InputLabel>
                  <Select
                    value={formData.holiday}
                    onChange={(e) => setFormData({ ...formData, holiday: e.target.value })}
                    label="명절"
                  >
                    <MenuItem value="설날">설날</MenuItem>
                    <MenuItem value="추석">추석</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label="상태"
                  >
                    <MenuItem value="예정">예정</MenuItem>
                    <MenuItem value="진행중">진행중</MenuItem>
                    <MenuItem value="완료">완료</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="비고"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? '저장 중...' : (editingItem ? '수정' : '등록')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 거래처 등록/수정 다이얼로그 */}
      <Dialog open={vendorDialogOpen} onClose={handleCloseVendorDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff', borderBottom: '1px solid #333' }}>
          {editingVendor ? '거래처 수정' : '거래처 등록'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff', pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="담당자명"
                value={vendorFormData.name}
                onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="직책"
                value={vendorFormData.position}
                onChange={(e) => setVendorFormData({ ...vendorFormData, position: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="전화번호"
                value={vendorFormData.phone}
                placeholder="010-1234-5678 (11자리) 또는 02-123-4567 (10자리)"
                onChange={(e) => {
                  const formattedPhone = formatPhoneNumber(e.target.value);
                  setVendorFormData({ ...vendorFormData, phone: formattedPhone });
                }}
                onInput={(e) => {
                  const formattedPhone = formatPhoneNumber(e.target.value);
                  setVendorFormData({ ...vendorFormData, phone: formattedPhone });
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="이메일"
                value={vendorFormData.email}
                onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="회사명"
                value={vendorFormData.company}
                onChange={(e) => setVendorFormData({ ...vendorFormData, company: e.target.value })}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="대표자명"
                value={vendorFormData.ceo}
                onChange={(e) => setVendorFormData({ ...vendorFormData, ceo: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="사업자번호"
                value={vendorFormData.businessNumber}
                onChange={(e) => setVendorFormData({ ...vendorFormData, businessNumber: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="주소"
                value={vendorFormData.address}
                onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비고"
                value={vendorFormData.note}
                onChange={(e) => setVendorFormData({ ...vendorFormData, note: e.target.value })}
                multiline
                rows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#ff4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                  },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21', borderTop: '1px solid #333', p: 2 }}>
          <Button 
            onClick={handleCloseVendorDialog}
            sx={{ 
              color: '#999',
              '&:hover': { bgcolor: '#333' }
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSaveVendor} 
            variant="contained" 
            disabled={loading}
            sx={{
              bgcolor: '#ff4444',
              '&:hover': { bgcolor: '#ff6666' },
              '&:disabled': { bgcolor: '#333' }
            }}
          >
            {loading ? '저장 중...' : (editingVendor ? '수정' : '등록')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            justifyContent: 'center'
          }
        }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ 
            width: 'auto',
            minWidth: '200px',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// 데이터베이스 탭 컴포넌트
const DatabaseTab = ({ 
  vendorData, 
  onVendorSelect, 
  onVendorAdd, 
  onVendorEdit, 
  onVendorDelete,
  onDragStart,
  onFilteredCountChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('company');

  const filteredVendors = vendorData.filter(vendor =>
    vendor.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'company') {
      const companyA = (a.company || a.companyName || '').toLowerCase();
      const companyB = (b.company || b.companyName || '').toLowerCase();
      return companyA.localeCompare(companyB);
    } else if (sortBy === 'name') {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    }
    return 0;
  });


  // 필터링된 거래처 개수가 변경될 때마다 상위 컴포넌트에 알림
  useEffect(() => {
    if (onFilteredCountChange) {
      onFilteredCountChange(filteredVendors.length);
    }
  }, [filteredVendors.length, onFilteredCountChange]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* 검색 및 컨트롤 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="회사명 또는 담당자명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{
            width: '50%',
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#ff4444' },
              '&.Mui-focused fieldset': { borderColor: '#ff4444' }
            },
            '& .MuiInputLabel-root': { color: '#999' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#ff4444' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton onClick={() => setSearchTerm('')} size="small">
                  <ClearIcon sx={{ color: '#999' }} />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ff4444' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff4444' }
            }}
          >
            <MenuItem value="company">회사명순</MenuItem>
            <MenuItem value="name">이름순</MenuItem>
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          onClick={onVendorAdd}
          startIcon={<AddIcon />}
          sx={{
            bgcolor: '#ff4444',
            '&:hover': { bgcolor: '#ff6666' }
          }}
        >
          추가
        </Button>
        
      </Box>

      {/* 거래처 카드 그리드 */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, height: '100%', pb: 0 }}>
          {filteredVendors.map((vendor) => (
            <Box key={`vendor-${vendor.id}`} sx={{ width: 'calc(50% - 4px)', height: '62px' }}>
              <Card 
                draggable
                onDragStart={(e) => onDragStart(e, vendor)}
                onDoubleClick={() => onVendorEdit(vendor)}
                sx={{ 
                  bgcolor: '#1a1a1a',
                  border: '1px solid #333',
                  cursor: 'grab',
                  width: '100%',
                  height: '62px',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(255, 68, 68, 0.2)',
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s ease-in-out',
                    borderColor: '#ff4444'
                  },
                  '&:active': {
                    cursor: 'grabbing'
                  }
                }}
              >
                <CardContent sx={{ 
                  padding: '4px 3px 4px 3px !important', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff', fontSize: '1.2rem', mb: 0.25, lineHeight: 1.0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {vendor.name} {vendor.position && `${vendor.position}`} ({vendor.company || vendor.companyName || '회사명 없음'})
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#999', fontSize: '1.2rem', lineHeight: 1.0, mt: 0.1 }}>
                    {vendor.phone || '미등록'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// 명절선물 관리 탭 컴포넌트
const GiftManagementTab = ({
  filteredData,
  searchTerm,
  setSearchTerm,
  selectedYear,
  setSelectedYear,
  selectedHoliday,
  setSelectedHoliday,
  onAdd,
  onEdit,
  onDelete,
  onDownload,
  onExcelUpload,
  loading,
  sections,
  setSections,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  dragOverSection,
  handleAddSection,
  handleEditSectionTitle,
  handleSaveSectionTitle,
  handleCancelEdit,
  handleDeleteSection,
  editingSection,
  editingTitle,
  setEditingTitle,
  handleCardDragStart,
  handleDeleteCard,
  selectedCards,
  selectMode,
  handleToggleCardSelection,
  handleSelectAll,
  handleDeselectAll,
  handleDeleteSelectedCards,
  handleToggleSelectMode,
  editingCard,
  editingCardQuantity,
  editingCardNote,
  setEditingCardQuantity,
  setEditingCardNote,
  handleEditCard,
  handleSaveCardEdit,
  handleCancelCardEdit,
  sectionEditingStates,
  draggedSection,
  dragOverSectionId,
  handleSectionDragStart,
  handleSectionDragOver,
  handleSectionDragLeave,
  handleSectionDrop,
  editingSectionHeight,
  editingHeight,
  setEditingHeight,
  handleEditSectionHeight,
  handleSaveSectionHeight,
  handleCancelHeightEdit,
  sectionSearchTerms,
  handleSectionSearch,
  getFilteredCards,
  handleAddCardToSection,
  editingCardName,
  setEditingCardName,
  editingCardCompany,
  setEditingCardCompany,
  editingCardPosition,
  setEditingCardPosition,
  editingCardPhone,
  setEditingCardPhone,
  editingCardAddress,
  setEditingCardAddress,
  editingCardGiftName,
  setEditingCardGiftName,
  setSnackbar
}) => {
  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case '완료': return 'success';
      case '진행중': return 'warning';
      case '예정': return 'default';
      default: return 'default';
    }
  };

  // 총계 정보 계산
  const getTotalSummary = useMemo(() => {
    if (!sections || sections.length === 0) {
      return {
        totalPeople: 0,
        totalAmount: 0,
        giftDetails: []
      };
    }

    let totalPeople = 0;
    let totalAmount = 0;
    const giftDetails = [];

    // 선물개수 총합에서 제외할 섹션들
    const excludeFromCount = ['직원', '팀별', '대마팀', '대마', '현장', '현장별', '중복', '신세계', '상품권'];

    sections.forEach(section => {
      const cards = getFilteredCards(section) || [];
      const sectionPeople = cards.length;
      const sectionQuantity = cards.reduce((sum, card) => sum + (card.quantity || 1), 0);
      const sectionAmount = (section.unitPrice || 0) * sectionQuantity;

      // 특정 섹션들은 선물개수 총합에서 제외
      if (!excludeFromCount.includes(section.title)) {
        totalPeople += sectionPeople;
      }
      
      // 금액은 모든 섹션에서 합산
      totalAmount += sectionAmount;

      if (sectionPeople > 0) {
        giftDetails.push({
          sectionTitle: section.title,
          giftName: section.giftName || '선물 미지정',
          people: sectionPeople,
          quantity: sectionQuantity,
          unitPrice: section.unitPrice || 0,
          totalAmount: sectionAmount,
          isExcludedFromCount: excludeFromCount.includes(section.title)
        });
      }
    });

    return {
      totalPeople,
      totalAmount,
      giftDetails
    };
  }, [sections, sectionSearchTerms]);

  // 총계 상세 내역 토글 상태
  const [showGiftDetails, setShowGiftDetails] = useState(false);
  
  // 선물 입력 편집 상태
  const [editingGiftName, setEditingGiftName] = useState(null);
  const [editingGiftNameValue, setEditingGiftNameValue] = useState('');

  // 선물 입력 편집 시작
  const handleEditGiftName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setEditingGiftName(sectionId);
      setEditingGiftNameValue(section.giftName || '');
    }
  };

  // 선물 입력 저장
  const handleSaveGiftName = async () => {
    if (editingGiftName && editingGiftNameValue.trim()) {
      try {
        await updateDoc(doc(db, 'giftSections', editingGiftName), {
          giftName: editingGiftNameValue.trim(),
          updatedAt: serverTimestamp()
        });
        
        setSections(prev => prev.map(section => 
          section.id === editingGiftName 
            ? { ...section, giftName: editingGiftNameValue.trim() }
            : section
        ));
        
        setSnackbar({ open: true, message: '선물 입력이 수정되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('선물 입력 저장 오류:', error);
        setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
      }
    }
    setEditingGiftName(null);
    setEditingGiftNameValue('');
  };

  // 선물 입력 편집 취소
  const handleCancelGiftNameEdit = () => {
    setEditingGiftName(null);
    setEditingGiftNameValue('');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* 검색 및 필터 컨트롤 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center', 
        mb: 2,
        flexWrap: 'wrap'
      }}>
        
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel sx={{ color: '#999' }}>년도</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            label="년도"
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ff4444' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff4444' }
            }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <MenuItem key={year} value={year}>{year}년</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel sx={{ color: '#999' }}>명절</InputLabel>
          <Select
            value={selectedHoliday}
            onChange={(e) => setSelectedHoliday(e.target.value)}
            label="명절"
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ff4444' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff4444' }
            }}
          >
            <MenuItem value="설날">설날</MenuItem>
            <MenuItem value="추석">추석</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddSection}
          sx={{
            borderColor: '#4caf50',
            color: '#4caf50',
            '&:hover': {
              borderColor: '#66bb6a',
              color: '#66bb6a'
            },
            mr: 1
          }}
        >
          그룹 추가
        </Button>


        <Button
          variant="outlined"
          onClick={handleToggleSelectMode}
          sx={{
            borderColor: selectMode ? '#ff4444' : '#2196f3',
            color: selectMode ? '#ff4444' : '#2196f3',
            '&:hover': {
              borderColor: selectMode ? '#ff6666' : '#42a5f5',
              color: selectMode ? '#ff6666' : '#42a5f5'
            },
            mr: 1
          }}
        >
          {selectMode ? '선택 모드 종료' : '선택 모드'}
        </Button>

        {selectMode && (
          <>
            <Button
              variant="outlined"
              onClick={handleSelectAll}
              sx={{
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': {
                  borderColor: '#ffb74d',
                  color: '#ffb74d'
                },
                mr: 1
              }}
            >
              전체 선택
            </Button>

            <Button
              variant="outlined"
              onClick={handleDeselectAll}
              sx={{
                borderColor: '#9e9e9e',
                color: '#9e9e9e',
                '&:hover': {
                  borderColor: '#bdbdbd',
                  color: '#bdbdbd'
                },
                mr: 1
              }}
            >
              선택 해제
            </Button>

            <Button
              variant="contained"
              onClick={handleDeleteSelectedCards}
              disabled={selectedCards.size === 0}
              sx={{
                bgcolor: '#f44336',
                '&:hover': { bgcolor: '#d32f2f' },
                '&:disabled': { bgcolor: '#666' },
                mr: 1
              }}
            >
              선택 삭제 ({selectedCards.size})
            </Button>
          </>
        )}

        <input
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          id="upload-gift-list"
          type="file"
          onChange={onExcelUpload}
        />
        <label htmlFor="upload-gift-list">
          <Button
            variant="contained"
            component="span"
            startIcon={<UploadIcon />}
            sx={{
              bgcolor: '#ff4444',
              '&:hover': { bgcolor: '#ff6666' },
              mr: 1
            }}
          >
            업로드
          </Button>
        </label>

        <Typography variant="body2" sx={{ color: '#4caf50', mr: 2 }}>
          자동 저장됨
        </Typography>

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onDownload}
          sx={{
            borderColor: '#ff4444',
            color: '#ff4444',
            '&:hover': {
              borderColor: '#ff6666',
              color: '#ff6666'
            }
          }}
        >
          다운로드
        </Button>
      </Box>

      {/* 총계 정보 */}
      <Box sx={{ 
        mb: 2, 
        p: 2, 
        bgcolor: '#1a1a1a', 
        borderRadius: 2, 
        border: '1px solid #333' 
      }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': { bgcolor: '#2a2a2a' },
            p: 1,
            borderRadius: 1,
            transition: 'background-color 0.2s'
          }}
          onClick={() => setShowGiftDetails(!showGiftDetails)}
        >
          <Typography variant="h5" sx={{ color: '#ff4444', fontWeight: 'bold', fontSize: '1.5rem' }}>
            총계: {getTotalSummary.totalPeople.toLocaleString()}명,   총 금액: {getTotalSummary.totalAmount.toLocaleString()}원
          </Typography>
          <Typography sx={{ color: '#999', fontSize: '1.2rem' }}>
            {showGiftDetails ? '▲' : '▼'}
          </Typography>
        </Box>

        {/* 상세 내역 */}
        {showGiftDetails && (
          <Box sx={{ mt: 2, pl: 2 }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 2, fontWeight: 'bold' }}>
              선물 상세 내역
            </Typography>
            {getTotalSummary.giftDetails.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                등록된 선물이 없습니다.
              </Typography>
            ) : (
              getTotalSummary.giftDetails.map((detail, index) => (
                <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#fff', minWidth: '30px' }}>
                    {index + 1}.
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ff4444', minWidth: '120px', mr: 2 }}>
                    {detail.sectionTitle}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#66bb6a', minWidth: '150px', mr: 2 }}>
                    {detail.giftName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#fff', minWidth: '80px' }}>
                    선물 {detail.quantity}개
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#fff', minWidth: '80px', ml: 2 }}>
                    단가 {detail.unitPrice.toLocaleString()}원
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#4caf50', minWidth: '100px', ml: 2, fontWeight: 'bold' }}>
                    총액 {detail.totalAmount.toLocaleString()}원
                  </Typography>
                  {detail.isExcludedFromCount && (
                    <Typography variant="caption" sx={{ color: '#ff9800', ml: 1, fontStyle: 'italic' }}>
                      (선물개수만 총계리스트에 제외, 금액은 포함)
                    </Typography>
                  )}
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>

      {/* 동적 섹션들 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        overflow: 'auto', // 스크롤 가능
        height: (() => {
          // 모든 섹션의 높이 + gap 계산
          const totalHeight = (sections || []).reduce((sum, section) => {
            return sum + (section.height || 200) + 16; // 16px는 gap
          }, 0);
          const calculatedHeight = Math.max(400, totalHeight);
          console.log(`부모 컨테이너 높이 계산: ${calculatedHeight}px (섹션 수: ${sections?.length || 0})`);
          return `${calculatedHeight}px`;
        })(),
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {!sections || sections.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '200px',
            bgcolor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 1
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: '#666', mb: 1 }}>
                {selectedYear}년 {selectedHoliday} 데이터가 없습니다
              </Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                '그룹 추가' 버튼을 눌러 새 섹션을 만들거나<br/>
                엑셀 파일을 업로드하여 데이터를 추가하세요
              </Typography>
            </Box>
          </Box>
        ) : (
          sections && Array.isArray(sections) ? sections.map((section, index) => (
            <Box 
              key={`section-${section.id}`}
              data-section-id={section.id}
              draggable
              onDragStart={(e) => handleSectionDragStart(e, section)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSectionDragOver(e, section.id);
              handleDragOver(e, section.id);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSectionDragLeave(e);
              handleDragLeave();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSectionDrop(e, section.id);
              handleDrop(e, section.id);
            }}
            sx={{ 
              bgcolor: '#1a1a1a', 
              border: (() => {
                if (dragOverSection === section.id) return '2px dashed #ff4444';
                if (dragOverSectionId === section.id) return '2px solid #4caf50';
                if (draggedSection?.id === section.id) return '2px solid #ff9800';
                return '1px solid #333';
              })(),
              borderRadius: 1, 
              p: 2,
              height: `${section.height || 200}px`, // 섹션별 높이 사용
              minHeight: `${Math.max(150, section.height || 200)}px`, // 최소 150px 보장
              transition: 'height 0.3s ease-in-out, min-height 0.3s ease-in-out',
              position: 'relative', // relative로 복원
              overflow: 'hidden', // 내용이 넘치면 숨김
              cursor: 'grab',
              '&:hover': {
                borderColor: '#ff4444',
                boxShadow: '0 4px 16px rgba(255, 68, 68, 0.1)'
              },
              '&:active': {
                cursor: 'grabbing'
              }
            }}
          >
            <Box 
              onClick={(e) => e.stopPropagation()}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2 
              }}>
              {editingSection === section.id && sectionEditingStates[section.id] ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <TextField
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        '& fieldset': { borderColor: '#ff4444' },
                        '&:hover fieldset': { borderColor: '#ff4444' },
                        '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                      },
                      '& .MuiInputLabel-root': { color: '#999' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveSectionTitle();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <IconButton
                    size="small"
                    onClick={handleSaveSectionTitle}
                    sx={{ color: '#4caf50' }}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handleCancelEdit}
                    sx={{ color: '#f44336' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      cursor: 'grab',
                      color: '#999',
                      '&:hover': { color: '#ff4444' },
                      '&:active': { cursor: 'grabbing' }
                    }}>
                      ⋮⋮
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        '&:hover': { color: '#ff4444' }
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditSectionTitle(section.id);
                      }}
                    >
                      {section.title}
                    </Typography>
                  </Box>
                  
                  {/* 선물 입력칸 */}
                  <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                    {editingGiftName === section.id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          size="small"
                          value={editingGiftNameValue}
                          onChange={(e) => setEditingGiftNameValue(e.target.value)}
                          placeholder="선물 입력"
                          sx={{
                            width: '150px',
                            '& .MuiOutlinedInput-root': {
                              color: '#fff',
                              '& fieldset': { borderColor: '#666' },
                              '&:hover fieldset': { borderColor: '#ff4444' },
                              '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                            },
                            '& .MuiInputLabel-root': { color: '#999' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveGiftName();
                            }
                          }}
                          autoFocus
                        />
                        <IconButton
                          size="small"
                          onClick={handleSaveGiftName}
                          sx={{ color: '#4caf50' }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleCancelGiftNameEdit}
                          sx={{ color: '#f44336' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography
                        variant="h6"
                        sx={{
                          color: section.giftName ? '#66bb6a' : '#666',
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          '&:hover': {
                            color: '#ff4444'
                          }
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditGiftName(section.id);
                        }}
                      >
                        {section.giftName ? `[선물종류: ${section.giftName}]` : '선물 입력'}
                      </Typography>
                    )}
                  </Box>
                  {section.isUploaded && (
                    <Chip
                      label="업로드됨"
                      size="small"
                      sx={{
                        bgcolor: '#4caf50',
                        color: '#fff',
                        fontSize: '0.7rem',
                        height: '20px',
                        '& .MuiChip-label': {
                          px: 1
                        }
                      }}
                    />
                  )}
                  {section.uploadDate && (
                    <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem' }}>
                      {new Date(section.uploadDate).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              )}
              
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {/* 카드 추가 버튼 */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddCardToSection(section.id);
                  }}
                  sx={{
                    borderColor: '#4caf50',
                    color: '#4caf50',
                    minWidth: 'auto',
                    px: 1,
                    '&:hover': {
                      borderColor: '#66bb6a',
                      color: '#66bb6a',
                      bgcolor: 'rgba(76, 175, 80, 0.1)'
                    }
                  }}
                >
                  카드 추가
                </Button>
                
                {/* 섹션별 검색 */}
                <TextField
                  placeholder="검색..."
                  value={sectionSearchTerms[section.id] || ''}
                  onChange={(e) => handleSectionSearch(section.id, e.target.value)}
                  size="small"
                  sx={{ 
                    width: 150,
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#ff4444' },
                      '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                    },
                    '& .MuiInputLabel-root': { color: '#999' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#ff4444', fontSize: '1rem' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          onClick={() => handleSectionSearch(section.id, '')} 
                          size="small"
                          sx={{ color: '#999' }}
                        >
                          <ClearIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                
                <TextField
                  size="small"
                  type="text"
                  value={(section.unitPrice || 0).toLocaleString()}
                  onChange={async (e) => {
                    e.stopPropagation();
                    const value = e.target.value.replace(/,/g, '');
                    const unitPrice = parseInt(value) || 0;
                    console.log('단가 변경:', { sectionId: section.id, unitPrice });
                    
                    try {
                      await updateDoc(doc(db, 'giftSections', section.id), {
                        unitPrice: unitPrice,
                        updatedAt: serverTimestamp()
                      });
                      
                      setSections(prev => {
                        const newSections = prev.map(s => 
                          s.id === section.id ? { ...s, unitPrice } : s
                        );
                        console.log('단가 변경 후 섹션들:', newSections);
                        return newSections;
                      });
                    } catch (error) {
                      console.error('단가 업데이트 오류:', error);
                      setSnackbar({ open: true, message: '단가 업데이트 중 오류가 발생했습니다.', severity: 'error' });
                    }
                  }}
                  label="단가"
                  sx={{
                    width: '100px',
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#666' },
                      '&:hover fieldset': { borderColor: '#ff4444' },
                      '&.Mui-focused fieldset': { borderColor: '#ff4444' },
                      '& input': {
                        textAlign: 'right'
                      }
                    },
                    '& .MuiInputLabel-root': { color: '#999' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.2 }}>
                  <Typography variant="body1" sx={{ color: '#ff4444', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    총액: {((section.unitPrice || 0) * (getFilteredCards(section) || []).reduce((sum, card) => sum + (card.quantity || 1), 0)).toLocaleString()}원
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    명단: {(getFilteredCards(section) || []).length}명 | 수량: {(getFilteredCards(section) || []).reduce((sum, card) => sum + (card.quantity || 1), 0)}개
                  </Typography>
                </Box>
                {editingSectionHeight === section.id ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={editingHeight}
                      onChange={(e) => setEditingHeight(e.target.value)}
                      label="높이"
                      sx={{
                        width: '80px',
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          '& fieldset': { borderColor: '#ff4444' },
                          '&:hover fieldset': { borderColor: '#ff4444' },
                          '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                        },
                        '& .MuiInputLabel-root': { color: '#999' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleSaveSectionHeight();
                        if (e.key === 'Escape') handleCancelHeightEdit();
                      }}
                      autoFocus
                    />
                    <IconButton
                      size="small"
                      onClick={handleSaveSectionHeight}
                      sx={{ color: '#4caf50' }}
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={handleCancelHeightEdit}
                      sx={{ color: '#f44336' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEditSectionHeight(section.id);
                    }}
                    sx={{ color: '#999' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                  <IconButton
                    size="small"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteSection(section.id);
                    }}
                    sx={{ 
                      color: '#f44336',
                      zIndex: 1000,
                      position: 'relative'
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
              </Box>
            </Box>
            
            <Box sx={{ 
              height: `calc(${section.height || 200}px - 100px)`, // 헤더와 패딩 고려
              overflow: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 1,
              p: 1,
              '&::-webkit-scrollbar': {
                width: '6px',
                height: '6px'
              },
              '&::-webkit-scrollbar-track': {
                background: '#333',
                borderRadius: '3px'
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#ff4444',
                borderRadius: '3px',
                '&:hover': {
                  background: '#ff6666'
                }
              },
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: dragOverSection === section.id 
                  ? 'linear-gradient(45deg, rgba(255, 68, 68, 0.1) 25%, transparent 25%), linear-gradient(-45deg, rgba(255, 68, 68, 0.1) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255, 68, 68, 0.1) 75%), linear-gradient(-45deg, transparent 75%, rgba(255, 68, 68, 0.1) 75%)'
                  : 'transparent',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                pointerEvents: 'none',
                transition: 'all 0.3s ease',
                zIndex: 1
              }
            }}>
              {(section.cards || []).length === 0 ? (
                <Box sx={{ 
                  gridColumn: '1 / -1', 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '100px',
                  gap: 1
                }}>
                  <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                    카드를 드래그해서 추가하세요
                  </Typography>
                  {dragOverSection === section.id && (
                    <Typography variant="caption" sx={{ color: '#ff4444', fontWeight: 'bold' }}>
                      여기에 드롭하세요!
                    </Typography>
                  )}
                </Box>
              ) : (
                (getFilteredCards(section) || []).map((card, index) => {
                  const isSelected = selectedCards.has(card.id);
                  return (
                    <Card
                      key={`${section.id}-${card.id}`}
                      id={`card-${card.id}`}
                      draggable={!selectMode && !editingCard}
                      onDragStart={(e) => {
                        if (selectMode || editingCard) {
                          e.preventDefault();
                          return;
                        }
                        e.stopPropagation();
                        handleCardDragStart(e, card, section.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectMode) {
                          handleToggleCardSelection(card.id);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleEditCard(card.id, section.id);
                      }}
                      sx={{
                        bgcolor: isSelected ? '#ff4444' : (card.isDuplicate ? '#4a2c2a' : '#2a2a2a'),
                        border: isSelected ? '2px solid #ff6666' : (card.isDuplicate ? '2px solid #ff6b6b' : '1px solid #444'),
                        cursor: selectMode ? 'pointer' : editingCard ? 'default' : 'grab',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        zIndex: 2,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)',
                          borderColor: '#ff4444',
                          transform: 'translateY(-2px)'
                        },
                        '&:active': {
                          cursor: selectMode ? 'pointer' : editingCard ? 'default' : 'grabbing',
                          transform: 'scale(0.98)'
                        },
                        '&[draggable="true"]:hover': {
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -2,
                            left: -2,
                            right: -2,
                            bottom: -2,
                            background: 'linear-gradient(45deg, #ff4444, #ff6666)',
                            borderRadius: 'inherit',
                            zIndex: -1,
                            opacity: 0.3
                          }
                        }
                      }}
                    >
                    <CardContent sx={{ 
                      p: 1, 
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      '&:last-child': { pb: 1 }
                    }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ 
                          color: isSelected ? '#fff' : '#fff', 
                          fontWeight: 'bold', 
                          fontSize: '1.1rem',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {card.cardNumber || (index + 1)}. {card.name}{card.position && card.position !== '회사' && ` ${card.position}`} {card.isDuplicate && '🔴'}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: isSelected ? '#fff' : '#999', 
                          fontSize: '1.1rem',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block'
                        }}>
                          <span style={{ fontSize: '1.1rem', fontFamily: 'inherit' }}>
                            {card.company}
                          </span> | 개수: {card.quantity || 1}개
                          {card.note && ` | ${card.note}`}
                        </Typography>
                      </Box>
                      {!selectMode && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(section.id, card.id);
                          }}
                          sx={{ 
                            color: '#f44336', 
                            p: 0.25,
                            minWidth: '20px',
                            height: '20px',
                            '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' }
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: '0.8rem' }} />
                        </IconButton>
                      )}
                    </CardContent>
                  </Card>
                  );
                })
              )}
            </Box>
            
          </Box>
          )) : null
        )}
      </Box>

      {/* 카드 편집 다이얼로그 */}
      <Dialog
        open={!!editingCard}
        onClose={handleCancelCardEdit}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid #333' }}>
          카드 편집
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="이름"
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                },
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
              }}
              value={editingCardName}
              onChange={(e) => setEditingCardName(e.target.value)}
              size="small"
              required
            />
            <TextField
              label="회사명"
              value={editingCardCompany}
              onChange={(e) => setEditingCardCompany(e.target.value)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                },
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
              }}
            />
            <TextField
              label="직책"
              value={editingCardPosition}
              onChange={(e) => setEditingCardPosition(e.target.value)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                },
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
              }}
            />
            <TextField
              label="전화번호"
              value={editingCardPhone || ''}
              onChange={(e) => {
                try {
                  const formattedPhone = formatPhoneNumber(e.target.value);
                  setEditingCardPhone(formattedPhone);
                } catch (error) {
                  console.error('전화번호 포맷팅 오류:', error);
                  setEditingCardPhone(e.target.value);
                }
              }}
              onInput={(e) => {
                try {
                  const formattedPhone = formatPhoneNumber(e.target.value);
                  setEditingCardPhone(formattedPhone);
                } catch (error) {
                  console.error('전화번호 실시간 포맷팅 오류:', error);
                }
              }}
              placeholder="010-1234-5678 (11자리) 또는 02-123-4567 (10자리)"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                },
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
              }}
            />
            <TextField
              label="주소"
              value={editingCardAddress}
              onChange={(e) => setEditingCardAddress(e.target.value)}
              size="small"
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                },
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
              }}
            />
            <TextField
              label="개수"
              type="number"
              value={editingCardQuantity}
              onChange={(e) => setEditingCardQuantity(parseInt(e.target.value) || 1)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                },
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
              }}
            />
            <TextField
              label="선물종류"
              value={editingCardGiftName}
              onChange={(e) => setEditingCardGiftName(e.target.value)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                },
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
              }}
            />
            <TextField
              label="비고"
              value={editingCardNote}
              onChange={(e) => setEditingCardNote(e.target.value)}
              size="small"
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' }
                },
                '& .MuiInputLabel-root': { color: '#999' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff4444' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #333' }}>
          <Button onClick={handleCancelCardEdit} sx={{ color: '#999' }}>
            취소
          </Button>
          <Button onClick={handleSaveCardEdit} variant="contained" sx={{ bgcolor: '#ff4444' }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GiftListTab;
