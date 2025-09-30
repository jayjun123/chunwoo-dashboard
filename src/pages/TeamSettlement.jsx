import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Checkbox
} from '@mui/material';
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
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, writeBatch, serverTimestamp, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

  // 저장된 탭 설정 로드 (Firebase 실시간)
  useEffect(() => {
    const userSettingsRef = doc(db, 'userSettings', 'teamSettlementTabs');
    const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.selectedTeams && Array.isArray(data.selectedTeams)) {
          console.log('저장된 탭 설정 로드됨:', data.selectedTeams);
          setSelectedTeamsForTabs(data.selectedTeams);
        }
      }
    }, (error) => {
      console.error('탭 설정 로드 오류:', error);
    });

    return () => unsubscribe();
  }, []);

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
      
      // 정확히 일치하는 경우만 매칭 (부분 매칭 제거)
      const exactMatch1 = cleanSiteTeam === cleanTeamName || cleanSiteTeam === cleanManagerName;
      const exactMatch2 = cleanSiteManager === cleanTeamName || cleanSiteManager === cleanManagerName;
      
      // 부분 매칭은 완전히 제거하고 정확한 매칭만 사용
      const isMatch = exactMatch1 || exactMatch2;
      
      if (isMatch) {
        console.log('매칭된 현장:', {
          siteName: site.name,
          siteTeam: cleanSiteTeam,
          siteManager: cleanSiteManager,
          teamName: cleanTeamName,
          managerName: cleanManagerName,
          exactMatch1, exactMatch2
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
          isMatch
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
    console.log('현장 추가 시작:', { teamId, siteName });
    
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
    
    console.log('새 행 데이터:', newRow);
    
    const updatedData = {
      ...teamTableData,
      [teamId]: [...(teamTableData[teamId] || []), newRow]
    };
    
    console.log('업데이트된 데이터:', updatedData);
    setTeamTableData(updatedData);
    
    // Firebase에 저장
    try {
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      const docSnap = await getDocs(teamSettlementRef);
      
      if (docSnap.exists()) {
        // 문서가 존재하면 업데이트
        await updateDoc(teamSettlementRef, {
          tableData: updatedData[teamId],
          updatedAt: serverTimestamp()
        });
        console.log('Firebase 업데이트 완료');
      } else {
        // 문서가 없으면 새로 생성
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          tableData: updatedData[teamId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('Firebase 새 문서 생성 완료');
      }
      
      setSnackbar({ 
        open: true, 
        message: `"${siteName}" 현장이 추가되었습니다.`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('현장 추가 저장 오류:', error);
      setSnackbar({ open: true, message: '현장 추가 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // Firebase에서 팀별 테이블 데이터 로드
  const loadTeamTableData = async (teamId) => {
    try {
      console.log('테이블 데이터 로드 시작:', { teamId, selectedMonth });
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      const docSnap = await getDoc(teamSettlementRef);
      
      console.log('Firebase 문서 존재 여부:', docSnap.exists());
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('로드된 데이터:', data);
        setTeamTableData(prev => ({
          ...prev,
          [teamId]: data.tableData || []
        }));
        console.log('테이블 데이터 상태 업데이트 완료');
      } else {
        console.log('문서가 존재하지 않음, 빈 배열로 초기화');
        setTeamTableData(prev => ({
          ...prev,
          [teamId]: []
        }));
      }
    } catch (error) {
      console.error('테이블 데이터 로드 오류:', error);
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

  // 탭 변경 시 해당 팀의 테이블 데이터 로드
  useEffect(() => {
    if (activeTab > 0 && selectedTeamsForTabs[activeTab - 1]) {
      const teamId = selectedTeamsForTabs[activeTab - 1].id;
      loadTeamTableData(teamId);
      
      // 전체 선택 상태 초기화
      const currentRows = teamTableData[teamId] || [];
      const allChecked = currentRows.length > 0 && currentRows.every(row => row.checked);
      setIsAllSelected(allChecked);
    }
  }, [activeTab, selectedTeamsForTabs, selectedMonth]);

  // activeTab이 유효한 범위를 벗어나지 않도록 보정
  useEffect(() => {
    const maxTabIndex = selectedTeamsForTabs.length; // 0(전체) + selectedTeamsForTabs.length
    if (activeTab > maxTabIndex) {
      setActiveTab(0); // 유효하지 않은 탭 인덱스면 전체 탭으로 리셋
    }
  }, [activeTab, selectedTeamsForTabs.length]);

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
    if (!selectedTeamsForTabs.find(t => t.id === team.id)) {
      const newSelectedTeams = [...selectedTeamsForTabs, team];
      setSelectedTeamsForTabs(newSelectedTeams);
      
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
      
      // 새로 추가된 탭으로 이동
      setActiveTab(newSelectedTeams.length);
      setSelectedTeam(team.id);
      // 새 팀 탭에 대한 빈 테이블 데이터 초기화
      setTeamTableData(prev => ({
        ...prev,
        [team.id]: []
      }));
    }
    setIsTeamSelectDialogOpen(false);
  };

  // 테이블 행 추가 (Firebase 저장)
  const handleAddTableRow = async (teamId, insertAfterSiteName = null) => {
    const newRow = {
      id: Date.now().toString(),
      checked: false,
      siteName: insertAfterSiteName || '', // 선택된 현장명으로 설정
      item: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      note: '',
      isItemRow: true // 항목 행임을 표시하는 플래그
    };
    
    const currentRows = teamTableData[teamId] || [];
    let updatedRows;
    
    if (insertAfterSiteName) {
      // 특정 현장명 아래에 삽입 (현장명 행 다음에)
      const siteRowIndex = currentRows.findIndex(row => row.siteName === insertAfterSiteName && (!row.item || row.item === ''));
      if (siteRowIndex !== -1) {
        // 해당 현장명 행 다음에 삽입
        updatedRows = [
          ...currentRows.slice(0, siteRowIndex + 1),
          newRow,
          ...currentRows.slice(siteRowIndex + 1)
        ];
      } else {
        // 현장명을 찾을 수 없으면 맨 아래에 추가
        updatedRows = [...currentRows, newRow];
      }
    } else {
      // 기본적으로 맨 아래에 추가
      updatedRows = [...currentRows, newRow];
    }
    
    const updatedData = {
      ...teamTableData,
      [teamId]: updatedRows
    };
    
    setTeamTableData(updatedData);
    
    // Firebase에 저장
    try {
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      
      // 문서 존재 여부 확인
      const docSnap = await getDoc(teamSettlementRef);
      
      if (docSnap.exists()) {
        // 문서가 존재하면 업데이트
        await updateDoc(teamSettlementRef, {
          tableData: updatedData[teamId],
          updatedAt: serverTimestamp()
        });
      } else {
        // 문서가 존재하지 않으면 새로 생성
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          tableData: updatedData[teamId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // 행 추가 후 선택된 현장 초기화
      setSelectedSiteForRowAdd('');
      
      setSnackbar({ 
        open: true, 
        message: insertAfterSiteName ? `"${insertAfterSiteName}" 현장에 항목이 추가되었습니다.` : '새 항목이 추가되었습니다.', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('행 추가 저장 오류:', error);
      setSnackbar({ open: true, message: '행 추가 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 테이블 행 삭제 (Firebase 저장)
  const handleDeleteTableRow = async (teamId, rowId) => {
    const updatedData = {
      ...teamTableData,
      [teamId]: teamTableData[teamId]?.filter(row => row.id !== rowId) || []
    };
    
    setTeamTableData(updatedData);
    
    // Firebase에 저장
    try {
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      
      // 문서 존재 여부 확인
      const docSnap = await getDoc(teamSettlementRef);
      
      if (docSnap.exists()) {
        // 문서가 존재하면 업데이트
        await updateDoc(teamSettlementRef, {
          tableData: updatedData[teamId],
          updatedAt: serverTimestamp()
        });
      } else {
        // 문서가 존재하지 않으면 새로 생성
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          tableData: updatedData[teamId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('행 삭제 저장 오류:', error);
      setSnackbar({ open: true, message: '행 삭제 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 테이블 데이터 업데이트 (실시간 Firebase 저장)
  const handleUpdateTableData = async (teamId, rowId, field, value) => {
    const updatedData = {
      ...teamTableData,
      [teamId]: teamTableData[teamId]?.map(row => {
        if (row.id === rowId) {
          const updatedRow = { ...row, [field]: value };
          // 물량이나 단가가 변경되면 총액 자동 계산
          if (field === 'quantity' || field === 'unitPrice') {
            updatedRow.totalPrice = (updatedRow.quantity || 0) * (updatedRow.unitPrice || 0);
          }
          return updatedRow;
        }
        return row;
      }) || []
    };
    
    setTeamTableData(updatedData);
    
    // 체크박스 상태가 변경되면 전체 선택 상태 업데이트
    if (field === 'checked') {
      const allRows = updatedData[teamId] || [];
      const allChecked = allRows.length > 0 && allRows.every(row => row.checked);
      setIsAllSelected(allChecked);
    }
    
    // Firebase에 실시간 저장
    try {
      const teamSettlementRef = doc(db, 'teamSettlements', `${teamId}_${selectedMonth}`);
      
      // 문서 존재 여부 확인
      const docSnap = await getDoc(teamSettlementRef);
      
      if (docSnap.exists()) {
        // 문서가 존재하면 업데이트
        await updateDoc(teamSettlementRef, {
          tableData: updatedData[teamId],
          updatedAt: serverTimestamp()
        });
      } else {
        // 문서가 존재하지 않으면 새로 생성
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          tableData: updatedData[teamId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('테이블 데이터 저장 오류:', error);
      setSnackbar({ open: true, message: '데이터 저장 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 전체 선택/해제
  const handleSelectAll = async (teamId) => {
    const currentRows = teamTableData[teamId] || [];
    const newSelectState = !isAllSelected;
    
    const updatedData = {
      ...teamTableData,
      [teamId]: currentRows.map(row => ({
        ...row,
        checked: newSelectState
      }))
    };
    
    setTeamTableData(updatedData);
    setIsAllSelected(newSelectState);
    
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
          tableData: updatedData[teamId],
          updatedAt: serverTimestamp()
        });
      } else {
        // 문서가 존재하지 않으면 새로 생성
        await setDoc(teamSettlementRef, {
          teamId: teamId,
          month: selectedMonth,
          tableData: updatedData[teamId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
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
  const handlePreviousMonth = () => {
    const currentDate = new Date(selectedMonth + '-01');
    currentDate.setMonth(currentDate.getMonth() - 1);
    const newMonth = currentDate.toISOString().slice(0, 7);
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const currentDate = new Date(selectedMonth + '-01');
    currentDate.setMonth(currentDate.getMonth() + 1);
    const newMonth = currentDate.toISOString().slice(0, 7);
    setSelectedMonth(newMonth);
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

  return (
    <Box sx={{ p: 3, pt: 11, bgcolor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        {/* 제목과 설명 */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => navigate('/daema-team')}
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
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h4" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 2 }}>
                <MoneyIcon sx={{ color: '#4caf50' }} />
                시공팀 월별 정산 관리
              </Typography>
            </Box>

            {/* 중앙: 월 네비게이션 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={handlePreviousMonth}
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
                <ChevronLeftIcon />
              </IconButton>
              
              <Typography variant="h5" sx={{ 
                color: '#fff', 
                fontWeight: 'bold',
                minWidth: '120px',
                textAlign: 'center',
                px: 2,
                py: 1,
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                borderRadius: 2,
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                {formatMonthDisplay(selectedMonth)}
              </Typography>
              
              <IconButton
                onClick={handleNextMonth}
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
                <ChevronRightIcon />
              </IconButton>
            </Box>
            
            {/* 오른쪽: 통계 카드들 */}
            <Box sx={{ display: 'flex', gap: 1, minWidth: 'fit-content' }}>
              <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333', minWidth: 220, height: 70 }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <GroupIcon sx={{ color: '#2196f3', fontSize: 28 }} />
                    <Typography variant="body1" sx={{ color: '#bbb', fontSize: '1.2rem', fontWeight: 'medium' }}>
                      시공팀
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '2rem' }}>
                    {teams.length}개
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333', minWidth: 220, height: 70 }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <MoneyIcon sx={{ color: '#4caf50', fontSize: 28 }} />
                    <Typography variant="body1" sx={{ color: '#bbb', fontSize: '1.2rem', fontWeight: 'medium' }}>
                      정산금액
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '2rem' }}>
                    {formatAmount(filteredSettlements.reduce((sum, s) => sum + (s.totalAmount || 0), 0))}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333', minWidth: 220, height: 70 }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckIcon sx={{ color: '#00ff88', fontSize: 28 }} />
                    <Typography variant="body1" sx={{ color: '#bbb', fontSize: '1.2rem', fontWeight: 'medium' }}>
                      정산건수
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '2rem' }}>
                    {filteredSettlements.length}건
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
          <Typography variant="body1" sx={{ color: '#bbb', ml: 7 }}>
            시공팀별 월별 정산 현황을 관리하고 지급 내역을 추적합니다.
          </Typography>
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
                       onClose={() => handleRemoveTeamTab(team.id)}
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
                 variant="outlined"
                 startIcon={<DownloadIcon />}
                 sx={{
                   borderColor: '#4caf50',
                   color: '#4caf50',
                   '&:hover': { borderColor: '#45a049', bgcolor: 'rgba(76, 175, 80, 0.1)' }
                 }}
               >
                 엑셀 다운로드
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
            )}
          </Box>
          
          {activeTab === 0 ? (
            // 전체 탭 - 기존 정산 현황 테이블
            <TableContainer component={Paper} sx={{ bgcolor: '#2d2d2d' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>시공팀명</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>정산 금액</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>지급 금액</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>미지급 금액</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>상태</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>비고</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSettlements.map((settlement) => (
                      <TableRow key={settlement.id} hover>
                        <TableCell sx={{ color: '#fff' }}>{settlement.teamName}</TableCell>
                        <TableCell sx={{ color: '#fff' }}>{formatAmount(settlement.totalAmount)}</TableCell>
                        <TableCell sx={{ color: '#fff' }}>{formatAmount(settlement.paidAmount)}</TableCell>
                        <TableCell sx={{ color: '#fff' }}>{formatAmount(settlement.remainingAmount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(settlement.status)}
                            color={getStatusColor(settlement.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#fff' }}>{settlement.notes || '-'}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEditSettlement(settlement)}
                            sx={{ color: '#4caf50' }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSettlement(settlement.id)}
                            sx={{ color: '#f44336' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            // 시공팀 탭 - 입력 가능한 테이블
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  {selectedTeamsForTabs[activeTab - 1]?.teamName} 정산 입력
                </Typography>
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
                      handleAddTableRow(selectedTeamsForTabs[activeTab - 1]?.id, selectedSiteForRowAdd);
                    }}
                    sx={{
                      bgcolor: '#4caf50',
                      '&:hover': { bgcolor: '#45a049' }
                    }}
                  >
                    {selectedSiteForRowAdd ? `${selectedSiteForRowAdd}에 행 추가` : '행 추가'}
                  </Button>
                </Box>
              </Box>
              
              <TableContainer component={Paper} sx={{ bgcolor: '#2d2d2d' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          color: '#fff', 
                          fontWeight: 'bold', 
                          width: '80px',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(76, 175, 80, 0.1)'
                          }
                        }}
                        onClick={() => handleSelectAll(selectedTeamsForTabs[activeTab - 1]?.id)}
                      >
                        선택
                      </TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '240px' }}>현장명</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '120px' }}>소계</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '90px' }}>항목</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '100px' }}>물량</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '100px' }}>단가</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '170px' }}>금액</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '120px' }}>비고</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '80px' }}>액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(teamTableData[selectedTeamsForTabs[activeTab - 1]?.id] || []).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {row.isSiteHeader && (
                            <Checkbox
                              checked={row.checked || false}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                handleUpdateTableData(selectedTeamsForTabs[activeTab - 1]?.id, row.id, 'checked', isChecked);
                                
                                // 현장명이 있는 행이고 체크된 경우 선택된 현장으로 설정
                                if (row.siteName && isChecked) {
                                  setSelectedSiteForRowAdd(row.siteName);
                                } else if (!isChecked && selectedSiteForRowAdd === row.siteName) {
                                  setSelectedSiteForRowAdd('');
                                }
                              }}
                              sx={{
                                color: '#4caf50',
                                '&.Mui-checked': {
                                  color: '#4caf50',
                                },
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            color: '#fff',
                            cursor: row.isSiteHeader ? 'pointer' : 'default',
                            '&:hover': row.isSiteHeader ? {
                              backgroundColor: 'rgba(76, 175, 80, 0.1)'
                            } : {}
                          }}
                          onClick={() => {
                            if (row.isSiteHeader) {
                              const isChecked = !row.checked;
                              handleUpdateTableData(selectedTeamsForTabs[activeTab - 1]?.id, row.id, 'checked', isChecked);
                              
                              // 현장명이 있는 행이고 체크된 경우 선택된 현장으로 설정
                              if (isChecked) {
                                setSelectedSiteForRowAdd(row.siteName);
                              } else if (selectedSiteForRowAdd === row.siteName) {
                                setSelectedSiteForRowAdd('');
                              }
                            }
                          }}
                        >
                          {row.isSiteHeader ? (
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {row.siteName}
                            </Typography>
                          ) : row.siteName && row.item && row.item !== '' ? (
                            <Typography variant="body2" sx={{ color: '#bbb', fontStyle: 'italic' }}>
                              └ {row.siteName}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ color: '#fff' }}>
                          {row.isSiteHeader && (
                            <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                              {(() => {
                                const teamId = selectedTeamsForTabs[activeTab - 1]?.id;
                                const allRows = teamTableData[teamId] || [];
                                const siteRows = allRows.filter(r => r.siteName === row.siteName && r.item && r.item !== '');
                                const total = siteRows.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
                                return total.toLocaleString() + '원';
                              })()}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {!row.isSiteHeader && (
                            <TextField
                              size="small"
                              value={row.item}
                              onChange={(e) => handleUpdateTableData(selectedTeamsForTabs[activeTab - 1]?.id, row.id, 'item', e.target.value)}
                              placeholder="항목 입력"
                              sx={{
                                width: '100%',
                                '& .MuiOutlinedInput-root': {
                                  color: '#fff',
                                  '& fieldset': { borderColor: '#666' },
                                  '&:hover fieldset': { borderColor: '#888' },
                                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!row.isSiteHeader && (
                            <TextField
                              size="small"
                              type="number"
                              value={row.quantity}
                              onChange={(e) => handleUpdateTableData(selectedTeamsForTabs[activeTab - 1]?.id, row.id, 'quantity', parseFloat(e.target.value) || 0)}
                              sx={{
                                width: '100%',
                                '& .MuiOutlinedInput-root': {
                                  color: '#fff',
                                  '& fieldset': { borderColor: '#666' },
                                  '&:hover fieldset': { borderColor: '#888' },
                                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!row.isSiteHeader && (
                            <TextField
                              size="small"
                              type="number"
                              value={row.unitPrice}
                              onChange={(e) => handleUpdateTableData(selectedTeamsForTabs[activeTab - 1]?.id, row.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              sx={{
                                width: '100%',
                                '& .MuiOutlinedInput-root': {
                                  color: '#fff',
                                  '& fieldset': { borderColor: '#666' },
                                  '&:hover fieldset': { borderColor: '#888' },
                                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                          {!row.isSiteHeader && formatAmount(row.totalPrice)}
                        </TableCell>
                        <TableCell>
                          {!row.isSiteHeader && (
                            <TextField
                              size="small"
                              value={row.note}
                              onChange={(e) => handleUpdateTableData(selectedTeamsForTabs[activeTab - 1]?.id, row.id, 'note', e.target.value)}
                              placeholder="비고 입력"
                              sx={{
                                width: '100%',
                                '& .MuiOutlinedInput-root': {
                                  color: '#fff',
                                  '& fieldset': { borderColor: '#666' },
                                  '&:hover fieldset': { borderColor: '#888' },
                                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!row.isSiteHeader && (
                            <IconButton
                              onClick={() => handleDeleteTableRow(selectedTeamsForTabs[activeTab - 1]?.id, row.id)}
                              sx={{ color: '#f44336' }}
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
              
              {/* 총계 표시 */}
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  총 금액: <span style={{ color: '#4caf50' }}>
                    {formatAmount((teamTableData[selectedTeamsForTabs[activeTab - 1]?.id] || []).reduce((sum, row) => sum + row.totalPrice, 0))}
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
                          <TableRow key={quantityIndex}>
                            <TableCell sx={{ color: '#fff' }}>{quantity.itemName}</TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={quantity.quantity}
                                onChange={(e) => handleQuantityChange(siteIndex, quantityIndex, 'quantity', parseFloat(e.target.value) || 0)}
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
            options={teams.filter(team => !selectedTeamsForTabs.find(t => t.id === team.id))}
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

export default TeamSettlement;
