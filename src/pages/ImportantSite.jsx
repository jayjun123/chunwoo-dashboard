import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Grid, 
  InputAdornment, 
  IconButton, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Container,
  Autocomplete
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import Image from '../components/common/Image';
import PermissionGuard from '../components/common/PermissionGuard';
import { hasMenuAccess } from '../utils/menuPermissions';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CommentIcon from '@mui/icons-material/Comment';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AddCommentIcon from '@mui/icons-material/AddComment';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { devLog, devError } from '../utils/performanceUtils';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import LinearProgress from '@mui/material/LinearProgress';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { formatContractAmount, formatGisungAmount, formatBalanceAmount } from '../utils/formatUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ImportantSite() {
  const isMobile = useMediaQuery('(max-width:600px)');
  const { currentUser } = useAuth();
  
  // 권한 체크
  const hasAccess = hasMenuAccess(currentUser, 'importantSite');
  
  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            접근 권한이 없습니다
          </Typography>
          <Typography variant="body2">
            주요현장 페이지에 접근하려면 관리자로부터 권한을 부여받아야 합니다.
          </Typography>
        </Alert>
      </Box>
    );
  }
  
  const [sites, setSites] = useState([]);
  const [progressData, setProgressData] = useState({}); // { siteId: [progressItems] }
  const [gisungData, setGisungData] = useState({}); // { siteId: [gisungItems] }
  const [search, setSearch] = useState('');
  const [remarks, setRemarks] = useState({}); // { siteId: remark }
  const [editingProgress, setEditingProgress] = useState({}); // { siteId: true/false }
  const [progressInput, setProgressInput] = useState({}); // { siteId: 값 }
  const [comments, setComments] = useState({}); // { siteId: [comments] }
  const [commentDialog, setCommentDialog] = useState({ open: false, siteId: null });
  const [newComment, setNewComment] = useState('');
  const [newCommentInputs, setNewCommentInputs] = useState({}); // { siteId: inputValue }
  const [editingComment, setEditingComment] = useState({ id: null, content: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const fileInputRefs = useRef({});
  const [uploadingSiteId, setUploadingSiteId] = useState(null);
  const [hoveredSiteId, setHoveredSiteId] = useState(null);
  const [draggedSiteId, setDraggedSiteId] = useState(null);
  const [siteOrder, setSiteOrder] = useState([]);
  const [settlementToggles, setSettlementToggles] = useState({}); // { siteId: boolean }
  const [settlementDialog, setSettlementDialog] = useState({ open: false, siteId: null, siteName: '' });
  const [settlementPages, setSettlementPages] = useState({}); // { siteId: boolean } - 정산 페이지 존재 여부
  const [selectedSiteId, setSelectedSiteId] = useState(null); // 선택된 현장 ID
  const [siteGroups, setSiteGroups] = useState([]);
  const [allSitesForGroups, setAllSitesForGroups] = useState([]);
  const [allImportantSites, setAllImportantSites] = useState([]); // 검색/전체보기용 전체 주요현장
  const [showAllSites, setShowAllSites] = useState(false); // 전체 보기 모드
  const [groupDialog, setGroupDialog] = useState({ open: false, mode: 'create', groupId: null });
  const [groupForm, setGroupForm] = useState({ title: '', description: '', items: [] });
  const [groupSiteId, setGroupSiteId] = useState('');
  const [groupCustomItem, setGroupCustomItem] = useState({ name: '', note: '' });
  const navigate = useNavigate();

  const scrollFocus = (ref) => () => {
    setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  // 정산 토글 처리
  const handleSettlementToggle = async (siteId, checked) => {
    if (checked) {
      // ON으로 변경 시 - 페이지 생성 확인 다이얼로그 표시
      const site = sites.find(s => s.id === siteId);
      setSettlementDialog({
        open: true,
        siteId: siteId,
        siteName: site?.name || '알 수 없는 현장'
      });
    } else {
      // OFF로 변경 시 - 정산 페이지가 있으면 토글로 오프 불가능
      if (settlementPages[siteId]) {
        setSnackbar({
          open: true,
          message: '정산 페이지가 있는 경우 토글로 비활성화할 수 없습니다. 정산 페이지에서 삭제하세요.',
          severity: 'warning'
        });
        return;
      }
      
      // 정산 페이지가 없는 경우에만 OFF 가능
      try {
        const siteRef = doc(db, 'sites', siteId);
        await updateDoc(siteRef, { 
          settlementEnabled: false,
          settlementUpdatedAt: serverTimestamp()
        });
        
        setSettlementToggles(prev => ({
          ...prev,
          [siteId]: false
        }));
        
        setSettlementPages(prev => ({
          ...prev,
          [siteId]: false
        }));
        
        setSnackbar({
          open: true,
          message: '정산이 비활성화되었습니다.',
          severity: 'success'
        });
      } catch (error) {
        console.error('정산 토글 오류:', error);
        setSnackbar({
          open: true,
          message: '정산 설정 변경에 실패했습니다.',
          severity: 'error'
        });
      }
    }
  };

  // 정산 페이지 생성 확인
  const handleCreateSettlementPage = async () => {
    const { siteId, siteName } = settlementDialog;
    try {
      const siteRef = doc(db, 'sites', siteId);
      await updateDoc(siteRef, { 
        settlementEnabled: true,
        settlementPageCreated: true,
        settlementUpdatedAt: serverTimestamp()
      });
      
      // settlements 컬렉션에도 데이터 추가
      const settlementData = {
        siteId: siteId,
        siteName: siteName,
        settlementPageCreated: true,
        settlementStatus: 'ON',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'settlements'), settlementData);
      
      setSettlementToggles(prev => ({
        ...prev,
        [siteId]: true
      }));
      
      setSettlementPages(prev => ({
        ...prev,
        [siteId]: true
      }));
      
      setSettlementDialog({ open: false, siteId: null, siteName: '' });
      
      setSnackbar({
        open: true,
        message: `${siteName}의 정산 페이지가 생성되었습니다.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('정산 페이지 생성 오류:', error);
      setSnackbar({
        open: true,
        message: '정산 페이지 생성에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 정산 페이지로 이동
  const handleGoToSettlement = (siteId) => {
    navigate(`/settlement/${siteId}`);
  };

  // 정렬된 사이트 목록 생성
  const sortedSites = useMemo(() => {
    if (siteOrder.length === 0) return sites;
    
    const siteMap = new Map(sites.map(site => [site.id, site]));
    const sorted = [];
    
    // siteOrder에 따라 정렬
    siteOrder.forEach(siteId => {
      const site = siteMap.get(siteId);
      if (site) {
        sorted.push(site);
        siteMap.delete(siteId);
      }
    });
    
    // 남은 사이트들을 뒤에 추가
    siteMap.forEach(site => sorted.push(site));
    
    return sorted;
  }, [sites, siteOrder]);

  useEffect(() => {
    // 모든 현장을 가져온 후 클라이언트에서 필터링 (디버깅용)
    const q = query(collection(db, 'sites'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('🔍 ImportantSite - 전체 현장 데이터:', allSitesData);
      console.log('🔍 ImportantSite - 전체 현장 개수:', allSitesData.length);
      
      // 각 현장의 isFavorite 상태 상세 출력
      allSitesData.forEach((site, index) => {
        console.log(`🔍 현장 ${index + 1}: ${site.name}`);
        console.log(`   - isFavorite: ${site.isFavorite} (타입: ${typeof site.isFavorite})`);
        console.log(`   - isStarred: ${site.isStarred} (타입: ${typeof site.isStarred})`);
      });
      
      // 무효한 날짜 형식은 제외하되, 공기 종료 현장은 데이터에서 제거하지 않고 숨김 처리 플래그만 부여
      const validSitesData = allSitesData
        .map((site) => {
          let isExpired = false;

          if (site.endDate) {
            const endDateStr = String(site.endDate);

            // 무효한 날짜 형식 체크 (0000.00.00, 0000/00/00, 0000-00-00, 0000.0.00 등)
            if (endDateStr.match(/^0{4}[.\/-]0{1,2}[.\/-]0{1,2}$/) ||
                endDateStr === '0000.00.00' ||
                endDateStr === '0000/00/00' ||
                endDateStr === '0000-00-00' ||
                endDateStr === '0000.0.00') {
              console.log(`🔍 주요현장 - ${site.name}: 무효한 날짜 형식 (${site.endDate}) -> 제외`);
              return null;
            }

            // 공기 종료 여부 판단 (종료되면 숨김 대상)
            try {
              const today = new Date();
              const endDate = new Date(endDateStr.replace(/[.\/-]/g, '-'));
              if (!Number.isNaN(endDate.getTime()) && endDate < today) {
                isExpired = true;
              }
            } catch (error) {
              console.log(`🔍 주요현장 - ${site.name}: 날짜 파싱 오류 (${site.endDate}) -> 포함`);
            }
          }

          return {
            ...site,
            _isExpired: isExpired
          };
        })
        .filter(Boolean);

      const activeSitesData = validSitesData.filter(site => !site._isExpired);
      
      // isFavorite 또는 isStarred가 true인 현장 필터링 (더 관대한 조건)
      const importantSitesData = validSitesData.filter(site => {
        const isFav = site.isFavorite === true || site.isStarred === true;
        
        console.log(`🔍 필터링 체크 - ${site.name}: isFavorite=${site.isFavorite}, isStarred=${site.isStarred} -> ${isFav ? '포함' : '제외'}`);
        
        // isFavorite 또는 isStarred가 true인 경우 포함
        return isFav;
      });
      console.log('🔍 ImportantSite - 주요현장 필터링 결과:', importantSitesData);
      console.log('🔍 ImportantSite - 주요현장 개수:', importantSitesData.length);
      
      // 검색/전체보기용: 모든 주요현장(완료·공기지난 포함) 저장
      setAllImportantSites(importantSitesData);
      
      // 주요현장이 없으면 공사기간이 진행중인 최근 현장 5개를 표시
      let finalSitesData = importantSitesData;
      if (importantSitesData.length === 0) {
        console.log('🔍 ImportantSite - 주요현장이 없어서 공사기간이 진행중인 최근 현장 5개를 표시합니다.');
        finalSitesData = activeSitesData.slice(0, 5);
      } else {
        // 최대 10개까지만 표시 (진행중 우선, 공기 종료 현장은 뒤로)
        const activeImportant = importantSitesData.filter(site => !site._isExpired);
        const expiredImportant = importantSitesData.filter(site => site._isExpired);
        finalSitesData = [...activeImportant, ...expiredImportant].slice(0, 10);
      }
      
      console.log('🔍 ImportantSite - 최종 표시할 현장:', finalSitesData);
      console.log('🔍 ImportantSite - 표시될 현장 이름들:', finalSitesData.map(site => site.name));
      
      setSites(finalSitesData);
      
      // 정산 토글 상태 초기화 (표시되는 현장 기준)
      const toggles = {};
      const pages = {};
      finalSitesData.forEach(site => {
        toggles[site.id] = site.settlementEnabled || false;
        pages[site.id] = site.settlementPageCreated || false;
      });
      
      // 금사동 현장의 정산을 자동으로 ON 설정 (전체 현장에서 검사 - 목록에 없어도 정산 페이지 진입 가능하도록)
      const geumsaSites = validSitesData.filter(site => 
        site.name && site.name.includes('금사동')
      );
      for (const site of geumsaSites) {
        if (!site.settlementEnabled || !site.settlementPageCreated) {
          try {
            updateDoc(doc(db, 'sites', site.id), {
              settlementEnabled: true,
              settlementPageCreated: true,
              settlementUpdatedAt: serverTimestamp()
            });
            toggles[site.id] = true;
            pages[site.id] = true;
          } catch (error) {
            console.error(`금사동 현장 "${site.name}" 정산 설정 오류:`, error);
          }
        }
      }
      
      setSettlementToggles(toggles);
      setSettlementPages(pages);
      
      // 사이트 순서 초기화 - 사이트 데이터가 로드된 후에 실행
      setTimeout(() => {
        const savedOrder = localStorage.getItem('importantSiteOrder');
    
        if (savedOrder) {
          const orderArray = JSON.parse(savedOrder);
          // 현재 사이트 목록에 있는 ID만 필터링
          const validOrder = orderArray.filter(id => 
            finalSitesData.some(site => site.id === id)
          );
          console.log('저장된 순서 로드:', validOrder);
          setSiteOrder(validOrder);
        } else {
          // 저장된 순서가 없으면 현재 순서로 초기화
          const initialOrder = finalSitesData.map(site => site.id);
          console.log('초기 순서 설정:', initialOrder);
          setSiteOrder(initialOrder);
        }
      }, 100);
    }, (error) => {
      devError("Error fetching sites in real-time:", error);
      console.error('❌ ImportantSite - 데이터 로드 실패:', error);
      setSites([]);
    });
    
    return () => unsubscribe();
  }, []);

  // 전체 기성 데이터 디버깅용 (개발 환경에서만 실행)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const debugGisungData = async () => {
      try {
        devLog('=== 전체 기성 데이터 디버깅 ===');
        const gisungSnapshot = await getDocs(collection(db, 'gisung'));
        const allGisung = gisungSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        devLog('DB의 모든 기성 데이터:', allGisung);
        devLog('기성 데이터 개수:', allGisung.length);
        
        // 각 기성 데이터의 모든 필드 출력
        allGisung.forEach((item, index) => {
          devLog(`기성 데이터 ${index + 1}:`, {
            id: item.id,
            siteId: item.siteId,
            siteName: item.siteName,
            name: item.name,
            gisungAmount: item.gisungAmount,
            currentGisung: item.currentGisung,
            gisungDate: item.gisungDate,
            gisungMonth: item.gisungMonth,
            모든필드: item
          });
        });
        
        // siteId별로 그룹화
        const groupedBySiteId = {};
        allGisung.forEach(item => {
          if (!groupedBySiteId[item.siteId]) {
            groupedBySiteId[item.siteId] = [];
          }
          groupedBySiteId[item.siteId].push(item);
        });
        devLog('siteId별 그룹화된 기성 데이터:', groupedBySiteId);
        
        // 각 siteId별 합계
        Object.keys(groupedBySiteId).forEach(siteId => {
          const total = groupedBySiteId[siteId].reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0);
          devLog(`SiteId ${siteId}의 누계기성: ${total.toLocaleString()}원`);
        });
      } catch (error) {
        devError('기성 데이터 디버깅 중 오류:', error);
      }
    };
    
    debugGisungData();
  }, []);

  // 기성금 데이터 실시간 구독
  useEffect(() => {
    if (sites.length === 0) return;

    devLog('=== 기성 데이터 구독 시작 ===');
    devLog('현재 sites:', sites.map(s => ({ id: s.id, name: s.name })));

    const unsubscribes = [];

    const mergeGisungForSite = (siteId, newItems) => {
      setGisungData(prev => {
        const existing = prev[siteId] || [];
        const byId = new Map(existing.map(g => [g.id, g]));
        newItems.forEach(g => byId.set(g.id, g));
        return { ...prev, [siteId]: Array.from(byId.values()) };
      });
    };

    sites.forEach(site => {
      const siteId = site.id;
      const siteName = (site.name || '').trim();
      try {
        const gisungBySiteIdQuery = query(
          collection(db, 'gisung'),
          where('siteId', '==', siteId)
        );
        const unsub1 = onSnapshot(gisungBySiteIdQuery, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          mergeGisungForSite(siteId, items);
        }, (error) => {
          devError(`Error fetching gisung by siteId ${siteId}:`, error);
          mergeGisungForSite(siteId, []);
        });
        unsubscribes.push(unsub1);

        if (siteName) {
          const gisungBySiteNameQuery = query(
            collection(db, 'gisung'),
            where('siteName', '==', siteName)
          );
          const unsub2 = onSnapshot(gisungBySiteNameQuery, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            mergeGisungForSite(siteId, items);
          }, () => {});
          unsubscribes.push(unsub2);

          const gisungByNameQuery = query(
            collection(db, 'gisung'),
            where('name', '==', siteName)
          );
          const unsub3 = onSnapshot(gisungByNameQuery, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            mergeGisungForSite(siteId, items);
          }, () => {});
          unsubscribes.push(unsub3);
        }
      } catch (error) {
        devError(`Error setting up gisung listener for site ${siteId}:`, error);
      }
    });

    return () => {
      unsubscribes.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          devError("Error cleaning up gisung listener:", error);
        }
      });
    };
  }, [sites.length]); // sites.length만 의존성으로 사용


  // 기존 progress 데이터 구독 (유지)
  useEffect(() => {
    if (sites.length === 0) return;

    const siteIds = sites.map(site => site.id);
    const unsubscribes = [];
    
    siteIds.forEach((siteId, index) => {
      try {
        const progressQuery = query(
          collection(db, 'progress'), 
          where('siteId', '==', siteId), 
          orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(progressQuery, (snapshot) => {
          const progressItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setProgressData(prev => ({
            ...prev,
            [siteId]: progressItems
          }));
        }, (error) => {
          devError(`Error fetching progress for site ${siteId}:`, error);
          setProgressData(prev => ({
            ...prev,
            [siteId]: []
          }));
        });
        
        unsubscribes.push(unsubscribe);
      } catch (error) {
        devError(`Error setting up progress listener for site ${siteId}:`, error);
      }
    });

    return () => {
      unsubscribes.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          devError("Error cleaning up progress listener:", error);
        }
      });
    };
  }, [sites.length]); // sites.length만 의존성으로 사용

  // 댓글 가져오기
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const commentsSnapshot = await getDocs(collection(db, 'siteComments'));
        const commentsData = {};
        commentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (!commentsData[data.siteId]) {
            commentsData[data.siteId] = [];
          }
          commentsData[data.siteId].push({ id: doc.id, ...data });
        });
        setComments(commentsData);
      } catch (error) {
        devError('댓글 로딩 실패:', error);
      }
    };
    fetchComments();
  }, []);

  useEffect(() => {
    const loadAllSitesForGroups = async () => {
      try {
        const sitesQuery = query(collection(db, 'sites'), orderBy('name', 'asc'));
        const sitesSnapshot = await getDocs(sitesQuery);
        const allSitesData = sitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllSitesForGroups(allSitesData);
      } catch (error) {
        devError('그룹용 전체 현장 로드 실패:', error);
      }
    };
    loadAllSitesForGroups();
  }, []);

  useEffect(() => {
    const groupsQuery = query(collection(db, 'site_groups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSiteGroups(groupsData);
    }, (error) => {
      devError('주요현장 그룹 로드 실패:', error);
    });
    return () => unsubscribe();
  }, []);

  const getSiteNameById = (siteId) => {
    const site = allSitesForGroups.find(s => s.id === siteId) || sites.find(s => s.id === siteId);
    return site?.name || '알 수 없는 현장';
  };

  // 현장 진행상황 라벨: 예정현장 / 진행중 현장 / 완료 현장
  const getSiteStatusLabel = (site) => {
    if (!site) return '완료 현장';
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let startDate = null;
    let endDate = null;
    if (site.startDate) {
      const s = String(site.startDate).replace(/[.\/-]/g, '-');
      if (s.length >= 10) startDate = new Date(s.slice(0, 10) + 'T00:00:00');
    }
    if (site.endDate) {
      const s = String(site.endDate).replace(/[.\/-]/g, '-');
      if (s.length >= 10 && !s.match(/^0{4}/)) endDate = new Date(s.slice(0, 10) + 'T00:00:00');
    }
    if (startDate && !Number.isNaN(startDate.getTime()) && todayDate < startDate) return '예정현장';
    if (endDate && !Number.isNaN(endDate.getTime()) && todayDate > endDate) return '완료 현장';
    return '진행중 현장';
  };

  // 그룹 카드용: 현장명 + 진행상황 라벨
  const getGroupSiteDisplay = (siteId) => {
    const site = allSitesForGroups.find(s => s.id === siteId) || sites.find(s => s.id === siteId);
    const name = site?.name || '알 수 없는 현장';
    const statusLabel = getSiteStatusLabel(site);
    return { name, statusLabel };
  };

  const openCreateGroup = () => {
    setGroupForm({ title: '', description: '', items: [] });
    setGroupSiteId('');
    setGroupCustomItem({ name: '', note: '' });
    setGroupDialog({ open: true, mode: 'create', groupId: null });
  };

  const openEditGroup = (group) => {
    setGroupForm({
      title: group.title || '',
      description: group.description || '',
      items: Array.isArray(group.items) ? group.items : []
    });
    setGroupSiteId('');
    setGroupCustomItem({ name: '', note: '' });
    setGroupDialog({ open: true, mode: 'edit', groupId: group.id });
  };

  const closeGroupDialog = () => {
    setGroupDialog({ open: false, mode: 'create', groupId: null });
  };

  const addGroupSiteItem = () => {
    if (!groupSiteId) return;
    setGroupForm(prev => ({
      ...prev,
      items: [...prev.items, { type: 'site', siteId: groupSiteId }]
    }));
    setGroupSiteId('');
  };

  const addGroupCustomItem = () => {
    if (!groupCustomItem.name.trim()) return;
    setGroupForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          type: 'custom',
          name: groupCustomItem.name.trim(),
          note: groupCustomItem.note.trim()
        }
      ]
    }));
    setGroupCustomItem({ name: '', note: '' });
  };

  const removeGroupItem = (index) => {
    setGroupForm(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const saveGroup = async () => {
    if (!groupForm.title.trim()) {
      setSnackbar({ open: true, message: '그룹 제목을 입력해주세요.', severity: 'warning' });
      return;
    }
    try {
      const payload = {
        title: groupForm.title.trim(),
        description: groupForm.description?.trim() || '',
        items: groupForm.items || [],
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid || null
      };

      if (groupDialog.mode === 'create') {
        await addDoc(collection(db, 'site_groups'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        setSnackbar({ open: true, message: '그룹이 생성되었습니다.', severity: 'success' });
      } else if (groupDialog.groupId) {
        await updateDoc(doc(db, 'site_groups', groupDialog.groupId), payload);
        setSnackbar({ open: true, message: '그룹이 수정되었습니다.', severity: 'success' });
      }
      closeGroupDialog();
    } catch (error) {
      devError('그룹 저장 실패:', error);
      setSnackbar({ open: true, message: '그룹 저장에 실패했습니다.', severity: 'error' });
    }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm('이 그룹을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'site_groups', groupId));
      setSnackbar({ open: true, message: '그룹이 삭제되었습니다.', severity: 'success' });
    } catch (error) {
      devError('그룹 삭제 실패:', error);
      setSnackbar({ open: true, message: '그룹 삭제에 실패했습니다.', severity: 'error' });
    }
  };

  // 검색어, 전체보기, 선택된 현장에 따라 필터링
  const filteredSites = useMemo(() => {
    let filtered;
    const searchTerm = search.trim();
    // 검색 시: 전체 주요현장에서 검색 (완료·공기지난 포함)
    if (searchTerm) {
      filtered = (allImportantSites || []).filter(site =>
        (site.name && site.name.includes(searchTerm)) ||
        (site.manager && site.manager.includes(searchTerm)) ||
        (site.address && site.address.includes(searchTerm))
      );
    } else if (showAllSites) {
      // 전체 보기: 모든 주요현장
      filtered = [...(allImportantSites || [])];
    } else {
      // 기본: 진행중인 주요현장만 (공사기간 지난 현장은 전체 보기에서만 표시)
      filtered = sortedSites.filter(site => !site._isExpired);
    }
    
    if (selectedSiteId) {
      filtered = filtered.filter(site => site.id === selectedSiteId);
    }
    
    // 정산완료된 현장(공사기간 종료)을 제일 아래쪽에 배치
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const urgentSites = []; // 준공일 60일 지났지만 미입금/미청구인 현장들
    const activeSites = [];
    const completedSites = [];
    
    filtered.forEach(site => {
      let isCompleted = false;
      let isUrgent = false;
      
      // 공사기간이 끝났는지 확인
      if (site.endDate) {
        let endDate;
        
        if (typeof site.endDate === 'string') {
          const endDateStr = String(site.endDate);
          
          // 무효한 날짜 형식 체크
          if (endDateStr.match(/^0{4}[.\/-]0{1,2}[.\/-]0{1,2}$/) ||
              endDateStr === '0000.00.00' || 
              endDateStr === '0000/00/00' || 
              endDateStr === '0000-00-00' ||
              endDateStr === '0000.0.00') {
            isCompleted = false;
          } else {
            if (site.endDate.includes('-')) {
              endDate = new Date(site.endDate + 'T00:00:00');
            } else if (site.endDate.includes('/')) {
              endDate = new Date(site.endDate + 'T00:00:00');
            } else if (site.endDate.includes('.')) {
              const parts = site.endDate.split('.');
              if (parts.length === 2) {
                const month = parseInt(parts[0]) - 1;
                const day = parseInt(parts[1]);
                const currentYear = new Date().getFullYear();
                endDate = new Date(currentYear, month, day);
              } else if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                endDate = new Date(year, month, day);
              } else {
                endDate = new Date(site.endDate + 'T00:00:00');
              }
            } else if (site.endDate.length === 8) {
              const year = site.endDate.substring(0, 4);
              const month = site.endDate.substring(4, 6);
              const day = site.endDate.substring(6, 8);
              endDate = new Date(`${year}-${month}-${day}T00:00:00`);
            } else {
              endDate = new Date(site.endDate + 'T00:00:00');
            }
          }
        } else if (site.endDate instanceof Date) {
          endDate = site.endDate;
        } else {
          endDate = site.endDate.toDate ? site.endDate.toDate() : new Date(site.endDate);
        }
        
        if (endDate) {
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          isCompleted = todayDate.getTime() > endDateOnly.getTime();
          
          // 준공일 60일 지난 현장 중 미입금이나 미청구 상태인지 확인
          if (isCompleted) {
            const daysSinceCompletion = Math.floor((todayDate.getTime() - endDateOnly.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceCompletion > 60) {
              // 현장의 상태 정보 확인 (미입금, 미청구, 또는 기성금 입금완료 처리가 안된 경우)
              const hasUnpaid = site.status === '미입금' || site.paymentStatus === '미입금';
              const hasUnclaimed = site.status === '미청구' || site.claimStatus === '미청구';
              const hasUnpaidProgress = site.status === '미지급' || site.paymentStatus === '미지급';
              const hasUnpaidFinal = site.status === '미지급완료' || site.paymentStatus === '미지급완료';
              const hasUnpaidRetention = site.status === '미지급보류' || site.paymentStatus === '미지급보류';
              
              // 기성금 입금완료 처리가 안된 모든 경우를 긴급 현장으로 분류
              if (hasUnpaid || hasUnclaimed || hasUnpaidProgress || hasUnpaidFinal || hasUnpaidRetention) {
                isUrgent = true;
                console.log(`🚨 긴급 현장: ${site.name} - 준공일 ${daysSinceCompletion}일 경과, 미입금/미청구 상태`);
              }
            }
          }
        }
      }
      
      if (isUrgent) {
        urgentSites.push(site);
      } else if (isCompleted) {
        completedSites.push(site);
      } else {
        activeSites.push(site);
      }
    });
    
    // 긴급 현장(준공일 60일 지났지만 미입금/미청구)을 맨 위에, 진행중인 현장을 그 다음에, 완료된 현장을 맨 아래에 배치
    return [...urgentSites, ...activeSites, ...completedSites];
  }, [sortedSites, selectedSiteId, search, showAllSites, allImportantSites]);

  const handleRemarkChange = (id, value) => {
    setRemarks(prev => ({ ...prev, [id]: value }));
  };

  // 새 의견 입력 변경
  const handleNewCommentChange = (siteId, value) => {
    setNewCommentInputs(prev => ({ ...prev, [siteId]: value }));
  };

  // 직접 의견 추가
  const handleAddCommentDirect = async (siteId) => {
    const content = newCommentInputs[siteId]?.trim();
    if (!content) return;
    
    try {
      await addDoc(collection(db, 'siteComments'), {
        siteId: siteId,
        content: content,
        userName: currentUser?.displayName || currentUser?.email || '사용자',
        userId: currentUser?.uid || 'anonymous',
        timestamp: serverTimestamp()
      });
      
      setNewCommentInputs(prev => ({ ...prev, [siteId]: '' }));
      setSnackbar({ open: true, message: '의견이 추가되었습니다.', severity: 'success' });
      
      // 댓글 목록 새로고침
      const commentsSnapshot = await getDocs(collection(db, 'siteComments'));
      const commentsData = {};
      commentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!commentsData[data.siteId]) {
          commentsData[data.siteId] = [];
        }
        commentsData[data.siteId].push({ id: doc.id, ...data });
      });
      setComments(commentsData);
    } catch (error) {
      console.error('의견 추가 실패:', error);
      setSnackbar({ open: true, message: '의견 추가에 실패했습니다.', severity: 'error' });
    }
  };

  // 의견 수정
  const handleEditComment = (commentId, currentContent) => {
    setEditingComment({ id: commentId, content: currentContent });
  };

  // 의견 수정 저장
  const handleSaveEditComment = async () => {
    if (!editingComment.id || !editingComment.content.trim()) return;
    
    try {
      await updateDoc(doc(db, 'siteComments', editingComment.id), {
        content: editingComment.content,
        updatedAt: serverTimestamp()
      });
      
      setEditingComment({ id: null, content: '' });
      setSnackbar({ open: true, message: '의견이 수정되었습니다.', severity: 'success' });
      
      // 댓글 목록 새로고침
      const commentsSnapshot = await getDocs(collection(db, 'siteComments'));
      const commentsData = {};
      commentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!commentsData[data.siteId]) {
          commentsData[data.siteId] = [];
        }
        commentsData[data.siteId].push({ id: doc.id, ...data });
      });
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      setSnackbar({ open: true, message: '댓글 수정에 실패했습니다.', severity: 'error' });
    }
  };

  // 의견 삭제
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('이 의견을 삭제하시겠습니까?')) return;
    
    try {
      await deleteDoc(doc(db, 'siteComments', commentId));
      setSnackbar({ open: true, message: '의견이 삭제되었습니다.', severity: 'success' });
      
      // 댓글 목록 새로고침
      const commentsSnapshot = await getDocs(collection(db, 'siteComments'));
      const commentsData = {};
      commentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!commentsData[data.siteId]) {
          commentsData[data.siteId] = [];
        }
        commentsData[data.siteId].push({ id: doc.id, ...data });
      });
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      setSnackbar({ open: true, message: '댓글 삭제에 실패했습니다.', severity: 'error' });
    }
  };

  // 차트 데이터 생성 함수
  const getChartData = (site, totalGisung) => {
    const contract = Number(site.contractAmount) || 0;
    const balance = contract - totalGisung; // 잔액 계산
    // 천단위로 변환
    const contractInThousand = Math.round(contract / 1000);
    const totalGisungInThousand = Math.round(totalGisung / 1000);
    const balanceInThousand = Math.round(balance / 1000);
    const chartData = {
      labels: ['계약금', '기성', '잔액'],
      datasets: [
        {
          label: '금액(천원)',
          data: [contractInThousand, totalGisungInThousand, balanceInThousand],
          backgroundColor: [
            '#1976d2', // 계약금 - 파랑
            '#43e97b', // 기성 - 연두
            '#f44336', // 잔액 - 빨강
          ],
          borderRadius: 8,
          barPercentage: 0.7,
          categoryPercentage: 0.5
        }
      ]
    };
    return chartData;
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      title: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#bbb', font: { weight: 700 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#bbb', font: { weight: 700 } }
      }
    }
  };

  const handleSaveProgress = async (site) => {
    console.log('=== 공사진행률 저장 시작 ===');
    console.log('사이트:', site);
    console.log('전체 progressInput 상태:', progressInput);
    console.log('현재 사이트 입력값:', progressInput[site.id]);
    console.log('사이트 ID:', site.id);
    
    // 입력값 검증
    const inputValue = progressInput[site.id];
    if (inputValue === undefined || inputValue === null || inputValue === '') {
      console.error('입력값이 없습니다!');
      setSnackbar({ open: true, message: '진행률을 입력해주세요.', severity: 'warning' });
      return;
    }
    
    const contract = Number(site.contractAmount) || 0;
    let percent = Number(inputValue);
    
    console.log('계약금액:', contract);
    console.log('진행률 퍼센트:', percent);
    console.log('percent가 숫자인가?', typeof percent, !isNaN(percent));
    
    // 계약금액 검증 (경고만 표시, 저장은 진행)
    if (contract === 0) {
      console.warn('계약금액이 설정되지 않았습니다. 진행률만 저장합니다.');
      setSnackbar({ open: true, message: '계약금액이 없어 진행률만 저장됩니다.', severity: 'info' });
    }
    
    // 숫자 검증
    if (isNaN(percent)) {
      console.error('진행률이 유효한 숫자가 아닙니다!');
      setSnackbar({ open: true, message: '유효한 숫자를 입력해주세요.', severity: 'warning' });
      return;
    }
    
    console.log('저장할 진행률:', percent);

    try {
      // Firestore 업데이트 - 진행률 퍼센트 저장
      console.log('Firestore 업데이트 시도...');
      await updateDoc(doc(db, 'sites', site.id), { 
        progressRate: percent
      });
      console.log('Firestore 업데이트 성공');
      
      // 현재 표시 중인 사이트 데이터만 업데이트 (필터링 유지)
      setSites(prevSites => {
        const updatedSites = prevSites.map(s => 
          s.id === site.id 
            ? { 
                ...s, 
                progressRate: percent,
                totalProgress: contract > 0 ? contract * (percent / 100) : (s.totalProgress || 0)
              }
            : s
        );
        console.log('상태 업데이트 완료:', updatedSites.find(s => s.id === site.id));
        return updatedSites;
      });
      
      // 로컬 상태에서도 progressRate 업데이트
      setProgressInput(prev => ({ ...prev, [site.id]: percent }));
      
      // 입력모드 해제 및 입력값 초기화
      setEditingProgress(prev => ({ ...prev, [site.id]: false }));
      setProgressInput(prev => ({ ...prev, [site.id]: undefined }));
      setSnackbar({ open: true, message: '진행률이 저장되었습니다.', severity: 'success' });
      console.log('=== 공사진행률 저장 완료 ===');
    } catch (error) {
      console.error('공사진행률 저장 오류:', error);
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handleImageClick = (siteId) => {
    if (fileInputRefs.current[siteId]) fileInputRefs.current[siteId].click();
  };

  const handleImageUpload = async (e, siteId) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSiteId(siteId);
    const storage = getStorage();
    const sRef = storageRef(storage, `siteImages/${siteId}_${file.name}`);
    await uploadBytes(sRef, file, {
      customMetadata: {
        userId: currentUser.uid,
        uploadedAt: new Date().toISOString(),
        type: 'site_image',
        siteId: siteId
      }
    });
    const url = await getDownloadURL(sRef);
    await updateDoc(doc(db, "sites", siteId), { imageUrl: url });
    setUploadingSiteId(null);
  };

  const handleImageDelete = async (siteId, imageUrl) => {
    setUploadingSiteId(siteId);
    try {
      const storage = getStorage();
      const imageRef = storageRef(storage, imageUrl);
      await updateDoc(doc(db, "sites", siteId), { imageUrl: null });
      await imageRef.delete();
    } catch (e) {
      // URL이 storage 경로가 아닐 경우 등 예외 무시
    }
    setUploadingSiteId(null);
  };

  // 드래그 앤 드롭 관련 함수들
  const handleDragStart = (e, siteId) => {
    console.log('드래그 시작:', siteId);
    setDraggedSiteId(siteId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetSiteId) => {
    e.preventDefault();
    console.log('드롭:', draggedSiteId, '->', targetSiteId);
    console.log('현재 siteOrder:', siteOrder);
    
    if (draggedSiteId && draggedSiteId !== targetSiteId) {
      const newOrder = [...siteOrder];
      const draggedIndex = newOrder.indexOf(draggedSiteId);
      const targetIndex = newOrder.indexOf(targetSiteId);
      
      console.log('인덱스:', draggedIndex, targetIndex);
      
      if (draggedIndex > -1 && targetIndex > -1) {
        // 드래그된 아이템을 제거하고 타겟 위치에 삽입
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedSiteId);
        console.log('새로운 순서:', newOrder);
        setSiteOrder(newOrder);
        
        // 로컬 스토리지에 순서 저장

      }
    }
    setDraggedSiteId(null);
  };

  const handleDragEnd = () => {
    setDraggedSiteId(null);
  };

  return (
        <Box sx={{ 
          height: '100vh',
          bgcolor: 'background.default',
          position: 'relative',
          pt: isMobile ? 4 : 4,
          overflow: 'hidden'
        }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: isMobile ? 10 : 3,
          pb: 3,
          px: isMobile ? 1 : 3,
          ml: isMobile ? 0 : 'auto',
          mr: isMobile ? 0 : 'auto',
          maxWidth: isMobile ? '100%' : 'none'
        }}
      >
        <Box sx={{ 
          height: 'calc(100vh - 120px)', 
          overflow: 'hidden', 
          pb: 4, 
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          boxShadow: 3,
          bgcolor: '#1a1d21'
        }}>
      {/* 페이지 제목 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1, // 8px (MUI에서 1 = 8px)
        px: isMobile ? 1 : 0
      }}>
        {!isMobile && (
          <Typography 
            variant="h4" 
            sx={{ 
              color: '#fff', 
              fontWeight: 600,
              fontSize: '2rem',
              transform: 'translate(30px, 5px)'
            }}
          >
            주요현장
          </Typography>
        )}
        
        {/* 상단 검색창과 현장 선택 - 컴팩트하게 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          gap: 1.5,
          alignItems: 'center',
          marginRight: '10px',
          marginTop: '8px',
          marginBottom: '8px'
        }}>
          {/* 현장 선택 드롭다운 */}
          <FormControl size="medium" sx={{ minWidth: 180 }}>
            <Select
              value={selectedSiteId || ''}
              onChange={(e) => setSelectedSiteId(e.target.value || null)}
              displayEmpty
              sx={{
                color: '#fff',
                bgcolor: '#232b3b',
                height: '40px',
                fontSize: '1rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#444'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#666'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ff9800'
                }
              }}
            >
              <MenuItem value="">
                <em>전체 현장</em>
              </MenuItem>
              {(showAllSites ? (allImportantSites || []) : sortedSites).map(site => (
                <MenuItem key={site.id} value={site.id}>
                  {site.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            size="medium"
            placeholder={isMobile ? "현장명, 소장으로 검색" : "현장명, 소장, 주소 검색"}
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    size="medium" 
                    onClick={() => setSearch('')}
                    sx={{ mr: 0.5, minWidth: '40px', minHeight: '40px' }}
                  >
                    <ClearIcon />
                  </IconButton>
                  <IconButton sx={{ minWidth: '40px', minHeight: '40px' }}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ 
              width: isMobile ? '100%' : 350, 
              bgcolor: '#232b3b', 
              borderRadius: 2, 
              input: { color: '#fff' },
              '& .MuiInputBase-root': {
                height: '40px',
                fontSize: '1rem'
              }
            }}
            inputRef={scrollFocus(null)}
          />
          
          <Button
            variant="outlined"
            size="medium"
            onClick={() => setShowAllSites(prev => !prev)}
            sx={{
              backgroundColor: showAllSites ? 'rgba(255, 152, 0, 0.15)' : 'transparent',
              color: '#ff9800',
              borderColor: '#ff9800',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              px: 1.5,
              borderRadius: 2,
              height: '40px',
              minHeight: '40px',
              '&:hover': {
                backgroundColor: 'rgba(255, 152, 0, 0.25)',
                borderColor: '#ff9800',
                color: '#ff9800'
              }
            }}
          >
            {showAllSites ? '해제하기' : '전체 보기'}
          </Button>
          
          <Button
            variant="outlined"
            size="medium"
            startIcon={<AddIcon />}
            onClick={openCreateGroup}
            sx={{
              backgroundColor: 'transparent',
              color: '#43e97b',
              borderColor: '#43e97b',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              px: 1.5,
              borderRadius: 2,
              height: '40px',
              minHeight: '40px',
              '&:hover': {
                backgroundColor: 'rgba(67, 233, 123, 0.1)',
                borderColor: '#43e97b',
                color: '#43e97b'
              }
            }}
          >
            그룹 추가
          </Button>

          {/* 정산확인 버튼 */}
          <Button
            variant="outlined"
            size="medium"
            startIcon={<AttachMoneyIcon />}
            onClick={() => {
              // 정산페이지로 이동
              window.location.href = '/settlement';
            }}
            sx={{
              backgroundColor: 'transparent',
              color: '#f44336',
              borderColor: '#fff',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              px: 1.5,
              borderRadius: 2,
              height: '40px',
              minHeight: '40px',
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                borderColor: '#fff',
                color: '#f44336'
              }
            }}
          >
            정산확인
          </Button>
        </Box>
      </Box>
      <Box sx={{
        width: '100%',
        flex: 1,
        border: '1px solid #333',
        borderRadius: 2,
        bgcolor: '#1a1a1a',
        mt: 0,
        minWidth: isMobile ? 'auto' : '1000px',
        height: 'calc(100vh - 200px)',
        paddingBottom: '60px',
        position: 'relative',
        zIndex: 1001,
        overflowY: 'auto',
        msOverflowStyle: 'none',  // IE and Edge
        scrollbarWidth: 'none',   // Firefox
        '&::-webkit-scrollbar': {
          display: 'none'         // Chrome, Safari, Opera
        },
        // 아이패드에서 스크롤 개선
        '@media (min-width: 768px) and (max-width: 1024px)': {
          height: 'calc(100vh - 180px)', // 아이패드에서 높이 20px 줄임
          paddingBottom: '40px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }
      }}>
        <Grid container spacing={2} sx={{ 
          padding: isMobile ? '5px 0 0 6px' : '5px 10px 0 10px',
          // 테블릿에서 그리드 간격 줄이기
          '@media (min-width: 768px) and (max-width: 1024px)': {
            gap: 1,
            padding: '5px 5px 0 5px'
          }
        }}>
            {siteGroups.map(group => {
              const items = Array.isArray(group.items) ? group.items : [];
            return (
              <Grid size={{ xs: 12, sm: 12, md: 12 }} key={`group-${group.id}`} sx={{ minWidth: isMobile ? 'auto' : '700px' }}>
                <Paper
                  sx={{
                    mb: isMobile ? 0.625 : 0.2,
                    borderRadius: 4,
                    boxShadow: 6,
                    bgcolor: '#202634',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'stretch',
                    height: isMobile ? 'auto' : 260,
                    minWidth: isMobile ? 'calc(100vw - 20px)' : '700px',
                    width: '100%',
                    p: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 10,
                    '&:hover': {
                      boxShadow: 8,
                      zIndex: 20
                    }
                  }}
                >
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#90caf9' }}>
                        {group.title || '그룹'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/hyunjangsch/group/${group.id}`)}
                          sx={{ color: '#90caf9', borderColor: '#90caf9' }}
                        >
                          열기
                        </Button>
                        <IconButton size="small" onClick={() => openEditGroup(group)} sx={{ color: '#4caf50' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => deleteGroup(group.id)} sx={{ color: '#f44336' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    {group.description && (
                      <Typography sx={{ color: '#ccc', fontSize: '0.9rem' }}>
                        {group.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {(() => {
                        const siteItems = (items || []).filter(i => i.type === 'site');
                        const customItems = (items || []).filter(i => i.type === 'custom');
                        const byStatus = { '예정현장': [], '진행중 현장': [], '완료 현장': [] };
                        siteItems.forEach(item => {
                          const { name, statusLabel } = getGroupSiteDisplay(item.siteId);
                          if (byStatus[statusLabel]) byStatus[statusLabel].push(name);
                        });
                        const statusOrder = ['예정현장', '진행중 현장', '완료 현장'];
                        return (
                          <>
                            {statusOrder.map(statusLabel => {
                              const names = byStatus[statusLabel] || [];
                              if (names.length === 0) return null;
                              const isOngoing = statusLabel === '진행중 현장';
                              return (
                                <Box
                                  key={statusLabel}
                                  sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    marginBottom: isOngoing ? 2 : 0
                                  }}
                                >
                                  <Typography
                                    component="span"
                                    sx={{
                                      fontSize: '1.08rem',
                                      fontWeight: 700,
                                      color: isOngoing ? '#22c55e' : statusLabel === '완료 현장' ? '#9ca3af' : '#93c5fd',
                                      flexShrink: 0,
                                      mr: 0.5
                                    }}
                                  >
                                    [{statusLabel}]
                                  </Typography>
                                  {names.map((name, idx) => (
                                    <Chip
                                      key={`${group.id}-${statusLabel}-${idx}`}
                                      size="small"
                                      label={name}
                                      sx={{
                                        bgcolor: statusLabel === '완료 현장' ? '#374151' : statusLabel === '예정현장' ? '#1e3a5f' : '#39475c',
                                        color: '#fff',
                                        fontSize: '1.08rem',
                                        fontWeight: 600
                                      }}
                                    />
                                  ))}
                                </Box>
                              );
                            })}
                            {customItems.length > 0 && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                                <Typography component="span" sx={{ fontSize: '1.08rem', fontWeight: 700, color: '#9ca3af', flexShrink: 0, mr: 0.5 }}>
                                  [기타]
                                </Typography>
                                {customItems.map((item, idx) => (
                                  <Chip
                                    key={`${group.id}-custom-${idx}`}
                                    size="small"
                                    label={item.name || '임의 입력'}
                                    sx={{ bgcolor: '#39475c', color: '#fff', fontSize: '1.08rem' }}
                                  />
                                ))}
                              </Box>
                            )}
                          </>
                        );
                      })()}
                    </Box>
                    <Typography sx={{ color: '#aaa', fontSize: '0.8rem' }}>
                      총 {items.length}개 현장
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}

          {siteGroups.length === 0 && filteredSites.length === 0 && (
            <Grid size={12}>
              <Typography sx={{ color: '#bbb', mt: 4 }}>
                {search.trim() !== '' ? '검색 결과가 없습니다.' : '주요현장으로 지정된 현장이 없습니다. 현장관리에서 별표를 체크하여 주요현장을 추가해주세요.'}
              </Typography>
            </Grid>
          )}
        {filteredSites.map(site => {
          const siteGisungData = gisungData[site.id] || [];
          let totalGisung = siteGisungData.reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0);
          if (totalGisung === 0 && Number(site.totalProgress) > 0) {
            totalGisung = Number(site.totalProgress);
          }
          
          return (
            <Grid size={{ xs: 12, sm: 12, md: 12 }} key={site.id} sx={{ minWidth: isMobile ? 'auto' : '700px' }}>
              <Paper 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDragOver(e);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDrop(e, site.id);
                }}
                sx={{ 
                  mb: isMobile ? 0.625 : 0.2, // 카드 간 간격 확 줄임
                  borderRadius: 4, 
                  boxShadow: 6, 
                  bgcolor: '#181f2e', 
                  color: '#fff', 
                  display: 'flex', 
                  flexDirection: { xs: 'column', md: 'row' }, 
                  alignItems: 'stretch', 
                  height: isMobile ? 'auto' : 400, // 원래 높이로 복원
                  minWidth: isMobile ? 'calc(100vw - 20px)' : '700px',
                  width: '100%', 
                  p: 0, 
                  overflow: 'hidden',
                  marginLeft: isMobile ? '2px' : 0,
                  marginRight: isMobile ? '5px' : 0,
                  // 테블릿에서 카드 조정
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    minWidth: 'calc(100vw - 40px)',
                    width: '100%',
                    height: 350
                  },
                  cursor: 'grab',
                  position: 'relative',
                  zIndex: 10,
                  '&:active': {
                    cursor: 'grabbing'
                  },
                  opacity: draggedSiteId === site.id ? 0.5 : 1,
                  transform: draggedSiteId === site.id ? 'rotate(5deg)' : 'none',
                  transition: 'opacity 0.2s, transform 0.2s',
                  '&:hover': {
                    boxShadow: 8,
                    zIndex: 20
                  }
                }}
              >
              {/* 왼쪽: 정보/버튼 */}
              <Box sx={{ 
                flex: 2, 
                minWidth: isMobile ? 'calc(100vw - 20px)' : 400, 
                width: isMobile ? 'calc(100vw - 20px)' : 'auto',
                p: isMobile ? 1.5 : 3, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: isMobile ? 0.5 : 1, 
                borderRight: { md: '2px solid #232b3b' }, 
                justifyContent: 'flex-start', 
                alignItems: 'flex-start' 
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  width: '100%', 
                  mb: isMobile ? 0.5 : 1 
                }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 800, 
                    color: '#90caf9', 
                    textAlign: 'left', 
                    flex: 1,
                    fontSize: isMobile ? '1rem' : '1.5rem',
                    // 테블릿에서 현장명을 1줄로 표시
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      fontSize: '1.2rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}>{site.name}</Typography>
                  <Box 
                    draggable
                    onDragStart={(e) => handleDragStart(e, site.id)}
                    sx={{ 
                      cursor: 'grab', 
                      p: 0.5, 
                      borderRadius: 1,
                      '&:active': { cursor: 'grabbing' },
                      '&:hover': { bgcolor: '#232b3b' }
                    }}
                  >
                    ⋮⋮
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: isMobile ? 1 : 3, width: '100%', alignItems: 'center', mb: isMobile ? 0.3 : 0.6, justifyContent: 'space-between' }}>
                  <Typography sx={{ 
                    fontSize: isMobile ? '0.75rem' : 16, 
                    color: '#43e97b', 
                    fontWeight: 700, 
                    textAlign: 'left' 
                  }}>계약구분: {site.contractType}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch
                      checked={settlementToggles[site.id] || site.settlementEnabled || false}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSettlementToggle(site.id, e.target.checked);
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#ffeb3b',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 235, 59, 0.1)',
                          },
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#ffeb3b',
                        },
                        '& .MuiSwitch-track': {
                          backgroundColor: '#666',
                        },
                      }}
                      size={isMobile ? 'small' : 'medium'}
                    />
                    <Button
                      variant="outlined"
                      size={isMobile ? 'small' : 'medium'}
                      onClick={(e) => {
                        const canEnter = settlementPages[site.id] || site.settlementPageCreated || site.settlementEnabled;
                        if (canEnter) {
                          e.preventDefault();
                          e.stopPropagation();
                          handleGoToSettlement(site.id);
                        }
                      }}
                      disabled={!(settlementPages[site.id] || site.settlementPageCreated || site.settlementEnabled)}
                      sx={{
                        backgroundColor: 'transparent',
                        color: '#f44336',
                        borderColor: '#fff',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '0.6rem' : '0.8rem',
                        borderRadius: 2,
                        minWidth: isMobile ? '40px' : '50px',
                        height: isMobile ? '28px' : '30px',
                        minHeight: isMobile ? '28px' : '30px',
                        padding: isMobile ? '2px 4px' : '4px 8px',
                        '&:hover': {
                          backgroundColor: 'rgba(244, 67, 54, 0.1)',
                          borderColor: '#fff',
                          color: '#f44336'
                        },
                        '&.Mui-disabled': {
                          color: '#666',
                          borderColor: '#444'
                        }
                      }}
                    >
                      정산
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: isMobile ? 1 : 2, width: '100%', alignItems: 'center', mb: isMobile ? 0.3 : 0.6 }}>
                  <Typography sx={{ 
                    fontSize: isMobile ? '0.7rem' : 15, 
                    color: '#90caf9', 
                    fontWeight: 700 
                  }}>{`회사명: ${site.companyName}`}</Typography>
                  <Typography sx={{ fontSize: isMobile ? '0.7rem' : 15 }}>소장: {site.manager}</Typography>
                </Box>
                <Typography sx={{ 
                  fontSize: isMobile ? '0.7rem' : 15, 
                  textAlign: 'left', 
                  width: '100%', 
                  mb: isMobile ? 0.3 : 0.6 
                }}>주소: {site.address}</Typography>
                <Typography sx={{ 
                  fontSize: isMobile ? '0.7rem' : 15, 
                  textAlign: 'left', 
                  width: '100%', 
                  mb: isMobile ? 0.3 : 0.6 
                }}>공사기간: {site.startDate} ~ {site.endDate}</Typography>
                <Box sx={{ display: 'flex', gap: isMobile ? 1 : 3, width: '100%', alignItems: 'center', mb: isMobile ? 0.3 : 0.6, flexWrap: 'wrap' }}>
                  <Typography sx={{ 
                    fontSize: isMobile ? '0.7rem' : 15, 
                    textAlign: 'left', 
                    minWidth: isMobile ? '60px' : '120px' 
                  }}>계약금: {formatContractAmount(site.contractAmount)}</Typography>
                  {(() => {
                    const siteGisungDataForDisplay = gisungData[site.id] || [];
                    const hasGisungItems = siteGisungDataForDisplay.length > 0;
                    const paidAmount = hasGisungItems
                      ? siteGisungDataForDisplay
                          .filter(item => item.paymentStatus === '입금완료' || item.paymentStatus === '완료')
                          .reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0)
                      : totalGisung;
                    const unpaidAmount = hasGisungItems
                      ? siteGisungDataForDisplay
                          .filter(item => item.paymentStatus === '미입금' || item.paymentStatus === '미지급' || !item.paymentStatus)
                          .reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0)
                      : 0;
                    
                    return (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        minWidth: isMobile ? '60px' : '120px',
                        flex: 1
                      }}>
                        <Typography sx={{ 
                          fontSize: isMobile ? '0.7rem' : 15, 
                          textAlign: 'left', 
                          color: '#43e97b', 
                          fontWeight: 'bold' 
                        }}>기성: {formatGisungAmount(paidAmount)}</Typography>
                        {unpaidAmount > 0 && (
                          <Typography sx={{ 
                            fontSize: isMobile ? '0.7rem' : 15, 
                            textAlign: 'left', 
                            color: '#f44336', 
                            fontWeight: 'bold' 
                          }}>+미입금 {formatGisungAmount(unpaidAmount)}</Typography>
                        )}
                      </Box>
                    );
                  })()}
                  <Typography sx={{ 
                    fontSize: isMobile ? '0.7rem' : 15, 
                    textAlign: 'left', 
                    color: '#f44336', 
                    fontWeight: 'bold' 
                  }}>잔액: {formatBalanceAmount((site.contractAmount || 0) - totalGisung)}</Typography>
                </Box>
                <Typography sx={{ 
                  fontSize: isMobile ? '0.7rem' : 15, 
                  textAlign: 'left', 
                  width: '100%', 
                  mb: isMobile ? 0.3 : 0.6 
                }}>시공팀: {site.team}</Typography>
                <Box sx={{ 
                  mt: 0, 
                  mb: isMobile ? 1 : 2, 
                  display: 'flex', 
                  gap: isMobile ? 0.5 : 1, 
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  <Button 
                    variant="contained" 
                    color="info" 
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ 
                      borderRadius: 2, 
                      fontWeight: 700,
                      fontSize: isMobile ? '0.65rem' : 'inherit',
                      padding: isMobile ? '4px 8px' : 'inherit',
                      minWidth: isMobile ? 'auto' : 'inherit'
                    }} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/sites?siteId=${site.id}`);
                    }}
                  >현장관리</Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ 
                      borderRadius: 2, 
                      fontWeight: 700,
                      fontSize: isMobile ? '0.65rem' : 'inherit',
                      padding: isMobile ? '4px 8px' : 'inherit',
                      minWidth: isMobile ? 'auto' : 'inherit'
                    }} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/progress?siteId=${site.id}`);
                    }}
                  >기성관리</Button>
                  <Button 
                    variant="contained" 
                    color="success" 
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ 
                      borderRadius: 2, 
                      fontWeight: 700,
                      fontSize: isMobile ? '0.65rem' : 'inherit',
                      padding: isMobile ? '4px 8px' : 'inherit',
                      minWidth: isMobile ? 'auto' : 'inherit'
                    }} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/safety?siteId=${site.id}`);
                    }}
                  >안전관리</Button>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ 
                      borderRadius: 2, 
                      fontWeight: 700,
                      fontSize: isMobile ? '0.65rem' : 'inherit',
                      padding: isMobile ? '4px 8px' : 'inherit',
                      minWidth: isMobile ? 'auto' : 'inherit'
                    }} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/discussions?siteId=${site.id}`);
                    }}
                  >토론</Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ 
                      borderRadius: 2, 
                      fontWeight: 700,
                      fontSize: isMobile ? '0.65rem' : 'inherit',
                      padding: isMobile ? '4px 8px' : 'inherit',
                      minWidth: isMobile ? 'auto' : 'inherit',
                      bgcolor: '#3b82f6',
                      '&:hover': { bgcolor: '#2563eb' }
                    }} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/hyunjangsch/${site.id}`);
                    }}
                  >상세</Button>
                </Box>
              </Box>
              {/* 가운데: 차트 - 모바일에서 숨김 */}
              {!isMobile && (
                <Box sx={{ 
                  flex: 1.7, 
                  minWidth: 400, 
                  maxWidth: 600, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start', 
                  bgcolor: '#181f2e', 
                  p: 0, 
                  height: '370px', 
                  borderRight: { md: '2px solid #232b3b' }, 
                  mt: 0.5,
                  // 아이패드에서 차트높이 10px 줄임
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    height: '350px'
                  }
                }}>
                  {/* 공사진행률 가로 차트 - 상단 고정 */}
                  <Box sx={{ width: '90%', mb: 3 }}>
                    <Typography sx={{ color: '#43e97b', fontWeight: 700, fontSize: 15, mb: 0.5 }}>공사진행률</Typography>
                    {(() => {
                      // 저장된 진행률이 있으면 우선 사용, 없으면 기성 데이터 기반으로 계산
                      const contract = Number(site.contractAmount) || 0;
                      const savedProgressRate = Number(site.progressRate) || 0;
                      const calculatedPercent = contract > 0 ? Math.round((totalGisung / contract) * 100) : 0;
                      
                      // 저장된 진행률이 있으면 그것을 사용, 없으면 계산된 값 사용
                      const basePercent = savedProgressRate > 0 ? savedProgressRate : calculatedPercent;
                      
                      const percent = editingProgress[site.id]
                        ? (progressInput[site.id] ?? basePercent)
                        : basePercent;
                      return (
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{ 
                            height: 18, 
                            borderRadius: 6, 
                            bgcolor: '#232b3b', 
                            '& .MuiLinearProgress-bar': { 
                              background: percent >= 100 
                                ? 'linear-gradient(90deg, #f44336 0%, #d32f2f 100%)' 
                                : 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)' 
                            } 
                          }}
                        />
                      );
                    })()}
                  </Box>
                  {/* 진행률 바(숫자 입력) - 상단 고정 */}
                  {(() => {
                    const contract = Number(site.contractAmount) || 0;
                    const savedProgressRate = Number(site.progressRate) || 0;
                    const calculatedPercent = contract > 0 ? Math.round((totalGisung / contract) * 100) : 0;
                    
                    // 저장된 진행률이 있으면 그것을 사용, 없으면 계산된 값 사용
                    const basePercent = savedProgressRate > 0 ? savedProgressRate : calculatedPercent;
                    
                    const isEditing = editingProgress[site.id];
                    const percent = isEditing
                      ? (progressInput[site.id] ?? basePercent)
                      : basePercent;
                    return (
                      <Box sx={{ width: '90%', mb: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isEditing ? (
                          <>
                            <TextField
                              type="text"
                              size="small"
                              autoFocus
                              inputProps={{ style: { color: '#43e97b', fontWeight: 700, fontSize: 15, textAlign: 'center' } }}
                              value={progressInput[site.id] !== undefined && progressInput[site.id] !== '' ? progressInput[site.id].toLocaleString() : percent.toLocaleString()}
                              onChange={e => {
                                let v = e.target.value.replace(/,/g, ''); // 콤마 제거
                                console.log('진행률 입력 변경:', site.id, '값:', v);
                                if (v === '') {
                                  setProgressInput(prev => ({ ...prev, [site.id]: '' }));
                                } else {
                                  const numValue = Number(v);
                                  if (!isNaN(numValue)) {
                                    const clampedValue = Math.max(0, Math.min(100, numValue));
                                    setProgressInput(prev => ({ ...prev, [site.id]: clampedValue }));
                                    console.log('설정된 값:', clampedValue);
                                    
                                    // 실시간으로 진행률 바 업데이트
                                    setSites(prevSites => 
                                      prevSites.map(s => 
                                        s.id === site.id 
                                          ? { ...s, progressRate: clampedValue }
                                          : s
                                      )
                                    );
                                  }
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  console.log('엔터 키 눌림 - 저장 실행');
                                  handleSaveProgress(site);
                                }
                              }}
                              onBlur={() => {
                                // 포커스를 잃을 때 자동 저장 (1초 후)
                                setTimeout(() => {
                                  if (progressInput[site.id] !== undefined && progressInput[site.id] !== '') {
                                    console.log('포커스 아웃 - 자동 저장');
                                    handleSaveProgress(site);
                                  }
                                }, 1000);
                              }}
                              sx={{ width: 90, bgcolor: '#232b3b', borderRadius: 1, mr: 1 }}
                              inputRef={scrollFocus(null)}
                            />
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              sx={{ minWidth: 60, fontWeight: 700, borderRadius: 2, bgcolor: '#43e97b', color: '#222', '&:hover': { bgcolor: '#38f9d7' } }}
                              onClick={() => handleSaveProgress(site)}
                            >
                              {progressInput[site.id] !== undefined && progressInput[site.id] !== '' ? '저장' : '취소'}
                            </Button>
                          </>
                        ) : (
                          <Typography
                            sx={{ color: '#43e97b', fontWeight: 700, fontSize: 15, mb: 2, cursor: 'pointer', userSelect: 'none' }}
                            onDoubleClick={() => {
                              setEditingProgress(prev => ({ ...prev, [site.id]: true }));
                              setProgressInput(prev => ({ ...prev, [site.id]: percent }));
                            }}
                          >
                            {`공사 진행률: ${percent.toLocaleString()}%`}
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                  {/* 차트 - 하단 배치 */}
                  <Box sx={{ 
                    width: '100%', 
                    height: '290px', 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'stretch', 
                    justifyContent: 'flex-end', 
                    p: 0, 
                    m: 0,
                    // 아이패드에서 차트높이 10px 줄임
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      height: '280px'
                    }
                  }}>
                    <Bar
                      data={getChartData(site, totalGisung)}
                      options={{
                        ...chartOptions,
                        maintainAspectRatio: false,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: { display: false },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { color: '#bbb', font: { weight: 700, size: 12 } }
                          },
                          y: {
                            grid: { display: false },
                            ticks: { color: '#bbb', font: { weight: 700, size: 12 } }
                          }
                        },
                        barPercentage: 0.6,
                        categoryPercentage: 0.5,
                      }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </Box>
                </Box>
              )}
              {/* 오른쪽: 조감도 이미지 - 모바일에서만 숨김 */}
              {!isMobile && (
                <Box
                  sx={{ 
                    flex: 1.5, 
                    minWidth: 240, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    bgcolor: '#222', 
                    cursor: !site.imageUrl && !uploadingSiteId ? 'pointer' : 'default', 
                    position: 'relative',
                    py: 2, // 위아래 패딩 추가
                    // 테블릿에서 조감도 영역 크기 조정
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      minWidth: 200,
                      flex: 1.3
                    }
                  }}
                  onClick={!site.imageUrl && !uploadingSiteId ? () => handleImageClick(site.id) : undefined}
                  onMouseEnter={() => setHoveredSiteId(site.id)}
                  onMouseLeave={() => setHoveredSiteId(null)}
                >
                  {uploadingSiteId === site.id ? (
                    <CircularProgress color="warning" />
                  ) : site.imageUrl ? (
                    <>
                      <Image 
                        src={site.imageUrl} 
                        alt="조감도" 
                        lazy={true}
                        style={{ 
                          width: 'auto',
                          height: '100%', 
                          maxHeight: '100%',
                          borderRadius: 8, 
                          filter: hoveredSiteId === site.id ? 'brightness(0.7)' : 'none' 
                        }} 
                      />
                      {hoveredSiteId === site.id && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.4)' }}>
                          <Button variant="contained" size="small" sx={{ mb: 1, bgcolor: '#ffd600', color: '#000', fontWeight: 700 }} onClick={e => { e.stopPropagation(); handleImageClick(site.id); }}>교체</Button>
                          <Button variant="contained" size="small" color="error" sx={{ fontWeight: 700 }} onClick={e => { e.stopPropagation(); handleImageDelete(site.id, site.imageUrl); }}>삭제</Button>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography sx={{ color: '#bbb', fontSize: 15, textAlign: 'center' }}>조감도 없음<br />(클릭하여 업로드)</Typography>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={el => fileInputRefs.current[site.id] = el}
                    onChange={e => handleImageUpload(e, site.id)}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        );
      })}
      </Grid>
      </Box>

      <Dialog open={groupDialog.open} onClose={closeGroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          {groupDialog.mode === 'create' ? '그룹 추가' : '그룹 수정'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21' }}>
          <TextField
            fullWidth
            label="그룹 제목"
            value={groupForm.title}
            onChange={(e) => setGroupForm(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mt: 2, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: '#ccc' } }}
          />
          <TextField
            fullWidth
            label="설명 (선택)"
            value={groupForm.description}
            onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mt: 2, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: '#ccc' } }}
          />

          <Box sx={{ mt: 3 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>현장 선택</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Autocomplete
              fullWidth
              size="small"
              options={allSitesForGroups}
              getOptionLabel={(option) => option.name || ''}
              value={allSitesForGroups.find(site => site.id === groupSiteId) || null}
              onChange={(_, newValue) => setGroupSiteId(newValue?.id || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="현장 선택"
                  sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: '#ccc' } }}
                />
              )}
              sx={{ bgcolor: '#232b3b', borderRadius: 1 }}
            />
            <Button variant="outlined" onClick={addGroupSiteItem} sx={{ color: '#90caf9', borderColor: '#90caf9' }}>
              추가
            </Button>
          </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>임의 입력</Typography>
            <TextField
              fullWidth
              label="현장명"
              value={groupCustomItem.name}
              onChange={(e) => setGroupCustomItem(prev => ({ ...prev, name: e.target.value }))}
              sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: '#ccc' } }}
            />
            <TextField
              fullWidth
              label="메모 (선택)"
              value={groupCustomItem.note}
              onChange={(e) => setGroupCustomItem(prev => ({ ...prev, note: e.target.value }))}
              sx={{ mt: 2, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: '#ccc' } }}
            />
            <Button variant="outlined" onClick={addGroupCustomItem} sx={{ mt: 1, color: '#90caf9', borderColor: '#90caf9' }}>
              임의 항목 추가
            </Button>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>현재 항목</Typography>
            {groupForm.items.length === 0 ? (
              <Typography sx={{ color: '#bbb' }}>추가된 항목이 없습니다.</Typography>
            ) : (
              <List>
                {groupForm.items.map((item, index) => {
                  const label = item.type === 'site'
                    ? getSiteNameById(item.siteId)
                    : (item.name || '임의 입력');
                  return (
                    <ListItem
                      key={`group-item-${index}`}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => removeGroupItem(index)} sx={{ color: '#f44336' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={label}
                        secondary={item.type === 'custom' ? (item.note || '') : ''}
                        sx={{ color: '#fff' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21' }}>
          <Button onClick={closeGroupDialog} sx={{ color: '#ccc' }}>취소</Button>
          <Button onClick={saveGroup} variant="contained" sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 정산 페이지 생성 확인 다이얼로그 */}
      <Dialog
        open={settlementDialog.open}
        onClose={() => setSettlementDialog({ open: false, siteId: null, siteName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: '#1a1d21', 
          color: '#fff', 
          borderBottom: '1px solid #333',
          fontSize: '1.2rem',
          fontWeight: 600
        }}>
          정산 페이지 생성
        </DialogTitle>
        <DialogContent sx={{ 
          bgcolor: '#1a1d21', 
          color: '#fff',
          p: 3
        }}>
          <Typography sx={{ mb: 2, fontSize: '1rem' }}>
            <strong>{settlementDialog.siteName}</strong> 현장의 정산 페이지를 생성하시겠습니까?
          </Typography>
          <Typography sx={{ mb: 2, color: '#bbb', fontSize: '0.9rem' }}>
            정산 페이지가 생성되면 해당 현장의 정산 관리가 가능합니다.
          </Typography>
          <Alert severity="info" sx={{ bgcolor: '#232b3b', color: '#90caf9' }}>
            정산 페이지는 정산 관리 페이지에서 삭제할 수 있습니다.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ 
          bgcolor: '#1a1d21', 
          borderTop: '1px solid #333',
          p: 2
        }}>
          <Button
            onClick={() => setSettlementDialog({ open: false, siteId: null, siteName: '' })}
            sx={{ 
              color: '#bbb',
              '&:hover': { bgcolor: '#333' }
            }}
          >
            취소
          </Button>
          <Button
            onClick={handleCreateSettlementPage}
            variant="contained"
            sx={{ 
              bgcolor: '#43e97b',
              color: '#222',
              fontWeight: 600,
              '&:hover': { bgcolor: '#38f9d7' }
            }}
          >
            생성
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Container>
    </Box>
  );
} 