import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { Grid, Paper, Tabs, Tab, TextField, List, ListItem, ListItemText, Button, IconButton, Typography, Box, FormControl, Select, MenuItem, Checkbox, FormControlLabel, InputLabel, Autocomplete, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';

import { collection, onSnapshot, query, orderBy, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { addSite, updateSite, deleteSite } from '../api/sites';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { formatContractAmount, formatAdvanceAmount, formatGisungAmount } from '../utils/formatUtils';

// 물량과 금액 포맷팅 함수
const formatQuantity = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num === 0) return '0.00';
  return num.toFixed(2);
};

const formatAmount = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num === 0) return '0';
  // 음수도 천단위 쉼표 적용
  const roundedNum = Math.round(num);
  return roundedNum.toLocaleString();
};

const formatPrice = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num === 0) return '0';
  return Math.round(num).toLocaleString();
};
import { getSiteIntegratedStatus } from '../utils/integrationUtils';
import * as XLSX from 'xlsx';

const STATUS_OPTIONS = ['예정', '진행중', '완료', '미정'];
const CONTRACT_TYPE_OPTIONS = ['하도급계약', '납품계약', '일반계약', '계약없음', '원도급', '관급'];
const ESTIMATE_STATUS_OPTIONS = ['제출대기', '제출완료', '수주', '미수주', '기타'];
const ESTIMATE_TYPE_OPTIONS = ['견적', '입찰', '수의', '소개'];

const initialFormState = {
  name: '',
  status: '진행중',
  contractType: '관급',
  subcontractGuardian: false,
  installment: '',
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
  isFavorite: false,
  stampType: '인감없음',
  items: [],
  estimateStatus: '',
  estimateType: '', // 견적유무 필드 추가
  note: '', // estimateNote를 note로 변경
};

const NewSites = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [statusTab, setStatusTab] = useState('진행중');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [vendors, setVendors] = useState([]); // 거래처 데이터 상태 추가
  const [siteIntegratedStatus, setSiteIntegratedStatus] = useState(null);
  const [totalIntegratedStatus, setTotalIntegratedStatus] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerRef = useRef(null);

  // 물량내역 업로드 관련 상태
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedItems, setUploadedItems] = useState([]);

  // 상태별 카운트 계산
  const statusCounts = useMemo(() => {
    const counts = {
      '예정': 0,
      '진행중': 0,
      '완료': 0,
      '미정': 0
    };
    
    sites.forEach(site => {
      if (counts.hasOwnProperty(site.status)) {
        counts[site.status]++;
      }
    });
    
    return counts;
  }, [sites]);

  // URL 파라미터에서 현장명 확인 및 자동 선택
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    if (pathSegments.length > 2 && pathSegments[1] === 'sites') {
      const siteName = decodeURIComponent(pathSegments[2]);
      const targetSite = sites.find(site => site.name === siteName);
      if (targetSite) {
        startTransition(() => {
          setSelectedSite(targetSite);
          setForm(targetSite);
          setIsEditing(false);
        });
      }
    }
  }, [location.pathname, sites]);

  // location state에서 전달받은 현장 정보 처리
  useEffect(() => {
    if (location.state && sites.length > 0) {
      const { selectedSiteId, selectedSiteName } = location.state;
      
      if (selectedSiteId) {
        const targetSite = sites.find(site => site.id === selectedSiteId);
        if (targetSite) {
          startTransition(() => {
            setSelectedSite(targetSite);
            setForm(targetSite);
            setIsEditing(false);
          });
        }
      } else if (selectedSiteName) {
        const targetSite = sites.find(site => site.name === selectedSiteName);
        if (targetSite) {
          startTransition(() => {
            setSelectedSite(targetSite);
            setForm(targetSite);
            setIsEditing(false);
          });
        }
      }
      
      // location state 초기화 (중복 실행 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location.state, sites]);



  // 현장 데이터가 변경될 때마다 전체 통합현황 재계산 (캐싱 적용)
  const [gisungData, setGisungData] = useState([]);
  const [costData, setCostData] = useState([]);
  
  // 기성 데이터 로드
  useEffect(() => {
    const loadGisungData = async () => {
      try {
        const gisungQuery = query(collection(db, 'gisung'));
        const gisungSnapshot = await getDocs(gisungQuery);
        const data = gisungSnapshot.docs.map(doc => doc.data());
        setGisungData(data);
      } catch (error) {
        console.error('기성 데이터 로드 오류:', error);
      }
    };
    
    const loadCostData = async () => {
      try {
        const costQuery = query(collection(db, 'costs'));
        const costSnapshot = await getDocs(costQuery);
        const data = costSnapshot.docs.map(doc => doc.data());
        setCostData(data);
      } catch (error) {
        console.error('지출 데이터 로드 오류:', error);
      }
    };
    
    loadGisungData();
    loadCostData();
  }, []);
  
  // 캐시된 데이터를 사용한 통합현황 계산
  useEffect(() => {
    if (sites.length === 0) return;
    
    try {
      let totalContractAmount = 0;
      let totalProgressAmount = 0;
      let totalCostAmount = 0;

      // 1. 계약금액: 현장상세정보에서 직접 가져오기 (로컬 계산)
      totalContractAmount = sites.reduce((sum, site) => {
        return sum + (Number(site.contractAmount) || 0);
      }, 0);
      
      // 2. 누계기성: 캐시된 데이터 사용
      const siteNames = sites.map(site => site.name);
      
      totalProgressAmount = gisungData.reduce((sum, gisung) => {
        if (siteNames.includes(gisung.name)) {
          return sum + (Number(gisung.gisungAmount) || 0);
        }
        return sum;
      }, 0);
      
      totalCostAmount = costData.reduce((sum, cost) => {
        if (siteNames.includes(cost.siteName)) {
          return sum + (Number(cost.amount) || 0);
        }
        return sum;
      }, 0);

      console.log('통합현황 계산 결과 (캐시 사용):', {
        totalContractAmount,
        totalProgressAmount,
        totalCostAmount,
        sitesCount: sites.length,
        gisungDataLength: gisungData.length,
        costDataLength: costData.length,
        siteNames: siteNames
      });

      setTotalIntegratedStatus({
        summary: {
          totalEstimateAmount: totalContractAmount,
          totalClaimAmount: totalProgressAmount,
          totalCostAmount: totalCostAmount
        }
      });
    } catch (error) {
      console.error('전체 통합현황 계산 오류:', error);
    }
  }, [sites, gisungData, costData]);

  // 모바일에서 키보드가 올라올 때 뷰포트 조정 (간소화)
  useEffect(() => {
    if (isMobile) {
      const handleFocusIn = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          // 간단한 스크롤 조정만 수행
          setTimeout(() => {
            e.target.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }, 100);
        }
      };

      document.addEventListener('focusin', handleFocusIn);

      return () => {
        document.removeEventListener('focusin', handleFocusIn);
      };
    }
  }, [isMobile]);

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString === 'string' && dateString.includes('.')) {
      return dateString.replace(/\./g, '-');
    }
    if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }
    return dateString;
  };

  const formatDateForStorage = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString === 'string' && dateString.includes('-')) {
      return dateString.replace(/-/g, '.');
    }
    return dateString;
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

  useEffect(() => {
    const q = query(collection(db, 'sites'), orderBy('name'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sitesData = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (data.status === '진행') data.status = '진행중';
        else if (data.status === '진행상황') data.status = '예정';
        return data;
      });

      const sitesWithGisung = await Promise.all(
        sitesData.map(async (site) => {
          try {
            const gisungQuery = query(collection(db, 'gisung'), where('name', '==', site.name));
            const gisungSnapshot = await getDocs(gisungQuery);
            const totalGisung = gisungSnapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().gisungAmount) || 0), 0);
            return { ...site, totalProgress: totalGisung };
          } catch (error) {
            console.error(`Error fetching gisung for site ${site.name}:`, error);
            return site;
          }
        })
      );
      setSites(sitesWithGisung);
    }, (error) => {
      console.error("Error fetching sites in real-time:", error);
    });

    // 거래처 데이터도 함께 로드
    loadVendors();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedSite) {
      setForm({
        ...initialFormState,
        ...selectedSite,
        startDate: selectedSite.startDate ? selectedSite.startDate.split('T')[0] : '',
        endDate: selectedSite.endDate ? selectedSite.endDate.split('T')[0] : '',
      });
      setIsEditing(false);
    } else {
      setForm(initialFormState);
      setIsEditing(true);
    }
  }, [selectedSite]);

  const filteredSites = useMemo(() => {
    return sites
      .filter(site => site.status === statusTab)
      .filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (site.manager && site.manager.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [sites, statusTab, searchTerm]);

  const handleSelectSite = async (site) => {
    setSelectedSite(site);
    
    // 선택된 현장의 통합 현황 조회
    if (site) {
      try {
        // 중복 단수정리 항목 자동 정리
        let cleanedItems = site.items || [];
        const adjustmentItems = cleanedItems.filter(item => item.name === '단수정리');
        
        if (adjustmentItems.length > 1) {
          console.log(`중복 단수정리 항목 발견: ${adjustmentItems.length}개`);
          
          // 첫 번째 단수정리 항목만 남기고 나머지 제거
          let foundFirst = false;
          cleanedItems = cleanedItems.filter(item => {
            if (item.name === '단수정리') {
              if (!foundFirst) {
                foundFirst = true;
                return true; // 첫 번째는 유지
              } else {
                return false; // 나머지는 제거
              }
            }
            return true; // 단수정리가 아닌 항목들은 모두 유지
          });
          
          // Firebase에 자동 저장
          try {
            await updateDoc(doc(db, 'sites', site.id), {
              items: cleanedItems,
              updatedAt: new Date()
            });
            console.log('중복 단수정리 항목 자동 정리 완료');
          } catch (error) {
            console.error('중복 단수정리 자동 정리 오류:', error);
          }
        }
        
        // 물량내역에서 계약금액 자동 추출
        const autoContractAmount = getAutoContractAmount(cleanedItems);
        
        // 계약금액 우선순위: 물량내역 > 현장상세정보
        const contractAmount = autoContractAmount > 0 ? autoContractAmount : (Number(site.contractAmount) || 0);
        
        // 2. 누계기성: 캐시된 데이터 사용
        const totalGisungAmount = gisungData.reduce((sum, gisung) => {
          if (gisung.name === site.name) {
            return sum + (Number(gisung.gisungAmount) || 0);
          }
          return sum;
        }, 0);
        
        // 3. 지출: 캐시된 데이터 사용
        const totalCostAmount = costData.reduce((sum, cost) => {
          if (cost.siteName === site.name) {
            return sum + (Number(cost.amount) || 0);
          }
          return sum;
        }, 0);
        
        const integratedStatus = {
          summary: {
            totalEstimateAmount: contractAmount,
            totalClaimAmount: totalGisungAmount,
            totalCostAmount: totalCostAmount
          }
        };
        
        console.log('현장 통합현황 계산 (캐시 사용):', {
          siteName: site.name,
          contractAmount,
          totalGisungAmount,
          totalCostAmount
        });
        
        setSiteIntegratedStatus(integratedStatus);
        
        // 폼 데이터 설정 (물량내역의 계약금액 우선, 정리된 아이템 사용)
        setForm(prev => ({
          ...prev,
          ...site,
          items: cleanedItems,
          contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : (site.contractAmount || '')
        }));
        
        setIsEditing(false);
      } catch (error) {
        console.error('현장 통합 현황 조회 오류:', error);
        setSiteIntegratedStatus(null);
      }
    } else {
      setSiteIntegratedStatus(null);
    }
  };
  // 전화번호 서식 함수
  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');
    
    // 길이에 따라 서식 적용
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    // 전화번호 필드인 경우 서식 적용
    if (name === 'phone' && type !== 'checkbox') {
      newValue = formatPhoneNumber(value);
    }
    
    setForm(prev => ({ ...prev, [name]: newValue }));
    
    // 진행상황이 변경되고 현재 현장이 선택되어 있으면 자동 저장
    if (name === 'status' && selectedSite && !isEditing) {
      try {
        await updateSite(selectedSite.id, { 
          ...form, 
          status: newValue,
          updatedAt: new Date()
        });
        console.log('진행상황 자동 저장 완료:', newValue);
      } catch (error) {
        console.error('진행상황 자동 저장 실패:', error);
        alert('진행상황 저장에 실패했습니다.');
      }
    }
  };
  // 물량내역에서 계약금액(부가세포함) 자동 추출 함수
  const getAutoContractAmount = (items) => {
    const totalWithVatItem = items?.find(item => item.isTotalWithVat);
    return totalWithVatItem ? parseFloat(totalWithVatItem.amount) || 0 : 0;
  };

  const handleItemsChange = async (index, field, value) => {
    // 수정 모드가 아닌 경우 편집 불가
    if (selectedSite && !isEditing) {
      return;
    }
    
    const newItems = [...form.items];
    
    // 단가와 금액의 경우 쉼표 제거 후 저장
    if (field === 'price' || field === 'amount') {
      const numericValue = value.replace(/,/g, '');
      newItems[index][field] = numericValue;
    } else {
      newItems[index][field] = value;
    }
    
    // 물량이나 단가가 변경되면 금액 자동 계산
    if (field === 'quantity' || field === 'price') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].price) || 0;
      newItems[index].amount = (quantity * price).toString();
    }
    
    // 총 공사계 자동 재계산 (단수정리 포함)
    const totalAmount = newItems
      .filter(item => !item.isSpacer && !item.isTotal && !item.isVat && !item.isTotalWithVat)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 총 공사계 업데이트
    const totalIndex = newItems.findIndex(item => item.isTotal);
    if (totalIndex !== -1) {
      newItems[totalIndex].amount = totalAmount.toString();
    }
    
    // 부가세 업데이트
    const vatAmount = Math.round(totalAmount * 0.1);
    const vatIndex = newItems.findIndex(item => item.isVat);
    if (vatIndex !== -1) {
      newItems[vatIndex].amount = vatAmount.toString();
    }
    
    // 계약금액(부가세포함) 업데이트
    const totalWithVat = totalAmount + vatAmount;
    const totalWithVatIndex = newItems.findIndex(item => item.isTotalWithVat);
    if (totalWithVatIndex !== -1) {
      newItems[totalWithVatIndex].amount = totalWithVat.toString();
    }
    
    // 계약금액 자동 업데이트
    const autoContractAmount = getAutoContractAmount(newItems);
    
    // 로컬 상태 업데이트
    setForm(prev => ({ 
      ...prev, 
      items: newItems,
      contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : prev.contractAmount
    }));
    
    // Firebase에 실시간 저장 (수정 모드일 때만)
    if (selectedSite && isEditing) {
      try {
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          items: newItems,
          contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : form.contractAmount,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('물량내역 실시간 저장 오류:', error);
      }
    }
  };
  const handleAddItem = async () => {
    // 수정 모드가 아닌 경우 편집 불가
    if (selectedSite && !isEditing) {
      return;
    }
    
    const currentItems = [...(form.items || [])];
    
    // 총공사계 위의 인덱스 찾기
    const totalIndex = currentItems.findIndex(item => item.isTotal);
    
    // 총공사계 위에 새 항목 추가
    const newItem = { name: '', quantity: '', price: '', amount: '' };
    if (totalIndex !== -1) {
      currentItems.splice(totalIndex, 0, newItem);
    } else {
      // 총공사계가 없으면 맨 뒤에 추가
      currentItems.push(newItem);
    }
    
    setForm(prev => ({ ...prev, items: currentItems }));
    
    // Firebase에 실시간 저장 (수정 모드일 때만)
    if (selectedSite && isEditing) {
      try {
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          items: currentItems,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('품목 추가 실시간 저장 오류:', error);
      }
    }
  };

  const handleAddAdjustmentItem = async () => {
    // 수정 모드가 아닌 경우 편집 불가
    if (selectedSite && !isEditing) {
      return;
    }
    
    const currentItems = [...(form.items || [])];
    
    // 이미 단수정리 항목이 있는지 확인
    const existingAdjustment = currentItems.find(item => item.name === '단수정리');
    if (existingAdjustment) {
      alert('단수정리 항목이 이미 존재합니다.');
      return;
    }
    
    // 단수정리 항목 추가
    const adjustmentItem = {
      name: '단수정리',
      quantity: '',
      price: '',
      amount: '',
      isAdjustment: true
    };
    
    // 총계 항목들 앞에 추가
    const totalIndex = currentItems.findIndex(item => item.isTotal);
    if (totalIndex !== -1) {
      currentItems.splice(totalIndex, 0, adjustmentItem);
    } else {
      currentItems.push(adjustmentItem);
    }
    
    setForm(prev => ({ ...prev, items: currentItems }));
    
    // Firebase에 실시간 저장 (수정 모드일 때만)
    if (selectedSite && isEditing) {
      try {
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          items: currentItems,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('단수정리 항목 추가 실시간 저장 오류:', error);
      }
    }
  };
  
  const handleRemoveItem = async (index) => {
    // 수정 모드가 아닌 경우 편집 불가
    if (selectedSite && !isEditing) {
      return;
    }
    
    // 삭제하려는 항목이 단수정리인지 확인
    const itemToRemove = form.items[index];
    if (itemToRemove && itemToRemove.name === '단수정리') {
      console.log('단수정리 항목은 삭제할 수 없습니다.');
      return;
    }
    
    const newItems = form.items.filter((_, i) => i !== index);
    
    // 총 공사계 자동 재계산 (단수정리 포함)
    const totalAmount = newItems
      .filter(item => !item.isSpacer && !item.isTotal && !item.isVat && !item.isTotalWithVat)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 총 공사계 업데이트
    const totalIndex = newItems.findIndex(item => item.isTotal);
    if (totalIndex !== -1) {
      newItems[totalIndex].amount = totalAmount.toString();
    }
    
    // 부가세 업데이트
    const vatAmount = Math.round(totalAmount * 0.1);
    const vatIndex = newItems.findIndex(item => item.isVat);
    if (vatIndex !== -1) {
      newItems[vatIndex].amount = vatAmount.toString();
    }
    
    // 계약금액(부가세포함) 업데이트
    const totalWithVat = totalAmount + vatAmount;
    const totalWithVatIndex = newItems.findIndex(item => item.isTotalWithVat);
    if (totalWithVatIndex !== -1) {
      newItems[totalWithVatIndex].amount = totalWithVat.toString();
    }
    
    // 계약금액 자동 업데이트
    const autoContractAmount = getAutoContractAmount(newItems);
    
    setForm(prev => ({ 
      ...prev, 
      items: newItems,
      contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : prev.contractAmount
    }));
    
    // Firebase에 실시간 저장 (수정 모드일 때만)
    if (selectedSite && isEditing) {
      try {
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          items: newItems,
          contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : form.contractAmount,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('품목 삭제 실시간 저장 오류:', error);
      }
    }
  };

  // 물량내역 업로드 관련 함수들
  const handleOpenUploadDialog = () => {
    // 수정 모드가 아닌 경우 업로드 불가
    if (selectedSite && !isEditing) {
      alert('수정 모드에서만 업로드할 수 있습니다.');
      return;
    }
    
    setUploadedItems([]);
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false, // 문자열로 읽기
          defval: '' // 빈 셀의 기본값
        });

        // 5번째 줄부터 데이터 추출 (A, B, C, D, E, K, L 열)
        const extractedItems = [];
        let totalAmount = 0;
        let danSuFound = false; // 단수정리 발견 여부
        
        for (let i = 4; i < jsonData.length; i++) { // 5번째 줄부터 (인덱스 4)
          const row = jsonData[i];
          
          if (row && row.length > 11) { // L열까지 있으려면 최소 12개 열 필요
            const itemName = row[0]; // A열 (인덱스 0) - 품명
            const specification = row[1]; // B열 (인덱스 1) - 규격
            const unit = row[2]; // C열 (인덱스 2) - 단위
            const quantity = row[3]; // D열 (인덱스 3) - 수량
            const amount = row[4]; // E열 (인덱스 4) - 금액 (새로 추가)
            const unitPrice = row[10]; // K열 (인덱스 10) - 단가
            const totalPrice = row[11]; // L열 (인덱스 11) - 금액 (기존)

            // 단수정리를 만나면 그 이후는 읽지 않음
            if (itemName && (itemName.includes('단수정리') || itemName.includes('NEGO') || itemName.includes('네고'))) {
              danSuFound = true;
              console.log(`✅ 단수정리 발견: ${itemName} (행 ${i + 1})`);
            }
            
            // 단수정리 이후는 완전히 중단
            if (danSuFound && !itemName.includes('단수정리') && !itemName.includes('NEGO') && !itemName.includes('네고')) {
              console.log(`🛑 단수정리 이후 중단: ${itemName} (행 ${i + 1})`);
              break;
            }

            // 단수정리 또는 일반 항목 처리
            if (itemName && (
                // 일반 항목들
                (!itemName.includes('부가세 별도') && 
                !itemName.includes('[ 총 공 사 금 액 ]') &&
                !itemName.includes('────────────────') &&
                !itemName.includes('총 공사계') &&
                !itemName.includes('부가세') &&
                !itemName.includes('계약금액') &&
                !itemName.includes('실선') &&
                !itemName.includes('구분선')) ||
                // 단수정리 항목
                itemName.includes('단수정리') ||
                itemName.includes('NEGO') ||
                itemName.includes('네고')
            )) {
              // 디버깅을 위한 로그
              console.log(`행 ${i + 1}: A=${itemName}, B=${specification}, C=${unit}, D=${quantity}, K=${unitPrice}, L=${totalPrice}`);
              console.log(`원시 값 타입: L=${typeof totalPrice}, 값=${totalPrice}`);
              
              // 값 정리 (공백 제거, 쉼표 제거, 음수 기호 유지)
              const cleanQuantity = quantity ? quantity.toString().trim().replace(/,/g, '') : '';
              const cleanUnitPrice = unitPrice ? unitPrice.toString().trim().replace(/,/g, '') : '';
              const cleanTotalPrice = totalPrice ? totalPrice.toString().trim().replace(/,/g, '') : '';
              
              // 단수정리 금액은 그대로 유지 (임의 계산하지 않음)
              let displayName = itemName;
              let finalAmount = cleanTotalPrice;
              
              // 음수 확인 (단수정리 표시용)
              const numericValue = parseFloat(cleanTotalPrice);
              const isNegative = !isNaN(numericValue) && numericValue < 0;
              
              console.log(`정리된 값: ${cleanTotalPrice}, 숫자값: ${numericValue}, 음수여부: ${isNegative}`);
              
              if (isNegative) {
                // 단수정리 표시만 변경, 금액은 그대로 유지
                displayName = '단수정리';
                finalAmount = cleanTotalPrice; // 원래 값 그대로 유지
                console.log(`단수정리 표시: ${cleanTotalPrice} (원래 값 유지)`);
              }
              
              // 물량이 1인 경우 단가와 금액을 같게 설정
              let finalPrice = cleanUnitPrice;
              let finalAmountValue = finalAmount;
              
              const quantityNum = parseFloat(cleanQuantity);
              if (quantityNum === 1 && cleanUnitPrice && !cleanTotalPrice) {
                // 물량이 1이고 단가는 있지만 금액이 없는 경우
                finalPrice = cleanUnitPrice;
                finalAmountValue = cleanUnitPrice; // 단가와 금액을 같게
                console.log(`물량 1 처리: ${itemName} - 단가: ${cleanUnitPrice}, 금액: ${finalAmountValue}`);
              } else if (quantityNum === 1 && !cleanUnitPrice && cleanTotalPrice) {
                // 물량이 1이고 단가는 없지만 금액이 있는 경우
                finalPrice = cleanTotalPrice; // 금액을 단가로 사용
                finalAmountValue = cleanTotalPrice;
                console.log(`물량 1 처리: ${itemName} - 단가: ${finalPrice}, 금액: ${finalAmountValue}`);
              }
              
              const item = {
                id: Date.now() + i,
                name: displayName || '',
                specification: specification || '', // B열 - 규격
                unit: unit || '', // C열 - 단위
                quantity: cleanQuantity,
                price: finalPrice,
                amount: finalAmountValue
              };
              
              // 총 금액 계산 (음수도 포함)
              if (cleanTotalPrice) {
                totalAmount += parseFloat(finalAmount) || 0;
              }
              
              extractedItems.push(item);
            }
          }
        }
        
        // 단수정리 항목은 자동으로 추가하지 않음 (사용자가 직접 추가하도록)
        // extractedItems.push({
        //   id: Date.now() + 'adjustment',
        //   name: '단수정리',
        //   quantity: '',
        //   price: '',
        //   amount: '',
        //   isAdjustment: true
        // });
        
        // 이미 단수정리까지만 추출되었으므로 그대로 사용
        console.log('✅ 단수정리까지만 추출 완료');

        setUploadedItems(extractedItems);
        console.log('추출된 물량내역:', extractedItems);
      } catch (error) {
        console.error('엑셀 파일 처리 오류:', error);
        alert('엑셀 파일 처리 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveUploadedItems = async () => {
    if (uploadedItems.length === 0) {
      alert('저장할 데이터가 없습니다.');
      return;
    }

    try {
      // 업로드된 아이템들에 기본 구조 추가 (총 공사계, 부가세, 계약금액 포함)
      const updatedItems = [
        ...uploadedItems, // 업로드된 아이템들
        { isTotal: true, name: '총 공사계(부가세별도)', quantity: '', price: '', amount: '0' }, // 총 공사계
        { isVat: true, name: '부가세', quantity: '', price: '', amount: '0' }, // 부가세
        { isTotalWithVat: true, name: '계약금액(부가세포함)', quantity: '', price: '', amount: '0' } // 계약금액
      ];
      
      // 총 공사계 자동 계산
      const totalAmount = uploadedItems
        .filter(item => !item.isSpacer && !item.isTotal && !item.isVat && !item.isTotalWithVat)
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      
      // 총 공사계 업데이트
      const totalIndex = updatedItems.findIndex(item => item.isTotal);
      if (totalIndex !== -1) {
        updatedItems[totalIndex].amount = totalAmount.toString();
      }
      
      // 부가세 업데이트
      const vatAmount = Math.round(totalAmount * 0.1);
      const vatIndex = updatedItems.findIndex(item => item.isVat);
      if (vatIndex !== -1) {
        updatedItems[vatIndex].amount = vatAmount.toString();
      }
      
      // 계약금액(부가세포함) 업데이트
      const totalWithVat = totalAmount + vatAmount;
      const totalWithVatIndex = updatedItems.findIndex(item => item.isTotalWithVat);
      if (totalWithVatIndex !== -1) {
        updatedItems[totalWithVatIndex].amount = totalWithVat.toString();
      }
      
      // 계약금액 자동 업데이트
      const autoContractAmount = getAutoContractAmount(updatedItems);
      
      // Firebase에 실시간 저장
      if (selectedSite) {
        // 기존 현장 수정
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          items: updatedItems,
          contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : form.contractAmount,
          updatedAt: new Date()
        });
      } else {
        // 새 현장 생성
        const newSiteData = {
          ...form,
          items: updatedItems,
          contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : form.contractAmount,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await addDoc(collection(db, 'sites'), newSiteData);
      }

      // 로컬 상태 업데이트
      setForm(prev => ({
        ...prev,
        items: updatedItems,
        contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : prev.contractAmount
      }));

      console.log('저장된 아이템들:', updatedItems);
      alert('물량내역이 성공적으로 저장되었습니다. 총 공사계, 부가세, 계약금액이 자동으로 추가되었습니다.');
      handleCloseUploadDialog();
    } catch (error) {
      console.error('물량내역 저장 오류:', error);
      alert('물량내역 저장 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleEditUploadedItem = (index, field, value) => {
    const updatedItems = [...uploadedItems];
    
    // 총 공사계는 편집 불가
    if (updatedItems[index].isTotal) {
      return;
    }
    
    // 단가와 금액의 경우 쉼표 제거 후 저장
    if (field === 'price' || field === 'amount') {
      const numericValue = value.replace(/,/g, '');
      updatedItems[index] = { ...updatedItems[index], [field]: numericValue };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }
    
    // 총 공사계 자동 재계산 (단수정리 포함)
    const totalAmount = updatedItems
      .filter(item => !item.isSpacer && !item.isTotal && !item.isVat && !item.isTotalWithVat)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 총 공사계 업데이트
    const totalIndex = updatedItems.findIndex(item => item.isTotal);
    if (totalIndex !== -1) {
      updatedItems[totalIndex].amount = totalAmount.toString();
    }
    
    // 부가세 업데이트
    const vatAmount = Math.round(totalAmount * 0.1);
    const vatIndex = updatedItems.findIndex(item => item.isVat);
    if (vatIndex !== -1) {
      updatedItems[vatIndex].amount = vatAmount.toString();
    }
    
    // 계약금액(부가세포함) 업데이트
    const totalWithVat = totalAmount + vatAmount;
    const totalWithVatIndex = updatedItems.findIndex(item => item.isTotalWithVat);
    if (totalWithVatIndex !== -1) {
      updatedItems[totalWithVatIndex].amount = totalWithVat.toString();
    }
    
    setUploadedItems(updatedItems);
  };

  const handleDeleteUploadedItem = (index) => {
    // 총 공사계는 삭제 불가
    if (uploadedItems[index].isTotal) {
      return;
    }
    
    const updatedItems = uploadedItems.filter((_, i) => i !== index);
    
    // 총 공사계 자동 재계산 (단수정리 포함)
    const totalAmount = updatedItems
      .filter(item => !item.isSpacer && !item.isTotal && !item.isVat && !item.isTotalWithVat)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 총 공사계 업데이트
    const totalIndex = updatedItems.findIndex(item => item.isTotal);
    if (totalIndex !== -1) {
      updatedItems[totalIndex].amount = totalAmount.toString();
    }
    
    // 부가세 업데이트
    const vatAmount = Math.round(totalAmount * 0.1);
    const vatIndex = updatedItems.findIndex(item => item.isVat);
    if (vatIndex !== -1) {
      updatedItems[vatIndex].amount = vatAmount.toString();
    }
    
    // 계약금액(부가세포함) 업데이트
    const totalWithVat = totalAmount + vatAmount;
    const totalWithVatIndex = updatedItems.findIndex(item => item.isTotalWithVat);
    if (totalWithVatIndex !== -1) {
      updatedItems[totalWithVatIndex].amount = totalWithVat.toString();
    }
    
    setUploadedItems(updatedItems);
  };
  const handleNewSite = () => {
    setSelectedSite(null);
    setSiteIntegratedStatus(null);
    
    // 기본 구조의 물량내역 생성 (총 공사계, 부가세, 계약금액 포함)
    const defaultItems = [
      { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 1
      { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 2
      { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 3
      { isTotal: true, name: '총 공사계(부가세별도)', quantity: '', price: '', amount: '0' }, // 총 공사계
      { isVat: true, name: '부가세', quantity: '', price: '', amount: '0' }, // 부가세
      { isTotalWithVat: true, name: '계약금액(부가세포함)', quantity: '', price: '', amount: '0' } // 계약금액
    ];
    
    setForm({
      name: '',
      contractType: '관급',
      manager: '',
      startDate: '',
      endDate: '',
      status: '진행중',
      isFavorite: false,
      items: defaultItems
    });
    setIsEditing(false);
  };
  const handleEditClick = () => setIsEditing(true);

  // 견적페이지와 연동하는 함수
  const syncWithEstimates = async (manager, companyName) => {
    if (manager && manager.trim()) {
      try {
        // 1. 거래처관리(vendors)에 저장
        const vendorData = {
          name: manager.trim(),
          position: '', // 현장관리에서는 직위 정보가 없음
          companyName: companyName && companyName.trim() ? companyName.trim() : '',
          source: 'new_sites',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 거래처가 있는지 확인
        const existingVendorQuery = query(
          collection(db, 'vendors'),
          where('name', '==', manager.trim())
        );
        const existingVendorSnapshot = await getDocs(existingVendorQuery);
        
        if (existingVendorSnapshot.empty) {
          console.log('새로운 거래처 추가:', vendorData);
          await addDoc(collection(db, 'vendors'), vendorData);
        } else {
          console.log('기존 거래처 업데이트:', vendorData);
          const existingVendorDoc = existingVendorSnapshot.docs[0];
          await updateDoc(doc(db, 'vendors', existingVendorDoc.id), {
            companyName: vendorData.companyName,
            updatedAt: new Date()
          });
        }
        
        // 2. 견적페이지에서 사용할 의뢰자 데이터 생성
        const requesterData = {
          name: manager.trim(),
          title: '', // 현장관리에서는 직위 정보가 없음
          fullName: manager.trim(),
          company: companyName && companyName.trim() ? companyName.trim() : '',
          source: 'new_sites',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 의뢰자가 있는지 확인
        const existingRequesterQuery = query(
          collection(db, 'requesters'),
          where('name', '==', manager.trim())
        );
        const existingRequesterSnapshot = await getDocs(existingRequesterQuery);
        
        if (existingRequesterSnapshot.empty) {
          console.log('새로운 의뢰자 추가:', requesterData);
          await addDoc(collection(db, 'requesters'), requesterData);
        } else {
          console.log('기존 의뢰자 업데이트:', requesterData);
          const existingRequesterDoc = existingRequesterSnapshot.docs[0];
          await updateDoc(doc(db, 'requesters', existingRequesterDoc.id), {
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
    // 기타 선택 시 견적 비고 필수 검증
    if (form.estimateStatus === '기타' && !form.estimateNote?.trim()) {
      alert('기타 선택 시 견적 비고를 반드시 입력해야 합니다.');
      estimateNoteRef.current?.focus();
      return;
    }

    const formDataToSave = { ...form, startDate: formatDateForStorage(form.startDate), endDate: formatDateForStorage(form.endDate) };
    if (selectedSite) {
      if (window.confirm('수정하시겠습니까?')) {
        try {
          await updateSite(selectedSite.id, formDataToSave);
          // 견적페이지와 연동
          await syncWithEstimates(form.manager, form.companyName);
          setIsEditing(false);
        } catch (error) { console.error("Failed to update site:", error); }
      }
    } else {
      // 등록 확인 메시지
      const confirmMessage = `다음 현장을 등록하시겠습니까?\n\n현장명: ${form.name}\n계약구분: ${form.contractType}\n담당자: ${form.manager}\n시작일: ${form.startDate}\n종료일: ${form.endDate}`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      try {
        await addSite(formDataToSave);
        // 견적페이지와 연동
        await syncWithEstimates(form.manager, form.companyName);
        alert('현장이 성공적으로 등록되었습니다.');
        handleNewSite();
      } catch (error) { 
        console.error("Failed to add site:", error);
        alert('현장 등록 중 오류가 발생했습니다.');
      }
    }
  };
  
  const handleDelete = async () => {
    if (selectedSite && window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteSite(selectedSite.id);
        handleNewSite();
      } catch (error) { console.error("Failed to delete site:", error); }
    }
  };

  const handleGisung = () => {
    if (selectedSite) {
      // 현장별 기성현황으로 이동 (현장별 뷰로 설정)
      navigate(`/progress?siteId=${selectedSite.id}&viewMode=site`);
    } else {
      navigate('/progress');
    }
  };
  const handleWholeList = () => navigate('/whole-list');
  const isReadOnly = !isEditing;

  const scrollFocus = (ref) => () => {
    if (isMobile) {
      setTimeout(() => {
        ref?.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // 모바일에서 추가 스크롤 조정
        const container = containerRef.current;
        if (container) {
          const rect = ref.current?.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect && containerRect) {
            const offset = rect.top - containerRect.top - 100;
            container.scrollTop += offset;
          }
        }
      }, 100);
    } else {
      setTimeout(() => {
        ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  // 견적 유무 색상 반환 함수
  const getEstimateStatusColor = (status) => {
    switch (status) {
      case '있음':
        return '#4caf50';
      case '없음':
        return '#f44336';
      case '입찰':
        return '#9c27b0';
      case '현설':
        return '#00bcd4';
      case '기타':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const inputRef1 = useRef();
  const inputRef2 = useRef();
  const addressRef = useRef();
  const startDateRef = useRef();
  const endDateRef = useRef();
  const companyNameRef = useRef();
  const managerRef = useRef();
  const phoneRef = useRef();
  const teamRef = useRef();
  const descRef = useRef();
  const estimateTypeRef = useRef();
  const noteRef = useRef();

  // 중복 단수정리 항목 정리 함수
  // 엑셀 다운로드 함수 (gisung.xlsx 템플릿 사용)


  const handleCleanupDuplicateAdjustments = async () => {
    if (!selectedSite) {
      alert('현장을 선택해주세요.');
      return;
    }

    const currentItems = [...(form.items || [])];
    const adjustmentItems = currentItems.filter(item => item.name === '단수정리');
    
    if (adjustmentItems.length <= 1) {
      alert('중복된 단수정리 항목이 없습니다.');
      return;
    }

    if (!confirm(`중복된 단수정리 항목 ${adjustmentItems.length}개를 정리하시겠습니까?`)) {
      return;
    }

    try {
      // 첫 번째 단수정리 항목만 남기고 나머지 제거
      let foundFirst = false;
      const cleanedItems = currentItems.filter(item => {
        if (item.name === '단수정리') {
          if (!foundFirst) {
            foundFirst = true;
            return true; // 첫 번째는 유지
          } else {
            return false; // 나머지는 제거
          }
        }
        return true; // 단수정리가 아닌 항목들은 모두 유지
      });

      // Firebase에 저장
      await updateDoc(doc(db, 'sites', selectedSite.id), {
        items: cleanedItems,
        updatedAt: new Date()
      });

      // 로컬 상태 업데이트
      setSites(prev => prev.map(site => 
        site.id === selectedSite.id 
          ? { ...site, items: cleanedItems }
          : site
      ));

      // 선택된 현장 상태도 업데이트
      setSelectedSite(prev => prev ? { ...prev, items: cleanedItems } : null);

      // 폼 상태도 업데이트
      setForm(prev => ({ ...prev, items: cleanedItems }));

      alert(`중복된 단수정리 항목이 정리되었습니다. (${adjustmentItems.length}개 → 1개)`);
    } catch (error) {
      console.error('중복 단수정리 정리 오류:', error);
      alert('중복 단수정리 정리 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 물량내역 초기화 함수
  const handleClearItems = async () => {
    if (!selectedSite) {
      alert('현장을 선택해주세요.');
      return;
    }

    if (!confirm('물량내역을 모두 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      // 기본 구조의 물량내역 생성 (총 공사계, 부가세, 계약금액 포함)
      const defaultItems = [
        { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 1
        { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 2
        { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 3
        { isTotal: true, name: '총 공사계(부가세별도)', quantity: '', price: '', amount: '0' }, // 총 공사계
        { isVat: true, name: '부가세', quantity: '', price: '', amount: '0' }, // 부가세
        { isTotalWithVat: true, name: '계약금액(부가세포함)', quantity: '', price: '', amount: '0' } // 계약금액
      ];

      // 선택된 현장의 물량내역을 기본 구조로 초기화
      await updateDoc(doc(db, 'sites', selectedSite.id), {
        items: defaultItems
      });

      // 로컬 상태 업데이트
      setSites(prev => prev.map(site => 
        site.id === selectedSite.id 
          ? { ...site, items: defaultItems }
          : site
      ));

      // 선택된 현장 상태도 업데이트
      setSelectedSite(prev => prev ? { ...prev, items: defaultItems } : null);

      // 폼 상태도 초기화
      setForm(prev => ({ ...prev, items: defaultItems }));

      alert('물량내역이 성공적으로 초기화되었습니다. 총 공사계, 부가세, 계약금액이 자동으로 추가되었습니다.');
    } catch (error) {
      console.error('물량내역 초기화 오류:', error);
      alert('물량내역 초기화 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        height: { xs: 'calc(100vh - 100px)', md: 'calc(100vh - 120px)' }, // 모바일에서는 더 작은 높이
        bgcolor: '#1a1d21', 
        p: 0, 
        gap: 2, 
        overflow: 'hidden', // 전체 컨테이너는 스크롤 없음
        width: isMobile ? 'calc(100% - 5px)' : '100%',
        maxWidth: isMobile ? 'calc(100% - 5px)' : '100%',
        mt: isMobile ? '34px' : 8,
        ml: isMobile ? '2px' : 0,
        mr: isMobile ? '5px' : 0,
        position: 'relative',
        right: isMobile ? '0px' : 'auto',
        pb: isMobile ? '20px' : 0
      }}
    >
      {/* Left Panel */}
      <Paper elevation={3} sx={{ 
        width: { xs: '100%', md: '20%' }, 
        minWidth: { md: '200px' }, 
        height: '100%', // 부모 컨테이너의 높이에 맞춤
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 1 : 2, 
        borderRadius: 2, 
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '0px' : 'auto',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        <Tabs 
          value={statusTab} 
          onChange={(e, v) => setStatusTab(v)} 
          variant="fullWidth" 
          sx={{ 
            mb: isMobile ? 1 : 2, 
            minHeight: 'auto', 
            '& .MuiTabs-flexContainer': { justifyContent: 'space-between' }, 
            '& .MuiTab-root': { 
              minWidth: 0, 
              px: isMobile ? 0.2 : 0.5, 
              py: isMobile ? 0.3 : 0.5, 
              fontSize: isMobile ? '0.65rem' : '0.75rem', 
              fontWeight: 'bold',
              minHeight: isMobile ? '32px' : 'auto'
            } 
          }}
        >
          {STATUS_OPTIONS.map(opt => (
            <Tab 
              key={opt} 
              label={`${opt} (${statusCounts[opt]})`} 
              value={opt}
              sx={{
                '& .MuiTab-label': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }
              }}
            />
          ))}
        </Tabs>
        <TextField 
          placeholder="현장명, 담당자 검색" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          variant="outlined" 
          size="small" 
          sx={{ 
            mb: isMobile ? 1 : 2, 
            input: { color: '#fff', fontSize: isMobile ? '0.8rem' : 'inherit' }, 
            fieldset: { borderColor: '#444' } 
          }} 
        />
        <List sx={{ 
          overflowY: 'auto', 
          flex: 1,
          minHeight: 0,
          maxHeight: '100%',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: '#1a1d21',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#444',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#666'
          }
        }}>
          {filteredSites.map(site => (
            <ListItem 
              key={site.id} 
              selected={selectedSite?.id === site.id} 
              onClick={() => handleSelectSite(site)} 
              sx={{ 
                mb: isMobile ? 0.25 : 0.5, 
                borderRadius: 1,
                py: isMobile ? 0.25 : 0.5,
                border: '1px solid',
                borderColor: selectedSite?.id === site.id ? '#90caf9' : '#333',
                bgcolor: selectedSite?.id === site.id ? '#1e3a5f' : 'transparent',
                '&:hover': {
                  bgcolor: selectedSite?.id === site.id ? '#1e3a5f' : '#2a2d35',
                  borderColor: '#90caf9'
                }
              }}
            >
              <ListItemText 
                primary={site.name} 
                secondary={site.status}
                primaryTypographyProps={{ 
                  fontSize: isMobile ? '0.8rem' : 'inherit',
                  fontWeight: selectedSite?.id === site.id ? 'bold' : 'normal',
                  color: selectedSite?.id === site.id ? '#90caf9' : '#fff'
                }}
                secondaryTypographyProps={{
                  fontSize: isMobile ? '0.7rem' : 'inherit',
                  color: selectedSite?.id === site.id ? '#90caf9' : '#aaa'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      
      {/* Center Panel */}
      <Paper elevation={3} sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 2 : 3, 
        borderRadius: 2, 
        minWidth: 0, 
        height: '100%', // 부모 컨테이너의 높이에 맞춤
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '0px' : 'auto',
        overflow: 'hidden' // 내부 컨텐츠에서 스크롤 처리
      }}>
         <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 1 : 2 }}>
           <Typography variant="h5" fontWeight="bold" sx={{ fontSize: isMobile ? '1.1rem' : 'inherit' }}>
             현장 상세 정보
           </Typography>
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
             <Button variant="contained" onClick={handleNewSite} size={isMobile ? 'small' : 'small'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
               + 새현장
             </Button>
             <Button variant="outlined" onClick={handleWholeList} size={isMobile ? 'small' : 'small'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit', display: isMobile ? 'none' : 'inline-flex' }}>
               전체 List
             </Button>
           </Box>
         </Box>
         {/* 통합 현황 표시 */}
         {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite)) && (
           <Box sx={{ 
             mb: 1, 
             p: 1.5, 
             bgcolor: '#424242', 
             borderRadius: 1,
             border: '1px solid #616161'
           }}>
             <Typography variant="body1" sx={{ mb: 0.5, fontWeight: 'bold', color: '#ffffff', fontSize: isMobile ? '0.9rem' : '1rem' }}>
               {selectedSite ? `${selectedSite.name} 통합 현황` : '전체 현장 통합 현황'}
             </Typography>
             <Grid container spacing={1}>
               <Grid size={{ xs: 4 }}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                     {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalEstimateAmount?.toLocaleString() || '0'}
                   </Typography>
                   <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>계약금액</Typography>
                 </Box>
               </Grid>
               <Grid size={{ xs: 4 }}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h5" sx={{ color: '#2196f3', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                     {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalClaimAmount?.toLocaleString() || '0'}
                   </Typography>
                   <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>누계기성</Typography>
                 </Box>
               </Grid>
               <Grid size={{ xs: 4 }}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h5" sx={{ color: '#ff9800', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                     {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalCostAmount?.toLocaleString() || '0'}
                   </Typography>
                   <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>지출</Typography>
                 </Box>
               </Grid>
             </Grid>
             <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #616161' }}>
               <Grid container spacing={1}>
                 <Grid size={{ xs: 12, sm: 4 }}>
                   <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                     계약금액: {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalEstimateAmount?.toLocaleString() || '0'}원
                   </Box>
                 </Grid>
                 <Grid size={{ xs: 12, sm: 4 }}>
                   <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                     누계기성: {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalClaimAmount?.toLocaleString() || '0'}원
                   </Box>
                 </Grid>
                 <Grid size={{ xs: 12, sm: 4 }}>
                   <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                     지출 총액: {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalCostAmount?.toLocaleString() || '0'}원
                   </Box>
                 </Grid>
               </Grid>
             </Box>
           </Box>
         )}

         <Box sx={{ 
           pr: 1, 
           display: 'flex', 
           flexDirection: 'column', 
           gap: isMobile ? 0.5 : 1,
           height: { xs: 'calc(100% - 80px)', md: 'calc(100% - 100px)' }, // 통합 현황 카드가 줄어든 만큼 높이 조정
           overflowY: 'auto', // 세로 스크롤 추가
           WebkitOverflowScrolling: 'touch',
           scrollBehavior: 'smooth',
           '&::-webkit-scrollbar': {
             width: '8px'
           },
           '&::-webkit-scrollbar-track': {
             background: '#1a1d21',
             borderRadius: '4px'
           },
           '&::-webkit-scrollbar-thumb': {
             background: '#444',
             borderRadius: '4px'
           },
           '&::-webkit-scrollbar-thumb:hover': {
             background: '#666'
           }
         }}>
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: isMobile ? 'none' : 8 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 현장명
               </Typography>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                 <TextField 
                   name="name" 
                   value={form.name ?? ''} 
                   onChange={handleChange} 
                   size="small" 
                   disabled={isReadOnly} 
                   sx={{ 
                     flex: 6,
                     '& .MuiOutlinedInput-root': {
                       '& fieldset': { borderColor: '#ffffff' },
                       '&:hover fieldset': { borderColor: '#ffffff' },
                       '&.Mui-focused fieldset': { borderColor: '#ffffff' }
                     },
                     '& .MuiInputLabel-root': { color: '#bbb' },
                     '& .MuiInputBase-input': { color: '#fff' }
                   }} 
                   inputRef={inputRef1} 
                   onFocus={scrollFocus(inputRef1)} 
                 />
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1.5 }}>
                   <Typography variant="body1" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>주요현장</Typography>
                   <IconButton 
                     onClick={() => handleChange({ target: { name: 'isFavorite', value: !form.isFavorite } })} 
                     size="small" 
                     sx={{ ml: 0.5 }} 
                     disabled={isReadOnly}
                   >
                     {form.isFavorite ? <StarIcon sx={{ color: 'gold' }} /> : <StarBorderIcon />}
                   </IconButton>
                 </Box>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 2.5 }}>
                   <Typography variant="body1" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>사용인감</Typography>
                   <FormControl size="small" sx={{ flex: 1 }}>
                     <Select 
                       name="stampType" 
                       value={form.stampType ?? '인감없음'} 
                       onChange={handleChange} 
                       disabled={isReadOnly}
                       sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
                     >
                       <MenuItem value="인감없음">인감없음</MenuItem>
                       <MenuItem value="A인감">A인감</MenuItem>
                       <MenuItem value="□인감">□인감</MenuItem>
                       <MenuItem value="○인감">○인감</MenuItem>
                       <MenuItem value="☆인감">☆인감</MenuItem>
                       <MenuItem value="△인감">△인감</MenuItem>
                       <MenuItem value="♤인감">♤인감</MenuItem>
                       <MenuItem value="♧인감">♧인감</MenuItem>
                       <MenuItem value="♡인감">♡인감</MenuItem>
                       <MenuItem value="기타">기타</MenuItem>
                     </Select>
                   </FormControl>
                 </Box>
               </Box>
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexDirection: 'row' }}>
             <Box sx={{ flex: isMobile ? 1 : 3 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 계약구분
               </Typography>
               <FormControl fullWidth size="small">
                 <Select name="contractType" value={form.contractType ?? '관급'} onChange={handleChange} disabled={isReadOnly}>
                   {CONTRACT_TYPE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                 </Select>
               </FormControl>
             </Box>
             <Box sx={{ flex: isMobile ? 1 : 3, pb: 0.5 }}>
               <FormControlLabel 
                 control={<Checkbox name="subcontractGuardian" checked={form.subcontractGuardian} onChange={handleChange} disabled={isReadOnly} />} 
                 label="하도급지킴이"
                 sx={{ 
                   '& .MuiFormControlLabel-label': {
                     wordBreak: 'keep-all', 
                     fontSize: isMobile ? '0.6rem' : 'inherit' 
                   }
                 }}
               />
             </Box>
             <Box sx={{ flex: isMobile ? 1 : 3 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 진행상황
               </Typography>
               <FormControl fullWidth size="small">
                 <Select 
                   name="status" 
                   value={form.status ?? '진행중'} 
                   onChange={handleChange} 
                   disabled={false}
                   sx={{
                     '& .MuiSelect-select': {
                       backgroundColor: form.status === '예정' ? '#ff9800' : 
                                      form.status === '진행중' ? '#1976d2' : 
                                      form.status === '완료' ? '#43a047' : 
                                      form.status === '미정' ? '#757575' : '#757575',
                       color: 'white',
                       fontWeight: 'bold'
                     }
                   }}
                 >
                   {STATUS_OPTIONS.map(opt => (
                     <MenuItem key={opt} value={opt} sx={{ 
                       backgroundColor: opt === '예정' ? '#ff9800' : 
                                     opt === '진행중' ? '#1976d2' : 
                                     opt === '완료' ? '#43a047' : 
                                     opt === '미정' ? '#757575' : '#757575',
                       color: 'white',
                       '&:hover': {
                         backgroundColor: opt === '예정' ? '#f57c00' : 
                                        opt === '진행중' ? '#1565c0' : 
                                        opt === '완료' ? '#388e3c' : 
                                        opt === '미정' ? '#616161' : '#616161'
                       }
                     }}>
                       {opt}
                     </MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, mt: isMobile ? 0.5 : 1, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 계약금액
               </Typography>
               <TextField name="contractAmount" value={isReadOnly ? formatContractAmount(form.contractAmount) : (form.contractAmount ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} inputRef={inputRef2} onFocus={scrollFocus(inputRef2)} />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 선급금
               </Typography>
               <TextField name="advance" value={isReadOnly ? formatAdvanceAmount(form.advance) : (form.advance ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 누계기성
               </Typography>
               <TextField name="totalProgress" value={formatGisungAmount(form.totalProgress)} onChange={handleChange} fullWidth size="small" disabled={true} sx={{ '& .MuiInputBase-input': { color: '#4caf50', fontWeight: 'bold' } }} />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 안전관리비
               </Typography>
               <TextField name="safetyCost" value={isReadOnly ? (Number(form.safetyCost || 0)).toLocaleString() : (form.safetyCost ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex' }}>
             <Box sx={{ width: '100%' }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 주소
               </Typography>
               <TextField 
                 name="address" 
                 value={form.address ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={addressRef}
                 onFocus={scrollFocus(addressRef)}
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 착공일
               </Typography>
               <TextField 
                 name="startDate" 
                 type="date" 
                 value={formatDateForInput(form.startDate) ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 InputLabelProps={{ shrink: true }} 
                 disabled={isReadOnly} 
                 inputRef={startDateRef}
                 onFocus={scrollFocus(startDateRef)}
               />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 준공예정일
               </Typography>
               <TextField 
                 name="endDate" 
                 type="date" 
                 value={formatDateForInput(form.endDate) ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 InputLabelProps={{ shrink: true }} 
                 disabled={isReadOnly} 
                 inputRef={endDateRef}
                 onFocus={scrollFocus(endDateRef)}
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 회사명 (거래처 선택 또는 입력)
               </Typography>
               <Autocomplete
                 options={vendors.map(vendor => vendor.companyName)}
                 value={form.companyName ?? ''}
                 onChange={(event, newValue) => {
                   const e = { target: { name: 'companyName', value: newValue || '' } };
                   handleChange(e);
                 }}
                 freeSolo
                 disabled={isReadOnly}
                 renderInput={(params) => (
                   <TextField
                     {...params}
                     size="small"
                     inputRef={companyNameRef}
                     onFocus={scrollFocus(companyNameRef)}
                   />
                 )}
               />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 소장
               </Typography>
               <TextField 
                 name="manager" 
                 value={form.manager ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={managerRef}
                 onFocus={scrollFocus(managerRef)}
               />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 연락처
               </Typography>
               <TextField 
                 name="phone" 
                 value={form.phone ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={phoneRef}
                 onFocus={scrollFocus(phoneRef)}
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: isMobile ? 'none' : 4 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 시공팀
               </Typography>
               <TextField 
                 name="team" 
                 value={form.team ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={teamRef}
                 onFocus={scrollFocus(teamRef)}
               />
             </Box>
             <Box sx={{ flex: isMobile ? 'none' : 4 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 견적유무
               </Typography>
               <FormControl fullWidth size="small">
                 <Select 
                   name="estimateType" 
                   value={form.estimateType ?? ''} 
                   onChange={handleChange} 
                   disabled={isReadOnly}
                   inputRef={estimateTypeRef}
                   onFocus={scrollFocus(estimateTypeRef)}
                 >
                   <MenuItem value="">선택하세요</MenuItem>
                   {ESTIMATE_TYPE_OPTIONS.map(opt => (
                     <MenuItem key={opt} value={opt}>
                       {opt}
                     </MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Box>
             <Box sx={{ flex: isMobile ? 'none' : 4 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 비고
               </Typography>
               <TextField 
                 name="note" 
                 value={form.note ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={noteRef}
                 onFocus={scrollFocus(noteRef)}
                 placeholder="비고 사항"
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 기타사항
               </Typography>
               <TextField 
                 name="desc" 
                 value={form.desc ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={descRef}
                 onFocus={scrollFocus(descRef)}
               />
             </Box>
           </Box>
         </Box>
         <Box sx={{ mt: 'auto', pt: isMobile ? 1 : 2, display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
           {isEditing ? (
             <Button variant="contained" color="primary" onClick={handleSave} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
               {selectedSite ? '저장하기' : '등록하기'}
             </Button>
           ) : (
             <Button variant="contained" color="primary" onClick={handleEditClick} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
               수정하기
             </Button>
           )}
           <Button variant="outlined" color="secondary" onClick={handleDelete} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
             삭제
           </Button>
           <Button variant="contained" color="success" onClick={handleGisung} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
             기성현황
           </Button>
         </Box>
      </Paper>
      
      {/* Right Panel */}
      <Paper elevation={3} sx={{ 
        width: { xs: '100%', md: '30%' }, 
        minWidth: { md: '280px' }, 
        height: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 2 : 3, 
        borderRadius: 2, 
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '2px' : 'auto'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 1 : 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" fontWeight="bold" sx={{ fontSize: isMobile ? '1.1rem' : 'inherit' }}>
            물량 내역
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              onClick={handleAddItem} 
              size={isMobile ? 'small' : 'medium'} 
              sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
              disabled={isReadOnly}
            >
              품목추가
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleOpenUploadDialog} 
              size={isMobile ? 'small' : 'medium'} 
              sx={{ 
                fontSize: isMobile ? '0.7rem' : 'inherit',
                color: '#4caf50',
                borderColor: '#4caf50',
                '&:hover': {
                  borderColor: '#388e3c',
                  backgroundColor: 'rgba(76, 175, 80, 0.04)'
                }
              }}
              startIcon={<UploadIcon />}
              disabled={isReadOnly}
            >
              업로드
            </Button>

            <Button 
              variant="outlined" 
              onClick={handleClearItems} 
              size={isMobile ? 'small' : 'medium'} 
              sx={{ 
                fontSize: isMobile ? '0.7rem' : 'inherit',
                color: '#f44336',
                borderColor: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: 'rgba(244, 67, 54, 0.04)'
                }
              }}
              disabled={isReadOnly}
            >
              초기화
            </Button>
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          mb: 1, 
          color: 'text.secondary', 
          borderBottom: 1, 
          borderColor: 'divider', 
          pb: 1 
        }}>
          <Typography sx={{ width: '35%', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : 'inherit' }}>항목</Typography>
          <Typography sx={{ width: '15%', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : 'inherit' }}>물량</Typography>
          <Typography sx={{ width: '20%', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : 'inherit' }}>단가</Typography>
          <Typography sx={{ width: '20%', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : 'inherit' }}>금액</Typography>
        </Box>
        <Box
          sx={{
            height: 'calc(100vh - 300px)',
            overflowY: 'auto',
            border: '1px solid #444',
            borderRadius: '4px',
            p: 1,
            scrollbarWidth: 'none', // Firefox
            '&::-webkit-scrollbar': { display: 'none' } // Chrome, Safari
          }}
        >
          {(form.items || []).map((item, index) => (
            <Box key={index} sx={{ 
              display: item.isSpacer ? 'none' : 'flex', 
              gap: 1, 
              mb: isMobile ? 0.5 : 1, 
              alignItems: 'center', 
              flexWrap: 'wrap' 
            }}>
              {item.isTotal ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: '1 1 120px',
                    fontWeight: 'bold',
                    color: 'primary.main',
                    fontSize: '1.2rem',
                    whiteSpace: 'nowrap', // 한 줄로 표시
                  }}
                >
                  총 공사계(부가세별도)
                </Typography>
              ) : item.isVat ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: '1 1 120px',
                    fontWeight: 'bold',
                    color: 'primary.main',
                    fontSize: '1.1rem'
                  }}
                >
                  부가세
                </Typography>
              ) : item.isTotalWithVat ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: '1 1 120px',
                    fontWeight: 'bold',
                    color: 'primary.main',
                    fontSize: '1.2rem',
                    whiteSpace: 'nowrap', // 한 줄로 표시
                  }}
                >
                  계약금액(부가세포함)
                </Typography>
              ) : item.isAdjustment ? (
                <TextField 
                  value={item.name ?? ''} 
                  onChange={(e) => handleItemsChange(index, 'name', e.target.value)} 
                  size="small" 
                  sx={{ flex: '1 1 120px' }} 
                  placeholder="단수정리" 
                  disabled={isReadOnly}
                  inputProps={{ style: { fontSize: isMobile ? '0.7rem' : 'inherit' } }}
                />
              ) : (
                <TextField 
                  value={item.name ?? ''} 
                  onChange={(e) => handleItemsChange(index, 'name', e.target.value)} 
                  size="small" 
                  sx={{ 
                    flex: '1 1 120px',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#555' },
                      '&:hover fieldset': { borderColor: '#777' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    },
                    '& .MuiInputBase-input': { 
                      color: '#fff',
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
                      fontWeight: '500'
                    }
                  }} 
                  placeholder="항목" 
                  disabled={isReadOnly}
                />
              )}
              
              {item.isTotal || item.isVat || item.isTotalWithVat ? (
                <Typography variant="body2" sx={{ flex: '1 1 60px', textAlign: 'center' }}>
                  {item.isTotal || item.isVat || item.isTotalWithVat ? '' : ''}
                </Typography>
              ) : (
                <TextField 
                  value={formatQuantity(item.quantity)} 
                  onChange={(e) => handleItemsChange(index, 'quantity', e.target.value)} 
                  size="small" 
                  sx={{ 
                    flex: '1 1 60px',
                    '& .MuiInputBase-input': { 
                      fontSize: isMobile ? '0.8rem' : 'inherit',
                      textAlign: 'right'
                    }
                  }} 
                  placeholder="물량" 
                  disabled={isReadOnly}
                  inputProps={{ 
                    type: 'number',
                    step: '0.01'
                  }}
                />
              )}
              
              {item.isTotal || item.isVat || item.isTotalWithVat ? (
                <Typography variant="body2" sx={{ flex: '1 1 80px', textAlign: 'center' }}>
                  {item.isTotal || item.isVat || item.isTotalWithVat ? '' : ''}
                </Typography>
              ) : (
                <TextField 
                  value={formatPrice(item.price)} 
                  onChange={(e) => handleItemsChange(index, 'price', e.target.value)} 
                  size="small" 
                  sx={{ 
                    flex: '1 1 80px',
                    '& .MuiInputBase-input': { 
                      fontSize: isMobile ? '0.8rem' : 'inherit',
                      textAlign: 'right'
                    }
                  }} 
                  placeholder="단가" 
                  disabled={isReadOnly}
                />
              )}
              
              {item.isTotal || item.isVat || item.isTotalWithVat ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: '1 1 80px',
                    textAlign: 'right',
                    fontWeight: (item.isTotal || item.isVat || item.isTotalWithVat) ? 'bold' : 'normal',
                    color: (item.isTotal || item.isVat || item.isTotalWithVat) ? 'primary.main' : 'text.primary',
                    fontSize: (item.isTotal || item.isVat || item.isTotalWithVat) ? '1.1rem' : 'inherit'
                  }}
                >
                  {(item.isTotal || item.isVat || item.isTotalWithVat) ? formatAmount(item.amount) : ''}
                </Typography>
              ) : (
                <TextField 
                  value={formatAmount(item.amount)} 
                  onChange={(e) => handleItemsChange(index, 'amount', e.target.value)} 
                  size="small" 
                  sx={{ 
                    flex: '1 1 80px',
                    '& .MuiInputBase-input': { 
                      fontSize: isMobile ? '0.8rem' : 'inherit',
                      textAlign: 'right'
                    }
                  }} 
                  placeholder="금액" 
                  disabled={isReadOnly}
                />
              )}
              
              {!item.isTotal && !item.isVat && !item.isTotalWithVat && (
                <IconButton 
                  onClick={() => handleRemoveItem(index)} 
                  size="small" 
                  disabled={isReadOnly}
                  sx={{ 
                    opacity: isReadOnly ? 0.5 : 1,
                    '&:hover': {
                      backgroundColor: isReadOnly ? 'transparent' : 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <DeleteIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      </Paper>

      {/* 물량내역 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          물량내역 업로드
        </DialogTitle>
        <DialogContent>
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
              <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
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
                          {item.isTotal ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                fontSize: '1.2rem'
                              }}
                            >
                              총 공사계(부가세별도)
                            </Typography>
                          ) : item.isVat ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                fontSize: '1.1rem'
                              }}
                            >
                              부가세
                            </Typography>
                          ) : item.isTotalWithVat ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                fontSize: '1.2rem'
                              }}
                            >
                              계약금액(부가세포함)
                            </Typography>
                          ) : item.isAdjustment ? (
                            <TextField
                              size="small"
                              value={item.name}
                              onChange={(e) => handleEditUploadedItem(index, 'name', e.target.value)}
                              fullWidth
                            />
                          ) : (
                            <TextField
                              size="small"
                              value={item.name}
                              onChange={(e) => handleEditUploadedItem(index, 'name', e.target.value)}
                              fullWidth
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.isTotal || item.isVat || item.isTotalWithVat || item.isAdjustment ? (
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {(item.isTotal || item.isVat || item.isTotalWithVat) ? '' : ''}
                            </Typography>
                          ) : (
                            <TextField
                              size="small"
                              type="number"
                              value={formatQuantity(item.quantity)}
                              onChange={(e) => handleEditUploadedItem(index, 'quantity', e.target.value)}
                              fullWidth
                              inputProps={{ step: '0.01' }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.isTotal || item.isVat || item.isTotalWithVat || item.isAdjustment ? (
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {(item.isTotal || item.isVat || item.isTotalWithVat) ? '' : ''}
                            </Typography>
                          ) : (
                            <TextField
                              size="small"
                              value={formatPrice(item.price)}
                              onChange={(e) => handleEditUploadedItem(index, 'price', e.target.value)}
                              fullWidth
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.isTotal || item.isVat || item.isTotalWithVat || item.isAdjustment ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                textAlign: 'center',
                                fontWeight: (item.isTotal || item.isVat || item.isTotalWithVat) ? 'bold' : 'normal',
                                color: (item.isTotal || item.isVat || item.isTotalWithVat) ? 'primary.main' : 'inherit',
                                fontSize: (item.isTotal || item.isVat || item.isTotalWithVat) ? '1.2rem' : 'inherit'
                              }}
                            >
                              {(item.isTotal || item.isVat || item.isTotalWithVat) ? formatAmount(item.amount) : (item.isAdjustment ? formatAmount(item.amount) : '')}
                            </Typography>
                          ) : (
                            <TextField
                              size="small"
                              value={formatAmount(item.amount)}
                              onChange={(e) => handleEditUploadedItem(index, 'amount', e.target.value)}
                              fullWidth
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!item.isTotal && !item.isVat && !item.isTotalWithVat && !item.isAdjustment && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUploadedItem(index)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
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
            onClick={handleSaveUploadedItems}
            variant="contained"
            disabled={uploadedItems.length === 0}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NewSites;
