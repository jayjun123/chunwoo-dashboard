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
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CommentIcon from '@mui/icons-material/Comment';
import AddCommentIcon from '@mui/icons-material/AddComment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const { currentUser } = useAuth();
  const fileInputRefs = useRef({});
  const [uploadingSiteId, setUploadingSiteId] = useState(null);
  const [hoveredSiteId, setHoveredSiteId] = useState(null);
  const [draggedSiteId, setDraggedSiteId] = useState(null);
  const [siteOrder, setSiteOrder] = useState([]);
  const navigate = useNavigate();

  const scrollFocus = (ref) => () => {
    setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
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
      
      // isFavorite가 명시적으로 true인 현장만 필터링 (엄격한 조건)
      const importantSitesData = allSitesData.filter(site => {
        const isFav = site.isFavorite === true;
        
        console.log(`🔍 필터링 체크 - ${site.name}: isFavorite=${site.isFavorite} (${typeof site.isFavorite}) -> ${isFav ? '포함' : '제외'}`);
        
        // 오직 isFavorite가 명시적으로 true인 경우만 포함
        return isFav;
      });
      console.log('🔍 ImportantSite - 주요현장 필터링 결과:', importantSitesData);
      console.log('🔍 ImportantSite - 주요현장 개수:', importantSitesData.length);
      
      // 최대 10개까지만 표시
      const limitedSitesData = importantSitesData.slice(0, 10);
      console.log('🔍 ImportantSite - 최종 표시할 주요현장:', limitedSitesData);
      

      
      setSites(limitedSitesData);
      
      // 사이트 순서 초기화 - 사이트 데이터가 로드된 후에 실행
      setTimeout(() => {
        const savedOrder = localStorage.getItem('importantSiteOrder');
    
        if (savedOrder) {
          const orderArray = JSON.parse(savedOrder);
          // 현재 사이트 목록에 있는 ID만 필터링
          const validOrder = orderArray.filter(id => 
            limitedSitesData.some(site => site.id === id)
          );
          console.log('저장된 순서 로드:', validOrder);
          setSiteOrder(validOrder);
        } else {
          // 저장된 순서가 없으면 현재 순서로 초기화
          const initialOrder = limitedSitesData.map(site => site.id);
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

    const siteIds = sites.map(site => site.id);
    const unsubscribes = [];
    
    // 각 현장별로 기성 데이터 구독
    siteIds.forEach(siteId => {
      try {
        devLog(`SiteId ${siteId}에 대한 기성 쿼리 생성`);
        
        // siteId로 쿼리
        const gisungQuery = query(
          collection(db, 'gisung'), 
          where('siteId', '==', siteId)
        );
        
        const unsubscribe = onSnapshot(gisungQuery, (snapshot) => {
          const gisungItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          devLog(`Site ${siteId}의 기성 데이터 (${gisungItems.length}개):`, gisungItems);
          
          setGisungData(prev => ({
            ...prev,
            [siteId]: gisungItems
          }));
        }, (error) => {
          devError(`Error fetching gisung for site ${siteId}:`, error);
          setGisungData(prev => ({
            ...prev,
            [siteId]: []
          }));
        });
        
        unsubscribes.push(unsubscribe);
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
  }, [sites]);

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
  }, [sites]);

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

  // 검색어에 따라 필터링합니다.
  const filteredSites = search.trim()
    ? sortedSites.filter(site => site.name.includes(search.trim()))
    : sortedSites;

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
        grid: { color: '#333' },
        ticks: { color: '#bbb', font: { weight: 700 } }
      },
      y: {
        grid: { color: '#222' },
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
      overflow: 'hidden', 
      pb: 4, 
      mt: isMobile ? '30px' : 8,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 페이지 제목 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        px: isMobile ? 1 : 0
      }}>
        {!isMobile && (
          <Typography 
            variant="h4" 
            sx={{ 
              color: '#fff', 
              fontWeight: 600,
              fontSize: '2rem',
              transform: 'translate(30px, 10px)'
            }}
          >
            주요현장
          </Typography>
        )}
        
        {/* 상단 검색창 - 모바일에서 간소화 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end'
        }}>
        <TextField
          size="small"
          placeholder={isMobile ? "현장명, 소장으로 검색" : "현장명, 소장, 주소 검색"}
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ 
            width: isMobile ? '100%' : 320, 
            bgcolor: '#232b3b', 
            borderRadius: 2, 
            input: { color: '#fff' } 
          }}
          inputRef={scrollFocus(null)}
        />
        </Box>
      </Box>
      <Grid container spacing={2} sx={{ 
        width: '100%', 
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: isMobile ? '10px 0 0 6px' : '10px 10px 0 10px',
        border: '1px solid #333',
        borderRadius: 2,
        bgcolor: '#1a1a1a',
        mt: 0 // 마진 제거
      }}>
        {filteredSites.length === 0 && (
          <Typography sx={{ color: '#bbb', mt: 4 }}>
            {search.trim() !== '' ? '검색 결과가 없습니다.' : '주요현장으로 지정된 현장이 없습니다. 현장관리에서 별표를 체크하여 주요현장을 추가해주세요.'}
          </Typography>
        )}
        {filteredSites.map(site => {
          // siteId로 바로 접근해서 누계기성값 계산
          const siteGisungData = gisungData[site.id] || [];
          const totalGisung = siteGisungData.reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0);
          
          // 기성 데이터 계산 완료 (로그 제거됨)
          
          return (
            <Grid item xs={12} md={6} key={site.id}>
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
                  mb: 2.5, // 카드간 간격 20px (2.5 * 8px = 20px)
                  borderRadius: 4, 
                  boxShadow: 6, 
                  bgcolor: '#181f2e', 
                  color: '#fff', 
                  display: 'flex', 
                  flexDirection: { xs: 'column', md: 'row' }, 
                  alignItems: 'stretch', 
                  height: isMobile ? 'auto' : 400, // 높이를 380에서 400으로 통일
                  minWidth: isMobile ? 'calc(100vw - 20px)' : 'auto', 
                  width: '100%', 
                  p: 0, 
                  overflow: 'hidden',
                  marginLeft: isMobile ? '2px' : 0,
                  marginRight: isMobile ? '5px' : 0,
                  cursor: 'grab',
                  '&:active': {
                    cursor: 'grabbing'
                  },
                  opacity: draggedSiteId === site.id ? 0.5 : 1,
                  transform: draggedSiteId === site.id ? 'rotate(5deg)' : 'none',
                  transition: 'opacity 0.2s, transform 0.2s',
                  '&:hover': {
                    boxShadow: 8
                  }
                }}
              >
              {/* 왼쪽: 정보/버튼 */}
              <Box sx={{ 
                flex: 2.5, 
                minWidth: isMobile ? 'calc(100vw - 20px)' : 320, 
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
                    fontSize: isMobile ? '1rem' : '1.5rem'
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
                <Box sx={{ display: 'flex', gap: isMobile ? 1 : 3, width: '100%', alignItems: 'center', mb: isMobile ? 0.3 : 0.6 }}>
                  <Typography sx={{ 
                    fontSize: isMobile ? '0.75rem' : 16, 
                    color: '#43e97b', 
                    fontWeight: 700, 
                    textAlign: 'left' 
                  }}>계약구분: {site.contractType}</Typography>
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
                <Box sx={{ display: 'flex', gap: isMobile ? 1 : 3, width: '100%', alignItems: 'center', mb: isMobile ? 0.3 : 0.6 }}>
                                  <Typography sx={{ 
                  fontSize: isMobile ? '0.7rem' : 15, 
                  textAlign: 'left', 
                  minWidth: isMobile ? '60px' : '120px' 
                }}>계약금: {formatContractAmount(site.contractAmount)}</Typography>
                <Typography sx={{ 
                  fontSize: isMobile ? '0.7rem' : 15, 
                  textAlign: 'left', 
                  color: '#43e97b', 
                  fontWeight: 'bold' 
                }}>기성: {formatGisungAmount(totalGisung)}</Typography>
                </Box>
                {/* 잔액을 시공팀 위로 이동 */}
                <Box sx={{ display: 'flex', gap: isMobile ? 1 : 3, width: '100%', alignItems: 'center', mb: isMobile ? 0.3 : 0.6 }}>
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
                <Box sx={{ mt: 0, mb: isMobile ? 1 : 2, display: 'flex', gap: isMobile ? 1 : 2, flexWrap: 'wrap' }}>
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
                    onClick={() => navigate(`/progress?siteId=${site.id}`)}
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
                    onClick={() => navigate(`/safety?siteId=${site.id}`)}
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
                    onClick={() => navigate(`/discussions?siteId=${site.id}`)}
                  >토론</Button>
                </Box>
              </Box>
              {/* 가운데: 차트 - 모바일에서 숨김 */}
              {!isMobile && (
                <Box sx={{ flex: 1.7, minWidth: 320, maxWidth: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', bgcolor: '#181f2e', p: 0, height: '380px', borderRight: { md: '2px solid #232b3b' }, mt: 1 }}>
                  {/* 공사진행률 가로 차트 - 상단 고정 */}
                  <Box sx={{ width: '90%', mb: 2 }}>
                    <Typography sx={{ color: '#43e97b', fontWeight: 700, fontSize: 15, mb: 0.5 }}>공사진행률</Typography>
                    {(() => {
                      // 기성 데이터 기반으로 진행율 계산
                      const contract = Number(site.contractAmount) || 0;
                      const calculatedPercent = contract > 0 ? Math.round((totalGisung / contract) * 100) : 0;
                      
                      const percent = editingProgress[site.id]
                        ? (progressInput[site.id] ?? calculatedPercent)
                        : calculatedPercent;
                      return (
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{ height: 18, borderRadius: 6, bgcolor: '#232b3b', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)' } }}
                        />
                      );
                    })()}
                  </Box>
                  {/* 진행률 바(숫자 입력) - 상단 고정 */}
                  {(() => {
                    // 기성 데이터 기반으로 진행율 계산
                    const contract = Number(site.contractAmount) || 0;
                    const calculatedPercent = contract > 0 ? Math.round((totalGisung / contract) * 100) : 0;
                    
                    const isEditing = editingProgress[site.id];
                    const percent = isEditing
                      ? (progressInput[site.id] ?? calculatedPercent)
                      : calculatedPercent;
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
                  <Box sx={{ width: '100%', height: '100%', flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', p: 0, m: 0 }}>
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
                            grid: { color: '#333' },
                            ticks: { color: '#bbb', font: { weight: 700, size: 12 } }
                          },
                          y: {
                            grid: { color: '#222' },
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
              {/* 오른쪽: 조감도 이미지 - 모바일에서 숨김 */}
              {!isMobile && (
                <Box
                  sx={{ flex: 1.5, minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#222', cursor: !site.imageUrl && !uploadingSiteId ? 'pointer' : 'default', position: 'relative' }}
                  onClick={!site.imageUrl && !uploadingSiteId ? () => handleImageClick(site.id) : undefined}
                  onMouseEnter={() => setHoveredSiteId(site.id)}
                  onMouseLeave={() => setHoveredSiteId(null)}
                >
                  {uploadingSiteId === site.id ? (
                    <CircularProgress color="warning" />
                  ) : site.imageUrl ? (
                    <>
                      <img src={site.imageUrl} alt="조감도" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, filter: hoveredSiteId === site.id ? 'brightness(0.7)' : 'none' }} />
                      {hoveredSiteId === site.id && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.4)' }}>
                          <Button variant="contained" size="small" sx={{ mb: 1, bgcolor: '#ffd600', color: '#222', fontWeight: 700 }} onClick={e => { e.stopPropagation(); handleImageClick(site.id); }}>교체</Button>
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
  );
} 