import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Autocomplete,
  Checkbox,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  AttachMoney as MoneyIcon,
  Group as GroupIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  Work as WorkIcon,
  ContentCopy as ContentCopyIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Visibility as VisibilityIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, writeBatch, serverTimestamp, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const TeamSettlement = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM 형식
  const [selectedTeam, setSelectedTeam] = useState('');
  const [activeTab, setActiveTab] = useState(0); // 탭 인덱스
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuantityPricingDialogOpen, setIsQuantityPricingDialogOpen] = useState(false);
  const [isTeamSelectDialogOpen, setIsTeamSelectDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState(null);
  const [selectedTeamForPricing, setSelectedTeamForPricing] = useState(null);
  const [selectedTeamsForTabs, setSelectedTeamsForTabs] = useState([]);
  const [selectedTeamForTab, setSelectedTeamForTab] = useState('');
  const [teamTableData, setTeamTableData] = useState({}); // { teamId: [{ id, checked, siteName, item, quantity, unitPrice, totalPrice, note }] }
  const [isSiteAddDialogOpen, setIsSiteAddDialogOpen] = useState(false);
  const [selectedSiteForAdd, setSelectedSiteForAdd] = useState('');
  const [selectedSiteItems, setSelectedSiteItems] = useState([]);
  const [selectedSiteForRowAdd, setSelectedSiteForRowAdd] = useState('');
  const [isTabDeleteDialogOpen, setIsTabDeleteDialogOpen] = useState(false);
  const [tabToDelete, setTabToDelete] = useState(null);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [collapsedSites, setCollapsedSites] = useState(new Set()); // 숨겨진 현장들 (기본적으로 모든 현장이 확장되어 있음)
  const [editingSiteName, setEditingSiteName] = useState(null); // 편집 중인 현장명
  const [editingSiteValue, setEditingSiteValue] = useState(''); // 편집 중인 현장명 값
  const [formData, setFormData] = useState({
    teamId: '',
    teamName: '',
    month: '',
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    status: 'pending', // pending, partial, completed
    notes: '',
    sites: []
  });
  const [quantityPricingData, setQuantityPricingData] = useState({
    teamId: '',
    teamName: '',
    month: '',
    sites: [] // [{ siteId, siteName, quantities: [{ itemName, quantity, unitPrice, totalPrice }] }]
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [sites, setSites] = useState([]);
  const [statusUpdating, setStatusUpdating] = useState({}); // 상태 업데이트 중인 팀들
  const lastDeletedRef = useRef({}); // 삭제 기록: { teamId_month: timestamp }
  const isManuallyDeletingRef = useRef(false); // 수동 삭제 중 플래그

  // 시공팀 데이터 로드
  useEffect(() => {
    const q = query(collection(db, 'constructionTeams'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('시공팀 데이터 로드됨:', teamsData);
      setTeams(teamsData);
    });

    return () => unsubscribe();
  }, []);

  // 현장 데이터 로드
  useEffect(() => {
    console.log('현장 데이터 로드 시작');
    
    const q = query(collection(db, 'sites'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sitesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('현장 데이터 로드됨:', sitesData.length, '개');
      console.log('현장 데이터 상세:', sitesData);
      setSites(sitesData);
    }, (error) => {
      console.error('현장 데이터 로드 오류:', error);
    });

    return () => unsubscribe();
  }, []);

  // 초기 로드 시 현재 월의 데이터가 있는 팀들만 표시
  useEffect(() => {
    const loadInitialData = async () => {
      if (teams.length > 0 && selectedMonth) {
        console.log('초기 로드: 현재 월의 데이터가 있는 팀들만 표시');
        await loadMonthlyStatusData(selectedMonth);
      }
    };
    
    loadInitialData();
  }, [teams, selectedMonth]);

  // 해당 팀의 현장 목록 가져오기 (현장관리페이지 스케줄 데이터 기반)
  const getTeamSites = (teamId) => {
    if (!teamId) return [];
    
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    
    console.log('현재 팀 정보:', { teamName: team.teamName, managerName: team.managerName });
    
    // 1. 팀의 currentSites와 scheduledSites에서 현장명 가져오기
    const currentSites = team.currentSites || [];
    const scheduledSites = team.scheduledSites || [];
    
    // 2. 현장관리페이지의 sites 데이터에서 해당 팀이 배정된 현장들 찾기
    const assignedSites = sites.filter(site => {
      const teamName = team.teamName || '';
      const managerName = team.managerName || '';
      const siteTeam = site.team || '';
      const siteManager = site.manager || '';
      
      // 정확한 매칭 (공백 제거 후 비교)
      const cleanTeamName = teamName.trim();
      const cleanManagerName = managerName.trim();
      const cleanSiteTeam = siteTeam.trim();
      const cleanSiteManager = siteManager.trim();
      
      // 정확한 매칭
      const exactMatch1 = cleanSiteTeam === cleanTeamName || cleanSiteTeam === cleanManagerName;
      const exactMatch2 = cleanSiteManager === cleanTeamName || cleanSiteManager === cleanManagerName;
      
      // 부분 매칭도 허용 (팀명이나 관리자명이 포함된 경우)
      const partialMatch1 = cleanSiteTeam.includes(cleanTeamName) || cleanSiteTeam.includes(cleanManagerName);
      const partialMatch2 = cleanSiteManager.includes(cleanTeamName) || cleanSiteManager.includes(cleanManagerName);
      
      // 정확한 매칭 또는 부분 매칭 중 하나라도 일치하면 매칭
      const isMatch = exactMatch1 || exactMatch2 || partialMatch1 || partialMatch2;
      
      if (isMatch) {
        console.log('매칭된 현장:', {
          siteName: site.name,
          siteTeam: cleanSiteTeam,
          siteManager: cleanSiteManager,
          teamName: cleanTeamName,
          managerName: cleanManagerName,
          exactMatch1, exactMatch2,
          partialMatch1, partialMatch2,
          matchType: exactMatch1 || exactMatch2 ? '정확한 매칭' : '부분 매칭'
        });
      }
      
      // 모든 현장 정보 출력 (디버깅용)
      if (site.name === '경북대 노후교체(4개동)') {
        console.log('경북대 현장 상세 정보:', {
          siteName: site.name,
          siteTeam: cleanSiteTeam,
          siteManager: cleanSiteManager,
          teamName: cleanTeamName,
          managerName: cleanManagerName,
          exactMatch1, exactMatch2,
          partialMatch1, partialMatch2,
          isMatch,
          matchType: exactMatch1 || exactMatch2 ? '정확한 매칭' : '부분 매칭'
        });
      }
      
      return isMatch;
    }).map(site => site.name);
    
    // 모든 현장명을 합치고 중복 제거
    const allSites = [...currentSites, ...scheduledSites, ...assignedSites];
    const uniqueSites = [...new Set(allSites)];
    
    console.log('최종 현장 목록:', uniqueSites);
    
    return uniqueSites;
  };

  // 현장별 항목 정보 가져오기
  const getSiteItems = async (siteName) => {
    try {
      console.log('getSiteItems 호출됨:', siteName);
      console.log('sites 배열:', sites);
      
      // 임시 하드코딩된 데이터로 테스트
      if (siteName.includes('부산곡유리')) {
        console.log('부산곡유리 현장 항목 반환');
        return ['복층유리', '강화유리', '단열유리', '방화유리'];
      }
      
      // sites 컬렉션에서 해당 현장 찾기
      const site = sites.find(s => s.name === siteName);
      console.log('찾은 현장:', site);
      
      if (!site) {
        console.log('현장을 찾을 수 없음');
        return [];
      }

      // quantity_info 컬렉션에서 해당 현장의 항목들 가져오기
      const q = query(
        collection(db, 'quantity_info'),
        where('siteId', '==', site.id)
      );
      console.log('quantity_info 쿼리 실행:', site.id);
      
      const snapshot = await getDocs(q);
      console.log('quantity_info 결과:', snapshot.docs.length, '개');
      
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('quantity_info 데이터:', items);

      const siteItems = items.map(item => item.siteItem).filter(Boolean);
      console.log('최종 siteItems:', siteItems);
      
      return siteItems;
    } catch (error) {
      console.error('현장 항목 정보 가져오기 오류:', error);
      return [];
    }
  };

  // 현장 추가 함수
  const handleAddSite = async (teamId, siteName) => {
    console.log('🔵 현장 추가 시작:', { teamId, siteName, selectedMonth, documentId: `${teamId}_${selectedMonth}` });
    
    // 🔴 중요: selectedMonth 검증
    if (!selectedMonth || !selectedMonth.match(/^\d{4}-\d{2}$/)) {
      console.error('❌ 잘못된 selectedMonth:', selectedMonth);
      setSnackbar({ open: true, message: '월 정보가 올바르지 않습니다. 페이지를 새로고침해주세요.', severity: 'error' });
      return;
    }
    
    const newRow = {
      id: Date.now().toString(),
      checked: false,
      siteName: siteName,
      item: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0, // 현장 추가 시 소계는 0으로 시작
      note: '',
      isSiteHeader: true // 현장 헤더 행임을 표시하는 플래그
    };
    
    console.log('🔵 새 행 데이터:', newRow);
    
    const currentRows = teamTableData[teamId] || [];
    const updatedRows = [...currentRows, newRow];
    
    const updatedData = {
      ...teamTableData,
      [teamId]: updatedRows
    };
    
    console.log('🔵 업데이트된 데이터:', updatedData);
    setTeamTableData(updatedData);
    
    // Firebase에 저장
    try {
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      const docSnap = await getDoc(teamSettlementRef);
      
      if (docSnap.exists()) {
        const existingData = docSnap.data();
        // 기존 문서의 month 필드 확인
        if (existingData.month && existingData.month !== selectedMonth) {
          console.error(`❌ 기존 문서의 month(${existingData.month})와 selectedMonth(${selectedMonth})가 다릅니다.`);
          setSnackbar({ open: true, message: '월 정보가 일치하지 않습니다. 페이지를 새로고침해주세요.', severity: 'error' });
          return;
        }
        
        // 문서가 존재하면 업데이트
        await updateDoc(teamSettlementRef, {
          tableData: updatedRows,
          month: selectedMonth, // 월 정보 명시적으로 저장
          updatedAt: serverTimestamp()
        });
        console.log(`✅ Firebase 현장 추가 업데이트 완료: ${selectedMonth}월`);
      } else {
        // 문서가 없으면 새로 생성
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          tableData: updatedRows,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log(`✅ Firebase 현장 추가 새 문서 생성 완료: ${selectedMonth}월`);
      }
      
      // 현장 추가 후 자동으로 해당 현장 선택
      setSelectedSiteForRowAdd(siteName);
      console.log('현장 추가 후 자동 선택:', siteName);
      
      // 현장 추가 후 접힌 상태로 설정
      setCollapsedSites(prev => {
        const newCollapsedSites = new Set(prev);
        newCollapsedSites.add(siteName);
        console.log('새 현장을 접힌 상태로 설정:', siteName);
        return newCollapsedSites;
      });
      
      setSnackbar({ 
        open: true, 
        message: `"${siteName}" 현장이 추가되었습니다. 이제 행 추가 버튼을 클릭하여 항목을 추가하세요.`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('현장 추가 저장 오류:', error);
      setSnackbar({ open: true, message: '현장 추가 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // Firebase에서 팀별 테이블 데이터 로드
  const loadTeamTableData = async (teamId, month = null) => {
    try {
      // month 파라미터가 제공되지 않으면 selectedMonth 사용 (하지만 항상 명시적으로 전달하는 것을 권장)
      const targetMonth = month || selectedMonth;
      const deleteKey = `${teamId}_${targetMonth}`;
      
      // 🔴 삭제 직후 재로드 차단 (최근 3초 이내 삭제 기록이 있으면 재로드하지 않음)
      if (isManuallyDeletingRef.current && lastDeletedRef.current[deleteKey]) {
        const timeSinceDelete = Date.now() - lastDeletedRef.current[deleteKey];
        if (timeSinceDelete < 3000) {
          console.log('🔴 삭제 직후 재로드 차단:', { teamId, targetMonth, timeSinceDelete: `${timeSinceDelete}ms` });
          return; // 재로드하지 않음
        }
      }
      
      console.log('🔵 테이블 데이터 로드 시작:', { teamId, targetMonth, providedMonth: month, selectedMonth, documentId: `${teamId}_${targetMonth}` });
      
      // 먼저 해당 팀의 데이터를 빈 배열로 초기화 (이전 월 데이터 제거)
      setTeamTableData(prev => ({
        ...prev,
        [teamId]: [] // 먼저 초기화
      }));
      
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${targetMonth}`);
      const docSnap = await getDoc(teamSettlementRef);
      
      console.log('🔵 Firebase 문서 존재 여부:', docSnap.exists(), `문서 ID: ${teamId}_${targetMonth}`);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔵 로드된 데이터:', { 
          documentMonth: data.month, 
          targetMonth: targetMonth,
          tableDataLength: (data.tableData || []).length,
          documentId: docSnap.id
        });
        
        // 🔴 중요: 로드된 데이터의 월이 올바른지 반드시 확인 (문서 내부 month 필드 검증)
        if (!data.month) {
          console.warn(`⚠️ 경고: 문서(${teamId}_${targetMonth})에 month 필드가 없습니다.`);
          // month 필드가 없으면 자동으로 올바른 월로 수정
          try {
            await updateDoc(teamSettlementRef, {
              month: targetMonth,
              updatedAt: serverTimestamp()
            });
            console.log(`✅ month 필드 자동 수정: ${targetMonth}`);
          } catch (error) {
            console.error('month 필드 수정 오류:', error);
            setTeamTableData(prev => ({
              ...prev,
              [teamId]: []
            }));
            setCollapsedSites(new Set());
            return;
          }
        }
        
        if (data.month !== targetMonth) {
          console.error(`❌ 월 불일치 오류: 문서의 월(${data.month})과 요청한 월(${targetMonth})이 다릅니다.`);
          console.error(`❌ 문서 ID: ${teamId}_${targetMonth}, 문서 내부 월: ${data.month}`);
          console.error(`❌ 이 문서의 데이터를 삭제하고 빈 데이터로 처리합니다.`);
          
          // 🔴 잘못된 월 데이터를 문서에서 완전히 삭제 (tableData를 빈 배열로)
          try {
            await updateDoc(teamSettlementRef, {
              tableData: [],
              month: targetMonth, // 올바른 월로 수정
              updatedAt: serverTimestamp()
            });
            console.log(`✅ 잘못된 월 데이터 삭제 완료: ${teamId}_${targetMonth}`);
          } catch (error) {
            console.error('잘못된 데이터 삭제 오류:', error);
          }
          
          // 빈 배열 반환
          setTeamTableData(prev => ({
            ...prev,
            [teamId]: []
          }));
          setCollapsedSites(new Set());
          return;
        }
        
        console.log(`✅ 월 일치 확인 완료: ${targetMonth}월 데이터 정상 로드`);
        const tableData = data.tableData || [];
        console.log('🔵 테이블 데이터:', tableData);
        
        // 올바른 월의 데이터만 설정
        setTeamTableData(prev => ({
          ...prev,
          [teamId]: tableData
        }));
        console.log(`✅ ${targetMonth}월 테이블 데이터 상태 업데이트 완료:`, { teamId, dataCount: tableData.length });
        
        // 모든 현장을 접힌 상태로 초기화
        const siteNames = new Set();
        tableData.forEach(row => {
          if (row.siteName && row.siteName !== '') {
            siteNames.add(row.siteName);
          }
        });
        setCollapsedSites(siteNames);
        console.log('모든 현장을 접힌 상태로 초기화:', Array.from(siteNames));
      } else {
        console.log(`✅ ${targetMonth}월 문서가 존재하지 않음, 빈 배열로 초기화`);
        setTeamTableData(prev => ({
          ...prev,
          [teamId]: []
        }));
        setCollapsedSites(new Set());
      }
    } catch (error) {
      console.error('테이블 데이터 로드 오류:', error);
      // 오류 발생 시에도 빈 배열로 초기화
      setTeamTableData(prev => ({
        ...prev,
        [teamId]: []
      }));
      setCollapsedSites(new Set());
    }
  };

  // 정산 데이터 로드
  useEffect(() => {
    if (selectedMonth) {
      const q = query(
        collection(db, 'teamSettlements'),
        where('month', '==', selectedMonth),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const settlementsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSettlements(settlementsData);
      });

      return () => unsubscribe();
    }
  }, [selectedMonth]);

  // 탭 변경 시 해당 팀의 테이블 데이터 로드 (월이 변경될 때만)
  const prevMonthRef = useRef(selectedMonth);
  useEffect(() => {
    // 월이 실제로 변경되었을 때만 데이터 로드
    if (prevMonthRef.current !== selectedMonth) {
      prevMonthRef.current = selectedMonth;
      
      if (activeTab > 0 && selectedTeamsForTabs[activeTab - 1]) {
        const currentTeam = selectedTeamsForTabs[activeTab - 1];
        console.log('월 변경으로 인한 데이터 로드:', { 
          activeTab, 
          teamId: currentTeam.id, 
          teamName: currentTeam.teamName,
          selectedMonth 
        });
        loadTeamTableData(currentTeam.id, selectedMonth);
      } else if (activeTab === 0) {
        console.log('월 변경으로 인한 전체 탭 데이터 로드:', selectedMonth);
        loadAllTeamsData();
      }
    } else if (activeTab > 0 && selectedTeamsForTabs[activeTab - 1]) {
      // 월은 같고 탭만 변경된 경우
      const currentTeam = selectedTeamsForTabs[activeTab - 1];
      const deleteKey = `${currentTeam.id}_${selectedMonth}`;
      
      // 🔴 삭제 직후 재로드 차단
      if (isManuallyDeletingRef.current && lastDeletedRef.current[deleteKey]) {
        const timeSinceDelete = Date.now() - lastDeletedRef.current[deleteKey];
        if (timeSinceDelete < 3000) {
          console.log('🔴 삭제 직후 탭 변경 재로드 차단:', {
            activeTab,
            teamId: currentTeam.id,
            timeSinceDelete: `${timeSinceDelete}ms`
          });
          return; // 재로드하지 않음
        }
      }
      
      // 🔴 중요: 이미 로드된 데이터가 있으면 절대 재로드하지 않음 (사용자가 삭제한 데이터 보호)
      const existingData = teamTableData[currentTeam.id];
      
      // existingData가 undefined가 아닌 경우 (로드된 적이 있는 경우) 재로드하지 않음
      if (existingData !== undefined) {
        console.log('🔒 탭 변경 - 기존 데이터 유지 (재로드 안 함, 사용자 삭제 보호):', {
          activeTab,
          teamId: currentTeam.id,
          dataCount: existingData.length
        });
        return; // 재로드하지 않음
      }
      
      // existingData가 undefined인 경우에만 로드 (아직 로드된 적이 없는 경우)
      console.log('탭 변경 - 데이터 없음, 로드 시작:', {
        activeTab,
        teamId: currentTeam.id,
        selectedMonth
      });
      loadTeamTableData(currentTeam.id, selectedMonth);
    }
  }, [activeTab, selectedTeamsForTabs, selectedMonth]);

  // teamTableData가 변경될 때 전체 선택 상태 업데이트
  useEffect(() => {
    if (activeTab > 0 && selectedTeamsForTabs[activeTab - 1]) {
      const teamId = selectedTeamsForTabs[activeTab - 1].id;
      const currentRows = teamTableData[teamId] || [];
      const allChecked = currentRows.length > 0 && currentRows.every(row => row.checked);
      setIsAllSelected(allChecked);
      console.log('전체 선택 상태 업데이트:', { allChecked, rowsCount: currentRows.length });
    }
  }, [teamTableData, activeTab, selectedTeamsForTabs]);

  // activeTab이 유효한 범위를 벗어나지 않도록 보정
  useEffect(() => {
    const maxTabIndex = selectedTeamsForTabs.length; // 0(전체) + selectedTeamsForTabs.length
    if (activeTab > maxTabIndex) {
      setActiveTab(0); // 유효하지 않은 탭 인덱스면 전체 탭으로 리셋
    }
  }, [activeTab, selectedTeamsForTabs.length]);

  // 페이지 이동 시 데이터 저장
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // 브라우저 종료/새로고침 시 데이터 저장
      saveAllDataOnPageLeave();
    };

    const handleRouteChange = () => {
      // React Router로 다른 페이지 이동 시 데이터 저장
      saveAllDataOnPageLeave();
    };

    // 브라우저 이벤트 리스너 등록
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 페이지 이동 시 마지막 저장
      saveAllDataOnPageLeave();
    };
  }, [teamTableData, selectedMonth]); // teamTableData나 selectedMonth가 변경될 때마다 최신 데이터로 저장

  // 정산 생성/수정
  const handleSaveSettlement = async () => {
    try {
      const settlementData = {
        ...formData,
        remainingAmount: formData.totalAmount - formData.paidAmount,
        updatedAt: new Date()
      };

      if (editingSettlement) {
        await updateDoc(doc(db, 'teamSettlements', editingSettlement.id), settlementData);
        setSnackbar({ open: true, message: '정산 정보가 수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, 'teamSettlements'), {
          ...settlementData,
          createdAt: new Date()
        });
        setSnackbar({ open: true, message: '새 정산이 생성되었습니다.', severity: 'success' });
      }

      setIsDialogOpen(false);
      setEditingSettlement(null);
      setFormData({
        teamId: '',
        teamName: '',
        month: '',
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        status: 'pending',
        notes: '',
        sites: []
      });
    } catch (error) {
      console.error('정산 저장 실패:', error);
      setSnackbar({ open: true, message: '정산 저장에 실패했습니다.', severity: 'error' });
    }
  };

  // 정산 편집
  const handleEditSettlement = (settlement) => {
    setEditingSettlement(settlement);
    setFormData(settlement);
    setIsDialogOpen(true);
  };

  // 정산 삭제
  const handleDeleteSettlement = async (settlementId) => {
    if (window.confirm('정말로 이 정산을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'teamSettlements', settlementId));
        setSnackbar({ open: true, message: '정산이 삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('정산 삭제 실패:', error);
        setSnackbar({ open: true, message: '정산 삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  // 새 정산 생성
  const handleCreateSettlement = () => {
    setEditingSettlement(null);
    
    // 현재 선택된 탭의 시공팀 정보를 기본값으로 설정
    let defaultTeamId = '';
    let defaultTeamName = '';
    
    if (activeTab > 0 && teams[activeTab - 1]) {
      defaultTeamId = teams[activeTab - 1].id;
      defaultTeamName = teams[activeTab - 1].teamName;
    }
    
    setFormData({
      teamId: defaultTeamId,
      teamName: defaultTeamName,
      month: selectedMonth,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      status: 'pending',
      notes: '',
      sites: []
    });
    setIsDialogOpen(true);
  };

  // 물량 단가 입력 다이얼로그 열기
  const handleOpenQuantityPricing = () => {
    if (activeTab === 0) {
      setSnackbar({ open: true, message: '시공팀을 선택해주세요.', severity: 'warning' });
      return;
    }

    const selectedTeam = teams[activeTab - 1];
    setSelectedTeamForPricing(selectedTeam);
    
    // 해당 시공팀이 담당하는 현장들 필터링
    const teamSites = sites.filter(site => 
      site.assignedTeamId === selectedTeam.id || 
      site.assignedTeamName === selectedTeam.teamName
    );

    setQuantityPricingData({
      teamId: selectedTeam.id,
      teamName: selectedTeam.teamName,
      month: selectedMonth,
      sites: teamSites.map(site => ({
        siteId: site.id,
        siteName: site.name,
        quantities: [
          { itemName: '토공사', quantity: 0, unitPrice: 0, totalPrice: 0 },
          { itemName: '콘크리트', quantity: 0, unitPrice: 0, totalPrice: 0 },
          { itemName: '철근', quantity: 0, unitPrice: 0, totalPrice: 0 },
          { itemName: '미장', quantity: 0, unitPrice: 0, totalPrice: 0 },
          { itemName: '타일', quantity: 0, unitPrice: 0, totalPrice: 0 }
        ]
      }))
    });
    
    setIsQuantityPricingDialogOpen(true);
  };

  // 시공팀 선택 모달 열기
  const handleOpenTeamSelect = () => {
    setIsTeamSelectDialogOpen(true);
  };

  // 시공팀 선택하여 탭 추가
  const handleAddTeamTab = async (team) => {
    // 데이터가 없어도 탭 생성 허용
    console.log(`🔵 ${team.teamName} 팀의 ${selectedMonth}월 탭을 생성합니다.`);
    
    if (!selectedTeamsForTabs.find(t => t.id === team.id)) {
      const newSelectedTeams = [...selectedTeamsForTabs, team];
      setSelectedTeamsForTabs(newSelectedTeams);
      
      // 🔴 중요: 탭 추가 시 현재 선택된 월(selectedMonth)의 데이터를 즉시 로드
      console.log(`🔵 ${selectedMonth}월 데이터 로드 시작: ${team.teamName} (${team.id})`);
      await loadTeamTableData(team.id, selectedMonth); // 명시적으로 selectedMonth 전달
      
      // Firebase에 선택된 팀 목록 저장
      try {
        const userSettingsRef = doc(db, 'userSettings', 'teamSettlementTabs');
        await updateDoc(userSettingsRef, {
          selectedTeams: newSelectedTeams,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        // 문서가 없으면 새로 생성
        try {
          const userSettingsRef = doc(db, 'userSettings', 'teamSettlementTabs');
          await setDoc(userSettingsRef, {
            selectedTeams: newSelectedTeams,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (createError) {
          console.error('탭 설정 저장 오류:', createError);
        }
      }
      
      // 새로 추가된 탭으로 이동 (loadTeamTableData가 데이터를 로드한 후)
      setActiveTab(newSelectedTeams.length);
      setSelectedTeam(team.id);
    }
    setIsTeamSelectDialogOpen(false);
  };

  // 테이블 행 추가 (Firebase 저장)
  const handleAddTableRow = async (teamId) => {
    console.log('🔥 행 추가 시작:', { 
      teamId, 
      selectedSiteForRowAdd, 
      currentTeamTableData: teamTableData[teamId],
      selectedMonth,
      documentId: `${teamId}_${selectedMonth}`
    });
    
    // 🔴 중요: selectedMonth 검증
    if (!selectedMonth || !selectedMonth.match(/^\d{4}-\d{2}$/)) {
      console.error('❌ 잘못된 selectedMonth:', selectedMonth);
      setSnackbar({ open: true, message: '월 정보가 올바르지 않습니다. 페이지를 새로고침해주세요.', severity: 'error' });
      return;
    }
    
    if (!teamId) {
      console.error('❌ teamId가 없습니다');
      setSnackbar({ open: true, message: '팀 ID가 없습니다.', severity: 'error' });
      return;
    }
    
    const newRow = {
      id: Date.now().toString(),
      checked: false,
      siteName: selectedSiteForRowAdd || '', // 선택된 현장이 있으면 자동 설정
      item: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      note: '',
      isItemRow: selectedSiteForRowAdd ? true : false, // 현장이 선택되어 있으면 항목 행으로 추가
      isSiteHeader: !selectedSiteForRowAdd, // 현장이 선택되어 있지 않으면 현장 헤더 행으로 추가
      isNewRow: true, // 새로 추가된 행임을 표시
      createdAt: Date.now() // 생성 시간 기록
    };
    
    console.log('🆕 새 행 생성:', { 
      newRow, 
      selectedSiteForRowAdd, 
      isItemRow: selectedSiteForRowAdd ? true : false,
      willAttachToSite: !!selectedSiteForRowAdd 
    });
    
    const currentRows = teamTableData[teamId] || [];
    console.log('📋 현재 행들:', currentRows);
    
    // 일단 무조건 맨 아래에 추가 (간단하게)
    const updatedRows = [...currentRows, newRow];
    console.log('✅ 업데이트된 행들:', updatedRows);
    
    const updatedData = {
      ...teamTableData,
      [teamId]: updatedRows
    };
    
    console.log('📊 행 추가 후 업데이트된 데이터:', updatedData);
    setTeamTableData(updatedData);
    console.log('🔄 상태 업데이트 완료');
    
    // 항목이 추가된 경우 해당 현장을 확장 상태로 설정
    if (selectedSiteForRowAdd && newRow.isItemRow) {
      setCollapsedSites(prev => {
        const newCollapsedSites = new Set(prev);
        newCollapsedSites.delete(selectedSiteForRowAdd);
        console.log('항목 추가 시 현장을 확장 상태로 설정:', selectedSiteForRowAdd);
        return newCollapsedSites;
      });
    }
    // 새로운 현장이 추가된 경우 접힌 상태로 설정
    else if (newRow.siteName && newRow.siteName !== '' && !newRow.isItemRow) {
      setCollapsedSites(prev => {
        const newCollapsedSites = new Set(prev);
        newCollapsedSites.add(newRow.siteName);
        console.log('새 현장을 접힌 상태로 설정:', newRow.siteName);
        return newCollapsedSites;
      });
    }
    
    // 상태 업데이트 후 즉시 확인
    setTimeout(() => {
      console.log('⏰ 상태 업데이트 후 확인:', {
        teamId,
        updatedTeamData: teamTableData[teamId],
        allTeamData: teamTableData
      });
    }, 100);
    
    // Firebase 저장은 페이지 이동 시에만 수행 (입력 필드 안정성을 위해)
    console.log('📝 행 추가 완료, Firebase 저장은 페이지 이동 시 수행');
    
    // 행 추가 후 선택된 현장은 유지 (사용자가 직접 해제할 때까지)
    console.log('행 추가 완료, 선택된 현장 유지:', selectedSiteForRowAdd);
    
    setSnackbar({ 
      open: true, 
      message: selectedSiteForRowAdd ? '새 항목이 추가되었습니다.' : '새 현장과 항목이 추가되었습니다.', 
      severity: 'success' 
    });
  };

  // 테이블 행 삭제 (Firebase 즉시 저장)
  const handleDeleteTableRow = async (teamId, rowId) => {
    console.log('🔴 행 삭제 시작:', { teamId, rowId, selectedMonth });
    
    isManuallyDeletingRef.current = true; // 삭제 중 플래그 설정
    const deleteKey = `${teamId}_${selectedMonth}`;
    lastDeletedRef.current[deleteKey] = Date.now(); // 삭제 기록
    
    const currentRows = teamTableData[teamId] || [];
    const updatedRows = currentRows.filter(row => row.id !== rowId);
    
    // 🔴 로컬 상태 즉시 업데이트
    const updatedData = {
      ...teamTableData,
      [teamId]: updatedRows
    };
    
    console.log('🔴 행 삭제 후 업데이트된 데이터:', updatedData);
    setTeamTableData(updatedData); // 즉시 상태 업데이트
    
    // 🔴 Firebase 저장 제거: 로컬 상태만 업데이트, 저장 버튼을 눌러야 Firebase에 저장됨
    setSnackbar({ 
      open: true, 
      message: '항목이 삭제되었습니다. 저장 버튼을 눌러 Firebase에 저장하세요.', 
      severity: 'info' 
    });
    
    // 삭제 플래그 해제 (즉시 해제, Firebase 저장 안 함)
    isManuallyDeletingRef.current = false;
    console.log('🔴 행 삭제 완료 (로컬 상태만 업데이트됨, 저장 버튼을 눌러야 Firebase에 저장됨)');
  };

  // 선택된 항목들 일괄 삭제
  const handleDeleteSelectedRows = async (teamId) => {
    const currentRows = teamTableData[teamId] || [];
    const selectedRows = currentRows.filter(row => row.checked);
    
    if (selectedRows.length === 0) {
      setSnackbar({ 
        open: true, 
        message: '삭제할 항목을 선택해주세요.', 
        severity: 'warning' 
      });
      return;
    }
    
    if (!window.confirm(`선택한 ${selectedRows.length}개의 항목을 삭제하시겠습니까?`)) {
      return;
    }
    
    console.log('🔴 선택 항목 삭제 시작:', { teamId, selectedCount: selectedRows.length, selectedMonth });
    
    isManuallyDeletingRef.current = true; // 삭제 중 플래그 설정
    const deleteKey = `${teamId}_${selectedMonth}`;
    lastDeletedRef.current[deleteKey] = Date.now(); // 삭제 기록
    
    const updatedRows = currentRows.filter(row => !row.checked);
    
    // 🔴 로컬 상태 즉시 업데이트 (재로드 방지)
    const updatedData = {
      ...teamTableData,
      [teamId]: updatedRows
    };
    
    console.log('🔴 선택 항목 삭제 후 업데이트된 데이터:', updatedData);
    setTeamTableData(updatedData);
    setIsAllSelected(false);
    
    // 🔴 Firebase 저장 제거: 로컬 상태만 업데이트, 저장 버튼을 눌러야 Firebase에 저장됨
    setSnackbar({ 
      open: true, 
      message: `${selectedRows.length}개의 항목이 삭제되었습니다. 저장 버튼을 눌러 Firebase에 저장하세요.`, 
      severity: 'info' 
    });
    
    // 삭제 플래그 해제 (즉시 해제, Firebase 저장 안 함)
    isManuallyDeletingRef.current = false;
    console.log('🔴 선택 항목 삭제 완료 (로컬 상태만 업데이트됨, 저장 버튼을 눌러야 Firebase에 저장됨)');
  };

  // 현장 전체 삭제 (현장 헤더 + 모든 항목) - Firebase 즉시 저장
  const handleDeleteSite = async (teamId, siteName) => {
    console.log('🔴 현장 전체 삭제 시작:', { teamId, siteName, selectedMonth });
    
    isManuallyDeletingRef.current = true; // 삭제 중 플래그 설정
    const deleteKey = `${teamId}_${selectedMonth}`;
    lastDeletedRef.current[deleteKey] = Date.now(); // 삭제 기록
    
    const currentRows = teamTableData[teamId] || [];
    // 해당 현장의 모든 행 삭제 (현장 헤더 + 항목들)
    const updatedRows = currentRows.filter(row => row.siteName !== siteName);
    
    // 🔴 로컬 상태 즉시 업데이트
    const updatedData = {
      ...teamTableData,
      [teamId]: updatedRows
    };
    
    console.log('🔴 현장 삭제 후 업데이트된 데이터:', updatedData);
    setTeamTableData(updatedData); // 즉시 상태 업데이트
    
    // 삭제된 현장이 선택되어 있었다면 선택 해제
    if (selectedSiteForRowAdd === siteName) {
      setSelectedSiteForRowAdd('');
      console.log('삭제된 현장 선택 해제:', siteName);
    }
    
    // 🔴 Firebase 저장 제거: 로컬 상태만 업데이트, 저장 버튼을 눌러야 Firebase에 저장됨
    setSnackbar({ 
      open: true, 
      message: `"${siteName}" 현장이 삭제되었습니다. 저장 버튼을 눌러 Firebase에 저장하세요.`, 
      severity: 'info' 
    });
    
    // 삭제 플래그 해제 (즉시 해제, Firebase 저장 안 함)
    isManuallyDeletingRef.current = false;
    console.log('🔴 현장 삭제 완료 (로컬 상태만 업데이트됨, 저장 버튼을 눌러야 Firebase에 저장됨)');
  };

  // 테이블 데이터 업데이트 (실시간 Firebase 저장)


  // 🔴 페이지 이동 시 자동 저장 비활성화: 저장 버튼을 눌러야만 Firebase에 저장됨
  const saveAllDataOnPageLeave = async () => {
    console.log('⚠️ 페이지 이동 시 자동 저장 비활성화됨 - 저장 버튼을 눌러야 Firebase에 저장됩니다.');
    // 자동 저장 기능 비활성화 - 사용자가 명시적으로 저장 버튼을 눌러야만 저장됨
    return;
  };

  // 현장명 입력을 위한 안전한 함수
  const handleSiteNameInput = useCallback((teamId, rowId, value) => {
    console.log('현장명 입력:', { teamId, rowId, value });
    
    // 즉시 상태 업데이트
    setTeamTableData(prevData => {
      const currentRows = prevData[teamId] || [];
      const updatedRows = currentRows.map(row => {
        if (row.id === rowId) {
          // 현장명이 완성되면 isNewRow를 false로 변경 (30초 후 그룹화 허용)
          const isCompleteSiteName = value && value.length > 1; // 2글자 이상이면 완성된 것으로 간주
          return { 
            ...row, 
            siteName: value,
            isNewRow: isCompleteSiteName ? false : row.isNewRow // 완성되면 새 행 플래그 해제
          };
        }
        return row;
      });
      
      return {
        ...prevData,
        [teamId]: updatedRows
      };
    });
  }, []);

  const handleUpdateTableData = useCallback((teamId, rowId, field, value) => {
    console.log('테이블 데이터 업데이트:', { teamId, rowId, field, value });
    
    // 현장명 입력은 별도 함수 사용
    if (field === 'siteName') {
      handleSiteNameInput(teamId, rowId, value);
      return;
    }
    
    let savedRows = null;
    
    setTeamTableData(prevData => {
      const currentRows = prevData[teamId] || [];
      const updatedRows = currentRows.map(row => {
        if (row.id === rowId) {
          const updatedRow = { ...row, [field]: value };
          // 물량이나 단가가 변경되면 총액 자동 계산
          if (field === 'quantity' || field === 'unitPrice') {
            updatedRow.totalPrice = (updatedRow.quantity || 0) * (updatedRow.unitPrice || 0);
          }
          return updatedRow;
        }
        return row;
      });
      
      // 저장할 데이터 저장
      savedRows = updatedRows;
      
      return {
        ...prevData,
        [teamId]: updatedRows
      };
    });
    
    // 체크박스 상태가 변경되면 전체 선택 상태 업데이트
    if (field === 'checked') {
      const currentRows = teamTableData[teamId] || [];
      const updatedRows = currentRows.map(row => {
        if (row.id === rowId) {
          return { ...row, [field]: value };
        }
        return row;
      });
      const allChecked = updatedRows.length > 0 && updatedRows.every(row => row.checked);
      setIsAllSelected(allChecked);
      
      // 🔴 체크박스 변경 시에도 즉시 동기화 (디바운스 없이)
      savedRows = updatedRows;
    }
    
    // Firebase에 즉시 저장 및 동기화 (데이터 손실 방지)
    if (savedRows) {
      const saveUpdatedData = async () => {
        try {
          const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
          const docSnap = await getDoc(teamSettlementRef);
          
          if (docSnap.exists()) {
            await updateDoc(teamSettlementRef, {
              tableData: savedRows,
              month: selectedMonth,
              updatedAt: serverTimestamp()
            });
          } else {
            await setDoc(teamSettlementRef, {
              teamId: teamId,
              month: selectedMonth,
              tableData: savedRows,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          console.log('✅ 테이블 데이터 즉시 저장 완료');
          
          // 🔴 기성현황 지출에 자동 반영 (체크박스 변경 포함)
          console.log(`🔄 지출 동기화 시작: ${teamId}, ${selectedMonth}`);
          await syncTeamSettlementToCosts(teamId, savedRows, selectedMonth);
          console.log(`✅ 지출 동기화 완료: ${teamId}, ${selectedMonth}`);
        } catch (error) {
          console.error('❌ 테이블 데이터 즉시 저장 오류:', error);
        }
      };
      
      // 🔴 자동 저장 제거: 로컬 상태만 업데이트, Firebase 저장은 저장 버튼 클릭 시에만 수행
      // 위의 saveUpdatedData 함수 호출 제거됨
    }
    
    // 🔴 자동 저장 제거: 로컬 상태만 업데이트, Firebase 저장은 저장 버튼 클릭 시에만 수행
    console.log('📝 테이블 데이터 업데이트 완료 (로컬 상태만 업데이트됨, 저장 버튼을 눌러야 Firebase에 저장됨)');
  }, [handleSiteNameInput, teamTableData, selectedMonth]);

  // 전체 선택/해제 (현재 탭의 팀만)
  const handleSelectAll = async (teamId) => {
    console.log('전체 선택/해제:', { teamId });
    
    const currentRows = teamTableData[teamId] || [];
    
    // 현재 탭의 선택 상태 확인 (현재 팀의 데이터만 체크)
    const allCurrentlyChecked = currentRows.length > 0 && currentRows.every(row => row.checked);
    const newSelectState = !allCurrentlyChecked;
    
    console.log('전체 선택 상태 변경:', { 
      teamId, 
      currentState: allCurrentlyChecked, 
      newState: newSelectState,
      rowsCount: currentRows.length 
    });
    
    // 현재 탭의 팀 데이터만 업데이트
    const updatedRows = currentRows.map(row => ({
      ...row,
      checked: newSelectState
    }));
    
    const updatedData = {
      ...teamTableData,
      [teamId]: updatedRows
    };
    
    setTeamTableData(updatedData);
    setIsAllSelected(newSelectState); // 현재 탭의 상태만 업데이트
    
    // 선택된 현장 초기화
    setSelectedSiteForRowAdd('');
    
    // Firebase에 저장
    try {
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      
      // 문서 존재 여부 확인
      const docSnap = await getDoc(teamSettlementRef);
      
      if (docSnap.exists()) {
        // 문서가 존재하면 업데이트
        await updateDoc(teamSettlementRef, {
          tableData: updatedRows,
          month: selectedMonth, // 월 정보 명시적으로 저장
          updatedAt: serverTimestamp()
        });
        console.log('Firebase 전체 선택 업데이트 완료');
      } else {
        // 문서가 존재하지 않으면 새로 생성
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          tableData: updatedRows,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('Firebase 전체 선택 새 문서 생성 완료');
      }
    } catch (error) {
      console.error('전체 선택 저장 오류:', error);
      setSnackbar({ open: true, message: '선택 상태 저장 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 탭 삭제 확인 다이얼로그 열기
  const handleOpenTabDeleteDialog = (team) => {
    setTabToDelete(team);
    setIsTabDeleteDialogOpen(true);
  };

  // 탭 제거 (Firebase만 사용)
  const handleRemoveTeamTab = async () => {
    if (!tabToDelete) return;
    
    const newSelectedTeams = selectedTeamsForTabs.filter(t => t.id !== tabToDelete.id);
    
    // Firebase에 업데이트된 탭 목록 저장
    try {
      const userSettingsRef = doc(db, 'userSettings', 'teamSettlementTabs');
      await updateDoc(userSettingsRef, {
        selectedTeams: newSelectedTeams,
        updatedAt: serverTimestamp()
      });
      
      // 해당 팀의 테이블 데이터도 Firebase에서 삭제
      const teamSettlementRef = doc(db, 'teamSettlements', `${tabToDelete.id}_${selectedMonth}`);
      await deleteDoc(teamSettlementRef);
      
      // 로컬 상태에서도 해당 팀의 데이터 제거
      setTeamTableData(prev => {
        const updated = { ...prev };
        delete updated[tabToDelete.id];
        return updated;
      });
      
      setSnackbar({ 
        open: true, 
        message: `"${tabToDelete.teamName}" 탭이 삭제되었습니다.`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('탭 제거 저장 오류:', error);
      setSnackbar({ 
        open: true, 
        message: '탭 삭제 중 오류가 발생했습니다.', 
        severity: 'error' 
      });
    }
    
    if (selectedTeam === tabToDelete.id) {
      setActiveTab(0);
      setSelectedTeam('');
    }
    
    setIsTabDeleteDialogOpen(false);
    setTabToDelete(null);
  };

  // 물량 단가 입력 핸들러
  const handleQuantityChange = (siteIndex, quantityIndex, field, value) => {
    const newData = { ...quantityPricingData };
    newData.sites[siteIndex].quantities[quantityIndex][field] = value;
    
    // totalPrice 자동 계산
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : newData.sites[siteIndex].quantities[quantityIndex].quantity;
      const unitPrice = field === 'unitPrice' ? value : newData.sites[siteIndex].quantities[quantityIndex].unitPrice;
      newData.sites[siteIndex].quantities[quantityIndex].totalPrice = quantity * unitPrice;
    }
    
    setQuantityPricingData(newData);
  };

  // 물량 단가 저장
  const handleSaveQuantityPricing = async () => {
    try {
      const totalAmount = quantityPricingData.sites.reduce((sum, site) => 
        sum + site.quantities.reduce((siteSum, q) => siteSum + q.totalPrice, 0), 0
      );

      const settlementData = {
        teamId: quantityPricingData.teamId,
        teamName: quantityPricingData.teamName,
        month: quantityPricingData.month,
        totalAmount: totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        status: 'pending',
        notes: '물량 단가 기반 자동 계산',
        sites: quantityPricingData.sites,
        quantityPricing: quantityPricingData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'teamSettlements'), settlementData);
      
      setSnackbar({ open: true, message: '물량 단가가 저장되었습니다.', severity: 'success' });
      setIsQuantityPricingDialogOpen(false);
    } catch (error) {
      console.error('물량 단가 저장 실패:', error);
      setSnackbar({ open: true, message: '물량 단가 저장에 실패했습니다.', severity: 'error' });
    }
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'error';
      default: return 'default';
    }
  };

  // 상태별 텍스트
  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '완료';
      case 'partial': return '부분지급';
      case 'pending': return '미지급';
      default: return '알 수 없음';
    }
  };

  // 탭 변경 핸들러
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      setSelectedTeam(''); // 전체 탭
    } else {
      // selectedTeamsForTabs 배열에서 해당 인덱스의 팀 찾기
      const team = selectedTeamsForTabs[newValue - 1];
      setSelectedTeam(team?.id || '');
    }
  };

  // 현재 탭에 맞는 정산 데이터 필터링
  const filteredSettlements = settlements.filter(settlement => 
    !selectedTeam || settlement.teamId === selectedTeam
  );

  // 월 네비게이션 함수들
  const handlePreviousMonth = async () => {
    const currentDate = new Date(selectedMonth + '-01');
    currentDate.setMonth(currentDate.getMonth() - 1);
    const newMonth = currentDate.toISOString().slice(0, 7);
    const previousMonth = selectedMonth; // 이전 월 저장
    await loadTeamsForMonth(newMonth, previousMonth); // 이전 월 정보 전달
    setSelectedMonth(newMonth); // 데이터 로드 후 월 변경
  };

  const handleNextMonth = async () => {
    const currentDate = new Date(selectedMonth + '-01');
    currentDate.setMonth(currentDate.getMonth() + 1);
    const newMonth = currentDate.toISOString().slice(0, 7);
    const previousMonth = selectedMonth; // 이전 월 저장
    await loadTeamsForMonth(newMonth, previousMonth); // 이전 월 정보 전달
    setSelectedMonth(newMonth); // 데이터 로드 후 월 변경
  };

  // 월 표시 포맷팅
  const formatMonthDisplay = (monthString) => {
    const [year, month] = monthString.split('-');
    return `${year}년${month}월`;
  };

  // 금액 포맷팅
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  // 현재 팀의 총금액 계산
  const getCurrentTeamTotalAmount = () => {
    if (activeTab === 0 || !selectedTeamsForTabs[activeTab - 1]) {
      return 0;
    }
    
    const teamId = selectedTeamsForTabs[activeTab - 1].id;
    const currentRows = teamTableData[teamId] || [];
    
    return currentRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
  };

  // 숫자 포맷팅 (콤마만)
  const formatNumber = (number) => {
    return new Intl.NumberFormat('ko-KR').format(number);
  };

  // 탭별 팀 금액 계산 (현재 선택된 월의 데이터만 사용)
  const getTeamAmount = (teamId) => {
    // selectedTeamsForTabs에 해당 팀이 있는지 확인 (현재 월에 데이터가 있는 팀만)
    const hasTeamInCurrentMonth = selectedTeamsForTabs.some(team => team.id === teamId);
    if (!hasTeamInCurrentMonth) {
      // 현재 월에 해당 팀의 데이터가 없으면 0 반환
      return 0;
    }
    const teamRows = teamTableData[teamId] || [];
    return teamRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
  };

  // 정산 데이터에서 팀 금액 가져오기
  const getSettlementAmount = (teamId) => {
    const settlement = settlements.find(s => s.teamId === teamId);
    return settlement ? settlement.totalAmount : 0;
  };

  // 팀을 활성팀과 협력팀으로 분류 (전체 팀에서, 비활성팀 제외)
  const classifyAllTeams = (allTeams) => {
    // 비활성팀 제외 (isActive가 false인 팀들 제외)
    const activeOnlyTeams = allTeams.filter(team => 
      team.isActive !== false && 
      team.status !== 'inactive' &&
      !team.teamName.includes('[비활성]') &&
      !team.teamName.includes('[중단]')
    );
    
    const activeTeams = activeOnlyTeams.filter(team => 
      !team.teamName.includes('[협력]') && (
        team.teamType === 'active' || 
        !team.teamType || 
        team.teamType === 'main' ||
        team.teamName.includes('오태훈') || 
        team.teamName.includes('전해곤') ||
        team.teamName.includes('김민수') ||
        team.teamName.includes('이준호') ||
        team.teamName.includes('박성민')
      )
    );
    
    const cooperationTeams = activeOnlyTeams.filter(team => 
      team.teamName.includes('[협력]') ||
      team.teamType === 'cooperation' || 
      team.teamType === 'sub'
    );
    
    return { activeTeams, cooperationTeams };
  };

  // 팀을 활성팀과 협력팀으로 분류 (정산 데이터가 있는 팀에서, 비활성팀 제외)
  const classifyTeams = (teams) => {
    // 비활성팀 제외
    const activeOnlyTeams = teams.filter(team => 
      team.isActive !== false && 
      team.status !== 'inactive' &&
      !team.teamName.includes('[비활성]') &&
      !team.teamName.includes('[중단]')
    );
    
    const activeTeams = activeOnlyTeams.filter(team => 
      !team.teamName.includes('[협력]') && (
        team.teamType === 'active' || 
        !team.teamType || 
        team.teamType === 'main' ||
        team.teamName.includes('오태훈') || 
        team.teamName.includes('전해곤') ||
        team.teamName.includes('김민수') ||
        team.teamName.includes('이준호') ||
        team.teamName.includes('박성민')
      )
    );
    
    const cooperationTeams = activeOnlyTeams.filter(team => 
      team.teamName.includes('[협력]') ||
      team.teamType === 'cooperation' || 
      team.teamType === 'sub'
    );
    
    return { activeTeams, cooperationTeams };
  };

  // 월별 통계 계산 (활성팀과 협력팀 분리)
  const getMonthlyStats = () => {
    const { activeTeams, cooperationTeams } = classifyTeams(selectedTeamsForTabs);
    
    let activeSettlement = 0;
    let activePaid = 0;
    let activeUnpaid = 0;
    let activeCount = 0;
    
    let cooperationSettlement = 0;
    let cooperationPaid = 0;
    let cooperationUnpaid = 0;
    let cooperationCount = 0;

    // 활성팀 통계
    activeTeams.forEach(team => {
      const teamAmount = getTeamAmount(team.id);
      const settlementAmount = getSettlementAmount(team.id);
      const displayAmount = settlementAmount > 0 ? settlementAmount : teamAmount;
      const currentStatus = teamStatuses[selectedMonth]?.[team.id] || 'unpaid';
      const isPaid = currentStatus === 'paid';

      activeSettlement += displayAmount;
      activeCount++;
      if (isPaid) {
        activePaid += displayAmount;
      } else {
        activeUnpaid += displayAmount;
      }
    });

    // 협력팀 통계
    cooperationTeams.forEach(team => {
      const teamAmount = getTeamAmount(team.id);
      const settlementAmount = getSettlementAmount(team.id);
      const displayAmount = settlementAmount > 0 ? settlementAmount : teamAmount;
      const currentStatus = teamStatuses[selectedMonth]?.[team.id] || 'unpaid';
      const isPaid = currentStatus === 'paid';

      cooperationSettlement += displayAmount;
      cooperationCount++;
      if (isPaid) {
        cooperationPaid += displayAmount;
      } else {
        cooperationUnpaid += displayAmount;
      }
    });

    const totalSettlement = activeSettlement + cooperationSettlement;
    const totalPaid = activePaid + cooperationPaid;
    const totalUnpaid = activeUnpaid + cooperationUnpaid;
    const totalCount = activeCount + cooperationCount;

    return {
      active: { settlement: activeSettlement, paid: activePaid, unpaid: activeUnpaid, count: activeCount },
      cooperation: { settlement: cooperationSettlement, paid: cooperationPaid, unpaid: cooperationUnpaid, count: cooperationCount },
      total: { settlement: totalSettlement, paid: totalPaid, unpaid: totalUnpaid, count: totalCount }
    };
  };

  // 전체 탭의 총계 계산 (기존 호환성 유지)
  const getTotalAmounts = () => {
    const stats = getMonthlyStats();
    return { 
      totalSettlement: stats.total.settlement, 
      totalPaid: stats.total.paid, 
      totalUnpaid: stats.total.unpaid 
    };
  };

  // 전체 탭에서 모든 팀의 데이터 로드 (명시적으로 selectedMonth 사용)
  const loadAllTeamsData = async () => {
    console.log('🔵 전체 탭 데이터 로드:', { selectedMonth, teamsCount: selectedTeamsForTabs.length });
    // 명시적으로 selectedMonth 전달하여 올바른 월의 데이터만 로드
    const promises = selectedTeamsForTabs.map(team => loadTeamTableData(team.id, selectedMonth));
    await Promise.all(promises);
    console.log('✅ 전체 탭 데이터 로드 완료');
  };

  // 팀별 현장 개수 계산
  const getTeamSiteCount = (teamId) => {
    const teamRows = teamTableData[teamId] || [];
    const siteNames = new Set();
    
    console.log('현장 개수 계산 중:', { teamId, teamRows, rowsCount: teamRows.length });
    
    teamRows.forEach(row => {
      if (row.siteName && row.siteName.trim() !== '') {
        siteNames.add(row.siteName.trim());
        console.log('현장명 추가:', row.siteName.trim());
      }
    });
    
    const siteCount = siteNames.size;
    console.log('최종 현장 개수:', { teamId, siteCount, siteNames: Array.from(siteNames) });
    
    return siteCount;
  };

  // 예쁜 엑셀 다운로드 함수
  const handleExcelDownload = async () => {
    if (activeTab === 0) {
      // 전체 탭 - 모든 팀 데이터 다운로드
      await downloadAllTeamsExcel();
    } else {
      // 팀별 탭 - 해당 팀 데이터만 다운로드
      const currentTeam = selectedTeamsForTabs[activeTab - 1];
      if (currentTeam) {
        await downloadTeamExcelNew(currentTeam);
      }
    }
  };

  // 팀별 엑셀 다운로드 (ExcelJS - 깔끔한 스타일)
  const downloadTeamExcelNew = async (team) => {
    const teamId = team.id;
    const teamName = team.teamName;
    const allRows = teamTableData[teamId] || [];
    
    console.log('팀별 엑셀 다운로드 (ExcelJS):', { teamName, teamId, rowsCount: allRows.length });
    
    if (allRows.length === 0) {
      setSnackbar({ 
        open: true, 
        message: '다운로드할 데이터가 없습니다.', 
        severity: 'warning' 
      });
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('정산내역');

      // 현장별로 그룹화
      const siteGroups = {};
      const independentRows = [];
      
      allRows.forEach(row => {
        if (row.siteName && (!row.item || row.item === '') && !row.isItemRow) {
          if (!siteGroups[row.siteName]) {
            siteGroups[row.siteName] = {
              siteRow: row,
              itemRows: []
            };
          }
        } else if (row.siteName && row.item) {
          if (!siteGroups[row.siteName]) {
            siteGroups[row.siteName] = {
              siteRow: {
                id: `temp-${row.siteName}`,
                siteName: row.siteName,
                checked: false,
                isSiteHeader: true
              },
              itemRows: []
            };
          }
          siteGroups[row.siteName].itemRows.push(row);
        } else if (row.isItemRow) {
          const siteName = row.siteName;
          if (siteGroups[siteName]) {
            siteGroups[siteName].itemRows.push(row);
          } else {
            if (!siteGroups[siteName]) {
              siteGroups[siteName] = {
                siteRow: {
                  id: `temp-${siteName}`,
                  siteName: siteName,
                  checked: false,
                  isSiteHeader: true
                },
                itemRows: []
              };
            }
            siteGroups[siteName].itemRows.push(row);
          }
        } else {
          if (row.siteName && row.siteName !== '') {
            if (!siteGroups[row.siteName]) {
              siteGroups[row.siteName] = {
                siteRow: {
                  id: `temp-${row.siteName}`,
                  siteName: row.siteName,
                  checked: false,
                  isSiteHeader: true
                },
                itemRows: []
              };
            }
            siteGroups[row.siteName].itemRows.push(row);
          } else {
            independentRows.push(row);
          }
        }
      });

      // 컬럼 너비 설정
      worksheet.columns = [
        { header: '현장명', key: 'siteName', width: 35 },
        { header: '소계(원)', key: 'subtotal', width: 15 },
        { header: '항목', key: 'item', width: 20 },
        { header: '물량 (자평)', key: 'quantity', width: 12 },
        { header: '단가(원)', key: 'unitPrice', width: 12 },
        { header: '금액(원)', key: 'amount', width: 15 },
        { header: '비고', key: 'note', width: 20 }
      ];

      let currentRow = 1;

      // 메인 제목 (1행)
      const titleRow = worksheet.getRow(currentRow);
      titleRow.getCell(1).value = `${teamName} ${selectedMonth} 정산내역`;
      titleRow.getCell(1).font = { 
        name: '맑은 고딕', 
        size: 16, 
        bold: true, 
        color: { argb: 'FF1F4E79' }
      };
      titleRow.getCell(1).alignment = { horizontal: 'center' };
      titleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      currentRow += 2;

      // 테이블 헤더 (3행)
      const headerRow = worksheet.getRow(currentRow);
      const headers = ['현장명', '소계(원)', '항목', '물량 (자평)', '단가(원)', '금액(원)', '비고'];
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 11, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFB8D4E3' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      });
      currentRow++;

      // 현장별 데이터
      Object.values(siteGroups).forEach((group, groupIndex) => {
        const siteTotal = group.itemRows.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        const siteRow = worksheet.getRow(currentRow);
        
        siteRow.getCell(1).value = group.siteRow.siteName;
        siteRow.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
        siteRow.getCell(1).alignment = { horizontal: 'left' };
        
        siteRow.getCell(2).value = siteTotal;
        siteRow.getCell(2).numFmt = '#,##0';
        siteRow.getCell(2).font = { name: '맑은 고딕', size: 11, bold: true };
        siteRow.getCell(2).alignment = { horizontal: 'right' };
        siteRow.getCell(2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8E8' }
        };
        
        for (let i = 3; i <= 7; i++) {
          siteRow.getCell(i).value = '';
        }
        
        for (let i = 1; i <= 7; i++) {
          siteRow.getCell(i).border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } }
          };
        }
        
        currentRow++;
        
        group.itemRows.forEach((itemRow, itemIndex) => {
          const itemDataRow = worksheet.getRow(currentRow);
          
          itemDataRow.getCell(1).value = `L ${itemIndex + 1}.`;
          itemDataRow.getCell(1).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(1).alignment = { horizontal: 'left' };
          
          itemDataRow.getCell(2).value = '';
          
          itemDataRow.getCell(3).value = itemRow.item || '';
          itemDataRow.getCell(3).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(3).alignment = { horizontal: 'left' };
          
          itemDataRow.getCell(4).value = itemRow.quantity || 0;
          itemDataRow.getCell(4).numFmt = '#,##0';
          itemDataRow.getCell(4).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(4).alignment = { horizontal: 'right' };
          
          itemDataRow.getCell(5).value = itemRow.unitPrice || 0;
          itemDataRow.getCell(5).numFmt = '#,##0';
          itemDataRow.getCell(5).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(5).alignment = { horizontal: 'right' };
          
          itemDataRow.getCell(6).value = itemRow.totalPrice || 0;
          itemDataRow.getCell(6).numFmt = '#,##0';
          itemDataRow.getCell(6).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(6).alignment = { horizontal: 'right' };
          
          itemDataRow.getCell(7).value = itemRow.note || '';
          itemDataRow.getCell(7).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(7).alignment = { horizontal: 'left' };
          
          for (let i = 1; i <= 7; i++) {
            itemDataRow.getCell(i).border = {
              top: { style: 'thin', color: { argb: 'FF808080' } },
              left: { style: 'thin', color: { argb: 'FF808080' } },
              bottom: { style: 'thin', color: { argb: 'FF808080' } },
              right: { style: 'thin', color: { argb: 'FF808080' } }
            };
          }
          
          currentRow++;
        });
      });

      // 독립적인 행들
      if (independentRows.length > 0) {
        independentRows.forEach((row, index) => {
          const independentRow = worksheet.getRow(currentRow);
          
          independentRow.getCell(1).value = row.siteName || '';
          independentRow.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
          independentRow.getCell(1).alignment = { horizontal: 'left' };
          
          const totalPrice = row.totalPrice || 0;
          independentRow.getCell(2).value = totalPrice;
          independentRow.getCell(2).numFmt = '#,##0';
          independentRow.getCell(2).font = { name: '맑은 고딕', size: 11, bold: true };
          independentRow.getCell(2).alignment = { horizontal: 'right' };
          independentRow.getCell(2).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F8E8' }
          };
          
          independentRow.getCell(3).value = row.item || '';
          independentRow.getCell(3).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(3).alignment = { horizontal: 'left' };
          
          independentRow.getCell(4).value = row.quantity || 0;
          independentRow.getCell(4).numFmt = '#,##0';
          independentRow.getCell(4).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(4).alignment = { horizontal: 'right' };
          
          independentRow.getCell(5).value = row.unitPrice || 0;
          independentRow.getCell(5).numFmt = '#,##0';
          independentRow.getCell(5).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(5).alignment = { horizontal: 'right' };
          
          independentRow.getCell(6).value = totalPrice;
          independentRow.getCell(6).numFmt = '#,##0';
          independentRow.getCell(6).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(6).alignment = { horizontal: 'right' };
          
          independentRow.getCell(7).value = row.note || '';
          independentRow.getCell(7).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(7).alignment = { horizontal: 'left' };
          
          for (let i = 1; i <= 7; i++) {
            independentRow.getCell(i).border = {
              top: { style: 'thin', color: { argb: 'FF808080' } },
              left: { style: 'thin', color: { argb: 'FF808080' } },
              bottom: { style: 'thin', color: { argb: 'FF808080' } },
              right: { style: 'thin', color: { argb: 'FF808080' } }
            };
          }
          
          currentRow++;
        });
      }

      // 총계 행
      const totalAmount = allRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
      const totalRow = worksheet.getRow(currentRow);
      
      totalRow.getCell(1).value = '총계';
      totalRow.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
      totalRow.getCell(1).alignment = { horizontal: 'left' };
      
      totalRow.getCell(2).value = '';
      totalRow.getCell(3).value = '';
      totalRow.getCell(4).value = '';
      totalRow.getCell(5).value = '';
      
      totalRow.getCell(6).value = totalAmount;
      totalRow.getCell(6).numFmt = '#,##0';
      totalRow.getCell(6).font = { name: '맑은 고딕', size: 11, bold: true };
      totalRow.getCell(6).alignment = { horizontal: 'right' };
      
      totalRow.getCell(7).value = '';
      
      for (let i = 1; i <= 7; i++) {
        totalRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F7E6' }
        };
        totalRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }
      
      currentRow += 2;

      // 정산 요약 섹션
      const totalSites = Object.keys(siteGroups).length;
      const totalItems = allRows.filter(row => row.item && row.item.trim() !== '').length;
      
      const summaryHeaderRow = worksheet.getRow(currentRow);
      summaryHeaderRow.getCell(1).value = '정산 요약';
      summaryHeaderRow.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
      summaryHeaderRow.getCell(1).alignment = { horizontal: 'left' };
      summaryHeaderRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F7E6' }
      };
      summaryHeaderRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF808080' } },
        left: { style: 'thin', color: { argb: 'FF808080' } },
        bottom: { style: 'thin', color: { argb: 'FF808080' } },
        right: { style: 'thin', color: { argb: 'FF808080' } }
      };
      for (let i = 2; i <= 7; i++) {
        summaryHeaderRow.getCell(i).value = '';
        summaryHeaderRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F7E6' }
        };
        summaryHeaderRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }
      currentRow++;

      const sitesRow = worksheet.getRow(currentRow);
      sitesRow.getCell(1).value = `총 현장 수: ${totalSites}개`;
      sitesRow.getCell(1).font = { name: '맑은 고딕', size: 10 };
      sitesRow.getCell(1).alignment = { horizontal: 'left' };
      sitesRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F8E8' }
      };
      sitesRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF808080' } },
        left: { style: 'thin', color: { argb: 'FF808080' } },
        bottom: { style: 'thin', color: { argb: 'FF808080' } },
        right: { style: 'thin', color: { argb: 'FF808080' } }
      };
      for (let i = 2; i <= 7; i++) {
        sitesRow.getCell(i).value = '';
        sitesRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8E8' }
        };
        sitesRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }
      currentRow++;

      const itemsRow = worksheet.getRow(currentRow);
      itemsRow.getCell(1).value = `총 항목 수: ${totalItems}개`;
      itemsRow.getCell(1).font = { name: '맑은 고딕', size: 10 };
      itemsRow.getCell(1).alignment = { horizontal: 'left' };
      itemsRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F8E8' }
      };
      itemsRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF808080' } },
        left: { style: 'thin', color: { argb: 'FF808080' } },
        bottom: { style: 'thin', color: { argb: 'FF808080' } },
        right: { style: 'thin', color: { argb: 'FF808080' } }
      };
      for (let i = 2; i <= 7; i++) {
        itemsRow.getCell(i).value = '';
        itemsRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8E8' }
        };
        itemsRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }
      currentRow++;

      const amountRow = worksheet.getRow(currentRow);
      amountRow.getCell(1).value = `총 정산 금액: ${totalAmount.toLocaleString()}`;
      amountRow.getCell(1).font = { name: '맑은 고딕', size: 10 };
      amountRow.getCell(1).alignment = { horizontal: 'left' };
      amountRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F8E8' }
      };
      amountRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF808080' } },
        left: { style: 'thin', color: { argb: 'FF808080' } },
        bottom: { style: 'thin', color: { argb: 'FF808080' } },
        right: { style: 'thin', color: { argb: 'FF808080' } }
      };
      for (let i = 2; i <= 7; i++) {
        amountRow.getCell(i).value = '';
        amountRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8E8' }
        };
        amountRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }

      // 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${teamName}_${selectedMonth}_정산내역.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSnackbar({ 
        open: true, 
        message: `${teamName} 정산내역이 다운로드되었습니다.`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      setSnackbar({ 
        open: true, 
        message: '엑셀 다운로드 중 오류가 발생했습니다.', 
        severity: 'error' 
      });
    }
  };

  // 팀별 엑셀 다운로드 (기존 XLSX 방식)
  const downloadTeamExcelOld = async (team) => {
    const teamId = team.id;
    const teamName = team.teamName;
    const allRows = teamTableData[teamId] || [];
    
    console.log('팀별 엑셀 다운로드:', { teamName, teamId, rowsCount: allRows.length });
    
    if (allRows.length === 0) {
      setSnackbar({ 
        open: true, 
        message: '다운로드할 데이터가 없습니다.', 
        severity: 'warning' 
      });
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('정산내역');

      // 현장별로 그룹화
      const siteGroups = {};
      const independentRows = [];
      
      allRows.forEach(row => {
        if (row.siteName && (!row.item || row.item === '') && !row.isItemRow) {
          if (!siteGroups[row.siteName]) {
            siteGroups[row.siteName] = {
              siteRow: row,
              itemRows: []
            };
          }
        } else if (row.siteName && row.item) {
          if (!siteGroups[row.siteName]) {
            siteGroups[row.siteName] = {
              siteRow: {
                id: `temp-${row.siteName}`,
                siteName: row.siteName,
                checked: false,
                isSiteHeader: true
              },
              itemRows: []
            };
          }
          siteGroups[row.siteName].itemRows.push(row);
        } else if (row.isItemRow) {
          const siteName = row.siteName;
          if (siteGroups[siteName]) {
            siteGroups[siteName].itemRows.push(row);
          } else {
            if (!siteGroups[siteName]) {
              siteGroups[siteName] = {
                siteRow: {
                  id: `temp-${siteName}`,
                  siteName: siteName,
                  checked: false,
                  isSiteHeader: true
                },
                itemRows: []
              };
            }
            siteGroups[siteName].itemRows.push(row);
          }
        } else {
          if (row.siteName && row.siteName !== '') {
            if (!siteGroups[row.siteName]) {
              siteGroups[row.siteName] = {
                siteRow: {
                  id: `temp-${row.siteName}`,
                  siteName: row.siteName,
                  checked: false,
                  isSiteHeader: true
                },
                itemRows: []
              };
            }
            siteGroups[row.siteName].itemRows.push(row);
          } else {
            independentRows.push(row);
          }
        }
      });

      // 컬럼 너비 설정
      worksheet.columns = [
        { header: '현장명', key: 'siteName', width: 35 },
        { header: '소계(원)', key: 'subtotal', width: 15 },
        { header: '항목', key: 'item', width: 20 },
        { header: '물량 (자평)', key: 'quantity', width: 12 },
        { header: '단가(원)', key: 'unitPrice', width: 12 },
        { header: '금액(원)', key: 'amount', width: 15 },
        { header: '비고', key: 'note', width: 20 }
      ];

      let currentRow = 1;

      // 메인 제목 (1행)
      const titleRow = worksheet.getRow(currentRow);
      titleRow.getCell(1).value = `${teamName} ${selectedMonth} 정산내역`;
      titleRow.getCell(1).font = { 
        name: '맑은 고딕', 
        size: 16, 
        bold: true, 
        color: { argb: 'FF1F4E79' }
      };
      titleRow.getCell(1).alignment = { horizontal: 'center' };
      titleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      currentRow += 2;

      // 테이블 헤더 (3행)
      const headerRow = worksheet.getRow(currentRow);
      const headers = ['현장명', '소계(원)', '항목', '물량 (자평)', '단가(원)', '금액(원)', '비고'];
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 11, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFB8D4E3' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      });
      currentRow++;

      // 현장별 데이터
      Object.values(siteGroups).forEach((group, groupIndex) => {
        const siteTotal = group.itemRows.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        const siteRow = worksheet.getRow(currentRow);
        
        siteRow.getCell(1).value = group.siteRow.siteName;
        siteRow.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
        siteRow.getCell(1).alignment = { horizontal: 'left' };
        
        siteRow.getCell(2).value = siteTotal;
        siteRow.getCell(2).numFmt = '#,##0';
        siteRow.getCell(2).font = { name: '맑은 고딕', size: 11, bold: true };
        siteRow.getCell(2).alignment = { horizontal: 'right' };
        siteRow.getCell(2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8E8' }
        };
        
        for (let i = 3; i <= 7; i++) {
          siteRow.getCell(i).value = '';
        }
        
        for (let i = 1; i <= 7; i++) {
          siteRow.getCell(i).border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } }
          };
        }
        
        currentRow++;
        
        group.itemRows.forEach((itemRow, itemIndex) => {
          const itemDataRow = worksheet.getRow(currentRow);
          
          itemDataRow.getCell(1).value = `L ${itemIndex + 1}.`;
          itemDataRow.getCell(1).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(1).alignment = { horizontal: 'left' };
          
          itemDataRow.getCell(2).value = '';
          
          itemDataRow.getCell(3).value = itemRow.item || '';
          itemDataRow.getCell(3).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(3).alignment = { horizontal: 'left' };
          
          itemDataRow.getCell(4).value = itemRow.quantity || 0;
          itemDataRow.getCell(4).numFmt = '#,##0';
          itemDataRow.getCell(4).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(4).alignment = { horizontal: 'right' };
          
          itemDataRow.getCell(5).value = itemRow.unitPrice || 0;
          itemDataRow.getCell(5).numFmt = '#,##0';
          itemDataRow.getCell(5).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(5).alignment = { horizontal: 'right' };
          
          itemDataRow.getCell(6).value = itemRow.totalPrice || 0;
          itemDataRow.getCell(6).numFmt = '#,##0';
          itemDataRow.getCell(6).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(6).alignment = { horizontal: 'right' };
          
          itemDataRow.getCell(7).value = itemRow.note || '';
          itemDataRow.getCell(7).font = { name: '맑은 고딕', size: 10 };
          itemDataRow.getCell(7).alignment = { horizontal: 'left' };
          
          for (let i = 1; i <= 7; i++) {
            itemDataRow.getCell(i).border = {
              top: { style: 'thin', color: { argb: 'FF808080' } },
              left: { style: 'thin', color: { argb: 'FF808080' } },
              bottom: { style: 'thin', color: { argb: 'FF808080' } },
              right: { style: 'thin', color: { argb: 'FF808080' } }
            };
          }
          
          currentRow++;
        });
      });

      // 독립적인 행들
      if (independentRows.length > 0) {
        independentRows.forEach((row, index) => {
          const independentRow = worksheet.getRow(currentRow);
          
          independentRow.getCell(1).value = row.siteName || '';
          independentRow.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
          independentRow.getCell(1).alignment = { horizontal: 'left' };
          
          const totalPrice = row.totalPrice || 0;
          independentRow.getCell(2).value = totalPrice;
          independentRow.getCell(2).numFmt = '#,##0';
          independentRow.getCell(2).font = { name: '맑은 고딕', size: 11, bold: true };
          independentRow.getCell(2).alignment = { horizontal: 'right' };
          independentRow.getCell(2).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F8E8' }
          };
          
          independentRow.getCell(3).value = row.item || '';
          independentRow.getCell(3).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(3).alignment = { horizontal: 'left' };
          
          independentRow.getCell(4).value = row.quantity || 0;
          independentRow.getCell(4).numFmt = '#,##0';
          independentRow.getCell(4).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(4).alignment = { horizontal: 'right' };
          
          independentRow.getCell(5).value = row.unitPrice || 0;
          independentRow.getCell(5).numFmt = '#,##0';
          independentRow.getCell(5).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(5).alignment = { horizontal: 'right' };
          
          independentRow.getCell(6).value = totalPrice;
          independentRow.getCell(6).numFmt = '#,##0';
          independentRow.getCell(6).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(6).alignment = { horizontal: 'right' };
          
          independentRow.getCell(7).value = row.note || '';
          independentRow.getCell(7).font = { name: '맑은 고딕', size: 10 };
          independentRow.getCell(7).alignment = { horizontal: 'left' };
          
          for (let i = 1; i <= 7; i++) {
            independentRow.getCell(i).border = {
              top: { style: 'thin', color: { argb: 'FF808080' } },
              left: { style: 'thin', color: { argb: 'FF808080' } },
              bottom: { style: 'thin', color: { argb: 'FF808080' } },
              right: { style: 'thin', color: { argb: 'FF808080' } }
            };
          }
          
          currentRow++;
        });
      }

      // 총계 행
      const totalAmount = allRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
      const totalRow = worksheet.getRow(currentRow);
      
      totalRow.getCell(1).value = '총계';
      totalRow.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
      totalRow.getCell(1).alignment = { horizontal: 'left' };
      
      totalRow.getCell(2).value = '';
      totalRow.getCell(3).value = '';
      totalRow.getCell(4).value = '';
      totalRow.getCell(5).value = '';
      
      totalRow.getCell(6).value = totalAmount;
      totalRow.getCell(6).numFmt = '#,##0';
      totalRow.getCell(6).font = { name: '맑은 고딕', size: 11, bold: true };
      totalRow.getCell(6).alignment = { horizontal: 'right' };
      
      totalRow.getCell(7).value = '';
      
      for (let i = 1; i <= 7; i++) {
        totalRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F7E6' }
        };
        totalRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }
      
      currentRow += 2;

      // 정산 요약 섹션
      const totalSites = Object.keys(siteGroups).length;
      const totalItems = allRows.filter(row => row.item && row.item.trim() !== '').length;
      
      const summaryHeaderRow = worksheet.getRow(currentRow);
      summaryHeaderRow.getCell(1).value = '정산 요약';
      summaryHeaderRow.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
      summaryHeaderRow.getCell(1).alignment = { horizontal: 'left' };
      summaryHeaderRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F7E6' }
      };
      summaryHeaderRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF808080' } },
        left: { style: 'thin', color: { argb: 'FF808080' } },
        bottom: { style: 'thin', color: { argb: 'FF808080' } },
        right: { style: 'thin', color: { argb: 'FF808080' } }
      };
      for (let i = 2; i <= 7; i++) {
        summaryHeaderRow.getCell(i).value = '';
        summaryHeaderRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F7E6' }
        };
        summaryHeaderRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }
      currentRow++;

      const sitesRow = worksheet.getRow(currentRow);
      sitesRow.getCell(1).value = `총 현장 수: ${totalSites}개`;
      sitesRow.getCell(1).font = { name: '맑은 고딕', size: 10 };
      sitesRow.getCell(1).alignment = { horizontal: 'left' };
      sitesRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F8E8' }
      };
      sitesRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF808080' } },
        left: { style: 'thin', color: { argb: 'FF808080' } },
        bottom: { style: 'thin', color: { argb: 'FF808080' } },
        right: { style: 'thin', color: { argb: 'FF808080' } }
      };
      for (let i = 2; i <= 7; i++) {
        sitesRow.getCell(i).value = '';
        sitesRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8E8' }
        };
        sitesRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }
      currentRow++;

      const itemsRow = worksheet.getRow(currentRow);
      itemsRow.getCell(1).value = `총 항목 수: ${totalItems}개`;
      itemsRow.getCell(1).font = { name: '맑은 고딕', size: 10 };
      itemsRow.getCell(1).alignment = { horizontal: 'left' };
      itemsRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F8E8' }
      };
      itemsRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF808080' } },
        left: { style: 'thin', color: { argb: 'FF808080' } },
        bottom: { style: 'thin', color: { argb: 'FF808080' } },
        right: { style: 'thin', color: { argb: 'FF808080' } }
      };
      for (let i = 2; i <= 7; i++) {
        itemsRow.getCell(i).value = '';
        itemsRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8E8' }
        };
        itemsRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }
      currentRow++;

      const amountRow = worksheet.getRow(currentRow);
      amountRow.getCell(1).value = `총 정산 금액: ${totalAmount.toLocaleString()}`;
      amountRow.getCell(1).font = { name: '맑은 고딕', size: 10 };
      amountRow.getCell(1).alignment = { horizontal: 'left' };
      amountRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F8E8' }
      };
      amountRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FF808080' } },
        left: { style: 'thin', color: { argb: 'FF808080' } },
        bottom: { style: 'thin', color: { argb: 'FF808080' } },
        right: { style: 'thin', color: { argb: 'FF808080' } }
      };
      for (let i = 2; i <= 7; i++) {
        amountRow.getCell(i).value = '';
        amountRow.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8E8' }
        };
        amountRow.getCell(i).border = {
          top: { style: 'thin', color: { argb: 'FF808080' } },
          left: { style: 'thin', color: { argb: 'FF808080' } },
          bottom: { style: 'thin', color: { argb: 'FF808080' } },
          right: { style: 'thin', color: { argb: 'FF808080' } }
        };
      }

      // 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${teamName}_${selectedMonth}_정산내역.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSnackbar({ 
        open: true, 
        message: `${teamName} 정산내역이 다운로드되었습니다.`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      setSnackbar({ 
        open: true, 
        message: '엑셀 다운로드 중 오류가 발생했습니다.', 
        severity: 'error' 
      });
    }
  };

  // 팀별 엑셀 다운로드 (기존 XLSX 방식) - 중복 제거용
  const downloadTeamExcelOldDuplicate = (team) => {
    const teamId = team.id;
    const teamName = team.teamName;
    const allRows = teamTableData[teamId] || [];
    
    console.log('팀별 엑셀 다운로드:', { teamName, teamId, rowsCount: allRows.length });
    
    if (allRows.length === 0) {
      setSnackbar({ 
        open: true, 
        message: '다운로드할 데이터가 없습니다.', 
        severity: 'warning' 
      });
      return;
    }

    // 현장별로 그룹화
    const siteGroups = {};
    const independentRows = [];
    
    allRows.forEach(row => {
      if (row.siteName && (!row.item || row.item === '') && !row.isItemRow) {
        // 현장 헤더 행
        if (!siteGroups[row.siteName]) {
          siteGroups[row.siteName] = {
            siteRow: row,
            itemRows: []
          };
        }
      } else if (row.siteName && row.item) {
        // 현장명이 있고 항목이 있는 행
        if (!siteGroups[row.siteName]) {
          siteGroups[row.siteName] = {
            siteRow: {
              id: `temp-${row.siteName}`,
              siteName: row.siteName,
              checked: false,
              isSiteHeader: true
            },
            itemRows: []
          };
        }
        siteGroups[row.siteName].itemRows.push(row);
      } else if (row.isItemRow) {
        // 항목 행
        const siteName = row.siteName;
        if (siteGroups[siteName]) {
          siteGroups[siteName].itemRows.push(row);
        } else {
          if (!siteGroups[siteName]) {
            siteGroups[siteName] = {
              siteRow: {
                id: `temp-${siteName}`,
                siteName: siteName,
                checked: false,
                isSiteHeader: true
              },
              itemRows: []
            };
          }
          siteGroups[siteName].itemRows.push(row);
        }
      } else {
        // 독립적인 행
        if (row.siteName && row.siteName !== '') {
          if (!siteGroups[row.siteName]) {
            siteGroups[row.siteName] = {
              siteRow: {
                id: `temp-${row.siteName}`,
                siteName: row.siteName,
                checked: false,
                isSiteHeader: true
              },
              itemRows: []
            };
          }
          siteGroups[row.siteName].itemRows.push(row);
        } else {
          independentRows.push(row);
        }
      }
    });

    // 엑셀 데이터 생성
    const excelData = [];
    
    // 상단 여백
    excelData.push([]);
    excelData.push([]);
    
    // 제목 영역
    excelData.push(['', '', '', '', '', '', '', '']);
    excelData.push(['', '', '', '', '', '', '', '']);
    excelData.push(['', '', '', '', '', '', '', '']);
    
    // 메인 제목 (팀명 + 월)
    excelData.push(['', '', `${teamName} ${selectedMonth} 정산내역`, '', '', '', '', '']);
    excelData.push([]);
    excelData.push([]);
    
    // 테이블 헤더 (간단하게)
    excelData.push(['현장명', '소계(원)', '항목', '물량(자평)', '단가(원)', '금액(원)', '비고']);
    
    // 현장별 데이터
    Object.values(siteGroups).forEach((group, index) => {
      // 현장 헤더 행 (현장명 + 소계)
      const siteTotal = group.itemRows.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      excelData.push([
        group.siteRow.siteName,
        siteTotal.toLocaleString(),
        '',
        '',
        '',
        '',
        ''
      ]);
      
      // 현장의 항목들 (L 1., L 2. 형태로)
      group.itemRows.forEach((itemRow, itemIndex) => {
        excelData.push([
        `L ${itemIndex + 1}.`,
        '',
        itemRow.item || '',
        itemRow.quantity || 0,
        (itemRow.unitPrice || 0).toLocaleString(),
        (itemRow.totalPrice || 0).toLocaleString(),
        itemRow.note || ''
        ]);
      });
    });
    
    // 독립적인 행들
    if (independentRows.length > 0) {
      excelData.push(['', '', '📋 독립 항목', '', '', '', '', '']);
      independentRows.forEach((row, index) => {
        excelData.push([
          row.checked ? '✓' : '',
          `  ${index + 1}.`,
          '',
          row.item || '',
          row.quantity || 0,
          `₩${(row.unitPrice || 0).toLocaleString()}`,
          `₩${(row.totalPrice || 0).toLocaleString()}`,
          row.note || ''
        ]);
      });
      excelData.push([]);
    }
    
    // 총계 섹션
    const totalAmount = allRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
    const totalSites = Object.keys(siteGroups).length;
    const totalItems = allRows.filter(row => row.item && row.item.trim() !== '').length;
    
    excelData.push([]);
    excelData.push(['', '', '📊 정산 요약', '', '', '', '', '']);
    excelData.push(['', '', `총 현장 수: ${totalSites}개`, '', '', '', '', '']);
    excelData.push(['', '', `총 항목 수: ${totalItems}개`, '', '', '', '', '']);
    excelData.push(['', '', `총 정산 금액: ₩${totalAmount.toLocaleString()}`, '', '', '', '', '']);
    excelData.push([]);
    excelData.push(['', '', '', '', '', '', '', '']);
    excelData.push(['', '', '', '', '', '', '', '']);
    excelData.push(['', '', '※ 본 정산서는 시스템에서 자동 생성되었습니다.', '', '', '', '', '']);
    excelData.push(['', '', '※ 문의사항이 있으시면 관리자에게 연락해주세요.', '', '', '', '', '']);
    
    // 워크북 생성
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    
    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 8 },   // 선택
      { wch: 30 },  // 현장명
      { wch: 18 },  // 소계
      { wch: 25 },  // 항목
      { wch: 15 },  // 물량
      { wch: 15 },  // 단가
      { wch: 18 },  // 금액
      { wch: 25 }   // 비고
    ];
    
    // 병합 설정
    ws['!merges'] = [
      // 메인 제목 병합 (C7:J7)
      { s: { r: 7, c: 2 }, e: { r: 7, c: 7 } },
      // 정보 섹션 병합들
      { s: { r: 9, c: 2 }, e: { r: 9, c: 7 } }, // 팀명
      { s: { r: 10, c: 2 }, e: { r: 10, c: 7 } }, // 정산월
      { s: { r: 11, c: 2 }, e: { r: 11, c: 7 } }, // 생성일
      { s: { r: 12, c: 2 }, e: { r: 12, c: 7 } }, // 생성자
      // 정산 요약 병합들
      { s: { r: 20, c: 2 }, e: { r: 20, c: 7 } }, // 정산 요약
      { s: { r: 21, c: 2 }, e: { r: 21, c: 7 } }, // 총 현장 수
      { s: { r: 22, c: 2 }, e: { r: 22, c: 7 } }, // 총 항목 수
      { s: { r: 23, c: 2 }, e: { r: 23, c: 7 } }, // 총 정산 금액
      // 하단 안내문 병합들
      { s: { r: 26, c: 2 }, e: { r: 26, c: 7 } }, // 안내문 1
      { s: { r: 27, c: 2 }, e: { r: 27, c: 7 } }  // 안내문 2
    ];
    
    // 스타일 적용
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // 전체 셀에 기본 스타일 적용
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        // 기본 스타일
        ws[cellAddress].s = {
          font: { name: "맑은 고딕", size: 11 },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          },
          alignment: { vertical: "center" }
        };
        
        // 메인 제목 스타일 (7행)
        if (row === 7) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 20, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1B5E20" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
        
        // 정보 행 스타일 (9-12행)
        if (row >= 9 && row <= 12) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 12, bold: true, color: { rgb: "2E7D32" } },
            fill: { fgColor: { rgb: "E8F5E8" } },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
        
        // 테이블 헤더 스타일 (15행)
        if (row === 15) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 12, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "388E3C" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
        
        // 정산 요약 스타일 (20-23행)
        if (row >= 20 && row <= 23) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 12, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1976D2" } },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
        
        // 하단 안내문 스타일 (26-27행)
        if (row >= 26 && row <= 27) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 10, italic: true, color: { rgb: "666666" } },
            fill: { fgColor: { rgb: "F5F5F5" } },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
        
        // 현장명 행 스타일 (📍 포함된 행)
        if (row > 15 && ws[cellAddress].v && typeof ws[cellAddress].v === 'string' && 
            ws[cellAddress].v.includes('📍')) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 12, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4CAF50" } },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
        
        // 금액 컬럼 스타일 (G열 - ₩ 포함)
        if (col === 6 && row > 15 && ws[cellAddress].v && typeof ws[cellAddress].v === 'string' && 
            ws[cellAddress].v.includes('₩')) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 11, bold: true, color: { rgb: "1976D2" } },
            alignment: { horizontal: "right", vertical: "center" }
          };
        }
        
        // 소계 컬럼 스타일 (C열 - ₩ 포함)
        if (col === 2 && row > 15 && ws[cellAddress].v && typeof ws[cellAddress].v === 'string' && 
            ws[cellAddress].v.includes('₩')) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 11, bold: true, color: { rgb: "FF5722" } },
            alignment: { horizontal: "right", vertical: "center" }
          };
        }
        
        // 항목 번호 스타일 (└ 포함된 행)
        if (row > 15 && ws[cellAddress].v && typeof ws[cellAddress].v === 'string' && 
            ws[cellAddress].v.includes('└')) {
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            font: { name: "맑은 고딕", size: 10, color: { rgb: "666666" } },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
      }
    }
    
    // 행 높이 설정
    ws['!rows'] = [
      { hpt: 15 }, // 빈 행들
      { hpt: 15 },
      { hpt: 15 },
      { hpt: 15 },
      { hpt: 15 },
      { hpt: 15 },
      { hpt: 15 },
      { hpt: 35 }, // 메인 제목
      { hpt: 15 }, // 빈 행
      { hpt: 25 }, // 정보 행들
      { hpt: 25 },
      { hpt: 25 },
      { hpt: 25 },
      { hpt: 15 }, // 빈 행
      { hpt: 15 }, // 빈 행
      { hpt: 30 }, // 테이블 헤더
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, `${teamName}_${selectedMonth}`);
    
    // 파일 다운로드
    const fileName = `${teamName}_${selectedMonth}_정산.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setSnackbar({ 
      open: true, 
      message: `${teamName} 팀 정산 데이터가 다운로드되었습니다.`, 
      severity: 'success' 
    });
  };

  // 전체 팀 엑셀 다운로드
  const downloadAllTeamsExcel = async () => {
    console.log('전체 정산 현황 엑셀 다운로드');
    
    try {
      const wb = XLSX.utils.book_new();
      
      // 전체 정산 현황 표 데이터 생성
      const summaryData = generateAllTeamsSummaryData();
      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      
      // 컬럼 너비 설정
      ws['!cols'] = [
        { wch: 15 },  // 팀명
        { wch: 12 },  // 팀구분
        { wch: 12 },  // 현장수
        { wch: 18 },  // 정산금액
        { wch: 18 },  // 지급금액
        { wch: 18 },  // 미지급금액
        { wch: 12 },  // 상태
        { wch: 15 },  // 정산일
        { wch: 30 }   // 비고
      ];
      
      // 병합 설정
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } }
      ];
      
      // 스타일 적용
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          
          ws[cellAddress].s = {
            font: { name: "맑은 고딕", size: 11 },
            border: {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            },
            alignment: { vertical: "center" }
          };
          
          // 제목 행
          if (row === 0) {
            ws[cellAddress].s = {
              ...ws[cellAddress].s,
              font: { name: "맑은 고딕", size: 18, bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "2E7D32" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          
          // 정보 행들
          if (row >= 1 && row <= 3) {
            ws[cellAddress].s = {
              ...ws[cellAddress].s,
              font: { name: "맑은 고딕", size: 12, bold: true, color: { rgb: "333333" } },
              fill: { fgColor: { rgb: "E8F5E8" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          
          // 헤더 행
          if (row === 5) {
            ws[cellAddress].s = {
              ...ws[cellAddress].s,
              font: { name: "맑은 고딕", size: 12, bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4CAF50" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          
          // 금액 컬럼들 (정산금액, 지급금액, 미지급금액)
          if ((col === 3 || col === 4 || col === 5) && row > 5) {
            ws[cellAddress].s = {
              ...ws[cellAddress].s,
              font: { name: "맑은 고딕", size: 11, bold: true, color: { rgb: "1976D2" } },
              alignment: { horizontal: "right", vertical: "center" }
            };
          }
          
          // 팀구분 컬럼
          if (col === 1 && row > 5) {
            ws[cellAddress].s = {
              ...ws[cellAddress].s,
              font: { name: "맑은 고딕", size: 11, bold: true },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
          
          // 상태 컬럼
          if (col === 6 && row > 5) {
            ws[cellAddress].s = {
              ...ws[cellAddress].s,
              font: { name: "맑은 고딕", size: 11, bold: true },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
        }
      }
      
      // 행 높이 설정
      ws['!rows'] = [
        { hpt: 30 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 15 }, { hpt: 30 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, '전체정산현황');
      
      // 파일 다운로드
      const fileName = `전체정산현황_${selectedMonth}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      setSnackbar({ 
        open: true, 
        message: `전체 정산 현황이 다운로드되었습니다.`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('전체 정산 현황 엑셀 다운로드 실패:', error);
      setSnackbar({ 
        open: true, 
        message: '엑셀 다운로드 중 오류가 발생했습니다.', 
        severity: 'error' 
      });
    }
  };

  // 전체 정산 현황 표 데이터 생성
  const generateAllTeamsSummaryData = () => {
    const excelData = [];
    
    // 헤더 정보
    excelData.push(['시공팀 월별 정산 현황']);
    excelData.push([`정산월: ${selectedMonth}`]);
    excelData.push([`생성일: ${new Date().toLocaleDateString('ko-KR')}`]);
    excelData.push([`총 팀수: ${selectedTeamsForTabs.length}팀`]);
    excelData.push([]);
    
    // 테이블 헤더
    excelData.push(['팀명', '팀구분', '현장수', '정산금액', '지급금액', '미지급금액', '상태', '정산일', '비고']);
    
    // 팀별 데이터 추가
    const { activeTeams, cooperationTeams } = classifyTeams(selectedTeamsForTabs);
    
    // 활성팀 데이터
    activeTeams.forEach(team => {
      const teamId = team.id;
      const teamName = team.teamName;
      const allRows = teamTableData[teamId] || [];
      const teamAmount = getTeamAmount(teamId);
      const settlementAmount = getSettlementAmount(teamId);
      const displayAmount = settlementAmount > 0 ? settlementAmount : teamAmount;
      const currentStatus = teamStatuses[selectedMonth]?.[teamId] || 'unpaid';
      const settlementDate = teamSettlementDates[selectedMonth]?.[teamId] || '';
      const notes = teamNotes[selectedMonth]?.[teamId] || '';
      const siteCount = getTeamSiteCount(teamId);
      
      const isPaid = currentStatus === 'paid';
      const paidAmount = isPaid ? displayAmount : 0;
      const unpaidAmount = isPaid ? 0 : displayAmount;
      
      const statusText = currentStatus === 'paid' ? '지급' : 
                        currentStatus === 'pending' ? '보류' : '미지급';
      
      excelData.push([
        teamName,
        '활성팀',
        siteCount,
        formatAmount(displayAmount),
        formatAmount(paidAmount),
        formatAmount(unpaidAmount),
        statusText,
        settlementDate || '-',
        notes || '-'
      ]);
    });
    
    // 협력팀 데이터
    cooperationTeams.forEach(team => {
      const teamId = team.id;
      const teamName = team.teamName;
      const allRows = teamTableData[teamId] || [];
      const teamAmount = getTeamAmount(teamId);
      const settlementAmount = getSettlementAmount(teamId);
      const displayAmount = settlementAmount > 0 ? settlementAmount : teamAmount;
      const currentStatus = teamStatuses[selectedMonth]?.[teamId] || 'unpaid';
      const settlementDate = teamSettlementDates[selectedMonth]?.[teamId] || '';
      const notes = teamNotes[selectedMonth]?.[teamId] || '';
      const siteCount = getTeamSiteCount(teamId);
      
      const isPaid = currentStatus === 'paid';
      const paidAmount = isPaid ? displayAmount : 0;
      const unpaidAmount = isPaid ? 0 : displayAmount;
      
      const statusText = currentStatus === 'paid' ? '지급' : 
                        currentStatus === 'pending' ? '보류' : '미지급';
      
      excelData.push([
        teamName,
        '협력팀',
        siteCount,
        formatAmount(displayAmount),
        formatAmount(paidAmount),
        formatAmount(unpaidAmount),
        statusText,
        settlementDate || '-',
        notes || '-'
      ]);
    });
    
    // 빈 행
    excelData.push([]);
    
    // 합계 행
    const stats = getMonthlyStats();
    excelData.push([
      '합계',
      `${activeTeams.length + cooperationTeams.length}팀`,
      '-',
      formatAmount(stats.total.settlement),
      formatAmount(stats.total.paid),
      formatAmount(stats.total.unpaid),
      '-',
      '-',
      '-'
    ]);
    
    return excelData;
  };

  // 팀 데이터를 엑셀 형식으로 변환
  const generateTeamExcelData = (team, allRows) => {
    const excelData = [];
    
    // 헤더 정보
    excelData.push(['시공팀 월별 정산 관리']);
    excelData.push([`팀명: ${team.teamName}`]);
    excelData.push([`정산월: ${selectedMonth}`]);
    excelData.push([`생성일: ${new Date().toLocaleDateString('ko-KR')}`]);
    excelData.push([]);
    
    // 테이블 헤더
    excelData.push(['선택', '현장명', '소계', '항목', '물량(자평)', '단가', '금액', '비고']);
    
    // 현장별 그룹화 (간단 버전)
    const siteGroups = {};
    allRows.forEach(row => {
      if (row.siteName) {
        if (!siteGroups[row.siteName]) {
          siteGroups[row.siteName] = [];
        }
        siteGroups[row.siteName].push(row);
      }
    });
    
    // 데이터 추가
    Object.entries(siteGroups).forEach(([siteName, rows]) => {
      const siteTotal = rows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
      excelData.push([
        '',
        siteName,
        siteTotal.toLocaleString(),
        '',
        '',
        '',
        '',
        ''
      ]);
      
      rows.forEach(row => {
        if (row.item) {
          excelData.push([
            row.checked ? '✓' : '',
            '',
            '',
            row.item,
            row.quantity || 0,
            row.unitPrice || 0,
            row.totalPrice || 0,
            row.note || ''
          ]);
        }
      });
      
      excelData.push([]);
    });
    
    return excelData;
  };

  // 탭별 팀 상태 관리 (월별)
  const [teamStatuses, setTeamStatuses] = useState({}); // {month: {teamId: 'unpaid' | 'paid' | 'pending'}}
  const [teamSettlementDates, setTeamSettlementDates] = useState({}); // {month: {teamId: 'YYYY-MM-DD'}}
  const [teamNotes, setTeamNotes] = useState({}); // {month: {teamId: '비고 내용'}}
  const [editingTeam, setEditingTeam] = useState(null);
  
  // 데이터 마이그레이션 관련 상태
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [migrationData, setMigrationData] = useState({
    sourceMonth: '',
    targetMonth: '',
    teamId: ''
  }); // 편집 중인 팀 ID

  // 팀 상태 업데이트 (자동 저장) - 월별 관리
  const updateTeamStatus = async (teamId, status) => {
    console.log('팀 상태 업데이트 시작:', { teamId, status, selectedMonth });
    
    // 로딩 상태 설정
    setStatusUpdating(prev => ({ ...prev, [teamId]: true }));
    
    // 로컬 상태 먼저 업데이트 (월별 구조)
    setTeamStatuses(prev => ({
      ...prev,
      [selectedMonth]: {
        ...prev[selectedMonth],
        [teamId]: status
      }
    }));
    
    // Firebase에 즉시 저장
    try {
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      
      // 문서 존재 여부 확인
      const docSnap = await getDoc(teamSettlementRef);
      
      if (docSnap.exists()) {
        // 문서가 존재하면 상태만 업데이트
        await updateDoc(teamSettlementRef, {
          status: status,
          updatedAt: serverTimestamp()
        });
        console.log('✅ 팀 상태 업데이트 완료:', { teamId, status, month: selectedMonth });
      } else {
        // 문서가 존재하지 않으면 새로 생성 (기본 데이터와 함께)
        const teamData = teamTableData[teamId] || [];
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          status: status,
          tableData: teamData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ 팀 상태 새 문서 생성 완료:', { teamId, status, month: selectedMonth });
      }
      
      // 성공 알림
      setSnackbar({ 
        open: true, 
        message: `상태가 ${status === 'paid' ? '지급' : status === 'pending' ? '보류' : '미지급'}으로 저장되었습니다.`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('❌ 팀 상태 업데이트 오류:', error);
      
      // 오류 발생 시 로컬 상태 롤백
      setTeamStatuses(prev => ({
        ...prev,
        [selectedMonth]: {
          ...prev[selectedMonth],
          [teamId]: prev[selectedMonth]?.[teamId] || 'unpaid'
        }
      }));
      
      // 오류 알림
      setSnackbar({ 
        open: true, 
        message: '상태 저장 중 오류가 발생했습니다. 다시 시도해주세요.', 
        severity: 'error' 
      });
    } finally {
      // 로딩 상태 해제
      setStatusUpdating(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // 팀 정보 업데이트 (날짜, 비고) - 월별 관리
  const updateTeamInfo = async (teamId, field, value) => {
    try {
      console.log('🔵 팀 정보 업데이트:', teamId, field, value, selectedMonth);
      
      // 문서가 없으면 먼저 생성
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      const docSnap = await getDoc(teamSettlementRef);
      
      if (docSnap.exists()) {
        // 문서가 존재하면 업데이트
        await updateDoc(teamSettlementRef, {
          [field]: value,
          month: selectedMonth, // 월 정보도 함께 저장
          updatedAt: serverTimestamp()
        });
        console.log(`✅ ${field} 업데이트 완료: ${value}`);
      } else {
        // 문서가 없으면 새로 생성
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          [field]: value,
          tableData: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log(`✅ ${field} 새 문서 생성 완료: ${value}`);
      }
      
      if (field === 'settlementDate') {
        setTeamSettlementDates(prev => ({
          ...prev,
          [selectedMonth]: {
            ...prev[selectedMonth],
            [teamId]: value
          }
        }));
        console.log(`✅ 정산날짜 상태 업데이트: ${selectedMonth}월, ${teamId}, ${value}`);
      } else if (field === 'notes') {
        setTeamNotes(prev => ({
          ...prev,
          [selectedMonth]: {
            ...prev[selectedMonth],
            [teamId]: value
          }
        }));
        console.log(`✅ 비고 상태 업데이트: ${selectedMonth}월, ${teamId}, ${value}`);
      }
    } catch (error) {
      console.error('팀 정보 업데이트 오류:', error);
      setSnackbar({ open: true, message: `${field === 'settlementDate' ? '정산날짜' : '비고'} 저장 중 오류가 발생했습니다.`, severity: 'error' });
    }
  };

  // 월별로 실제 데이터가 있는 팀들 필터링 (문서 내부 month 필드 검증)
  const getTeamsWithDataForMonth = async (month) => {
    try {
      console.log(`🔍 월별 데이터가 있는 팀들 필터링 시작: ${month}`);
      
      // 모든 팀에 대해 해당 월의 데이터 존재 여부 확인
      const promises = teams.map(async (team) => {
        const teamSettlementRef = doc(db, 'teamSettlements', `${team.id}_${month}`);
        const docSnap = await getDoc(teamSettlementRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // 🔴 중요: 문서 내부의 month 필드가 요청한 월과 일치하는지 반드시 확인
          if (data.month && data.month !== month) {
            console.error(`❌ 월 불일치 발견: 문서 ID(${team.id}_${month})의 내부 month(${data.month})가 요청 월(${month})과 다릅니다.`);
            console.error(`❌ 이 문서의 잘못된 데이터를 삭제합니다.`);
            
            // 🔴 잘못된 월 데이터를 문서에서 완전히 삭제
            try {
              await updateDoc(teamSettlementRef, {
                tableData: [],
                month: month, // 올바른 월로 수정
                updatedAt: serverTimestamp()
              });
              console.log(`✅ 잘못된 월 데이터 삭제 완료: ${team.id}_${month}`);
            } catch (error) {
              console.error('잘못된 데이터 삭제 오류:', error);
            }
            
            return {
              team,
              hasData: false, // 월이 다르면 데이터가 없는 것으로 처리
              status: 'unpaid',
              settlementDate: '',
              notes: ''
            };
          }
          
          // month 필드가 없거나 일치하는 경우에만 데이터 확인
          const hasTableData = data.tableData && data.tableData.length > 0;
          const hasStatus = data.status !== undefined;
          const hasSettlementDate = data.settlementDate && data.settlementDate !== '';
          const hasNotes = data.notes && data.notes !== '';
          
          // 테이블 데이터가 있거나, 상태/날짜/비고 중 하나라도 있으면 해당 월에 데이터가 있는 것으로 간주
          const hasData = hasTableData || hasStatus || hasSettlementDate || hasNotes;
          
          if (hasData) {
            console.log(`✅ ${team.teamName} 팀 - ${month}월 데이터 확인됨`);
          }
          
          return {
            team,
            hasData,
            status: data.status || 'unpaid',
            settlementDate: data.settlementDate || '',
            notes: data.notes || ''
          };
        }
        
        return {
          team,
          hasData: false,
          status: 'unpaid',
          settlementDate: '',
          notes: ''
        };
      });
      
      const teamDataResults = await Promise.all(promises);
      
      // 데이터가 있는 팀들만 필터링 (월이 일치하는 문서만)
      const teamsWithData = teamDataResults
        .filter(result => result.hasData)
        .map(result => result.team);
      
      console.log(`✅ ${month}월 데이터가 있는 팀들:`, teamsWithData.map(t => t.teamName));
      
      return {
        teamsWithData,
        allTeamData: teamDataResults
      };
    } catch (error) {
      console.error('월별 팀 필터링 오류:', error);
      return { teamsWithData: [], allTeamData: [] };
    }
  };

  // 월별 상태 데이터 로드
  const loadMonthlyStatusData = async (month) => {
    try {
      console.log(`월별 상태 데이터 로드 시작: ${month}`);
      
      // 월별로 데이터가 있는 팀들만 가져오기
      const { teamsWithData, allTeamData } = await getTeamsWithDataForMonth(month);
      
      // 데이터가 있는 팀들만 탭에 표시
      const teamsForTabs = teamsWithData.map(team => {
        const teamData = allTeamData.find(td => td.team.id === team.id);
        return {
          ...team,
          hasData: teamData?.hasData || false
        };
      });
      
      // 탭에 표시할 팀들을 데이터가 있는 팀들만으로 업데이트
      setSelectedTeamsForTabs(teamsForTabs);
      
      // 상태 데이터를 월별 구조로 업데이트
      const newStatuses = {};
      const newSettlementDates = {};
      const newNotes = {};
      
      allTeamData.forEach(({ team, status, settlementDate, notes }) => {
        newStatuses[team.id] = status;
        newSettlementDates[team.id] = settlementDate;
        newNotes[team.id] = notes;
      });
      
      setTeamStatuses(prev => ({
        ...prev,
        [month]: newStatuses
      }));
      
      setTeamSettlementDates(prev => ({
        ...prev,
        [month]: newSettlementDates
      }));
      
      setTeamNotes(prev => ({
        ...prev,
        [month]: newNotes
      }));
      
      console.log(`✅ 월별 상태 데이터 로드 완료: ${month}`, { 
        teamsWithData: teamsForTabs.map(t => ({ name: t.teamName, hasData: t.hasData })),
        newStatuses, 
        newSettlementDates, 
        newNotes 
      });
      
      // 업데이트된 팀 리스트 반환 (비동기 상태 업데이트 대신 직접 반환)
      return teamsForTabs;
    } catch (error) {
      console.error('월별 상태 데이터 로드 오류:', error);
      return [];
    }
  };

  // 월 변경 시 해당 월에 데이터가 있는 팀들 자동 로드
  const loadTeamsForMonth = async (month, previousMonth = null) => {
    try {
      console.log(`월 변경: ${month} - 이전 월: ${previousMonth || selectedMonth} - 월별 데이터가 있는 팀들만 로드`);
      
      // 먼저 이전 월의 데이터를 저장 (이전 월 정보를 명시적으로 사용)
      const monthToSave = previousMonth || selectedMonth;
      if (monthToSave && monthToSave !== month) {
        console.log(`이전 월(${monthToSave})의 데이터 저장 시작`);
        await saveAllDataOnPageLeaveForMonth(monthToSave);
      }
      
      // 이전 월의 모든 데이터 완전히 제거 (모든 팀의 데이터 초기화)
      setTeamTableData({});
      setSelectedTeamsForTabs([]); // 팀 탭 목록도 초기화
      console.log('🧹 이전 월의 모든 데이터 완전 초기화 완료');
      
      // 약간의 지연을 주어 상태 초기화가 완전히 완료되도록 함
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 월별 상태 데이터 로드 (이 함수에서 selectedTeamsForTabs도 업데이트되고, 업데이트된 팀 리스트를 반환)
      const updatedTeams = await loadMonthlyStatusData(month);
      
      // 업데이트된 팀들의 테이블 데이터 로드 (명시적으로 month 파라미터 전달)
      if (updatedTeams && updatedTeams.length > 0) {
        const promises = updatedTeams.map(team => loadTeamTableData(team.id, month));
        await Promise.all(promises);
        console.log(`✅ ${month}월 데이터 로드 완료: ${updatedTeams.length}개 팀`);
      } else {
        console.log(`✅ ${month}월 데이터 없음`);
      }
      
      // activeTab이 유효하지 않으면 전체 탭으로 리셋
      if (updatedTeams && activeTab > updatedTeams.length) {
        console.log('월 변경으로 인한 activeTab 리셋:', activeTab, '-> 0');
        setActiveTab(0);
      }
      
    } catch (error) {
      console.error('월별 팀 로드 오류:', error);
    }
  };

  // 특정 월의 데이터만 저장하는 함수
  const saveAllDataOnPageLeaveForMonth = async (month) => {
    console.log(`📤 ${month}월 데이터 저장 시작`);
    
    const savePromises = [];
    
    // 해당 월에 해당하는 팀들의 데이터만 저장
    Object.keys(teamTableData).forEach(teamId => {
      const rows = teamTableData[teamId];
      if (rows && rows.length > 0) {
        const promise = (async () => {
          try {
            const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${month}`);
            
            // 문서 존재 여부 확인
            const docSnap = await getDoc(teamSettlementRef);
            
            if (docSnap.exists()) {
              // 문서가 존재하면 업데이트 (월 정보도 함께 업데이트)
              await updateDoc(teamSettlementRef, {
                tableData: rows,
                month: month, // 월 정보 명시적으로 저장
                updatedAt: serverTimestamp()
              });
              console.log(`✅ ${teamId} 팀 데이터 저장 완료 (${month})`);
            } else {
              // 문서가 존재하지 않으면 새로 생성
              await setDoc(teamSettlementRef, {
                teamId: teamId,
                month: month,
                tableData: rows,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              console.log(`✅ ${teamId} 팀 데이터 새 문서 생성 완료 (${month})`);
            }
          } catch (error) {
            console.error(`❌ ${teamId} 팀 데이터 저장 오류:`, error);
          }
        })();
        
        savePromises.push(promise);
      }
    });
    
    // 모든 저장 작업 완료 대기
    await Promise.all(savePromises);
    console.log(`📤 ${month}월 데이터 저장 완료`);
  };

  // 데이터 마이그레이션 함수
  const handleDataMigration = async () => {
    if (!migrationData.sourceMonth || !migrationData.targetMonth || !migrationData.teamId) {
      setSnackbar({
        open: true,
        message: '모든 필드를 선택해주세요.',
        severity: 'error'
      });
      return;
    }

    try {
      // 원본 데이터 가져오기
      const sourceRef = doc(db, 'teamSettlements', `${migrationData.teamId}_${migrationData.sourceMonth}`);
      const sourceDoc = await getDoc(sourceRef);
      
      if (!sourceDoc.exists()) {
        setSnackbar({
          open: true,
          message: '원본 데이터를 찾을 수 없습니다.',
          severity: 'error'
        });
        return;
      }

      // 대상 문서에 데이터 복사
      const targetRef = doc(db, 'teamSettlements', `${migrationData.teamId}_${migrationData.targetMonth}`);
      await setDoc(targetRef, {
        ...sourceDoc.data(),
        migratedAt: serverTimestamp(),
        migratedFrom: migrationData.sourceMonth
      });

      setSnackbar({
        open: true,
        message: `데이터가 ${migrationData.sourceMonth}에서 ${migrationData.targetMonth}로 복사되었습니다.`,
        severity: 'success'
      });

      setIsMigrationDialogOpen(false);
      setMigrationData({ sourceMonth: '', targetMonth: '', teamId: '' });

      // 현재 월이 대상 월이면 데이터 새로고침
      if (migrationData.targetMonth === selectedMonth) {
        loadTeamTableData(migrationData.teamId);
      }

    } catch (error) {
      console.error('데이터 마이그레이션 오류:', error);
      setSnackbar({
        open: true,
        message: '데이터 복사 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 현장명 편집 시작
  const handleStartEditSiteName = (siteName) => {
    setEditingSiteName(siteName);
    setEditingSiteValue(siteName);
  };

  // 시공팀 정산 데이터를 기성현황 지출에 자동 반영하는 함수
  const syncTeamSettlementToCosts = async (teamId, rows, month) => {
    try {
      const team = teams.find(t => t.id === teamId);
      if (!team) {
        console.warn(`팀을 찾을 수 없음: ${teamId}`);
        return;
      }

      if (!rows || rows.length === 0) {
        // 데이터가 없으면 기존 전송 데이터 삭제
        await deleteExistingTransferredCosts(teamId, month);
        return;
      }

      // 체크된 항목들만 지출에 반영
      const checkedRows = rows.filter(row => row.checked && row.siteName && row.totalPrice > 0);
      
      // 현장별로 그룹화
      const siteGroups = {};
      checkedRows.forEach(row => {
        if (!siteGroups[row.siteName]) {
          siteGroups[row.siteName] = [];
        }
        siteGroups[row.siteName].push(row);
      });

      // 기존 전송된 데이터 삭제 후 재생성
      await deleteExistingTransferredCosts(teamId, month);

      // 체크된 항목이 없으면 여기서 종료
      if (Object.keys(siteGroups).length === 0) {
        console.log(`✅ ${teamId} 팀 - 체크된 항목 없음, 기존 지출 데이터 삭제 완료`);
        return;
      }

      // 각 현장별로 지출 데이터 생성
      const batch = writeBatch(db);
      let transferCount = 0;

      for (const [siteName, siteRows] of Object.entries(siteGroups)) {
        const totalAmount = siteRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
        const transferAmount = Math.round(totalAmount * 1.1); // 1.1배 적용

        // 해당 현장의 기존 노무비 지출 데이터 확인하여 다음 차수 계산
        const existingCostsQuery = query(
          collection(db, 'costs'),
          where('site', '==', siteName),
          where('itemType', '==', '노무비')
        );
        const existingCostsSnapshot = await getDocs(existingCostsQuery);
        
        let nextSequence = '1차';
        if (!existingCostsSnapshot.empty) {
          const existingCosts = existingCostsSnapshot.docs.map(doc => doc.data());
          const sequences = existingCosts
            .map(cost => cost.sequence)
            .filter(seq => seq && typeof seq === 'string')
            .map(seq => {
              const match = seq.match(/(\d+)차/);
              return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);
          
          if (sequences.length > 0) {
            const maxSequence = Math.max(...sequences);
            nextSequence = `${maxSequence + 1}차`;
          }
        }

        // 정산 월의 마지막 날짜로 설정
        const [settlementYear, settlementMonth] = month.split('-');
        const settlementDate = new Date(parseInt(settlementYear), parseInt(settlementMonth), 0);
        const dateString = settlementDate.toISOString().split('T')[0];

        const costData = {
          site: siteName,
          itemType: '노무비',
          date: dateString,
          totalValue: transferAmount,
          paymentType: '시공팀정산',
          description: `${team.teamName} 팀 ${month} 정산 노무비`,
          etcNote: `시공팀 정산 자동 반영 - 원금액: ${totalAmount.toLocaleString()}원, 전송금액: ${transferAmount.toLocaleString()}원 (1.1배)`,
          sequence: nextSequence,
          source: 'teamSettlement',
          teamId: teamId,
          teamName: team.teamName,
          settlementMonth: month,
          originalAmount: totalAmount,
          transferAmount: transferAmount,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const costRef = doc(collection(db, 'costs'));
        batch.set(costRef, costData);
        transferCount++;
      }

      await batch.commit();
      console.log(`✅ ${transferCount}개 현장의 노무비가 기성현황 지출에 자동 반영됨 (${teamId})`);
      
      setSnackbar({
        open: true,
        message: `${transferCount}개 현장의 노무비가 기성현황 지출에 반영되었습니다.`,
        severity: 'success'
      });

    } catch (error) {
      console.error('지출 자동 반영 오류:', error);
      setSnackbar({
        open: true,
        message: '지출 반영 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 기성현황 지출에서 시공팀 정산으로 데이터 가져오기
  const syncCostsToTeamSettlement = async (teamId, month) => {
    try {
      console.log('🔄 기성현황 지출에서 시공팀 정산으로 데이터 가져오기 시작:', { teamId, month });
      
      // 기성현황 지출에서 해당 팀, 해당 월의 시공팀 정산 데이터 조회
      const costsQuery = query(
        collection(db, 'costs'),
        where('source', '==', 'teamSettlement'),
        where('teamId', '==', teamId),
        where('settlementMonth', '==', month),
        where('itemType', '==', '노무비')
      );
      
      const costsSnapshot = await getDocs(costsQuery);
      
      if (costsSnapshot.empty) {
        setSnackbar({
          open: true,
          message: '가져올 데이터가 없습니다. 기성현황 지출에 해당 팀/월의 시공팀 정산 데이터가 없습니다.',
          severity: 'info'
        });
        return;
      }
      
      const costsData = costsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('가져온 기성현황 지출 데이터:', costsData.length, '개');
      
      // 현장별로 그룹화
      const siteGroups = {};
      costsData.forEach(cost => {
        if (!siteGroups[cost.site]) {
          siteGroups[cost.site] = [];
        }
        siteGroups[cost.site].push(cost);
      });
      
      // 현재 팀의 테이블 데이터 가져오기
      const currentRows = teamTableData[teamId] || [];
      const existingSites = new Set(currentRows.map(row => row.siteName).filter(Boolean));
      
      let addedCount = 0;
      const newRows = [];
      
      // 각 현장별로 데이터 추가
      for (const [siteName, costs] of Object.entries(siteGroups)) {
        // originalAmount가 있으면 그것을 사용, 없으면 totalValue를 1.1로 나눈 값 사용
        const totalOriginalAmount = costs.reduce((sum, cost) => {
          if (cost.originalAmount) {
            return sum + cost.originalAmount;
          } else if (cost.totalValue) {
            // 1.1배로 전송되었으므로 역산 (정확도는 떨어질 수 있음)
            return sum + Math.round(cost.totalValue / 1.1);
          }
          return sum;
        }, 0);
        
        // 현장이 이미 있으면 건너뛰기 (중복 방지)
        if (existingSites.has(siteName)) {
          console.log(`⚠️ 현장 "${siteName}"은 이미 존재합니다. 건너뜁니다.`);
          continue;
        }
        
        // 현장 헤더 행 생성
        const siteRowId = `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const siteRow = {
          id: siteRowId,
          siteName: siteName,
          item: '',
          quantity: 0,
          unitPrice: 0,
          totalPrice: totalOriginalAmount,
          note: `기성현황에서 가져옴 (${costs.length}건)`,
          checked: true, // 자동으로 체크
          isItemRow: false // 현장 헤더
        };
        
        newRows.push(siteRow);
        
        // 각 cost를 항목 행으로 추가
        costs.forEach((cost, index) => {
          const itemRowId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`;
          const originalAmount = cost.originalAmount || Math.round(cost.totalValue / 1.1);
          
          const itemRow = {
            id: itemRowId,
            siteName: siteName,
            item: `정산 ${cost.sequence || ''}`,
            quantity: 1,
            unitPrice: originalAmount,
            totalPrice: originalAmount,
            note: cost.description || `기성현황에서 가져옴`,
            checked: true, // 자동으로 체크
            isItemRow: true // 항목 행
          };
          
          newRows.push(itemRow);
        });
        
        addedCount++;
      }
      
      if (newRows.length === 0) {
        setSnackbar({
          open: true,
          message: '추가할 새 현장이 없습니다. (모든 현장이 이미 존재합니다)',
          severity: 'info'
        });
        return;
      }
      
      // 기존 데이터에 새 행들 추가
      setTeamTableData(prev => ({
        ...prev,
        [teamId]: [...currentRows, ...newRows]
      }));
      
      setSnackbar({
        open: true,
        message: `${addedCount}개 현장, 총 ${newRows.length}개 항목을 기성현황 지출에서 가져왔습니다. 저장 버튼을 눌러 저장하세요.`,
        severity: 'success'
      });
      
      console.log(`✅ 기성현황 지출에서 시공팀 정산으로 데이터 가져오기 완료: ${addedCount}개 현장, ${newRows.length}개 항목`);
      
    } catch (error) {
      console.error('기성현황 지출에서 데이터 가져오기 오류:', error);
      setSnackbar({
        open: true,
        message: '데이터 가져오기 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 기존 전송된 지출 데이터 삭제
  const deleteExistingTransferredCosts = async (teamId, month) => {
    try {
      const existingCosts = await getDocs(
        query(
          collection(db, 'costs'),
          where('source', '==', 'teamSettlement'),
          where('teamId', '==', teamId),
          where('settlementMonth', '==', month)
        )
      );

      if (!existingCosts.empty) {
        const batch = writeBatch(db);
        existingCosts.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ 기존 전송 데이터 ${existingCosts.docs.length}개 삭제 완료 (${teamId}, ${month})`);
      }
    } catch (error) {
      console.error('기존 전송 데이터 삭제 오류:', error);
    }
  };

  // 시공팀 정산 노무비를 기성관리로 전송하는 함수 (수동 전송 버튼용)
  const handleTransferLaborCosts = async (teamId) => {
    try {
      const team = teams.find(t => t.id === teamId);
      if (!team) {
        setSnackbar({
          open: true,
          message: '팀 정보를 찾을 수 없습니다.',
          severity: 'error'
        });
        return;
      }

      const teamData = teamTableData[teamId] || [];
      if (teamData.length === 0) {
        setSnackbar({
          open: true,
          message: '전송할 데이터가 없습니다.',
          severity: 'warning'
        });
        return;
      }

      // 현장별로 그룹화하여 노무비 계산
      const siteGroups = {};
      teamData.forEach(row => {
        if (row.checked && row.siteName && row.totalPrice > 0) {
          if (!siteGroups[row.siteName]) {
            siteGroups[row.siteName] = [];
          }
          siteGroups[row.siteName].push(row);
        }
      });

      if (Object.keys(siteGroups).length === 0) {
        setSnackbar({
          open: true,
          message: '선택된 항목이 없습니다.',
          severity: 'warning'
        });
        return;
      }

      // 중복 방지를 위한 기존 데이터 확인
      const existingCosts = await getDocs(
        query(
          collection(db, 'costs'),
          where('source', '==', 'teamSettlement'),
          where('teamId', '==', teamId),
          where('settlementMonth', '==', selectedMonth)
        )
      );

      if (!existingCosts.empty) {
        setSnackbar({
          open: true,
          message: '이미 전송된 데이터입니다. 중복 전송을 방지합니다.',
          severity: 'warning'
        });
        return;
      }

      // 각 현장별로 지출 데이터 생성
      const batch = writeBatch(db);
      let transferCount = 0;

      for (const [siteName, rows] of Object.entries(siteGroups)) {
        const totalAmount = rows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
        const transferAmount = Math.round(totalAmount * 1.1); // 1.1배 적용

        // 해당 현장의 기존 노무비 지출 데이터 확인하여 다음 차수 계산
        // 인덱스 문제를 피하기 위해 단순한 쿼리 사용
        const existingCostsQuery = query(
          collection(db, 'costs'),
          where('site', '==', siteName),
          where('itemType', '==', '노무비')
        );
        const existingCostsSnapshot = await getDocs(existingCostsQuery);
        
        let nextSequence = '1차'; // 기본값
        if (!existingCostsSnapshot.empty) {
          const existingCosts = existingCostsSnapshot.docs.map(doc => doc.data());
          console.log(`현장 ${siteName}의 기존 노무비 데이터:`, existingCosts);
          
          // 클라이언트 사이드에서 정렬 (createdAt 기준 내림차순)
          existingCosts.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          });
          
          // 기존 차수들에서 가장 높은 차수 찾기
          const sequences = existingCosts
            .map(cost => cost.sequence)
            .filter(seq => seq && typeof seq === 'string')
            .map(seq => {
              // "1차", "2차", "3차" 형식에서 숫자 추출
              const match = seq.match(/(\d+)차/);
              return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);
          
          if (sequences.length > 0) {
            const maxSequence = Math.max(...sequences);
            nextSequence = `${maxSequence + 1}차`;
          }
        }
        
        console.log(`현장 ${siteName}의 다음 차수: ${nextSequence}`);

        // 정산 월의 마지막 날짜로 설정 (예: 2024-09-30)
        const [settlementYear, settlementMonth] = selectedMonth.split('-');
        const settlementDate = new Date(parseInt(settlementYear), parseInt(settlementMonth), 0);
        const dateString = settlementDate.toISOString().split('T')[0];

        const costData = {
          site: siteName,
          itemType: '노무비',
          date: dateString,
          totalValue: transferAmount,
          paymentType: '시공팀정산',
          description: `${team.teamName} 팀 ${selectedMonth} 정산 노무비`,
          etcNote: `시공팀 정산 자동 전송 - 원금액: ${totalAmount.toLocaleString()}원, 전송금액: ${transferAmount.toLocaleString()}원 (1.1배)`,
          sequence: nextSequence, // 현장별 다음 차수
          source: 'teamSettlement', // 전송 출처 표시
          teamId: teamId,
          teamName: team.teamName,
          settlementMonth: selectedMonth,
          originalAmount: totalAmount,
          transferAmount: transferAmount,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const costRef = doc(collection(db, 'costs'));
        batch.set(costRef, costData);
        transferCount++;
      }

      await batch.commit();

      setSnackbar({
        open: true,
        message: `${transferCount}개 현장의 노무비가 기성관리로 전송되었습니다. (1.1배 적용)`,
        severity: 'success'
      });

    } catch (error) {
      console.error('노무비 전송 오류:', error);
      setSnackbar({
        open: true,
        message: '노무비 전송 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 현장명 편집 완료
  const handleFinishEditSiteName = async (teamId, oldSiteName) => {
    if (editingSiteValue.trim() === '') {
      setSnackbar({ open: true, message: '현장명을 입력해주세요.', severity: 'warning' });
      return;
    }

    if (editingSiteValue === oldSiteName) {
      setEditingSiteName(null);
      setEditingSiteValue('');
      return;
    }

    try {
      const currentRows = teamTableData[teamId] || [];
      const updatedRows = currentRows.map(row => {
        if (row.siteName === oldSiteName) {
          return { ...row, siteName: editingSiteValue.trim() };
        }
        return row;
      });

      const updatedData = {
        ...teamTableData,
        [teamId]: updatedRows
      };

      setTeamTableData(updatedData);

      // Firebase에 저장
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      await updateDoc(teamSettlementRef, {
        tableData: updatedRows,
        updatedAt: serverTimestamp()
      });

      setEditingSiteName(null);
      setEditingSiteValue('');
      
      setSnackbar({ 
        open: true, 
        message: `현장명이 "${editingSiteValue.trim()}"로 변경되었습니다.`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('현장명 변경 오류:', error);
      setSnackbar({ 
        open: true, 
        message: '현장명 변경 중 오류가 발생했습니다.', 
        severity: 'error' 
      });
    }
  };

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
          pt: 11, 
          bgcolor: '#0a0a0a', 
          minHeight: '100vh',
          borderRadius: 2,
          boxShadow: 3,
          color: '#fff',
          // 스마트폰에서만 적용
          '@media (max-width: 767px)': {
            p: 1,
        pt: 2,
        bgcolor: '#f5f5f5',
        color: '#333'
      }
    }}>
      {/* 스마트폰 전용 헤더 */}
      <Box sx={{ 
        mb: 4,
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          mb: 2,
          bgcolor: 'white',
          borderRadius: '12px',
          p: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }
      }}>
        {/* 제목과 설명 */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: 1,
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 2,
              mb: 2
            }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                justifyContent: 'space-between',
                width: '100%'
              }
            }}>
              <IconButton
                onClick={() => navigate('/daema-team')}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/daema-team');
                }}
                sx={{
                  color: '#4caf50',
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(76, 175, 80, 0.2)',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.3s ease',
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    color: '#2E7D32',
                    bgcolor: 'rgba(46, 125, 50, 0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(46, 125, 50, 0.2)'
                    }
                  }
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ 
                // 테블릿에서 제목 영역 숨기기
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  display: 'none'
                },
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  flex: 1,
                  textAlign: 'center'
                }
              }}>
                <Typography variant="h3" sx={{ 
                  color: '#fff', 
                  fontWeight: '700',
                  background: 'linear-gradient(45deg, #4caf50, #81c784)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5,
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '1.5rem',
                    color: '#2E7D32',
                    background: 'none',
                    WebkitTextFillColor: 'unset'
                  }
                }}>
                  시공팀 월별 정산 관리
                </Typography>
                <Typography variant="body1" sx={{ 
                  color: '#bbb', 
                  fontSize: '1.1rem',
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    color: '#666',
                    fontSize: '0.9rem'
                  }
                }}>
                  시공팀별 월별 정산 현황을 관리하고 지급 내역을 추적합니다.
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#999', 
                  fontSize: '0.9rem',
                  mt: 0.5,
                  fontStyle: 'italic',
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    color: '#888',
                    fontSize: '0.85rem'
                  }
                }}>
                  (단, 현장별 노무비 지급 중 주요현장 노임은 제외일 수 있습니다.)
                </Typography>
              </Box>
            </Box>

            {/* 중앙: 월 네비게이션 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={handlePreviousMonth}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePreviousMonth();
                }}
                sx={{
                  color: '#4caf50',
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(76, 175, 80, 0.2)',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <ChevronLeftIcon sx={{ 
                  fontSize: '2rem',
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '1.5rem'
                  }
                }} />
              </IconButton>
              
              <Box sx={{
                minWidth: '160px',
                textAlign: 'center',
                px: 3,
                py: 2,
                bgcolor: 'rgba(76, 175, 80, 0.15)',
                borderRadius: '16px',
                border: '2px solid rgba(76, 175, 80, 0.3)',
                boxShadow: '0 4px 16px rgba(76, 175, 80, 0.2)',
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  minWidth: '120px',
                  px: 2,
                  py: 1,
                  bgcolor: 'rgba(46, 125, 50, 0.1)',
                  border: '1px solid rgba(46, 125, 50, 0.3)',
                  boxShadow: '0 2px 8px rgba(46, 125, 50, 0.2)'
                }
              }}>
                <Typography variant="h5" sx={{ 
                  color: '#fff', 
                  fontWeight: '700',
                  fontSize: '1.4rem',
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    color: '#2E7D32',
                    fontSize: '1.1rem'
                  }
                }}>
                  {formatMonthDisplay(selectedMonth)}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#81c784', 
                  fontSize: '0.9rem',
                  mt: 0.5
                }}>
                  정산월
                </Typography>
              </Box>
              
              <IconButton
                onClick={handleNextMonth}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNextMonth();
                }}
                sx={{
                  color: '#4caf50',
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(76, 175, 80, 0.2)',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <ChevronRightIcon sx={{ 
                  fontSize: '2rem',
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: '1.5rem'
                  }
                }} />
              </IconButton>
            </Box>
            
            {/* 오른쪽: 통계 카드들 */}
            <Box sx={{ display: 'flex', gap: 1, minWidth: 'fit-content' }}>
              {/* 시공팀 통합 카드 */}
              <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #4caf50', minWidth: 220, height: 70 }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <GroupIcon sx={{ color: '#4caf50', fontSize: 28 }} />
                    <Typography variant="body1" sx={{ color: '#4caf50', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      시공팀
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: '2rem' }}>
                      {(() => {
                        const { activeTeams } = classifyAllTeams(teams);
                        return `${activeTeams.length}`;
                      })()}
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold', fontSize: '1.8rem' }}>
                      {(() => {
                        const { cooperationTeams } = classifyAllTeams(teams);
                        return `+${cooperationTeams.length}`;
                      })()}
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: '2rem' }}>
                      팀
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              {/* 정산금액 카드 */}
              <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333', minWidth: 280, height: 70 }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <MoneyIcon sx={{ color: '#4caf50', fontSize: 28 }} />
                    <Typography variant="body1" sx={{ color: '#bbb', fontSize: '1.2rem', fontWeight: 'medium' }}>
                      정산금액
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '2rem', ml: 2 }}>
                    {(() => {
                      const stats = getMonthlyStats();
                      return formatAmount(stats.total.settlement);
                    })()}
                  </Typography>
                </CardContent>
              </Card>
              
              {/* 정산건수 카드 */}
              <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333', minWidth: 220, height: 70 }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckIcon sx={{ color: '#00ff88', fontSize: 28 }} />
                    <Typography variant="body1" sx={{ color: '#bbb', fontSize: '1.2rem', fontWeight: 'medium' }}>
                      정산건수
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '2rem' }}>
                    {(() => {
                      const stats = getMonthlyStats();
                      return `${stats.total.count}건`;
                    })()}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 탭과 버튼을 같은 라인에 배치 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>

        {/* 시공팀별 탭 */}
        <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333', minWidth: 400 }}>
          <CardContent sx={{ p: 0 }}>
                 <Tabs
                   value={Math.min(activeTab, selectedTeamsForTabs.length)}
                   onChange={handleTabChange}
                   variant="scrollable"
                   scrollButtons="auto"
                   sx={{
                     borderBottom: '1px solid #333',
                     '& .MuiTab-root': {
                       color: '#bbb',
                       fontWeight: 'bold',
                       minHeight: 48,
                       minWidth: 80,
                       px: 3,
                       '&.Mui-selected': {
                         color: '#4caf50'
                       }
                     },
                     '& .MuiTabs-indicator': {
                       backgroundColor: '#4caf50'
                     }
                   }}
                 >
                   <Tab label="전체" />
                   {selectedTeamsForTabs.map((team) => (
                     <Tab
                       key={`selected-${team.id}`}
                       label={team.teamName}
                       onClose={() => handleOpenTabDeleteDialog(team)}
                     />
                   ))}
                 </Tabs>
          </CardContent>
        </Card>

        {/* 액션 버튼들 */}
             <Box sx={{ display: 'flex', gap: 2 }}>
               <Button
                 variant="contained"
                 startIcon={<GroupIcon />}
                 onClick={handleOpenTeamSelect}
                 sx={{
                   bgcolor: '#2196f3',
                   '&:hover': { bgcolor: '#1976d2' }
                 }}
               >
                 탭 생성
               </Button>
               <Button
                 variant="contained"
                 startIcon={<ContentCopyIcon />}
                 onClick={() => setIsMigrationDialogOpen(true)}
                 sx={{
                   bgcolor: '#ff9800',
                   '&:hover': { bgcolor: '#f57c00' }
                 }}
               >
                 데이터 복사
               </Button>
               <Button
                 variant="outlined"
                 startIcon={<DownloadIcon />}
                 onClick={handleExcelDownload}
                 sx={{
                   borderColor: '#4caf50',
                   color: '#4caf50',
                   '&:hover': { borderColor: '#45a049', bgcolor: 'rgba(76, 175, 80, 0.1)' }
                 }}
              >
                {activeTab === 0 ? '전체 팀 엑셀 다운로드' : '팀별 엑셀 다운로드'}
              </Button>
            </Box>
      </Box>


      {/* 정산 목록 */}
      <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#fff' }}>
              {selectedMonth} 정산 현황
              {activeTab > 0 && selectedTeamsForTabs[activeTab - 1] && (
                <Chip 
                  label={selectedTeamsForTabs[activeTab - 1].teamName} 
                  color="primary" 
                  size="small" 
                  sx={{ ml: 2, bgcolor: '#4caf50', color: '#fff' }}
                />
              )}
            </Typography>
            {activeTab > 0 && selectedTeamsForTabs[activeTab - 1] && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<MoneyIcon />}
                  onClick={() => handleTransferLaborCosts(selectedTeamsForTabs[activeTab - 1].id)}
                  sx={{
                    bgcolor: '#2196f3',
                    '&:hover': { bgcolor: '#1976d2' }
                  }}
                >
                  노무비 전송
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleOpenTabDeleteDialog(selectedTeamsForTabs[activeTab - 1])}
                  sx={{
                    bgcolor: '#f44336',
                    '&:hover': { bgcolor: '#d32f2f' }
                  }}
                >
                  탭 삭제
                </Button>
              </Box>
            )}
          </Box>
          
          {activeTab === 0 ? (
            // 전체 탭 - 기존 정산 현황 테이블
            <TableContainer component={Paper} sx={{ bgcolor: '#2d2d2d' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>시공팀명</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>정산 날짜</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>정산 금액 (부가세 별도)</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>지급 금액 (부가세 별도)</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>미지급 금액 (부가세 별도)</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>상태</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>비고</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedTeamsForTabs.map((team, index) => {
                    const teamAmount = getTeamAmount(team.id);
                    const settlementAmount = getSettlementAmount(team.id);
                    const displayAmount = settlementAmount > 0 ? settlementAmount : teamAmount; // 정산 데이터가 있으면 정산 데이터, 없으면 탭 금액
                    const currentStatus = teamStatuses[selectedMonth]?.[team.id] || 'unpaid'; // 기본값: 미지급 (월별)
                    const isPaid = currentStatus === 'paid';
                    const isEditing = editingTeam === team.id;
                    const settlementDate = teamSettlementDates[selectedMonth]?.[team.id] || '';
                    const teamNote = teamNotes[selectedMonth]?.[team.id] || '';
                    
                    return (
                      <TableRow key={team.id} hover sx={{ '& .MuiTableCell-root': { py: 0.5 } }}>
                        <TableCell sx={{ color: '#fff', fontSize: '1.05rem' }}>{team.teamName}</TableCell>
                        <TableCell sx={{ color: '#fff', fontSize: '1.05rem' }}>
                          {isEditing ? (
                            <TextField
                              type="date"
                              value={settlementDate}
                              onChange={(e) => updateTeamInfo(team.id, 'settlementDate', e.target.value)}
                              size="small"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  color: '#fff',
                                  fontSize: '1.05rem',
                                  '& fieldset': { borderColor: '#666' },
                                  '&:hover fieldset': { borderColor: '#888' },
                                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                }
                              }}
                            />
                          ) : (
                            settlementDate || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ color: '#fff', fontSize: '1.05rem' }}>{formatAmount(displayAmount)}</TableCell>
                        <TableCell sx={{ color: '#fff', fontSize: '1.05rem' }}>
                          {isPaid ? formatAmount(displayAmount) : formatAmount(0)}
                        </TableCell>
                        <TableCell sx={{ color: '#fff', fontSize: '1.05rem' }}>
                          {isPaid ? formatAmount(0) : formatAmount(displayAmount)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              statusUpdating[team.id] 
                                ? '저장중...' 
                                : currentStatus === 'paid' ? '지급' : currentStatus === 'pending' ? '보류' : '미지급'
                            }
                            size="small"
                            clickable={!statusUpdating[team.id]}
                            disabled={statusUpdating[team.id]}
                            color={
                              statusUpdating[team.id] ? 'default' :
                              currentStatus === 'paid' ? 'success' : 
                              currentStatus === 'pending' ? 'info' : 
                              'warning'
                            }
                            onClick={() => {
                              if (statusUpdating[team.id]) return; // 저장 중이면 클릭 무시
                              
                              // 상태 순환: 미지급 -> 지급 -> 보류 -> 미지급
                              const nextStatus = currentStatus === 'unpaid' ? 'paid' : 
                                               currentStatus === 'paid' ? 'pending' : 'unpaid';
                              updateTeamStatus(team.id, nextStatus);
                            }}
                            sx={{
                              fontSize: '0.9rem',
                              height: '28px',
                              '&:hover': {
                                opacity: statusUpdating[team.id] ? 1 : 0.8
                              },
                              '&.Mui-disabled': {
                                opacity: 0.7
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#fff', fontSize: '1.05rem' }}>
                          {isEditing ? (
                            <TextField
                              value={teamNote}
                              onChange={(e) => updateTeamInfo(team.id, 'notes', e.target.value)}
                              size="small"
                              placeholder="비고 입력"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  color: '#fff',
                                  fontSize: '1.05rem',
                                  '& fieldset': { borderColor: '#666' },
                                  '&:hover fieldset': { borderColor: '#888' },
                                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                }
                              }}
                            />
                          ) : (
                            teamNote || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              onClick={() => setEditingTeam(isEditing ? null : team.id)}
                              sx={{ 
                                color: isEditing ? '#4caf50' : '#666',
                                '&:hover': { color: '#4caf50' }
                              }}
                              title={isEditing ? '편집 완료' : '편집'}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => setActiveTab(index + 1)}
                              sx={{ color: '#4caf50' }}
                              title="상세 보기"
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => {
                                if (window.confirm(`"${team.teamName}" 팀의 정산 정보를 삭제하시겠습니까?`)) {
                                  // 팀 정산 정보 삭제 로직
                                  console.log('팀 정산 정보 삭제:', team.id);
                                }
                              }}
                              sx={{ color: '#f44336' }}
                              title="삭제"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* 총계 행 */}
                  {(() => {
                    const { totalSettlement, totalPaid, totalUnpaid } = getTotalAmounts();
                    const teamCount = selectedTeamsForTabs.length;
                    return (
                      <TableRow sx={{ 
                        '& .MuiTableCell-root': { 
                          py: 1,
                          borderTop: '2px solid #4caf50',
                          backgroundColor: '#1a1d21'
                        } 
                      }}>
                        <TableCell sx={{ 
                          color: '#4caf50', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          총계 {teamCount}개 팀
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#4caf50', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          -
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#4caf50', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          textAlign: 'right'
                        }}>
                          총 정산금액 {formatAmount(totalSettlement)}
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#4caf50', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          textAlign: 'right'
                        }}>
                          총 지급금액 {formatAmount(totalPaid)}
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#4caf50', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          textAlign: 'right'
                        }}>
                          총 미지급금액 {formatAmount(totalUnpaid)}
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#4caf50', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#4caf50', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                        </TableCell>
                        <TableCell sx={{ 
                          color: '#4caf50', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            // 시공팀 탭 - 입력 가능한 테이블
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" sx={{ color: '#fff' }}>
                    {selectedTeamsForTabs[activeTab - 1]?.teamName} 정산 입력
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    총 금액: {formatAmount(getCurrentTeamTotalAmount())}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsSiteAddDialogOpen(true)}
                    sx={{
                      bgcolor: '#2196f3',
                      '&:hover': { bgcolor: '#1976d2' }
                    }}
                  >
                    현장 추가
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                      onClick={() => {
                        const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                        const currentTeam = selectedTeamsForTabs[activeTab - 1];
                        console.log('🔥 행 추가 버튼 클릭:', { 
                          teamId, 
                          teamName: currentTeam?.teamName,
                          selectedSiteForRowAdd, 
                          activeTab, 
                          selectedTeamsForTabs: selectedTeamsForTabs[activeTab - 1],
                          teamTableData: teamTableData[teamId],
                          selectedMonth
                        });
                        if (teamId) {
                          handleAddTableRow(teamId);
                        } else {
                          console.error('❌ teamId가 없습니다:', { activeTab, selectedTeamsForTabs });
                          setSnackbar({ 
                            open: true, 
                            message: '팀을 선택해주세요.',
                            severity: 'error' 
                          });
                        }
                      }}
                    sx={{
                      bgcolor: selectedSiteForRowAdd ? '#81c784' : '#4caf50',
                      color: '#fff',
                      '&:hover': { 
                        bgcolor: selectedSiteForRowAdd ? '#66bb6a' : '#45a049' 
                      }
                    }}
                  >
                    {selectedSiteForRowAdd ? `항목 추가 (${selectedSiteForRowAdd})` : '현장+항목 추가'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CloudDownloadIcon />}
                    onClick={async () => {
                      const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                      if (teamId) {
                        if (window.confirm('기성현황 지출에서 해당 팀/월의 시공팀 정산 데이터를 가져오시겠습니까?\n\n기존에 같은 현장이 있으면 추가되지 않습니다.')) {
                          await syncCostsToTeamSettlement(teamId, selectedMonth);
                        }
                      } else {
                        setSnackbar({
                          open: true,
                          message: '팀을 선택해주세요.',
                          severity: 'warning'
                        });
                      }
                    }}
                    sx={{
                      borderColor: '#2196f3',
                      color: '#2196f3',
                      '&:hover': { 
                        borderColor: '#1976d2', 
                        bgcolor: 'rgba(33, 150, 243, 0.1)' 
                      }
                    }}
                  >
                    기성현황에서 가져오기
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={async () => {
                      const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                      if (teamId) {
                        try {
                          const rows = teamTableData[teamId] || [];
                          const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
                          const docSnap = await getDoc(teamSettlementRef);
                          
                          if (docSnap.exists()) {
                            await updateDoc(teamSettlementRef, {
                              tableData: rows,
                              month: selectedMonth,
                              updatedAt: serverTimestamp()
                            });
                          } else {
                            await setDoc(teamSettlementRef, {
                              teamId: teamId,
                              month: selectedMonth,
                              tableData: rows,
                              createdAt: serverTimestamp(),
                              updatedAt: serverTimestamp()
                            });
                          }
                          
                          // 🔴 기성현황 지출에 동기화 (저장 버튼 클릭 시에만 수행)
                          console.log(`🔄 지출 동기화 시작: ${teamId}, ${selectedMonth}`);
                          await syncTeamSettlementToCosts(teamId, rows, selectedMonth);
                          console.log(`✅ 지출 동기화 완료: ${teamId}, ${selectedMonth}`);
                          
                          setSnackbar({ 
                            open: true, 
                            message: '데이터가 저장되었고 기성현황 지출에 반영되었습니다.', 
                            severity: 'success' 
                          });
                        } catch (error) {
                          console.error('저장 오류:', error);
                          setSnackbar({ 
                            open: true, 
                            message: '저장 중 오류가 발생했습니다.', 
                            severity: 'error' 
                          });
                        }
                      }
                    }}
                    sx={{
                      bgcolor: '#4caf50',
                      color: '#fff',
                      '&:hover': { 
                        bgcolor: '#45a049' 
                      }
                    }}
                  >
                    저장
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                      if (teamId) {
                        handleDeleteSelectedRows(teamId);
                      }
                    }}
                    disabled={(() => {
                      const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                      if (!teamId) return true;
                      const currentRows = teamTableData[teamId] || [];
                      const selectedCount = currentRows.filter(row => row.checked).length;
                      return selectedCount === 0;
                    })()}
                    sx={{
                      bgcolor: '#f44336',
                      color: '#fff',
                      '&:hover': { 
                        bgcolor: '#d32f2f' 
                      },
                      '&.Mui-disabled': {
                        bgcolor: '#666',
                        color: '#999'
                      }
                    }}
                  >
                    선택 삭제
                    {(() => {
                      const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                      if (!teamId) return '';
                      const currentRows = teamTableData[teamId] || [];
                      const selectedCount = currentRows.filter(row => row.checked).length;
                      return selectedCount > 0 ? ` (${selectedCount})` : '';
                    })()}
                  </Button>
                </Box>
              </Box>
              
              <TableContainer 
                component={Paper} 
                sx={{ 
                  bgcolor: '#2d2d2d',
                  maxHeight: '600px',
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    display: 'none'
                  },
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none'
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '60px', fontSize: '1.1rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Checkbox
                            checked={isAllSelected}
                            indeterminate={(() => {
                              const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                              if (!teamId) return false;
                              const currentRows = teamTableData[teamId] || [];
                              const checkedCount = currentRows.filter(row => row.checked).length;
                              return checkedCount > 0 && checkedCount < currentRows.length;
                            })()}
                            onChange={() => {
                              const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                              if (teamId) {
                                handleSelectAll(teamId);
                              }
                            }}
                            sx={{
                              color: '#4caf50',
                              '&.Mui-checked': {
                                color: '#4caf50',
                              },
                              '&.MuiCheckbox-indeterminate': {
                                color: '#4caf50',
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '400px', fontSize: '1.1rem' }}>
                        현장명({(() => {
                          const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                          const teamName = selectedTeamsForTabs[activeTab - 1]?.teamName;
                          const siteCount = teamId ? getTeamSiteCount(teamId) : 0;
                          console.log('현장 개수 계산:', { teamId, teamName, siteCount });
                          return `${siteCount}개 현장`;
                        })()})
                      </TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '120px', fontSize: '1.1rem' }}>소계</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '120px', fontSize: '1.1rem' }}>항목</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '80px', fontSize: '1.1rem' }}>물량</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '80px', fontSize: '1.1rem' }}>단가</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '120px', fontSize: '1.1rem' }}>금액</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '150px', fontSize: '1.1rem' }}>비고</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '60px', fontSize: '1.1rem' }}>삭제</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                      const allRows = teamTableData[teamId] || [];
                      
                      console.log('📊 테이블 렌더링:', { 
                        teamId, 
                        teamName: selectedTeamsForTabs[activeTab - 1]?.teamName,
                        allRows, 
                        rowsCount: allRows.length,
                        selectedMonth,
                        teamTableDataKeys: Object.keys(teamTableData),
                        currentTeamData: teamTableData[teamId]
                      });
                      
                      if (allRows.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#bbb' }}>
                              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                                아직 등록된 현장이 없습니다. "현장 추가" 버튼을 클릭하여 현장을 추가하세요.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      // 현장별로 그룹화
                      const siteGroups = {};
                      const independentRows = []; // 독립적인 행들
                      
                      allRows.forEach(row => {
                        if (row.siteName && (!row.item || row.item === '') && !row.isItemRow) {
                          // 현장 헤더 행
                          if (!siteGroups[row.siteName]) {
                            siteGroups[row.siteName] = {
                              siteRow: row,
                              itemRows: []
                            };
                          }
                        } else if (row.isItemRow) {
                          // 항목 행 - 해당 현장에 속하는 항목들
                          const siteName = row.siteName;
                          console.log('항목 행 처리:', { 
                            rowId: row.id, 
                            siteName, 
                            isItemRow: row.isItemRow,
                            hasSiteGroup: !!siteGroups[siteName]
                          });
                          
                          if (siteGroups[siteName]) {
                            siteGroups[siteName].itemRows.push(row);
                            console.log('기존 현장 그룹에 항목 추가:', { siteName, rowId: row.id });
                          } else {
                            // 현장 헤더가 없으면 임시로 생성
                            if (!siteGroups[siteName]) {
                              siteGroups[siteName] = {
                                siteRow: {
                                  id: `temp-${siteName}`,
                                  siteName: siteName,
                                  checked: false,
                                  isSiteHeader: true
                                },
                                itemRows: []
                              };
                              console.log('새 현장 그룹 생성 후 항목 추가:', { siteName, rowId: row.id });
                            }
                            siteGroups[siteName].itemRows.push(row);
                          }
                        } else {
                          // 독립적인 행 (isItemRow: false) - 새로 추가된 행은 일정 시간 동안 독립적으로 유지
                          console.log('독립적인 행 처리:', { 
                            rowId: row.id, 
                            siteName: row.siteName, 
                            isItemRow: row.isItemRow,
                            hasSiteName: !!(row.siteName && row.siteName !== ''),
                            isNewRow: row.isNewRow,
                            createdAt: row.createdAt
                          });
                          
                          // 새로 추가된 행이거나 생성된 지 30초 이내인 경우 독립적인 행으로 유지
                          const isRecentlyCreated = row.isNewRow || (row.createdAt && (Date.now() - row.createdAt) < 30000);
                          
                          console.log('독립적인 행 조건 확인:', {
                            rowId: row.id,
                            siteName: row.siteName,
                            isNewRow: row.isNewRow,
                            createdAt: row.createdAt,
                            timeDiff: row.createdAt ? (Date.now() - row.createdAt) : 'N/A',
                            isRecentlyCreated,
                            shouldStayIndependent: !row.siteName || row.siteName === '' || isRecentlyCreated
                          });
                          
                          // 새로 추가된 행은 무조건 독립적인 행으로 유지 (30초 동안)
                          if (row.isNewRow) {
                            independentRows.push(row);
                            console.log('새 행이므로 독립적인 행으로 추가:', { rowId: row.id, isNewRow: row.isNewRow });
                          } else if (row.siteName && row.siteName !== '' && !isRecentlyCreated) {
                            // 현장명이 있고 새로 추가된 행이 아니면 해당 현장 그룹에 추가
                            if (!siteGroups[row.siteName]) {
                              siteGroups[row.siteName] = {
                                siteRow: {
                                  id: `temp-${row.siteName}`,
                                  siteName: row.siteName,
                                  checked: false,
                                  isSiteHeader: true
                                },
                                itemRows: []
                              };
                              console.log('새 현장 그룹 생성:', row.siteName);
                            }
                            siteGroups[row.siteName].itemRows.push(row);
                            console.log('현장 그룹에 행 추가:', { siteName: row.siteName, rowId: row.id });
                          } else {
                            // 현장명이 없거나 최근 생성된 행이면 독립적인 행으로 추가
                            independentRows.push(row);
                            console.log('독립적인 행으로 추가:', { rowId: row.id, isNewRow: row.isNewRow, isRecentlyCreated });
                          }
                        }
                      });
                      
                      console.log('현장 그룹화 결과:', siteGroups);
                      console.log('독립적인 행들:', independentRows);
                      console.log('전체 행 수:', allRows.length);
                      
                      const result = [];
                      Object.values(siteGroups).forEach((group, groupIndex) => {
                        // 현장 헤더 행 (현장명 + 소계)
                        result.push(
                          <TableRow 
                            key={`site-${group.siteRow.id}`} 
                            sx={{ 
                              '& .MuiTableCell-root': { py: 1 },
                              backgroundColor: selectedSiteForRowAdd === group.siteRow.siteName 
                                ? 'rgba(129, 199, 132, 0.2)' 
                                : 'rgba(76, 175, 80, 0.05)',
                              borderBottom: selectedSiteForRowAdd === group.siteRow.siteName
                                ? '2px solid #81c784'
                                : '2px solid #000',
                              '&:hover': {
                                backgroundColor: selectedSiteForRowAdd === group.siteRow.siteName
                                  ? 'rgba(129, 199, 132, 0.25)'
                                  : 'rgba(76, 175, 80, 0.1)'
                              }
                            }}
                          >
                            <TableCell>
                              <Checkbox
                                checked={group.siteRow.checked || false}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  console.log('체크박스 변경:', { 
                                    siteName: group.siteRow.siteName, 
                                    isChecked, 
                                    currentSelected: selectedSiteForRowAdd 
                                  });
                                  
                                  // 임시 헤더가 아닌 경우에만 업데이트
                                  if (!group.siteRow.id.startsWith('temp-')) {
                                    handleUpdateTableData(teamId, group.siteRow.id, 'checked', isChecked);
                                  }
                                  
                                  // 현장 선택 상태 업데이트
                                  if (group.siteRow.siteName && isChecked) {
                                    setSelectedSiteForRowAdd(group.siteRow.siteName);
                                    console.log('✅ 체크박스로 현장 선택됨:', group.siteRow.siteName);
                                  } else if (!isChecked && selectedSiteForRowAdd === group.siteRow.siteName) {
                                    setSelectedSiteForRowAdd('');
                                    console.log('❌ 체크박스로 현장 선택 해제됨');
                                  }
                                }}
                                sx={{
                                  color: selectedSiteForRowAdd === group.siteRow.siteName ? '#81c784' : '#4caf50',
                                  '&.Mui-checked': {
                                    color: selectedSiteForRowAdd === group.siteRow.siteName ? '#81c784' : '#4caf50',
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell 
                              sx={{ 
                                color: selectedSiteForRowAdd === group.siteRow.siteName ? '#81c784' : '#4caf50', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                backgroundColor: selectedSiteForRowAdd === group.siteRow.siteName ? 'rgba(129, 199, 132, 0.15)' : 'transparent',
                                border: selectedSiteForRowAdd === group.siteRow.siteName ? '2px solid #81c784' : 'none',
                                borderRadius: selectedSiteForRowAdd === group.siteRow.siteName ? '4px' : '0px'
                              }}
                              onClick={() => {
                                // 현장 펼치기/접기 토글
                                const siteName = group.siteRow.siteName;
                                const newCollapsedSites = new Set(collapsedSites);
                                
                                if (newCollapsedSites.has(siteName)) {
                                  newCollapsedSites.delete(siteName);
                                  console.log('현장 펼치기:', siteName);
                                } else {
                                  newCollapsedSites.add(siteName);
                                  console.log('현장 접기:', siteName);
                                }
                                
                                setCollapsedSites(newCollapsedSites);
                              }}
                              onDoubleClick={() => {
                                // 현장명 편집 모드 시작
                                console.log('현장명 더블클릭 - 편집 모드 시작:', group.siteRow.siteName);
                                handleStartEditSiteName(group.siteRow.siteName);
                              }}
                            >
                              {editingSiteName === group.siteRow.siteName ? (
                                <TextField
                                  value={editingSiteValue}
                                  onChange={(e) => setEditingSiteValue(e.target.value)}
                                  onBlur={() => {
                                    // 약간의 지연을 두어 다른 이벤트가 먼저 처리되도록 함
                                    setTimeout(() => {
                                      if (editingSiteName === group.siteRow.siteName) {
                                        handleFinishEditSiteName(teamId, group.siteRow.siteName);
                                      }
                                    }, 100);
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleFinishEditSiteName(teamId, group.siteRow.siteName);
                                    } else if (e.key === 'Escape') {
                                      setEditingSiteName(null);
                                      setEditingSiteValue('');
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleFinishEditSiteName(teamId, group.siteRow.siteName);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingSiteName(null);
                                      setEditingSiteValue('');
                                    }
                                  }}
                                  autoFocus
                                  size="small"
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      color: '#4caf50',
                                      fontWeight: 'bold',
                                      fontSize: '1.2rem',
                                      '& fieldset': { borderColor: '#4caf50' },
                                      '&:hover fieldset': { borderColor: '#4caf50' },
                                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                    }
                                  }}
                                />
                              ) : (
                                <>
                                  {collapsedSites.has(group.siteRow.siteName) ? '▶' : '▼'} 📍 {group.siteRow.siteName}
                                </>
                              )}
                            </TableCell>
                            <TableCell 
                              sx={{ 
                                color: '#4caf50', 
                                fontWeight: 'bold',
                                fontSize: '1.1rem'
                              }}
                            >
                              {(() => {
                                const total = group.itemRows.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
                                return total.toLocaleString() + '원';
                              })()}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  onClick={() => {
                                    if (editingSiteName === group.siteRow.siteName) {
                                      // 편집 중이면 편집 완료
                                      handleFinishEditSiteName(teamId, group.siteRow.siteName);
                                    } else if (!group.siteRow.id.startsWith('temp-')) {
                                      // 편집 중이 아니면 편집 시작
                                      handleStartEditSiteName(group.siteRow.siteName);
                                    }
                                  }}
                                  sx={{ 
                                    color: editingSiteName === group.siteRow.siteName ? '#ff9800' : '#4caf50',
                                    '&:hover': {
                                      backgroundColor: 'rgba(76, 175, 80, 0.1)'
                                    }
                                  }}
                                  title={editingSiteName === group.siteRow.siteName ? '편집 완료' : '편집'}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  onClick={() => {
                                    if (window.confirm(`"${group.siteRow.siteName}" 현장을 삭제하시겠습니까?`)) {
                                      console.log('🗑️ 현장 삭제 시작:', { 
                                        siteName: group.siteRow.siteName, 
                                        teamId, 
                                        allRows: allRows.length 
                                      });
                                      
                                      // 현장 헤더와 해당 현장의 모든 항목들을 삭제
                                      const updatedRows = allRows.filter(row => {
                                        const shouldDelete = row.siteName !== group.siteRow.siteName;
                                        if (!shouldDelete) {
                                          console.log('삭제할 행:', { 
                                            id: row.id, 
                                            siteName: row.siteName, 
                                            item: row.item,
                                            isSiteHeader: row.isSiteHeader,
                                            isItemRow: row.isItemRow
                                          });
                                        }
                                        return shouldDelete;
                                      });
                                      
                                      console.log('삭제 후 남은 행들:', updatedRows.length);
                                      
                                      const updatedData = {
                                        ...teamTableData,
                                        [teamId]: updatedRows
                                      };
                                      
                                      setTeamTableData(updatedData);
                                      
                                      // 삭제된 현장이 선택된 현장이면 선택 상태 초기화
                                      if (selectedSiteForRowAdd === group.siteRow.siteName) {
                                        setSelectedSiteForRowAdd('');
                                        console.log('삭제된 현장이 선택된 현장이므로 선택 상태 초기화');
                                      }
                                      
                                      // Firebase에 저장
                                      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
                                      updateDoc(teamSettlementRef, {
                                        tableData: updatedRows,
                                        updatedAt: serverTimestamp()
                                      }).then(() => {
                                        setSnackbar({ 
                                          open: true, 
                                          message: `"${group.siteRow.siteName}" 현장이 삭제되었습니다.`, 
                                          severity: 'success' 
                                        });
                                      }).catch((error) => {
                                        console.error('현장 삭제 오류:', error);
                                        setSnackbar({ 
                                          open: true, 
                                          message: '현장 삭제 중 오류가 발생했습니다.', 
                                          severity: 'error' 
                                        });
                                      });
                                    }
                                  }}
                                  sx={{ 
                                    color: '#f44336',
                                    '&:hover': {
                                      backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                    }
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                        
                        // 해당 현장의 항목들 (소분류) - 접혀있지 않은 경우만 표시
                        if (!collapsedSites.has(group.siteRow.siteName)) {
                          console.log('현장 항목들 렌더링:', { 
                            siteName: group.siteRow.siteName, 
                            itemCount: group.itemRows.length,
                            collapsed: collapsedSites.has(group.siteRow.siteName)
                          });
                          group.itemRows.forEach((itemRow, itemIndex) => {
                            console.log('항목 행 렌더링:', { 
                              rowId: itemRow.id, 
                              siteName: itemRow.siteName,
                              isNewRow: itemRow.id && itemRow.id.length > 10
                            });
                          result.push(
                            <TableRow 
                              key={`item-${itemRow.id}`} 
                              sx={{ 
                                '& .MuiTableCell-root': { py: 0.5 },
                                backgroundColor: itemRow.id && itemRow.id.length > 10 ? 'rgba(129, 199, 132, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                                borderLeft: itemRow.id && itemRow.id.length > 10 ? '3px solid rgba(129, 199, 132, 0.8)' : '3px solid rgba(76, 175, 80, 0.3)',
                                border: itemRow.id && itemRow.id.length > 10 ? '1px solid rgba(129, 199, 132, 0.4)' : 'none',
                                '&:hover': {
                                  backgroundColor: itemRow.id && itemRow.id.length > 10 ? 'rgba(129, 199, 132, 0.2)' : 'rgba(76, 175, 80, 0.05)'
                                }
                              }}
                            >
                              <TableCell>
                                {/* 항목 행에는 선택박스 없음 */}
                              </TableCell>
                              <TableCell sx={{ color: '#888', pl: 4, fontSize: '1.05rem' }}>
                                └ {itemRow.siteName}
                              </TableCell>
                              <TableCell sx={{ color: '#888', fontSize: '1.05rem' }}>
                                └
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={itemRow.item || ''}
                                  onChange={(e) => handleUpdateTableData(teamId, itemRow.id, 'item', e.target.value)}
                                  placeholder="항목 입력"
                                  sx={{
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                      color: '#fff',
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      fontSize: '1.05rem',
                                      '& fieldset': { borderColor: '#666' },
                                      '&:hover fieldset': { borderColor: '#888' },
                                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={itemRow.quantity !== undefined ? itemRow.quantity : ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const numValue = value === '' ? 0 : parseFloat(value);
                                    handleUpdateTableData(teamId, itemRow.id, 'quantity', isNaN(numValue) ? 0 : numValue);
                                  }}
                                  placeholder="예: 1.5"
                                  inputProps={{
                                    step: "0.01",
                                    min: 0
                                  }}
                                  sx={{
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                      color: '#fff',
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      fontSize: '1.05rem',
                                      '& fieldset': { borderColor: '#666' },
                                      '&:hover fieldset': { borderColor: '#888' },
                                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={itemRow.unitPrice ? formatNumber(itemRow.unitPrice) : ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/,/g, '');
                                    handleUpdateTableData(teamId, itemRow.id, 'unitPrice', parseFloat(value) || 0);
                                  }}
                                  placeholder="예: 50,000"
                                  sx={{
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                      color: '#fff',
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      fontSize: '1.05rem',
                                      '& fieldset': { borderColor: '#666' },
                                      '&:hover fieldset': { borderColor: '#888' },
                                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                {formatAmount(itemRow.totalPrice || 0)}
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={itemRow.note || ''}
                                  onChange={(e) => handleUpdateTableData(teamId, itemRow.id, 'note', e.target.value)}
                                  placeholder="비고 입력"
                                  sx={{
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                      color: '#fff',
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      fontSize: '1.05rem',
                                      '& fieldset': { borderColor: '#666' },
                                      '&:hover fieldset': { borderColor: '#888' },
                                      '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  onClick={() => handleDeleteTableRow(teamId, itemRow.id)}
                                  sx={{ 
                                    color: '#f44336',
                                    '&:hover': {
                                      backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                    }
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        });
                        } // collapsedSites 조건문 닫기
                      });
                      
                      // 독립적인 행들 렌더링 (새로 추가된 행들)
                      console.log('독립적인 행들 렌더링 시작:', independentRows.length);
                      independentRows.forEach((row) => {
                        const isNewRow = row.id && row.id.length > 10; // 새로 추가된 행인지 확인
                        console.log('독립적인 행 렌더링:', { rowId: row.id, isNewRow, siteName: row.siteName });
                        result.push(
                          <TableRow 
                            key={`independent-${row.id}`} 
                            sx={{ 
                              '& .MuiTableCell-root': { py: 0.5 },
                              backgroundColor: isNewRow ? 'rgba(129, 199, 132, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                              border: isNewRow ? '1px solid rgba(129, 199, 132, 0.3)' : 'none',
                              '&:hover': {
                                backgroundColor: isNewRow ? 'rgba(129, 199, 132, 0.15)' : 'rgba(76, 175, 80, 0.05)'
                              }
                            }}
                          >
                            <TableCell>
                              <Checkbox
                                checked={row.checked || false}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  handleUpdateTableData(teamId, row.id, 'checked', isChecked);
                                }}
                                sx={{
                                  color: '#4caf50',
                                  '&.Mui-checked': {
                                    color: '#4caf50',
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                key={`siteName-${row.id}-${row.siteName}`}
                                size="small"
                                value={row.siteName || ''}
                                onChange={(e) => handleSiteNameInput(teamId, row.id, e.target.value)}
                                placeholder="현장명 입력"
                                autoComplete="off"
                                sx={{
                                  width: '100%',
                                  '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    fontSize: '1.05rem',
                                    '& fieldset': { borderColor: '#666' },
                                    '&:hover fieldset': { borderColor: '#888' },
                                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {formatAmount(row.totalPrice || 0)}
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={row.item || ''}
                                onChange={(e) => handleUpdateTableData(teamId, row.id, 'item', e.target.value)}
                                placeholder="항목 입력"
                                sx={{
                                  width: '100%',
                                  '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    fontSize: '1.05rem',
                                    '& fieldset': { borderColor: '#666' },
                                    '&:hover fieldset': { borderColor: '#888' },
                                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={row.quantity !== undefined ? row.quantity : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // 빈 문자열이면 0, 아니면 숫자로 변환 (음수 포함)
                                  const numValue = value === '' ? 0 : parseFloat(value);
                                  handleUpdateTableData(teamId, row.id, 'quantity', isNaN(numValue) ? 0 : numValue);
                                }}
                                placeholder="예: 1.5 또는 -0.5"
                                inputProps={{
                                  step: "0.01",
                                  min: undefined // 음수 허용
                                }}
                                sx={{
                                  width: '100%',
                                  '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    fontSize: '1.05rem',
                                    '& fieldset': { borderColor: '#666' },
                                    '&:hover fieldset': { borderColor: '#888' },
                                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={row.unitPrice ? formatNumber(row.unitPrice) : ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/,/g, '');
                                  handleUpdateTableData(teamId, row.id, 'unitPrice', parseFloat(value) || 0);
                                }}
                                placeholder="예: 50,000"
                                sx={{
                                  width: '100%',
                                  '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    fontSize: '1.05rem',
                                    '& fieldset': { borderColor: '#666' },
                                    '&:hover fieldset': { borderColor: '#888' },
                                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {formatAmount(row.totalPrice || 0)}
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={row.note || ''}
                                onChange={(e) => handleUpdateTableData(teamId, row.id, 'note', e.target.value)}
                                placeholder="비고 입력"
                                sx={{
                                  width: '100%',
                                  '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    fontSize: '1.05rem',
                                    '& fieldset': { borderColor: '#666' },
                                    '&:hover fieldset': { borderColor: '#888' },
                                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => handleDeleteTableRow(teamId, row.id)}
                                sx={{ 
                                  color: '#f44336',
                                  '&:hover': {
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      });
                      
                      return result;
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* 총계 표시 */}
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant="h6" sx={{ color: '#fff', fontSize: '1.5rem' }}>
                  총 금액: <span style={{ color: '#4caf50', fontSize: '1.6rem', fontWeight: 'bold' }}>
                    {formatAmount((teamTableData[selectedTeamsForTabs[activeTab - 1]?.id] || []).reduce((sum, row) => sum + (row.totalPrice || 0), 0))}
                  </span>
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 정산 생성/편집 다이얼로그 */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#1a1d21', color: '#fff' }
        }}
      >
        <DialogTitle>
          {editingSettlement ? '정산 수정' : '새 정산 생성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#bbb' }}>시공팀</InputLabel>
                <Select
                  value={formData.teamId}
                  onChange={(e) => {
                    const selectedTeam = teams.find(t => t.id === e.target.value);
                    setFormData({
                      ...formData,
                      teamId: e.target.value,
                      teamName: selectedTeam?.teamName || ''
                    });
                  }}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' }
                  }}
                >
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.teamName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="정산 월"
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                InputLabelProps={{ style: { color: '#bbb' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="총 정산 금액"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  totalAmount: parseInt(e.target.value) || 0,
                  remainingAmount: (parseInt(e.target.value) || 0) - formData.paidAmount
                })}
                InputLabelProps={{ style: { color: '#bbb' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="지급 금액"
                type="number"
                value={formData.paidAmount}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  paidAmount: parseInt(e.target.value) || 0,
                  remainingAmount: formData.totalAmount - (parseInt(e.target.value) || 0)
                })}
                InputLabelProps={{ style: { color: '#bbb' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="미지급 금액"
                type="number"
                value={formData.remainingAmount}
                disabled
                InputLabelProps={{ style: { color: '#bbb' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#bbb' }}>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' }
                  }}
                >
                  <MenuItem value="pending">미지급</MenuItem>
                  <MenuItem value="partial">부분지급</MenuItem>
                  <MenuItem value="completed">완료</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비고"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                InputLabelProps={{ style: { color: '#bbb' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsDialogOpen(false)}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button
            onClick={handleSaveSettlement}
            variant="contained"
            sx={{
              bgcolor: '#4caf50',
              '&:hover': { bgcolor: '#45a049' }
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 물량 단가 입력 다이얼로그 */}
      <Dialog
        open={isQuantityPricingDialogOpen}
        onClose={() => setIsQuantityPricingDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#1a1d21', color: '#fff' }
        }}
      >
        <DialogTitle>
          물량 단가 입력 - {selectedTeamForPricing?.teamName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 3 }}>
              {selectedMonth} - 현장별 물량 및 단가 입력
            </Typography>
            
            {quantityPricingData.sites.map((site, siteIndex) => (
              <Card key={site.siteId} sx={{ bgcolor: '#2d2d2d', mb: 3, border: '1px solid #444' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#4caf50', mb: 2 }}>
                    {site.siteName}
                  </Typography>
                  
                  <TableContainer component={Paper} sx={{ bgcolor: '#3d3d3d' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>항목</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>수량</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>단가 (원)</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>금액 (원)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {site.quantities.map((quantity, quantityIndex) => (
                          <TableRow key={quantityIndex} sx={{ '& .MuiTableCell-root': { py: 0.5 } }}>
                            <TableCell sx={{ color: '#fff' }}>{quantity.itemName}</TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={quantity.quantity}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // 음수 포함하여 숫자로 변환
                                  const numValue = value === '' ? 0 : parseFloat(value);
                                  handleQuantityChange(siteIndex, quantityIndex, 'quantity', isNaN(numValue) ? 0 : numValue);
                                }}
                                inputProps={{
                                  step: "0.01",
                                  min: undefined // 음수 허용
                                }}
                                size="small"
                                sx={{
                                  width: 100,
                                  '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    '& fieldset': { borderColor: '#666' },
                                    '&:hover fieldset': { borderColor: '#888' },
                                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={quantity.unitPrice}
                                onChange={(e) => handleQuantityChange(siteIndex, quantityIndex, 'unitPrice', parseFloat(e.target.value) || 0)}
                                size="small"
                                sx={{
                                  width: 120,
                                  '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    '& fieldset': { borderColor: '#666' },
                                    '&:hover fieldset': { borderColor: '#888' },
                                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                              {formatAmount(quantity.totalPrice)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ mt: 2, textAlign: 'right' }}>
                    <Typography variant="h6" sx={{ color: '#fff' }}>
                      현장 총액: <span style={{ color: '#4caf50' }}>
                        {formatAmount(site.quantities.reduce((sum, q) => sum + q.totalPrice, 0))}
                      </span>
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
            
            <Box sx={{ mt: 3, p: 2, bgcolor: '#2d2d2d', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h5" sx={{ color: '#fff' }}>
                전체 총액: <span style={{ color: '#4caf50' }}>
                  {formatAmount(quantityPricingData.sites.reduce((sum, site) => 
                    sum + site.quantities.reduce((siteSum, q) => siteSum + q.totalPrice, 0), 0
                  ))}
                </span>
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsQuantityPricingDialogOpen(false)}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button
            onClick={handleSaveQuantityPricing}
            variant="contained"
            sx={{
              bgcolor: '#4caf50',
              '&:hover': { bgcolor: '#45a049' }
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 시공팀 선택 다이얼로그 */}
      <Dialog
        open={isTeamSelectDialogOpen}
        onClose={() => setIsTeamSelectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#1a1d21', color: '#fff' }
        }}
      >
        <DialogTitle>
          시공팀 선택
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: '#bbb', mb: 2 }}>
            탭에 추가할 시공팀을 선택하세요.
          </Typography>
          
          <Autocomplete
            fullWidth
            value={selectedTeamForTab ? teams.find(team => team.id === selectedTeamForTab) : null}
            onChange={(event, newValue) => {
              if (newValue) {
                setSelectedTeamForTab(newValue.id);
              } else {
                setSelectedTeamForTab('');
              }
            }}
            onInputChange={(event, newInputValue) => {
              // 입력값이 변경될 때마다 처리
              if (newInputValue && !teams.find(team => team.teamName === newInputValue)) {
                // 새로운 팀명이 입력된 경우
                setSelectedTeamForTab(newInputValue);
              }
            }}
            options={teams.filter(team => {
              // 이미 탭에 추가된 팀은 제외
              const isAlreadyInTabs = selectedTeamsForTabs.find(t => t.id === team.id);
              if (isAlreadyInTabs) return false;
              
              // 해당 월에 데이터가 있는 팀만 표시
              const teamSettlementRef = doc(db, 'teamSettlements', `${team.id}_${selectedMonth}`);
              // 비동기 체크는 복잡하므로 일단 모든 팀을 표시하되, 
              // 실제 탭 추가 시에는 데이터가 있는지 확인
              return true;
            })}
            getOptionLabel={(option) => option.teamName || option}
            filterOptions={(options, { inputValue }) => {
              const filtered = options.filter(option =>
                option.teamName.toLowerCase().includes(inputValue.toLowerCase())
              );
              return filtered;
            }}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="시공팀 검색/선택"
                placeholder="시공팀명을 검색하거나 새로 입력하세요"
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#666'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4caf50'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4caf50'
                  },
                  '& .MuiInputLabel-root': {
                    color: '#bbb'
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#4caf50'
                  }
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <GroupIcon sx={{ color: '#2196f3' }} />
                  <Box>
                    <Typography variant="body1" sx={{ color: '#fff' }}>
                      {option.teamName}
                    </Typography>
                    {option.description && (
                      <Typography variant="body2" sx={{ color: '#bbb' }}>
                        {option.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
            sx={{
              mb: 2,
              '& .MuiAutocomplete-popupIndicator': {
                color: '#fff'
              },
              '& .MuiAutocomplete-clearIndicator': {
                color: '#fff'
              },
              '& .MuiAutocomplete-paper': {
                bgcolor: '#2d2d2d',
                color: '#fff'
              },
              '& .MuiAutocomplete-listbox': {
                bgcolor: '#2d2d2d'
              },
              '& .MuiAutocomplete-option': {
                color: '#fff',
                '&:hover': {
                  bgcolor: '#3d3d3d'
                },
                '&.Mui-focused': {
                  bgcolor: '#4caf50'
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsTeamSelectDialogOpen(false);
              setSelectedTeamForTab('');
            }}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button
            onClick={async () => {
              if (selectedTeamForTab) {
                let teamToAdd;
                
                // 기존 팀인지 새 팀인지 확인
                const existingTeam = teams.find(team => team.id === selectedTeamForTab);
                
                if (existingTeam) {
                  // 기존 팀인 경우
                  teamToAdd = existingTeam;
                } else {
                  // 새 팀인 경우 - Firebase에 새 팀 생성
                  try {
                    const newTeamData = {
                      teamName: selectedTeamForTab,
                      description: '',
                      status: 'active',
                      createdAt: serverTimestamp(),
                      createdBy: 'system'
                    };
                    
                    const docRef = await addDoc(collection(db, 'constructionTeams'), newTeamData);
                    teamToAdd = {
                      id: docRef.id,
                      ...newTeamData
                    };
                    
                    setSnackbar({ 
                      open: true, 
                      message: `새 시공팀 "${selectedTeamForTab}"이 생성되었습니다.`, 
                      severity: 'success' 
                    });
                  } catch (error) {
                    console.error('새 팀 생성 오류:', error);
                    setSnackbar({ 
                      open: true, 
                      message: '새 팀 생성 중 오류가 발생했습니다.', 
                      severity: 'error' 
                    });
                    return;
                  }
                }
                
                handleAddTeamTab(teamToAdd);
                setSelectedTeamForTab('');
                setIsTeamSelectDialogOpen(false);
              }
            }}
            variant="contained"
            disabled={!selectedTeamForTab}
            sx={{
              bgcolor: '#4caf50',
              '&:hover': { bgcolor: '#45a049' },
              '&:disabled': { bgcolor: '#666' }
            }}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 현장 추가 다이얼로그 */}
      <Dialog
        open={isSiteAddDialogOpen}
        onClose={() => {
          setIsSiteAddDialogOpen(false);
          setSelectedSiteForAdd('');
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#1a1d21', color: '#fff' }
        }}
      >
        <DialogTitle>
          현장 추가
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: '#bbb', mb: 2 }}>
            {selectedTeamsForTabs[activeTab - 1]?.teamName} 팀에 현장을 추가하세요.
          </Typography>
          
          {getTeamSites(selectedTeamsForTabs[activeTab - 1]?.id).length === 0 && (
            <Typography variant="body2" sx={{ color: '#ff9800', mb: 2, fontStyle: 'italic' }}>
              💡 이 팀에는 아직 할당된 현장이 없습니다. 시공팀 관리 페이지에서 현장을 할당하거나, 아래에 직접 현장명을 입력하세요.
            </Typography>
          )}
          
          <Autocomplete
            fullWidth
            value={selectedSiteForAdd}
            onChange={async (event, newValue) => {
              setSelectedSiteForAdd(newValue || '');
              if (newValue) {
                const items = await getSiteItems(newValue);
                setSelectedSiteItems(items);
              } else {
                setSelectedSiteItems([]);
              }
            }}
            onInputChange={(event, newInputValue) => {
              setSelectedSiteForAdd(newInputValue);
            }}
            options={getTeamSites(selectedTeamsForTabs[activeTab - 1]?.id)}
            freeSolo
            filterOptions={(options, { inputValue }) => {
              const filtered = options.filter(option =>
                option.toLowerCase().includes(inputValue.toLowerCase())
              );
              return filtered;
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="현장 검색/선택"
                placeholder={getTeamSites(selectedTeamsForTabs[activeTab - 1]?.id).length === 0 
                  ? "현장명을 직접 입력하세요 (예: 부산곡유리 현장)" 
                  : "현장명을 검색하거나 새로 입력하세요"}
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#666'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4caf50'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4caf50'
                  },
                  '& .MuiInputLabel-root': {
                    color: '#bbb'
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#4caf50'
                  }
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Typography variant="body2" sx={{ color: '#fff' }}>
                  {option}
                </Typography>
              </Box>
            )}
            sx={{
              mb: 2,
              '& .MuiAutocomplete-popupIndicator': {
                color: '#fff'
              },
              '& .MuiAutocomplete-clearIndicator': {
                color: '#fff'
              },
              '& .MuiAutocomplete-paper': {
                bgcolor: '#2d2d2d',
                color: '#fff'
              },
              '& .MuiAutocomplete-listbox': {
                bgcolor: '#2d2d2d'
              },
              '& .MuiAutocomplete-option': {
                color: '#fff',
                '&:hover': {
                  bgcolor: '#3d3d3d'
                },
                '&.Mui-focused': {
                  bgcolor: '#4caf50'
                }
              }
            }}
          />

          {/* 선택된 현장의 항목들 표시 */}
          {selectedSiteForAdd && selectedSiteItems.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#4caf50', mb: 1, fontWeight: 'bold' }}>
                📋 {selectedSiteForAdd} 현장의 등록된 항목들:
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                maxHeight: 120,
                overflowY: 'auto',
                p: 1,
                bgcolor: '#2d2d2d',
                borderRadius: 1,
                border: '1px solid #444'
              }}>
                {selectedSiteItems.map((item, index) => (
                  <Chip
                    key={index}
                    label={item}
                    size="small"
                    sx={{
                      bgcolor: '#4caf50',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: '#45a049'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {selectedSiteForAdd && selectedSiteItems.length === 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#ff9800', fontStyle: 'italic' }}>
                ⚠️ {selectedSiteForAdd} 현장에는 등록된 항목이 없습니다.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsSiteAddDialogOpen(false);
              setSelectedSiteForAdd('');
              setSelectedSiteItems([]);
            }}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button
            onClick={() => {
              if (selectedSiteForAdd) {
                handleAddSite(selectedTeamsForTabs[activeTab - 1]?.id, selectedSiteForAdd);
                setIsSiteAddDialogOpen(false);
                setSelectedSiteForAdd('');
                setSelectedSiteItems([]);
                setSnackbar({ 
                  open: true, 
                  message: `"${selectedSiteForAdd}" 현장이 추가되었습니다.`, 
                  severity: 'success' 
                });
              }
            }}
            variant="contained"
            disabled={!selectedSiteForAdd}
            sx={{
              bgcolor: '#4caf50',
              '&:hover': { bgcolor: '#45a049' },
              '&:disabled': { bgcolor: '#666' }
            }}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 탭 삭제 확인 다이얼로그 */}
      <Dialog
        open={isTabDeleteDialogOpen}
        onClose={() => {
          setIsTabDeleteDialogOpen(false);
          setTabToDelete(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#1a1d21', color: '#fff' }
        }}
      >
        <DialogTitle>
          탭 삭제 확인
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: '#bbb', mb: 2 }}>
            "{tabToDelete?.teamName}" 탭을 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" sx={{ color: '#ff9800', fontStyle: 'italic' }}>
            ⚠️ 이 작업은 되돌릴 수 없으며, 해당 팀의 모든 정산 데이터가 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsTabDeleteDialogOpen(false);
              setTabToDelete(null);
            }}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button
            onClick={handleRemoveTeamTab}
            variant="contained"
            color="error"
            sx={{
              bgcolor: '#f44336',
              '&:hover': { bgcolor: '#d32f2f' }
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 데이터 마이그레이션 다이얼로그 */}
      <Dialog
        open={isMigrationDialogOpen}
        onClose={() => {
          setIsMigrationDialogOpen(false);
          setMigrationData({ sourceMonth: '', targetMonth: '', teamId: '' });
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#1a1d21', color: '#fff' }
        }}
      >
        <DialogTitle>
          데이터 복사
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: '#bbb', mb: 3 }}>
            한 월의 팀 데이터를 다른 월로 복사합니다.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#bbb' }}>팀 선택</InputLabel>
                <Select
                  value={migrationData.teamId}
                  onChange={(e) => setMigrationData({ ...migrationData, teamId: e.target.value })}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4caf50' }
                  }}
                >
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.teamName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="원본 월"
                type="month"
                value={migrationData.sourceMonth}
                onChange={(e) => setMigrationData({ ...migrationData, sourceMonth: e.target.value })}
                InputLabelProps={{ style: { color: '#bbb' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="대상 월"
                type="month"
                value={migrationData.targetMonth}
                onChange={(e) => setMigrationData({ ...migrationData, targetMonth: e.target.value })}
                InputLabelProps={{ style: { color: '#bbb' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                  }
                }}
              />
            </Grid>
          </Grid>
          
          <Typography variant="body2" sx={{ color: '#ff9800', mt: 2, fontStyle: 'italic' }}>
            ⚠️ 대상 월에 기존 데이터가 있다면 덮어씌워집니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsMigrationDialogOpen(false);
              setMigrationData({ sourceMonth: '', targetMonth: '', teamId: '' });
            }}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button
            onClick={handleDataMigration}
            variant="contained"
            sx={{
              bgcolor: '#ff9800',
              '&:hover': { bgcolor: '#f57c00' }
            }}
          >
            복사
          </Button>
        </DialogActions>
      </Dialog>


      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          top: '50px !important',
          '& .MuiSnackbar-root': {
            top: '50px !important'
          }
        }}
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
      </Container>
    </Box>
  );
};

export default TeamSettlement;
