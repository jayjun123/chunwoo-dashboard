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
  Close as CloseIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { isMasterUser } from '../utils/masterUtils';
import { formatNumber } from '../utils/formatUtils';
import * as XLSX from 'xlsx';

const GiftListTab = ({ selectedYear: propSelectedYear, selectedHoliday: propSelectedHoliday }) => {
  const { currentUser } = useAuth();
  const isMaster = isMasterUser(currentUser);
  
  // 상태 관리
  const [giftData, setGiftData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
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
  const [editingCard, setEditingCard] = useState(null);
  const [editingCardQuantity, setEditingCardQuantity] = useState(1);
  const [editingCardNote, setEditingCardNote] = useState('');
  const [sectionEditingStates, setSectionEditingStates] = useState({});
  
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

  // 거래처 데이터 로드
  const loadVendorData = async () => {
    try {
      const vendorSnapshot = await getDocs(collection(db, 'vendors'));
      const vendors = vendorSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendorData(vendors);
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

  // Firebase에서 섹션 데이터 로드
  const loadSectionsData = async () => {
    try {
      console.log('섹션 데이터 로드 시작:', { selectedYear, selectedHoliday });
      
      // 현재 선택된 연도와 명절에 맞는 섹션만 쿼리
      const sectionsQuery = query(
        collection(db, 'giftSections'),
        where('year', '==', selectedYear),
        where('holiday', '==', selectedHoliday)
      );
      
      const sectionsSnapshot = await getDocs(sectionsQuery);
      const sectionsData = sectionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('로드된 섹션 데이터:', sectionsData);
      setSections(sectionsData);
    } catch (error) {
      console.error('섹션 데이터 로드 오류:', error);
      // 오류 발생 시 빈 배열로 설정 (기본 섹션 생성하지 않음)
      setSections([]);
    }
  };

  // Firebase에서 카드 데이터 로드
  const loadCardsData = async () => {
    try {
      console.log('카드 데이터 로드 시작:', { selectedYear, selectedHoliday });
      
      // 현재 선택된 연도와 명절에 맞는 카드만 쿼리
      const cardsQuery = query(
        collection(db, 'giftCards'),
        where('year', '==', selectedYear),
        where('holiday', '==', selectedHoliday)
      );
      
      const cardsSnapshot = await getDocs(cardsQuery);
      const cardsData = cardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('로드된 카드 데이터:', cardsData);
      
      // 섹션별로 카드 그룹화
      const cardsBySection = {};
      cardsData.forEach(card => {
        if (!cardsBySection[card.sectionId]) {
          cardsBySection[card.sectionId] = [];
        }
        cardsBySection[card.sectionId].push(card);
      });
      
      console.log('섹션별 카드 그룹화:', cardsBySection);
      
      // 섹션에 카드 데이터 추가
      setSections(prev => {
        const updatedSections = prev.map(section => ({
          ...section,
          cards: cardsBySection[section.id] || []
        }));
        console.log('업데이트된 섹션들:', updatedSections);
        return updatedSections;
      });
    } catch (error) {
      console.error('카드 데이터 로드 오류:', error);
    }
  };

  useEffect(() => {
    loadVendorData();
    loadGiftData();
    loadSectionsData();
  }, []);

  // 섹션 데이터 로드 후 카드 데이터 로드
  useEffect(() => {
    if (sections.length > 0) {
      loadCardsData();
    }
  }, [sections.length]);

  // 연도나 명절이 변경될 때 섹션과 카드 데이터 다시 로드
  useEffect(() => {
    loadSectionsData();
  }, [selectedYear, selectedHoliday]);

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

  // 엑셀 다운로드
  const handleDownload = () => {
    // 모든 섹션의 카드 데이터를 수집
    const allCards = sections.flatMap(section => section.cards || []);
    
    // 2차원 배열로 데이터 구성
    const title = `${selectedYear}년 ${selectedHoliday} 리스트`;
    const headers = ['번호', '수령자', '회사명', '직책', '선물', '개수', '비고'];
    
    // 데이터 행들
    const dataRows = allCards.map((card, index) => [
      index + 1,
      card.name || '',
      card.company || '',
      card.position || '',
      card.giftType || card.type || '',
      card.quantity || 1,
      card.note || ''
    ]);
    
    // 전체 데이터 구성 (제목 + 헤더 + 데이터)
    const allData = [
      [title], // 1행: 제목
      headers, // 2행: 헤더
      ...dataRows // 3행부터: 데이터
    ];
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // 제목 행 병합 (A1~G1)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
    ];
    
    // 제목 스타일 적용
    ws['A1'] = { 
      v: title, 
      s: { 
        font: { bold: true, size: 16 }, 
        alignment: { horizontal: 'center', vertical: 'center' }
      } 
    };
    
    // 헤더 스타일 적용
    headers.forEach((header, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: index });
      ws[cellAddress] = { 
        v: header, 
        s: { 
          font: { bold: true }, 
          fill: { fgColor: { rgb: 'E0E0E0' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        } 
      };
    });
    
    // 데이터 행 스타일 적용
    dataRows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 2, c: colIndex });
        ws[cellAddress] = { 
          v: cell, 
          s: { 
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          } 
        };
      });
    });
    
    // 열 너비 설정
    ws['!cols'] = [
      { wch: 8 },  // 번호
      { wch: 15 }, // 수령자
      { wch: 20 }, // 회사명
      { wch: 15 }, // 직책
      { wch: 15 }, // 선물
      { wch: 8 },  // 개수
      { wch: 20 }  // 비고
    ];
    
    // 워크북 생성 및 파일 저장
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '명절선물목록');
    
    const fileName = `${selectedYear}년_${selectedHoliday}_리스트_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };


  // 거래처 다이얼로그 열기
  const handleOpenVendorDialog = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setVendorFormData({
        name: vendor.name || '',
        position: vendor.position || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        company: vendor.company || '',
        ceo: vendor.ceo || '',
        businessNumber: vendor.businessNumber || '',
        address: vendor.address || '',
        note: vendor.note || ''
      });
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
      loadVendorData();
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
        loadVendorData();
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
    
    if (draggedItem && draggedItem.type === 'vendor') {
      // 거래처를 섹션에 추가
      try {
        const newCardData = {
          type: 'vendor',
          name: draggedItem.data.name,
          company: draggedItem.data.company || draggedItem.data.companyName || draggedItem.data.company_name || '회사명 없음',
          phone: draggedItem.data.phone || '전화번호 없음',
          position: draggedItem.data.position || '',
          quantity: 1,
          note: '',
          sectionId: sectionId,
          year: selectedYear,
          holiday: selectedHoliday,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'unknown'
        };
        
        const docRef = await addDoc(collection(db, 'giftCards'), newCardData);
        const newCard = { id: docRef.id, ...newCardData };
        
        setSections(prev => {
          const newSections = prev.map(section => {
            if (section.id === sectionId) {
              console.log('카드 추가:', { sectionId, newCard });
              return { ...section, cards: [...section.cards, newCard] };
            }
            return section;
          });
          console.log('업데이트된 섹션들:', newSections);
          return newSections;
        });
        
        setSnackbar({ open: true, message: '거래처가 추가되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('거래처 추가 오류:', error);
        setSnackbar({ open: true, message: '거래처 추가 중 오류가 발생했습니다.', severity: 'error' });
      }
    } else if (draggedCard) {
      // 카드를 다른 섹션으로 이동
      try {
        await updateDoc(doc(db, 'giftCards', draggedCard.card.id), {
          sectionId: sectionId,
          updatedAt: serverTimestamp()
        });
        
        setSections(prev => {
          const newSections = prev.map(section => {
            if (section.id === draggedCard.sourceSectionId) {
              // 원본 섹션에서 카드 제거
              return { ...section, cards: section.cards.filter(card => card.id !== draggedCard.card.id) };
            } else if (section.id === sectionId) {
              // 대상 섹션에 카드 추가
              return { ...section, cards: [...section.cards, { ...draggedCard.card, sectionId }] };
            }
            return section;
          });
          console.log('카드 이동 후 섹션들:', newSections);
          return newSections;
        });
        
        setSnackbar({ open: true, message: '카드가 이동되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('카드 이동 오류:', error);
        setSnackbar({ open: true, message: '카드 이동 중 오류가 발생했습니다.', severity: 'error' });
      }
    }
    
    setDraggedItem(null);
    setDraggedCard(null);
    setDragOverSection(null);
  };

  // 카드 삭제
  const handleDeleteCard = async (sectionId, cardId) => {
    try {
      await deleteDoc(doc(db, 'giftCards', cardId));
      
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, cards: section.cards.filter(card => card.id !== cardId) }
          : section
      ));
      
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
    const allCardIds = sections.flatMap(section => section.cards.map(card => card.id));
    setSelectedCards(new Set(allCardIds));
  };

  // 전체 선택 해제
  const handleDeselectAll = () => {
    setSelectedCards(new Set());
  };

  // 선택된 카드들 삭제
  const handleDeleteSelectedCards = () => {
    if (selectedCards.size === 0) return;
    
    setSections(prev => prev.map(section => ({
      ...section,
      cards: section.cards.filter(card => !selectedCards.has(card.id))
    })));
    setSelectedCards(new Set());
    setSelectMode(false);
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
    const searchTerm = sectionSearchTerms[section.id] || '';
    if (!searchTerm) return section.cards || [];
    
    return (section.cards || []).filter(card => 
      card.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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

  // 카드 편집 상태
  const [editingCardName, setEditingCardName] = useState('');
  const [editingCardCompany, setEditingCardCompany] = useState('');
  const [editingCardPosition, setEditingCardPosition] = useState('');

  // 카드 편집 시작
  const handleEditCard = (cardId, sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    const card = section?.cards.find(c => c.id === cardId);
    if (card) {
      setEditingCard(cardId);
      setEditingCardName(card.name || '');
      setEditingCardCompany(card.company || '');
      setEditingCardPosition(card.position || '');
      setEditingCardQuantity(card.quantity || 1);
      setEditingCardNote(card.note || '');
    }
  };

  // 거래처 중복확인 및 자동 추가
  const checkAndAddVendor = async (personName, companyName, position = '') => {
    if (!personName || personName.trim() === '') return;
    
    try {
      // 기존 거래처에서 이름부터 검색 (이름이 우선)
      const existingVendor = vendorData.find(vendor => 
        vendor.name?.toLowerCase() === personName.toLowerCase()
      );
      
      if (!existingVendor) {
        // 거래처가 없으면 새로 추가
        const newVendorData = {
          name: personName,
          company: companyName || personName, // 회사명이 없으면 이름으로 설정
          position: position || '',
          phone: '',
          email: '',
          ceo: '',
          businessNumber: '',
          address: '',
          note: '자동 추가됨',
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'unknown'
        };
        
        const docRef = await addDoc(collection(db, 'vendors'), newVendorData);
        const newVendor = { id: docRef.id, ...newVendorData };
        
        // 거래처 데이터 업데이트
        setVendorData(prev => [...prev, newVendor]);
        
        console.log('새 거래처 추가됨:', newVendor);
        setSnackbar({ open: true, message: `새 거래처 "${personName}"이 추가되었습니다.`, severity: 'success' });
      } else {
        console.log('기존 거래처 발견:', existingVendor);
        // 기존 거래처의 회사명이 다르면 업데이트
        if (companyName && existingVendor.company !== companyName) {
          try {
            await updateDoc(doc(db, 'vendors', existingVendor.id), {
              company: companyName,
              updatedAt: serverTimestamp()
            });
            
            // 로컬 데이터도 업데이트
            setVendorData(prev => prev.map(vendor => 
              vendor.id === existingVendor.id 
                ? { ...vendor, company: companyName }
                : vendor
            ));
            
            console.log('거래처 회사명 업데이트됨:', { name: personName, company: companyName });
          } catch (error) {
            console.error('거래처 회사명 업데이트 오류:', error);
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
        // 수령자 이름이 있으면 거래처 중복확인 및 추가
        if (editingCardName && editingCardName.trim() !== '') {
          await checkAndAddVendor(editingCardName, editingCardCompany, editingCardPosition);
        }
        
        await updateDoc(doc(db, 'giftCards', editingCard), {
          name: editingCardName,
          company: editingCardCompany,
          position: editingCardPosition,
          quantity: editingCardQuantity,
          note: editingCardNote,
          updatedAt: serverTimestamp()
        });
        
        setSections(prev => prev.map(section => ({
          ...section,
          cards: section.cards.map(card => 
            card.id === editingCard 
              ? { 
                  ...card, 
                  name: editingCardName,
                  company: editingCardCompany,
                  position: editingCardPosition,
                  quantity: editingCardQuantity, 
                  note: editingCardNote 
                }
              : card
          )
        })));
        
        setSnackbar({ open: true, message: '카드가 수정되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('카드 저장 오류:', error);
        setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
      }
      
      setEditingCard(null);
      setEditingCardName('');
      setEditingCardCompany('');
      setEditingCardPosition('');
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
    setEditingCardQuantity(1);
    setEditingCardNote('');
  };

  // 섹션에 카드 추가
  const handleAddCardToSection = async (sectionId) => {
    try {
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
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'unknown'
      };
      
      const docRef = await addDoc(collection(db, 'giftCards'), newCardData);
      const newCard = { id: docRef.id, ...newCardData };
      
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, cards: [...section.cards, newCard] }
          : section
      ));
      
      // 새로 추가된 카드를 바로 편집 모드로 설정
      setTimeout(() => {
        handleEditCard(newCard.id, sectionId);
      }, 100);
    } catch (error) {
      console.error('카드 추가 오류:', error);
      setSnackbar({ open: true, message: '카드 추가 중 오류가 발생했습니다.', severity: 'error' });
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
        title: `새 그룹 ${sections.length + 1}`,
        cards: [],
        unitPrice: 0,
        year: selectedYear,
        holiday: selectedHoliday,
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
        
        setSections(prev => prev.filter(section => section.id !== sectionId));
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
  const handleSectionDrop = (e, targetSectionId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedSection || draggedSection.id === targetSectionId) {
      setDraggedSection(null);
      setDragOverSectionId(null);
      return;
    }

    console.log('섹션 드롭:', draggedSection.title, '->', targetSectionId);
    
    setSections(prev => {
      const newSections = [...prev];
      const draggedIndex = newSections.findIndex(s => s.id === draggedSection.id);
      const targetIndex = newSections.findIndex(s => s.id === targetSectionId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // 섹션 순서 변경
        const [draggedItem] = newSections.splice(draggedIndex, 1);
        newSections.splice(targetIndex, 0, draggedItem);
      }
      
      return newSections;
    });
    
    setDraggedSection(null);
    setDragOverSectionId(null);
  };


  // 명절/년도 변경 시 데이터 자동 불러오기
  useEffect(() => {
    loadSectionsData();
  }, [selectedYear, selectedHoliday]);


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

        // 중복 확인 및 같은 이름 확인
        const allExistingNames = sections.flatMap(section => section.cards.map(card => card.name));
        const duplicateNames = [];
        const newNames = [];

        Object.entries(giftGroups).forEach(([giftType, names]) => {
          names.forEach(name => {
            if (allExistingNames.includes(name)) {
              duplicateNames.push(name);
            } else {
              newNames.push({ name, giftType });
            }
          });
        });

        // 중복된 이름이 있으면 확인
        if (duplicateNames.length > 0) {
          const confirmed = window.confirm(
            `다음 이름들이 이미 존재합니다:\n${duplicateNames.join(', ')}\n\n같은 사람인가요? 확인하면 추가됩니다.`
          );
          if (confirmed) {
            duplicateNames.forEach(name => {
              const giftType = giftData.find(item => item.name === name)?.giftType;
              if (giftType) {
                newNames.push({ name, giftType });
              }
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
              isUploaded: true,
              uploadDate: new Date().toISOString(),
              createdAt: serverTimestamp(),
              createdBy: currentUser?.email || 'unknown'
            };
            
            const docRef = await addDoc(collection(db, 'giftSections'), newSectionData);
            const newSection = { id: docRef.id, ...newSectionData };
            
            // 카드들을 Firebase에 추가
            const cardPromises = names.map(async (name) => {
              const cardData = {
                type: 'gift',
                name: name,
                giftType: giftType,
                quantity: 1,
                note: '',
                company: '회사명 없음',
                position: '',
                sectionId: docRef.id,
                year: selectedYear,
                holiday: selectedHoliday,
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
            // 기존 섹션에 모든 카드 추가
            const cardPromises = names.map(async (name) => {
              const cardData = {
                type: 'gift',
                name: name,
                giftType: giftType,
                quantity: 1,
                note: '',
                company: '회사명 없음',
                position: '',
                sectionId: targetSection.id,
                year: selectedYear,
                holiday: selectedHoliday,
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
                    cards: [...section.cards, ...newCards], 
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
                데이터베이스
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
                onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
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
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
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
  onDragStart
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
            <Box key={vendor.id} sx={{ width: 'calc(50% - 4px)', height: '62px' }}>
              <Card 
                draggable
                onDragStart={(e) => onDragStart(e, vendor)}
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
                    전화번호: {vendor.phone || '미등록'}
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
  setEditingCardPosition
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

      {/* 동적 섹션들 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        overflow: 'auto', // 스크롤 가능
        height: (() => {
          // 모든 섹션의 높이 + gap 계산
          const totalHeight = sections.reduce((sum, section) => {
            return sum + (section.height || 200) + 16; // 16px는 gap
          }, 0);
          const calculatedHeight = Math.max(400, totalHeight);
          console.log(`부모 컨테이너 높이 계산: ${calculatedHeight}px (섹션 수: ${sections.length})`);
          return `${calculatedHeight}px`;
        })(),
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {sections.length === 0 ? (
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
          sections.map((section, index) => (
            <Box 
              key={section.id}
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
                    minWidth: 120,
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
                    )
                  }}
                />
                
                <TextField
                  size="small"
                  type="number"
                  value={section.unitPrice || 0}
                  onChange={async (e) => {
                    e.stopPropagation();
                    const unitPrice = parseInt(e.target.value) || 0;
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
                    width: '80px',
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
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#ff4444', fontWeight: 'bold' }}>
                    총액: {((section.unitPrice || 0) * getFilteredCards(section).reduce((sum, card) => sum + (card.quantity || 1), 0)).toLocaleString()}원
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    명단: {getFilteredCards(section).length}명 | 수량: {getFilteredCards(section).reduce((sum, card) => sum + (card.quantity || 1), 0)}개 | 높이: {section.height || 200}px
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
              {section.cards.length === 0 ? (
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
                getFilteredCards(section).map((card, index) => {
                  const isSelected = selectedCards.has(card.id);
                  return (
                    <Card
                      key={card.id}
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
                        bgcolor: isSelected ? '#ff4444' : '#2a2a2a',
                        border: isSelected ? '2px solid #ff6666' : '1px solid #444',
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
                          {index + 1}. {card.name}
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
                          {card.position && `${card.position} `}({card.company}) | 개수: {card.quantity || 1}개
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
          ))
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
              value={editingCardName}
              onChange={(e) => setEditingCardName(e.target.value)}
              size="small"
              required
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
