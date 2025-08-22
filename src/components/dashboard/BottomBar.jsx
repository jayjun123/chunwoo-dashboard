import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip, Badge, Modal, Paper, Drawer, List, ListItem, ListItemIcon, ListItemText, Checkbox, Button, Popover, TextField, Slide, useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { devLog, devError } from '../../utils/performanceUtils';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ForumIcon from '@mui/icons-material/Forum';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import OpacityIcon from '@mui/icons-material/Opacity';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SafetyHelmetIcon from '@mui/icons-material/SafetyCheck';
import AddIcon from '@mui/icons-material/Add';
import SecurityIcon from '@mui/icons-material/Security';
import CalculateIcon from '@mui/icons-material/Calculate';
import CategoryIcon from '@mui/icons-material/Category';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePopup } from '../../contexts/PopupContext';
import { format } from 'date-fns';
import { getKoreanDate, isSameDate } from '../../utils/dateUtils';

// 날짜 비교 함수 추가
function isDateBefore(dateStr1, dateStr2) {
  const date1 = new Date(dateStr1);
  const date2 = new Date(dateStr2);
  return date1 < date2;
}
import { 
  sendCountNotification, 
  checkNotificationPermission,
  loadNotificationSettings 
} from '../../utils/notificationUtils';

// 관리자/마스터 권한 체크 함수
function isAdminOrMaster(user) {
  if (!user) return false;
  if (user.role === 'master' || user.role === 'admin') return true;
  if (user.email === 'fire8803@naver.com' || user.uid === 'HpF5IrlTscYbWPsUhtdzV05sjbF2') return true;
  return false;
}

// props: 날짜, 날씨, 온도, 현장/기성/협의/안전/ToDo/관리 등 실시간 데이터, 클릭 이벤트 핸들러
const BottomBar = ({
  dateText,
  weatherIcon = <WbSunnyIcon sx={{ color: '#FFD600', fontSize: 20, verticalAlign: 'middle' }} />, // ☀️
  temperature,
  onWeather,
  onSites,
  onProgress,
  onDiscussion,
  onSafety,
  onTodo,
  onManage,
  keyboardVisibleProp = false
}) => {
  const { currentUser } = useAuth();
  
  // 관리자/마스터 권한 체크
  const isAdminOrMasterUser = isAdminOrMaster(currentUser);

  const [stats, setStats] = useState({
    todaySites: 0,
    todayCompleted: 0,
    monthCompleted: 0,
    progressCount: 0,
    discussionCount: 0,
    safetyCount: 0,
    estimateCount: 0,
    bidCount: 0,
    etcCount: 0,
    todoDone: 0,
    todoTotal: 0
  });

  // 팝업 상태 관리
  const [openProgress, setOpenProgress] = useState(false);
  const [openDiscussion, setOpenDiscussion] = useState(false);
  const [openSafety, setOpenSafety] = useState(false);
  const [openTodo, setOpenTodo] = useState(false);

  // 팝업 데이터 상태
  const [progressList, setProgressList] = useState([]);
  const [discussionList, setDiscussionList] = useState([]);
  const [safetyList, setSafetyList] = useState([]);
  const [todoList, setTodoList] = useState([]);
  const [setupList, setSetupList] = useState([]); // 금일현설용 별도 상태
  const [estimateList, setEstimateList] = useState([]); // 금일견적용 별도 상태
  const [bidList, setBidList] = useState([]); // 금일입찰용 별도 상태 (estimates에서)
  const [etcList, setEtcList] = useState([]); // 금일기타용 별도 상태
  const [sitesList, setSitesList] = useState([]); // 현장 목록
  const [notificationSettings, setNotificationSettings] = useState({});
  const [lastNotificationTime, setLastNotificationTime] = useState({});

  // 햄버거 메뉴 Drawer 상태
  const [drawerOpen, setDrawerOpen] = useState(false);

  // PopupProvider 컨텍스트 사용하지 않음 (필요시 나중에 추가)
  const registerPopup = () => {};
  const unregisterPopup = () => {};

  // 알림 설정 로드
  useEffect(() => {
    const settings = loadNotificationSettings();
    setNotificationSettings(settings);
  }, []);

  // 알림 보내기 함수
  const sendCountNotificationIfNeeded = (type, count) => {
    if (!notificationSettings.count || checkNotificationPermission() !== 'granted') {
      return;
    }

    const now = Date.now();
    const lastTime = lastNotificationTime[type] || 0;
    const timeDiff = now - lastTime;

    // 5분(300000ms) 이내에 같은 타입의 알림을 보낸 적이 있으면 스킵
    if (timeDiff < 300000) {
      return;
    }

    // 카운트가 0보다 클 때만 알림
    if (count > 0) {
      sendCountNotification(type, count);
      setLastNotificationTime(prev => ({
        ...prev,
        [type]: now
      }));
    }
  };
  const navigate = useNavigate();
  const theme = useTheme();
  const [isMaster, setIsMaster] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isMobile = useMediaQuery('(max-width:600px)');

  const [error, setError] = useState('');

  const [todoInput, setTodoInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [loadTodoDialog, setLoadTodoDialog] = useState(false);
  const [yesterdayTodos, setYesterdayTodos] = useState([]);
  const [selectedTodos, setSelectedTodos] = useState([]);

  // 확장 상태 관리
  const [expandWeather, setExpandWeather] = useState(false);
  const [expandCenter, setExpandCenter] = useState(false);
  const [expandTodo, setExpandTodo] = useState(false);
  const [expandSettings, setExpandSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // 하단바 전체 확장/축소 상태
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 현재 날짜를 실시간으로 업데이트
  useEffect(() => {
    const updateCurrentDate = () => {
      setCurrentDate(new Date());
    };
    
    // 초기 업데이트
    updateCurrentDate();
    
    // 매일 자정에 업데이트 (한국 시간 기준)
    const now = new Date();
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const tomorrow = new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - koreanTime.getTime();
    
    const midnightTimer = setTimeout(() => {
      updateCurrentDate();
      // 이후 24시간마다 업데이트
      setInterval(updateCurrentDate, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
    
    return () => {
      clearTimeout(midnightTimer);
    };
  }, []);

  const [settingsTab, setSettingsTab] = useState(0); // 0:회원, 1:권한, 2:설정

  // Popover 앵커 상태
  const [anchorElSettings, setAnchorElSettings] = useState(null);

  // todoList의 최신 값을 참조하기 위한 ref
  const todoListRef = useRef(todoList);
  todoListRef.current = todoList;



  // 날짜를 'YYYY. M. D (요일)' 한글로 포맷팅하는 함수
  function formatDate(date) {
    const week = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(date);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${week[d.getDay()]})`;
  }








  // 현장 데이터 fetch (stats용) - 제거: 일정 기반으로 통일

  useEffect(() => {
    // 일정관리에서 금일 데이터 fetch + 최근 5개
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    console.log('🔥 하단바 일정 연동 시작 - 오늘 날짜 범위:', todayStart, '~', todayEnd);
    
    // Firebase에서 타임스탬프 date 필드로 오늘 날짜 범위 쿼리
    const q = query(collection(db, 'schedules'));
    
    const unsubSchedules = onSnapshot(q, (snapshot) => {
      const allSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 클라이언트에서 오늘 날짜 필터링 (문자열과 Date 객체 모두 처리)
      const todaySchedules = allSchedules.filter(item => {
        if (!item.date) return false;
        
        let itemDate;
        if (item.date.toDate) {
          // Firestore Timestamp
          itemDate = item.date.toDate();
        } else if (item.date instanceof Date) {
          // Date 객체
          itemDate = item.date;
        } else if (typeof item.date === 'string') {
          // 문자열 형식 (예: "2024-01-15")
          itemDate = new Date(item.date + 'T12:00:00');
        } else {
          // 기타 형식
          itemDate = new Date(item.date);
        }
        
        // 오늘 날짜 계산 (로컬 시간 기준)
        const now = new Date();
        const todayYear = now.getFullYear();
        const todayMonth = now.getMonth();
        const todayDay = now.getDate();
        
        const itemYear = itemDate.getFullYear();
        const itemMonth = itemDate.getMonth();
        const itemDay = itemDate.getDate();
        
        // 날짜가 오늘과 같은지 확인
        return itemYear === todayYear && itemMonth === todayMonth && itemDay === todayDay;
      });
      
      console.log('🔥 Firebase에서 가져온 오늘 일정 (클라이언트 필터링):', todaySchedules);
      console.log('🔥 오늘 일정 상세 정보:', todaySchedules.map(item => ({
        id: item.id,
        text: item.text,
        type: item.type,
        date: item.date
      })));
      
      // 전자입찰 관련 일정 찾기
      const electronicBids = todaySchedules.filter(item => 
        item.text && item.text.includes('전자입찰')
      );
      console.log('🔥 전자입찰 관련 일정:', electronicBids);
      
      // 입찰 관련 일정 찾기 (더 넓은 범위)
      const allBidRelated = todaySchedules.filter(item => 
        (item.text && (item.text.includes('입찰') || item.text.includes('전자입찰'))) ||
        (item.type && (item.type.includes('입찰') || item.type.includes('전자입찰')))
      );
      console.log('🔥 모든 입찰 관련 일정:', allBidRelated);
      
      // 금일현장 (type에 '현장' 또는 '실측' 포함)
      const todaySites = todaySchedules.filter(item => {
        if (!item.type) return false;
        
        // type이 문자열인 경우 (단일 타입)
        if (typeof item.type === 'string') {
          // 쉼표로 구분된 여러 타입이 있을 수 있음
          const types = item.type.split(',').map(t => t.trim());
          return types.some(type => type.includes('현장') || type.includes('실측'));
        }
        
        // type이 배열인 경우 (다중 타입)
        if (Array.isArray(item.type)) {
          return item.type.some(type => type.includes('현장') || type.includes('실측'));
        }
        
        return false;
      });
      console.log('🔥 금일현장:', todaySites.length, '개', todaySites);
      
      // 금일입찰 (type에 '입찰' 또는 '전자입찰' 포함)
      const todayBids = todaySchedules.filter(item => {
        if (!item.type) return false;
        
        // type이 문자열인 경우 (단일 타입)
        if (typeof item.type === 'string') {
          // 쉼표로 구분된 여러 타입이 있을 수 있음
          const types = item.type.split(',').map(t => t.trim());
          const hasBid = types.some(type => type.includes('입찰') || type.includes('전자입찰'));
          if (hasBid) {
            console.log('🔥 입찰 일정 발견:', {
              id: item.id,
              text: item.text,
              type: item.type,
              types: types
            });
          }
          return hasBid;
        }
        
        // type이 배열인 경우 (다중 타입)
        if (Array.isArray(item.type)) {
          const hasBid = item.type.some(type => type.includes('입찰') || type.includes('전자입찰'));
          if (hasBid) {
            console.log('🔥 입찰 일정 발견 (배열):', {
              id: item.id,
              text: item.text,
              type: item.type
            });
          }
          return hasBid;
        }
        
        return false;
      });
      console.log('🔥 금일입찰:', todayBids.length, '개', todayBids);
      
      // 금일회의 (type에 '회의' 포함)
      const todayMeetings = todaySchedules.filter(item => {
        if (!item.type) return false;
        
        // type이 문자열인 경우 (단일 타입)
        if (typeof item.type === 'string') {
          // 쉼표로 구분된 여러 타입이 있을 수 있음
          const types = item.type.split(',').map(t => t.trim());
          return types.some(type => type.includes('회의'));
        }
        
        // type이 배열인 경우 (다중 타입)
        if (Array.isArray(item.type)) {
          return item.type.some(type => type.includes('회의'));
        }
        
        return false;
      });
      console.log('🔥 금일회의:', todayMeetings.length, '개', todayMeetings);
      
      // 금일현설 (type에 '현설' 포함)
      const todaySetup = todaySchedules.filter(item => {
        if (!item.type) return false;
        
        // type이 문자열인 경우 (단일 타입)
        if (typeof item.type === 'string') {
          // 쉼표로 구분된 여러 타입이 있을 수 있음
          const types = item.type.split(',').map(t => t.trim());
          return types.some(type => type.includes('현설'));
        }
        
        // type이 배열인 경우 (다중 타입)
        if (Array.isArray(item.type)) {
          return item.type.some(type => type.includes('현설'));
        }
        
        return false;
      });
      console.log('🔥 금일현설:', todaySetup.length, '개', todaySetup);
      
      // 금일기타 (type에 '기타' 포함)
      const todayEtc = todaySchedules.filter(item => {
        if (!item.type) return false;
        
        // type이 문자열인 경우 (단일 타입)
        if (typeof item.type === 'string') {
          // 쉼표로 구분된 여러 타입이 있을 수 있음
          const types = item.type.split(',').map(t => t.trim());
          return types.some(type => type.includes('기타'));
        }
        
        // type이 배열인 경우 (다중 타입)
        if (Array.isArray(item.type)) {
          return item.type.some(type => type.includes('기타'));
        }
        
        return false;
      });
      console.log('🔥 금일기타:', todayEtc.length, '개', todayEtc);
      
      // stats를 한 번에 업데이트 (견적은 별도로 처리)
      const newStats = {
        todaySites: todaySites.length,
        bidCount: todayBids.length, // 입찰 개수는 bidCount에 할당
        discussionCount: todayMeetings.length,
        safetyCount: todaySetup.length,
        etcCount: todayEtc.length
      };
      
      console.log('🔥 하단바 stats 업데이트:', newStats);
      console.log('🔥 todayBids 개수:', todayBids.length);
      console.log('🔥 todayBids 상세:', todayBids.map(item => ({
        id: item.id,
        text: item.text,
        type: item.type,
        date: item.date
      })));
      
      setStats(prev => {
        const updatedStats = {
          ...prev,
          ...newStats
        };
        
        // 알림 보내기
        sendCountNotificationIfNeeded('sites', newStats.todaySites);
        sendCountNotificationIfNeeded('progress', newStats.progressCount);
        sendCountNotificationIfNeeded('discussion', newStats.discussionCount);
        sendCountNotificationIfNeeded('safety', newStats.safetyCount);
        
        return updatedStats;
      });
      
      setProgressList(todaySites.reverse());
      setDiscussionList(todayBids.reverse());
      setSafetyList(todayMeetings.reverse());
      setSetupList(todaySetup.reverse());
      setEtcList(todayEtc.reverse());
      
      // 일정 데이터에서 입찰 항목을 bidList에 추가
      console.log('🔥 todayBids 상세 분석:', todayBids.map(item => ({
        id: item.id,
        text: item.text,
        type: item.type,
        date: item.date,
        completed: item.completed
      })));
      
      console.log('🔥 allBidRelated 상세 분석:', allBidRelated.map(item => ({
        id: item.id,
        text: item.text,
        type: item.type,
        date: item.date,
        completed: item.completed
      })));
      
      // 기존 bidList와 일정 데이터의 입찰 항목을 합침
      setBidList(prevBidList => {
        // todayBids가 비어있으면 allBidRelated 사용
        const effectiveBids = todayBids.length > 0 ? todayBids : allBidRelated;
        
        const scheduleBids = effectiveBids.map(item => ({
          id: item.id,
          siteName: item.text || item.title || '입찰',
          company: item.siteName || '',
          requester: item.desc || '입찰요청',
          requestContent: item.desc || '입찰요청',
          submissionDeadline: item.date,
          submissionStatus: item.completed ? '제출완료' : '제출대기',
          type: '입찰',
          isFromSchedule: true // 일정에서 온 데이터임을 표시
        }));
        
        const combinedBids = [...prevBidList, ...scheduleBids];
        // 중복 제거 (id 기준)
        const uniqueBids = combinedBids.filter((bid, index, self) => 
          index === self.findIndex(b => b.id === bid.id)
        );
        // 최신순으로 정렬
        const sortedBids = uniqueBids.sort((a, b) => {
          const dateA = new Date(a.submissionDeadline);
          const dateB = new Date(b.submissionDeadline);
          return dateB - dateA;
        });
        
        console.log('🔥 통합된 bidList:', sortedBids);
        return sortedBids.reverse();
      });
    }, (err) => {
      console.error('🔥 하단바 일정 연동 오류:', err);
      setError('일정관리 데이터를 불러오는 중 오류가 발생했습니다.');
    });

    return () => {
      console.log('🔥 하단바 일정 연동 해제');
      unsubSchedules();
    };
  }, []);

  // 견적 데이터 별도 처리 (estimates 컬렉션에서)
  useEffect(() => {
    // 한국 시간 기준으로 오늘 날짜 계산
    const now = new Date();
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const todayStr = koreanTime.toISOString().split('T')[0];
    console.log('🔥 하단바 견적 연동 시작 - 한국 시간 기준 오늘 날짜:', todayStr);
    
    const q = query(collection(db, 'estimates'));
    
    const unsubEstimates = onSnapshot(q, (snapshot) => {
      console.log('🔥 견적 데이터 실시간 업데이트 감지:', snapshot.size, '개 문서');
      
      const allEstimates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('🔥 전체 견적 데이터:', allEstimates);
      
      // 제출기한이 오늘인 견적과 미제출된 날짜 지난 견적 필터링
      const todayEstimates = allEstimates.filter(estimate => {
        if (!estimate.submissionDeadline) return false;
        
        // 개선된 날짜 비교 사용
        const isToday = isSameDate(estimate.submissionDeadline, todayStr);
        const isOverdue = isDateBefore(estimate.submissionDeadline, todayStr);
        const isNotSubmitted = estimate.submissionStatus !== '제출완료';
        
        // 오늘 날짜인 견적 또는 미제출된 날짜 지난 견적
        const shouldInclude = isToday || (isOverdue && isNotSubmitted);
        
        // 디버깅 로그 추가
        if (shouldInclude) {
          console.log('🔥 포함된 견적:', estimate, '제출상태:', estimate.submissionStatus, '타입:', estimate.type, '오늘여부:', isToday, '지난여부:', isOverdue);
        }
        
        return shouldInclude;
      });
      
      console.log('🔥 전체 견적 개수:', allEstimates.length);
      console.log('🔥 한국 시간 기준 오늘 날짜:', todayStr);
      console.log('🔥 금일제출견적:', todayEstimates.length, '개', todayEstimates);
      
      // 모든 견적의 submissionDeadline 상세 확인
      console.log('🔥 === 모든 견적 데이터 상세 분석 ===');
      allEstimates.forEach((estimate, index) => {
        const parsedDate = new Date(estimate.submissionDeadline);
        const isToday = isSameDate(estimate.submissionDeadline, todayStr);
        
        console.log(`🔥 견적 ${index + 1}:`, {
          id: estimate.id,
          siteName: estimate.siteName,
          submissionDeadline: estimate.submissionDeadline,
          submissionDeadlineType: typeof estimate.submissionDeadline,
          parsedDate: parsedDate.toISOString().split('T')[0],
          parsedDateValid: !isNaN(parsedDate.getTime()),
          submissionStatus: estimate.submissionStatus,
          type: estimate.type,
          isToday: isToday
        });
      });
      console.log('🔥 === 오늘 견적만 ===');
      todayEstimates.forEach((estimate, index) => {
        console.log(`🔥 오늘 견적 ${index + 1}:`, {
          id: estimate.id,
          siteName: estimate.siteName,
          submissionDeadline: estimate.submissionDeadline,
          submissionStatus: estimate.submissionStatus,
          type: estimate.type
        });
      });
      
      // 견적과 입찰을 분류 (타입 변경 감지 강화)
      const estimates = todayEstimates.filter(estimate => estimate.type !== '입찰');
      const bids = todayEstimates.filter(estimate => estimate.type === '입찰');
      
      console.log('🔥 견적/입찰 분류 결과:', {
        전체: todayEstimates.length,
        견적: estimates.length,
        입찰: bids.length,
        견적목록: estimates.map(e => ({ id: e.id, siteName: e.siteName, type: e.type })),
        입찰목록: bids.map(b => ({ id: b.id, siteName: b.siteName, type: b.type }))
      });
      
      // 타입 변경 감지 강화
      if (todayEstimates.length > 0) {
        console.log('🔥 타입 변경 감지 - 최근 업데이트된 견적들:');
        todayEstimates.forEach((estimate, index) => {
          if (estimate.updatedAt) {
            console.log(`🔥 견적 ${index + 1} (최근 업데이트):`, {
              id: estimate.id,
              siteName: estimate.siteName,
              type: estimate.type,
              updatedAt: estimate.updatedAt,
              submissionStatus: estimate.submissionStatus
            });
          }
        });
      }
      
      // stats 업데이트 - estimates의 입찰 데이터와 일정 데이터의 입찰 개수를 합침
      setStats(prev => {
        const updatedStats = {
          ...prev,
          estimateCount: estimates.length,
          bidCount: prev.bidCount + bids.length, // 기존 일정 데이터의 입찰 개수 + 견적 데이터의 입찰 개수
          progressCount: prev.bidCount + bids.length  // estimates의 입찰 카운트로 progressCount 덮어쓰기
        };
        
        console.log('🔥 하단바 stats 업데이트 (estimates 우선):', updatedStats);
        console.log('🔥 estimates 입찰 개수:', bids.length);
        console.log('🔥 progressCount 업데이트됨:', bids.length);
        
        // 견적 알림 보내기
        sendCountNotificationIfNeeded('estimates', estimates.length);
        sendCountNotificationIfNeeded('bids', bids.length);
        
        return updatedStats;
      });
      
      // 견적만 표시 (최신순)
      const sortedEstimates = estimates.sort((a, b) => {
        const dateA = new Date(a.submissionDeadline);
        const dateB = new Date(b.submissionDeadline);
        return dateB - dateA;
      });
      
      // 입찰만 표시 (최신순)
      const sortedBids = bids.sort((a, b) => {
        const dateA = new Date(a.submissionDeadline);
        const dateB = new Date(b.submissionDeadline);
        return dateB - dateA;
      });
      
      setEstimateList(sortedEstimates.slice(-5).reverse());
      
      // 견적 데이터의 입찰 항목을 bidList에 설정
      const estimateBids = sortedBids.slice(-5).reverse();
      
      // 기존 bidList와 견적 데이터의 입찰 항목을 합침
      setBidList(prevBidList => {
        const combinedBids = [...prevBidList, ...estimateBids];
        // 중복 제거 (id 기준)
        const uniqueBids = combinedBids.filter((bid, index, self) => 
          index === self.findIndex(b => b.id === bid.id)
        );
        // 최신순으로 정렬
        const sortedBids = uniqueBids.sort((a, b) => {
          const dateA = new Date(a.submissionDeadline);
          const dateB = new Date(b.submissionDeadline);
          return dateB - dateA;
        });
        
        console.log('🔥 견적 데이터에서 설정된 bidList:', estimateBids);
        console.log('🔥 통합된 bidList (견적):', sortedBids);
        return sortedBids.slice(-5).reverse();
      });
    }, (err) => {
      console.error('🔥 하단바 견적 연동 오류:', err);
      setError('견적 데이터를 불러오는 중 오류가 발생했습니다.');
    });

    return () => {
      console.log('🔥 하단바 견적 연동 해제');
      unsubEstimates();
    };
  }, []);

  // ToDoList fetch + 최근 20개 (별도 관리)
  useEffect(() => {
    const unsubTodos = onSnapshot(collection(db, 'todos'), (snapshot) => {
      const arr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 현재 사용자의 투두리스트만 필터링
      const userTodos = arr.filter(item => item.userId === currentUser?.uid);
      
      // 한국 시간 기준으로 오늘 날짜 범위 계산
      const now = new Date();
      const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      const todayStart = new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate(), 0, 0, 0);
      const todayEnd = new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate(), 23, 59, 59);
      
      const todayTodos = userTodos.filter(item => {
        // 한국 시간 기준으로 오늘 날짜 생성
        const now = new Date();
        const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const todayYear = koreanTime.getFullYear();
        const todayMonth = String(koreanTime.getMonth() + 1).padStart(2, '0');
        const todayDay = String(koreanTime.getDate()).padStart(2, '0');
        const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
        
        // 1. date 필드가 있으면 date로 체크 (우선순위)
        if (item.date === todayStr) return true;
        
        // 2. createdAt 필드가 있으면 createdAt으로 체크
        if (item.createdAt) {
          let itemDate;
          if (item.createdAt.toDate) {
            // Firestore Timestamp
            itemDate = item.createdAt.toDate();
          } else if (item.createdAt instanceof Date) {
            // Date 객체
            itemDate = item.createdAt;
          } else {
            // 문자열이나 숫자
            itemDate = new Date(item.createdAt);
          }
          
          // 오늘 00:00:00 ~ 23:59:59 사이에 생성된 항목만
          return itemDate >= todayStart && itemDate <= todayEnd;
        }
        
        return false;
      });
      
      const filtered = todayTodos.filter(item => !['샘플','테스트','임시'].some(word => (item.text||item.title||'').includes(word)));
      
      // 최신 순서로 정렬 (timestamp 또는 createdAt 기준)
      const sorted = filtered.sort((a, b) => {
        const timeA = a.timestamp || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime());
        const timeB = b.timestamp || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime());
        return timeB - timeA; // 최신이 위로
      });
      
      const done = sorted.filter(t => t.completed).length;
      
      console.log('투두리스트 필터링:', {
        전체: arr.length,
        사용자: currentUser?.uid,
        사용자투두: userTodos.length,
        오늘: todayTodos.length,
        필터링: filtered.length,
        정렬후: sorted.length,
        완료: done
      });
      
      setStats(prev => {
        const updatedStats = { ...prev, todoDone: done, todoTotal: sorted.length };
        
        // 투두 알림 보내기 (완료되지 않은 투두가 있을 때)
        const incompleteCount = sorted.length - done;
        sendCountNotificationIfNeeded('todos', incompleteCount);
        
        return updatedStats;
      });
      setTodoList(sorted.slice(0, 20)); // 최신 20개만 표시
    }, (err) => setError('ToDoList 데이터를 불러오는 중 오류가 발생했습니다.'));

    return () => {
      unsubTodos();
    };
  }, [currentUser?.uid]);

  // ToDo 확장 팝업용 스타일
  const todoPopupStyle = {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    border: '1.5px solid #222',
    padding: '24px 20px 20px 20px',
    minWidth: 320,
    maxWidth: 400,
    width: '95%',
    margin: '0 auto',
    position: 'relative',
    fontFamily: 'inherit',
    backgroundImage: 'repeating-linear-gradient(to bottom, #fff, #fff 32px, #eee 32px, #eee 34px)',
  };

  // 확장 패널 동시 오픈 방지
  const handleOpenPanel = useCallback((panel) => {
    setExpandWeather(panel === 'weather' ? !expandWeather : false);
    setExpandCenter(panel === 'center' ? !expandCenter : false);
    setExpandTodo(panel === 'todo' ? !expandTodo : false);
  }, [expandWeather, expandCenter, expandTodo]);

  // 확장 패널 닫기: ESC, 외부 클릭 지원
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setExpandCenter(false);
      setExpandWeather(false);
      setExpandTodo(false);
      setExpandSettings(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function handleBackdropClick(e, closeFn) {
    if (e.target === e.currentTarget) {
      closeFn(false);
    }
  }

  // 외부 클릭 시 모든 확장 패널 닫기
  const handleClickOutside = useCallback((event) => {
    // 확장 패널들이 열려있고, 클릭이 패널 외부에서 발생한 경우
    if ((expandWeather || expandCenter || expandTodo || expandSettings) && 
        !event.target.closest('[data-panel]')) {
      setExpandWeather(false);
      setExpandCenter(false);
      setExpandTodo(false);
      setExpandSettings(false);
    }
  }, [expandWeather, expandCenter, expandTodo, expandSettings]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!todoInput.trim()) return;

    try {
      // 한국 시간 기준으로 오늘 날짜 생성
      const now = new Date();
      const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      const todayYear = koreanTime.getFullYear();
      const todayMonth = String(koreanTime.getMonth() + 1).padStart(2, '0');
      const todayDay = String(koreanTime.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

      await addDoc(collection(db, 'todos'), {
        text: todoInput.trim(),
        completed: false,
        userId: currentUser.uid,
        date: todayStr, // 한국 시간 기준 오늘 날짜
        createdAt: new Date(),
        updatedAt: new Date(),
        timestamp: Date.now() // 정확한 시간순 정렬을 위한 타임스탬프 추가
      });
      setTodoInput('');
      console.log('투두 추가됨:', {
        text: todoInput.trim(),
        date: todayStr,
        koreanTime: koreanTime.toISOString()
      });
    } catch (error) {
      console.error('할일 추가 실패:', error);
      setError('할일을 추가하는데 실패했습니다.');
    }
  };

  const handleToggleTodo = async (item) => {
    try {
      await updateDoc(doc(db, 'todos', item.id), {
        completed: !item.completed,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('할일 상태 변경 실패:', error);
      setError('할일 상태를 변경하는데 실패했습니다.');
    }
  };

  const handleDeleteTodo = async (item) => {
    try {
      await deleteDoc(doc(db, 'todos', item.id));
    } catch (error) {
      console.error('할일 삭제 실패:', error);
      setError('할일을 삭제하는데 실패했습니다.');
    }
  };

  const handleEditTodo = async (item) => {
    try {
      await updateDoc(doc(db, 'todos', item.id), {
        text: item.text,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('할일 수정 실패:', error);
      setError('할일을 수정하는데 실패했습니다.');
    }
  };

  // 매일 00:00 리셋 기능
  useEffect(() => {
    const checkDailyReset = () => {
      const now = new Date();
      const lastReset = localStorage.getItem('lastTodoReset');
      const lastResetDate = lastReset ? new Date(lastReset) : null;
      
      // 오늘 날짜와 마지막 리셋 날짜가 다르면 리셋
      if (!lastResetDate || lastResetDate.getDate() !== now.getDate() || 
          lastResetDate.getMonth() !== now.getMonth() || 
          lastResetDate.getFullYear() !== now.getFullYear()) {
        
        // 전날 미완료 항목들을 저장
        const incompleteTodos = todoListRef.current.filter(todo => !todo.completed);
        if (incompleteTodos.length > 0) {
          localStorage.setItem('yesterdayIncompleteTodos', JSON.stringify(incompleteTodos));
        }
        
        // 오늘 날짜로 리셋 기록
        localStorage.setItem('lastTodoReset', now.toISOString());
        
        // 모든 완료된 항목들 삭제 (미완료는 유지)
        todoListRef.current.forEach(async (todo) => {
          if (todo.completed) {
            try {
              await deleteDoc(doc(db, 'todos', todo.id));
            } catch (error) {
              console.error('완료된 할일 삭제 실패:', error);
            }
          }
        });
      }
    };

    // 페이지 로드 시 체크
    checkDailyReset();
    
    // 매분마다 체크 (00:00에 리셋되도록)
    const interval = setInterval(checkDailyReset, 60000);
    
    return () => clearInterval(interval);
  }, []); // todoList 의존성 제거

  // 전날 미완료 투두 불러오기 다이얼로그 열기
  const handleLoadYesterdayIncomplete = async () => {
    try {
      if (!currentUser) {
        setError('로그인이 필요합니다.');
        return;
      }

      // 전날 날짜 계산 (한국 시간 기준)
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      // 한국 시간 기준으로 날짜 문자열 생성
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${year}-${month}-${day}`;
      
      // 오늘 날짜도 한국 시간 기준으로
      const todayYear = today.getFullYear();
      const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDay = String(today.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

      devLog('전날 날짜:', yesterdayStr);
      devLog('오늘 날짜:', todayStr);

      // 전날 미완료 투두들을 createdAt 필드로 가져오기 (더 정확한 조회)
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      const yesterdayQuery = query(
        collection(db, 'todos'),
        where('userId', '==', currentUser.uid),
        where('completed', '==', false),
        orderBy('createdAt', 'desc')
      );
      
      const yesterdaySnapshot = await getDocs(yesterdayQuery);
      const allIncompleteTodos = yesterdaySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 클라이언트에서 전날 데이터 필터링
      const incompleteTodos = allIncompleteTodos.filter(todo => {
        // date 필드가 있으면 date로 체크
        if (todo.date === yesterdayStr) return true;
        
        // createdAt 필드가 있으면 createdAt으로 체크
        if (todo.createdAt) {
          let todoDate;
          if (todo.createdAt.toDate) {
            todoDate = todo.createdAt.toDate();
          } else if (todo.createdAt instanceof Date) {
            todoDate = todo.createdAt;
          } else {
            todoDate = new Date(todo.createdAt);
          }
          
          return todoDate >= yesterdayStart && todoDate <= yesterdayEnd;
        }
        
        return false;
      });

      devLog('전날 미완료 투두 개수:', incompleteTodos.length);
      devLog('전날 범위:', { start: yesterdayStart, end: yesterdayEnd });
      devLog('전체 미완료 투두:', allIncompleteTodos.length);

      if (incompleteTodos.length === 0) {
        setError('불러올 전날 미완료 항목이 없습니다.');
        return;
      }

      setYesterdayTodos(incompleteTodos);
      setSelectedTodos([]);
      setLoadTodoDialog(true);
    } catch (error) {
      devError('전날 미완료 항목 조회 실패:', error);
      setError('전날 미완료 항목을 조회하는데 실패했습니다.');
    }
  };

  // 선택된 투두 불러오기
  const handleLoadSelectedTodos = async () => {
    try {
      if (!currentUser) {
        setError('로그인이 필요합니다.');
        return;
      }
      
      if (selectedTodos.length === 0) {
        setError('불러올 항목을 선택해주세요.');
        return;
      }
      
      // 한국 시간 기준으로 오늘 날짜 생성
      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDay = String(today.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
      
      // 오늘 이미 존재하는 투두 체크 (중복 방지)
      const todayQuery = query(
        collection(db, 'todos'),
        where('userId', '==', currentUser.uid)
      );
      const todaySnapshot = await getDocs(todayQuery);
      
      // 오늘 날짜 필터링 (date 필드 또는 createdAt 필드로)
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const existingTodos = todaySnapshot.docs
        .map(doc => doc.data())
        .filter(todo => {
          // date 필드가 있으면 date로 체크
          if (todo.date === todayStr) return true;
          
          // date 필드가 없으면 createdAt으로 체크
          if (todo.createdAt) {
            let todoDate;
            if (todo.createdAt.toDate) {
              todoDate = todo.createdAt.toDate();
            } else if (todo.createdAt instanceof Date) {
              todoDate = todo.createdAt;
            } else {
              todoDate = new Date(todo.createdAt);
            }
            return todoDate >= todayStart && todoDate <= todayEnd;
          }
          return false;
        })
        .map(todo => todo.text);
      
      let addedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // 선택된 투두들을 오늘로 추가 (중복 체크)
      for (const todoId of selectedTodos) {
        try {
          const todo = yesterdayTodos.find(t => t.id === todoId);
          if (!todo) {
            console.warn('투두를 찾을 수 없음:', todoId);
            errorCount++;
            continue;
          }
          
          // 중복 체크 (대소문자 무시, 공백 제거 후 비교)
          const normalizedTodoText = todo.text.trim().toLowerCase();
          const isDuplicate = existingTodos.some(existing => 
            existing.trim().toLowerCase() === normalizedTodoText
          );
          
          if (isDuplicate) {
            skippedCount++;
            continue;
          }
          
          // 새 투두 추가
          await addDoc(collection(db, 'todos'), {
            text: todo.text,
            completed: false,
            userId: currentUser.uid,
            date: todayStr,
            createdAt: new Date(),
            updatedAt: new Date(),
            fromYesterday: true,
            originalTodoId: todo.id // 원본 투두 ID 저장
          });
          addedCount++;
          
          // 기존 목록에 추가하여 중복 체크 업데이트
          existingTodos.push(todo.text);
          
        } catch (todoError) {
          console.error('개별 투두 처리 실패:', todoError);
          errorCount++;
        }
      }
      
      // 다이얼로그 닫기
      setLoadTodoDialog(false);
      setSelectedTodos([]); // 선택 상태 초기화
      
      // 결과 메시지 생성
      let message = '';
      if (addedCount > 0) {
        message += `✅ ${addedCount}개의 항목을 성공적으로 불러왔습니다.`;
      }
      if (skippedCount > 0) {
        message += `\n⚠️ ${skippedCount}개의 중복 항목은 건너뛰었습니다.`;
      }
      if (errorCount > 0) {
        message += `\n❌ ${errorCount}개의 항목 처리 중 오류가 발생했습니다.`;
      }
      
      if (!message) {
        message = '처리할 항목이 없습니다.';
      }
      
      setError(message);
      
      // 성공적으로 추가된 경우 잠시 후 메시지 지우기
      if (addedCount > 0) {
        setTimeout(() => {
          setError('');
        }, 5000);
      }
      
    } catch (error) {
      devError('투두 불러오기 실패:', error);
      setError(`투두를 불러오는데 실패했습니다: ${error.message}`);
    }
  };

  // 선택된 투두 삭제
  const handleDeleteSelectedTodos = async () => {
    try {
      if (selectedTodos.length === 0) {
        setError('삭제할 항목을 선택해주세요.');
        return;
      }
      
      // 선택된 투두들을 삭제
      for (const todoId of selectedTodos) {
        await deleteDoc(doc(db, 'todos', todoId));
      }
      
      setLoadTodoDialog(false);
      setError(`${selectedTodos.length}개의 항목을 성공적으로 삭제했습니다.`);
    } catch (error) {
      devError('투두 삭제 실패:', error);
      setError('투두를 삭제하는데 실패했습니다.');
    }
  };

  // 체크박스 선택/해제
  const handleTodoSelection = (todoId) => {
    setSelectedTodos(prev => 
      prev.includes(todoId) 
        ? prev.filter(id => id !== todoId)
        : [...prev, todoId]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedTodos.length === yesterdayTodos.length) {
      setSelectedTodos([]);
    } else {
      setSelectedTodos(yesterdayTodos.map(todo => todo.id));
    }
  };

  // 키보드 이벤트 감지 (모바일)
  const [keyboardVisible, setKeyboardVisible] = useState(keyboardVisibleProp);
  const handleResize = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const windowHeight = window.outerHeight;
    const isKeyboardVisible = viewportHeight < windowHeight * 0.8;
    setKeyboardVisible(isKeyboardVisible);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isMobile, handleResize]);

  useEffect(() => {
    if (currentUser) {
      // 사용자 권한 확인
      const checkUserRole = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'members', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsMaster(userData.role === 'master');
            setIsAdmin(userData.role === 'admin' || userData.role === 'master');
          }
        } catch (error) {
          devError('사용자 권한 확인 실패:', error);
        }
      };
      checkUserRole();
    }
  }, [currentUser]);

  // 팝업 닫기 함수
  const handleClose = () => {
    setOpenProgress(false);
    setOpenDiscussion(false);
    setOpenSafety(false);
    setOpenTodo(false);
  };

  // 팝업 refs
  const expandCenterRef = useRef(null);
  const expandWeatherRef = useRef(null);
  const expandTodoRef = useRef(null);

  // 팝업 등록/해제
  useEffect(() => {
    if (expandCenter && expandCenterRef.current) {
      registerPopup('expand-center', 1202, {
        element: expandCenterRef.current,
        onClose: () => setExpandCenter(false)
      });
    } else {
      unregisterPopup('expand-center');
    }
  }, [expandCenter]);

  useEffect(() => {
    if (expandWeather && expandWeatherRef.current) {
      registerPopup('expand-weather', 1302, {
        element: expandWeatherRef.current,
        onClose: () => setExpandWeather(false)
      });
    } else {
      unregisterPopup('expand-weather');
    }
  }, [expandWeather]);

  useEffect(() => {
    if (expandTodo && expandTodoRef.current) {
      registerPopup('expand-todo', 1202, {
        element: expandTodoRef.current,
        onClose: () => setExpandTodo(false)
      });
    } else {
      unregisterPopup('expand-todo');
    }
  }, [expandTodo]);

  // 설정 아이콘 클릭 핸들러
  const handleSettingsIconClick = (e) => {
    setAnchorElSettings(e.currentTarget);
  };
  const handleSettingsClose = () => {
    setAnchorElSettings(null);
  };


  // 하단바 전체 확장/축소 토글 함수
  const handleBottomBarToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // 1. 뷰포트 높이 상태 추가
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. ToDo 입력칸 ref 및 포커스 시 scrollIntoView
  const todoInputRef = useRef(null);
  useEffect(() => {
    if (keyboardVisible && todoInputRef.current) {
      setTimeout(() => {
        todoInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [keyboardVisible]);

  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: { xs: keyboardVisible ? 'auto' : 0, md: 0 }, 
      left: 0, 
      right: 0, 
      zIndex: 20000, 
      bgcolor: '#23242a', 
      color: '#fff', 
      borderTop: '1px solid #333', 
      height: isMobile ? '38px' : '46px',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: 2,
      transition: 'bottom 0.3s ease',
      cursor: 'default',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
      '&:hover': {
        bgcolor: '#23242a'
      },
      ...(keyboardVisible && isMobile && {
        position: 'absolute',
        bottom: 'auto',
        top: 'calc(100vh - 46px - 300px)', // 키보드 높이를 고려한 위치
        transform: 'translateY(-100%)'
      })
    }}
    data-bottom-bar="true"
  >
      {/* 기본 하단바 내용 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        height: isMobile ? '38px' : '46px',
        width: '100%'
      }}>
        {/* 왼쪽: 날짜/온도/날씨(아이콘) 전체 클릭 시 확장 */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '0 0 auto', minWidth: 120 }}>
            <Typography sx={{ fontWeight: 500, fontSize: 15 }}>{formatDate(currentDate)}</Typography>
          </Box>
        )}
        {/* 중앙: 금일현장/입찰/회의/현설 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.5, md: 2 }, 
          flex: 1, 
          justifyContent: { xs: 'flex-start', md: 'center' }, 
          pl: { xs: 2, md: 0 },
          cursor: 'pointer' 
        }} onClick={(e) => { e.stopPropagation(); handleOpenPanel('center'); }}>
          <Box sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {!isMobile && <span style={{ marginRight: '16px' }}>TODAY'S</span>}
            <EngineeringIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#FFD600', mr: 0.5 }} />
            {!isMobile && '[현장]'} {stats.todaySites ?? 0}
          </Box>
          <Box sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#4FC3F7', mr: 0.5 }} />
            {!isMobile && '[입찰]'} {stats.bidCount ?? 0}
          </Box>
          <Box sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ForumIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#FF7043', mr: 0.5 }} />
            {!isMobile && '[회의]'} {stats.discussionCount ?? 0}
          </Box>
          <Box sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SafetyHelmetIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#81C784', mr: 0.5 }} />
            {!isMobile && '[현설]'} {stats.safetyCount ?? 0}
          </Box>

          <Box 
            sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); handleOpenPanel('center'); }}
          >
            <CalculateIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#FF9800', mr: 0.5 }} />
            {!isMobile && '[견적]'} {stats.estimateCount ?? 0}
          </Box>
          <Box sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CategoryIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#9E9E9E', mr: 0.5 }} />
            {!isMobile && '[기타]'} {stats.etcCount ?? 0}
          </Box>
        </Box>
        {/* 우측: ToDoList + 설정 아이콘 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, md: 2 }, 
          flex: '0 0 auto', 
          minWidth: { xs: 100, md: 120 }, 
          justifyContent: 'flex-end' 
        }}>
          <Typography 
            sx={{ fontSize: isMobile ? 12 : 15, cursor: 'pointer' }} 
            onClick={(e) => { e.stopPropagation(); handleOpenPanel('todo'); }}
          >
            ToDoList {stats.todoDone ?? 0}/{stats.todoTotal ?? 0}
          </Typography>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpandSettings(!expandSettings); setExpandWeather(false); setExpandCenter(false); setExpandTodo(false); }} sx={{ color: '#fff' }}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Settings 확장 패널: 하단바 위로 확장되는 설정 메뉴 */}
      {expandSettings && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} zIndex={1499} onClick={() => { setExpandWeather(false); setExpandCenter(false); setExpandTodo(false); setExpandSettings(false); }} />
      )}
      <Slide direction="up" in={expandSettings} mountOnEnter unmountOnExit>
        <Box
          onClick={e => e.stopPropagation()}
          sx={{
            position: 'fixed',
            right: isMobile ? 16 : 32,
            left: isMobile ? 16 : 'auto',
            bottom: { xs: keyboardVisible ? 'auto' : 46, md: 46 },
            top: { xs: keyboardVisible ? 'calc(100vh - 46px - 200px)' : 'auto', md: 'auto' },
            zIndex: 1500,
            bgcolor: '#23242a',
            color: '#fff',
            boxShadow: 3,
            borderRadius: '16px 16px 0 0',
            p: isMobile ? 1 : 2, // 모바일 패딩 줄임
            width: isMobile ? 'calc(100vw - 32px)' : 280,
            maxWidth: isMobile ? 'calc(100vw - 32px)' : '100%',
            minWidth: 0,
            height: 'auto',
            maxHeight: isMobile ? '50vh' : '50vh', // 모바일 최대 높이 줄임
            minHeight: isMobile ? 100 : 150, // 모바일 최소 높이 줄임
            fontSize: isMobile ? 12 : 15, // 모바일 글씨 크기 줄임
            transition: 'bottom 0.3s ease, top 0.3s ease'
          }}
          data-panel="settings"
        >
          <IconButton 
            onClick={() => setExpandSettings(false)} 
            sx={{ position: 'absolute', right: 16, top: 16, color: '#fff', zIndex: 1500 + 100 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ mb: { xs: 1, md: 2 }, fontWeight: 700, fontSize: isMobile ? 14 : 18 }}>
            설정 메뉴
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
            {/* 관리자/마스터만 회원관리 접근 가능 */}
            {isAdminOrMasterUser && (
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setExpandSettings(false);
                  navigate('/members');
                }}
                sx={{
                  bgcolor: '#4FC3F7',
                  color: '#fff',
                  fontWeight: 600,
                  py: { xs: 1, md: 1.5 }, // 모바일 패딩 줄임
                  fontSize: isMobile ? 12 : 15, // 모바일 글씨 크기 줄임
                  '&:hover': { bgcolor: '#29B6F6' }
                }}
                startIcon={<EngineeringIcon />}
              >
                회원관리
              </Button>
            )}
            {/* 마스터만 권한관리 접근 가능 (PC에서만) */}
            {isAdminOrMasterUser && !isMobile && (
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setExpandSettings(false);
                  navigate('/permissions');
                }}
                sx={{
                  bgcolor: '#FF7043',
                  color: '#fff',
                  fontWeight: 600,
                  py: { xs: 1, md: 1.5 }, // 모바일 패딩 줄임
                  fontSize: isMobile ? 12 : 15, // 모바일 글씨 크기 줄임
                  '&:hover': { bgcolor: '#F4511E' }
                }}
                startIcon={<TrendingUpIcon />}
              >
                권한관리
              </Button>
            )}
            {/* 모든 사용자 설정 접근 가능 */}
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setExpandSettings(false);
                navigate('/settings');
              }}
              sx={{
                bgcolor: '#81C784',
                color: '#fff',
                fontWeight: 600,
                py: { xs: 1, md: 1.5 }, // 모바일 패딩 줄임
                fontSize: isMobile ? 12 : 15, // 모바일 글씨 크기 줄임
                '&:hover': { bgcolor: '#66BB6A' }
              }}
                              startIcon={<ForumIcon />}
            >
              설정
            </Button>
          </Box>
        </Box>
      </Slide>
      
      {/* ToDoList 확장 패널: ToDoList 바로 위에서 슬라이드로 확장 */}
      {expandTodo && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} zIndex={1499} onClick={() => { setExpandWeather(false); setExpandCenter(false); setExpandTodo(false); setExpandSettings(false); }} />
      )}
      <Slide direction="up" in={expandTodo} mountOnEnter unmountOnExit>
        <Box 
          ref={expandTodoRef}
          onClick={e => e.stopPropagation()}
          sx={{ 
            position: 'fixed', 
            right: isMobile ? 0 : 32, 
            left: isMobile ? 0 : 'auto',
            bottom: { xs: keyboardVisible ? 'auto' : 46, md: 46 }, 
            top: { xs: keyboardVisible ? 'calc(100vh - 46px - 300px - 400px)' : 'auto', md: 'auto' },
            zIndex: 1500, 
            bgcolor: '#fff',
            color: '#000',
            boxShadow: 3, 
            borderRadius: { xs: keyboardVisible ? 0 : '16px 16px 0 0', md: '16px 16px 0 0' }, 
            p: isMobile ? 1 : 3, // 모바일 패딩 줄임
            width: isMobile ? '100vw' : 420,
            maxWidth: isMobile ? '100vw' : '100%',
            minWidth: 0,
            height: { xs: keyboardVisible ? `${Math.min(300, viewportHeight - 46)}px` : 'auto', md: 400 }, // 모바일 높이 줄임
            maxHeight: { xs: keyboardVisible ? `${Math.min(300, viewportHeight - 46)}px` : '60vh', md: '70vh' }, // 모바일 최대 높이 줄임
            minHeight: isMobile ? 120 : 250, // 모바일 최소 높이 줄임
            backgroundImage: 'repeating-linear-gradient(to bottom, #fff, #fff 32px, #eee 32px, #eee 34px)',
            border: '1.5px solid #222',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease',
            fontSize: isMobile ? 12 : 15 // 모바일 글씨 크기 줄임
          }}
          data-panel="todo"
        >
          {/* 상단 버튼들 */}
          <Box sx={{ display: 'flex', gap: 1, mb: { xs: 1, md: 2 }, justifyContent: 'space-between', alignItems: 'center' }}>
            <img src="/TodoList.png" alt="TodoList" style={{ height: isMobile ? '24px' : '30px', width: 'auto' }} />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* 성현준 아이디에만 이름 표시 */}
              {currentUser?.uid === 'HpF5IrlTscYbWPsUhtdzV05sjbF2' && (
                <Typography sx={{ fontSize: isMobile ? 10 : 12, color: '#666', mr: 1 }}>
                  성현준
                </Typography>
              )}
              <Button variant="outlined" size="small" sx={{ 
                fontWeight: 600, 
                fontSize: isMobile ? '0.7rem' : '0.875rem', 
                py: isMobile ? 0.5 : 1,
                color: '#1976d2',
                borderColor: '#1976d2',
                height: '32px', // 높이 고정
                '&:hover': {
                  borderColor: '#1565c0',
                  bgcolor: 'rgba(25, 118, 210, 0.04)',
                }
              }} onClick={() => navigate('/todo/all')}>
                LIST
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: isMobile ? '0.6rem' : '0.7rem',
                  px: isMobile ? 1 : 1.5,
                  py: isMobile ? 0.3 : 0.5,
                  minWidth: 'auto',
                  bgcolor: '#424242',
                  color: '#fff',
                  borderColor: '#666',
                  height: '32px', // 높이 고정
                  '&:hover': {
                    bgcolor: '#616161',
                    borderColor: '#888'
                  }
                }} 
                onClick={handleLoadYesterdayIncomplete}
              >
                불러오기
              </Button>
            </Box>
          </Box>
          
          {/* ToDo 입력/추가 */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            mb: { xs: 1, md: 2 },
            position: { xs: keyboardVisible ? 'fixed' : 'static' },
            bottom: { xs: keyboardVisible ? '300px' : 'auto' },
            left: { xs: keyboardVisible ? '16px' : 'auto' },
            right: { xs: keyboardVisible ? '16px' : 'auto' },
            zIndex: { xs: keyboardVisible ? 1300 : 'auto' },
            bgcolor: { xs: keyboardVisible ? '#fff' : 'transparent' },
            p: { xs: keyboardVisible ? 1 : 0 },
            borderRadius: { xs: keyboardVisible ? 1 : 0 },
            boxShadow: { xs: keyboardVisible ? 2 : 'none' }
          }}>
            <TextField
              inputRef={todoInputRef}
              variant="standard"
              placeholder="할 일 추가"
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={e => { 
                if (e.key === 'Enter' && todoInput?.trim() && !isComposing) {
                  handleAddTodo(e);
                }
              }}
              inputProps={{
                'data-lpignore': 'true',
                'autoComplete': 'off',
                'autoCorrect': 'off',
                'autoCapitalize': 'off',
                'spellCheck': 'false'
              }}
              InputProps={{
                disableUnderline: true,
                style: {
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  color: '#000',
                  padding: 0
                }
              }}
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: isMobile ? '0.9rem' : '1rem',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                color: '#000',
                '& input': {
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  color: '#000',
                  padding: 0,
                  '&::placeholder': {
                    color: '#999'
                  }
                }
              }}
            />
            <Button
              variant="contained"
              color="primary"
              sx={{ minWidth: isMobile ? 60 : 80, fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.875rem', py: isMobile ? 0.5 : 1 }}
              onClick={e => handleAddTodo(e)}
              disabled={!todoInput?.trim()}
            >
              추가
            </Button>
          </Box>
          {/* ToDo 리스트 */}
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            pr: 1,
            maxHeight: isMobile ? '200px' : '300px', // 모바일 높이 줄임
            minHeight: isMobile ? '100px' : '150px', // 모바일 최소 높이 줄임
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: isMobile ? 0.5 : 1, // 모바일 패딩 줄임
            bgcolor: '#fafafa'
          }}>
            {(() => {
              // 한국 시간 기준으로 오늘 날짜 계산
              const now = new Date();
              const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
              const todayStart = new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate(), 0, 0, 0);
              const todayEnd = new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate(), 23, 59, 59);
              
              const todayTodos = todoList.filter(item => {
                // 한국 시간 기준으로 오늘 날짜 생성
                const todayYear = koreanTime.getFullYear();
                const todayMonth = String(koreanTime.getMonth() + 1).padStart(2, '0');
                const todayDay = String(koreanTime.getDate()).padStart(2, '0');
                const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
                
                console.log('투두 필터링 체크:', {
                  itemId: item.id,
                  itemText: item.text,
                  itemDate: item.date,
                  todayStr: todayStr,
                  dateMatch: item.date === todayStr,
                  createdAt: item.createdAt
                });
                
                // 1. date 필드가 있으면 date로 체크 (우선순위)
                if (item.date === todayStr) return true;
                
                // 2. createdAt 필드가 있으면 createdAt으로 체크
                if (item.createdAt) {
                  let itemDate;
                  if (item.createdAt.toDate) {
                    // Firestore Timestamp
                    itemDate = item.createdAt.toDate();
                  } else if (item.createdAt instanceof Date) {
                    // Date 객체
                    itemDate = item.createdAt;
                  } else {
                    // 문자열이나 숫자
                    itemDate = new Date(item.createdAt);
                  }
                  
                  // 오늘 00:00:00 ~ 23:59:59 사이에 생성된 항목만
                  return itemDate >= todayStart && itemDate <= todayEnd;
                }
                
                return false;
              });
              
              // 최신 순서로 정렬 (확장 팝업에서도 동일한 정렬 적용)
              const sortedTodayTodos = todayTodos.sort((a, b) => {
                const timeA = a.timestamp || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime());
                const timeB = b.timestamp || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime());
                return timeB - timeA; // 최신이 위로
              });
              
              console.log('오늘 투두 필터링:', {
                전체: todoList.length,
                오늘: todayTodos.length,
                정렬후: sortedTodayTodos.length,
                오늘시작: todayStart,
                오늘끝: todayEnd
              });
              
              return sortedTodayTodos.length === 0 ? (
                <Typography sx={{ color: '#666', fontSize: isMobile ? 12 : 14 }}>할 일이 없습니다.</Typography>
              ) : (
                sortedTodayTodos.map(item => (
                  <Box key={item.id} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: isMobile ? 0.1 : 0.25, 
                    p: isMobile ? 0.1 : 0.25, 
                    borderRadius: 1, 
                    bgcolor: item.completed ? '#f5f5f5' : '#fff' 
                  }}>
                    <Checkbox
                      checked={!!item.completed}
                      onChange={() => handleToggleTodo(item)}
                      sx={{ color: '#1976d2', p: isMobile ? 0.1 : 0.25, size: isMobile ? 'small' : 'medium' }}
                    />
                    <Typography sx={{ 
                      flex: 1, 
                      fontSize: isMobile ? 12 : 14, 
                      textDecoration: item.completed ? 'line-through' : 'none', 
                      color: item.completed ? '#666' : '#000' 
                    }}>
                      {item.text}
                    </Typography>
                    <IconButton size="small" onClick={() => handleDeleteTodo(item)} sx={{ color: '#d32f2f', p: isMobile ? 0.1 : 0.25 }}>
                      <DeleteIcon fontSize={isMobile ? 'small' : 'small'} />
                    </IconButton>
                  </Box>
                ))
              );
            })()}
          </Box>
        </Box>
      </Slide>

      {/* 금일현장/기성/협의/안전 실시간 현황 확장 패널 */}
      {expandCenter && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} zIndex={1201} onClick={() => { setExpandWeather(false); setExpandCenter(false); setExpandTodo(false); setExpandSettings(false); }} />
      )}
      <Slide direction="up" in={expandCenter} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 44,
            zIndex: 1202,
            bgcolor: '#23242a',
            color: '#fff',
            boxShadow: 3,
            borderRadius: '16px 16px 0 0',
            p: { xs: 2, md: 3 }, // 모바일 패딩 줄임
            maxWidth: 1200,
            margin: '0 auto',
            minHeight: { xs: 150, md: 200 } // 모바일 최소 높이 줄임
          }}
          onClick={e => handleBackdropClick(e, setExpandCenter)}
          data-panel="center"
        >
          <IconButton 
            onClick={() => setExpandCenter(false)} 
            sx={{ position: 'absolute', right: 16, top: 16, color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ mb: { xs: 1, md: 2 }, fontWeight: 700, fontSize: { xs: 16, md: 18 } }}>
            {isMobile ? '오늘의 주요일정' : '금일현장/기성/협의/안전 실시간 현황'}
          </Typography>
          
          {/* PC에서는 가로 배치, 모바일에서는 세로 배치 */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: { xs: 2, md: 2 }, // 모바일 간격 줄임
            justifyContent: 'space-between'
          }}>
            {/* 금일현장 목록 */}
            {(!isMobile || progressList.length > 0) && (
              <Box sx={{ flex: { xs: 'none', md: 1 }, minWidth: { md: 0 } }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#FFD600', fontWeight: 600, fontSize: { xs: 14, md: 14 } }}>
                  🏗️ {isMobile ? '현장' : '금일현장'} ({progressList.length}개)
                </Typography>
                {progressList.length === 0 ? (
                  <Typography sx={{ color: '#ccc', fontSize: { xs: 12, md: 12 } }}>오늘 현장 일정이 없습니다.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                    {progressList.map((item, index) => (
                        <Box key={item.id} sx={{ 
                          p: { xs: 1, md: 1 }, // 모바일 패딩 줄임
                          bgcolor: '#2a2a2a', 
                          borderRadius: 1, 
                          border: '1px solid #444',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: { xs: 13, md: 14 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.text || item.title || '현장 일정'}
                            </Typography>
                                                      {(item.desc || item.description) && (item.desc || item.description).trim() && (
                            <Typography sx={{ 
                              color: '#ccc', 
                              fontSize: { xs: 11, md: 12 }, 
                              mt: 0.5, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'normal',
                              lineHeight: 1.3,
                              maxHeight: '2.6em',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {item.desc || item.description}
                            </Typography>
                          )}
                          </Box>
                          <Typography sx={{ color: '#FFD600', fontSize: { xs: 12, md: 12 }, fontWeight: 600, ml: 1, flexShrink: 0 }}>
                            {item.startDate}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                )}
              </Box>
            )}

            {/* 금일입찰 목록 */}
            {(!isMobile || bidList.length > 0) && (
              <Box sx={{ flex: { xs: 'none', md: 1 }, minWidth: { md: 0 } }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#4FC3F7', fontWeight: 600, fontSize: { xs: 14, md: 14 } }}>
                  📈 {isMobile ? '입찰' : '금일입찰'} ({bidList.length}개)
                </Typography>
                {bidList.length === 0 ? (
                  <Typography sx={{ color: '#ccc', fontSize: { xs: 12, md: 12 } }}>오늘 입찰 일정이 없습니다.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                    {bidList.map((item, index) => (
                      <Box key={index} sx={{ 
                        p: { xs: 1, md: 1 }, // 모바일 패딩 줄임
                        bgcolor: '#2a2a2a', 
                        borderRadius: 1, 
                        border: '1px solid #444',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: '#3a3a3a'
                        }
                      }}
                      onDoubleClick={() => {
                        setExpandCenter(false);
                        navigate('/estimates');
                      }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ 
                            fontWeight: 600, 
                            fontSize: { xs: 13, md: 14 }, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            opacity: item.submissionStatus === '제출완료' ? 0.6 : 1
                          }}>
                            {item.siteName || item.company || '입찰'}
                          </Typography>
                          <Typography sx={{ 
                            color: '#ccc', 
                            fontSize: { xs: 11, md: 12 }, 
                            mt: 0.5, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'normal',
                            lineHeight: 1.3,
                            maxHeight: '2.6em',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            opacity: item.submissionStatus === '제출완료' ? 0.6 : 1
                          }}>
                            {item.requester} {item.company ? `(${item.company})` : ''} - {item.requestContent || '입찰요청'}
                          </Typography>
                        </Box>
                        {item.submissionStatus === '제출완료' && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            backgroundColor: 'rgba(79, 195, 247, 0.15)',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            flexShrink: 0,
                            border: '1px solid rgba(79, 195, 247, 0.3)'
                          }}>
                            <Typography sx={{ 
                              color: '#4FC3F7', 
                              fontSize: { xs: 10, md: 11 }, 
                              fontWeight: 600
                            }}>
                              ✓ 제출완료
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* 금일회의 목록 */}
            {(!isMobile || safetyList.length > 0) && (
              <Box sx={{ flex: { xs: 'none', md: 1 }, minWidth: { md: 0 } }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#FF7043', fontWeight: 600, fontSize: { xs: 14, md: 14 } }}>
                  💬 {isMobile ? '회의' : '금일회의'} ({safetyList.length}개)
                </Typography>
                {safetyList.length === 0 ? (
                  <Typography sx={{ color: '#ccc', fontSize: { xs: 12, md: 12 } }}>오늘 회의 일정이 없습니다.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                    {safetyList.map((item, index) => (
                      <Box key={index} sx={{ 
                        p: { xs: 1, md: 1 }, // 모바일 패딩 줄임
                        bgcolor: '#2a2a2a', 
                        borderRadius: 1, 
                        border: '1px solid #444',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: { xs: 13, md: 14 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title || item.text || item.description || item.desc || '설명 없음'}
                          </Typography>
                          {(item.description || item.desc) && (item.description || item.desc).trim() && (
                            <Typography sx={{ 
                              color: '#ccc', 
                              fontSize: { xs: 11, md: 12 }, 
                              mt: 0.5, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'normal',
                              lineHeight: 1.3,
                              maxHeight: '2.6em',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {item.description || item.desc}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ color: '#FF7043', fontSize: { xs: 12, md: 12 }, fontWeight: 600, ml: 1, flexShrink: 0 }}>
                          {item.startDate}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* 금일현설 목록 */}
            {(!isMobile || setupList.length > 0) && (
              <Box sx={{ flex: { xs: 'none', md: 1 }, minWidth: { md: 0 } }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#81C784', fontWeight: 600, fontSize: { xs: 14, md: 14 } }}>
                  🛡️ {isMobile ? '현설' : '금일현설'} ({setupList.length}개)
                </Typography>
                {setupList.length === 0 ? (
                  <Typography sx={{ color: '#ccc', fontSize: { xs: 12, md: 12 } }}>오늘 현설 일정이 없습니다.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                    {setupList.map((item, index) => (
                      <Box key={index} sx={{ 
                        p: { xs: 1, md: 1 }, // 모바일 패딩 줄임
                        bgcolor: '#2a2a2a', 
                        borderRadius: 1, 
                        border: '1px solid #444',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: { xs: 13, md: 14 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title || item.text || item.description || item.desc || '설명 없음'}
                          </Typography>
                          {(item.description || item.desc) && (item.description || item.desc).trim() && (
                            <Typography sx={{ 
                              color: '#ccc', 
                              fontSize: { xs: 11, md: 12 }, 
                              mt: 0.5, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'normal',
                              lineHeight: 1.3,
                              maxHeight: '2.6em',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {item.description || item.desc}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ color: '#81C784', fontSize: { xs: 12, md: 12 }, fontWeight: 600, ml: 1, flexShrink: 0 }}>
                          {item.startDate}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* 금일제출견적 목록 */}
            {(!isMobile || estimateList.length > 0) && (
              <Box sx={{ flex: { xs: 'none', md: 1 }, minWidth: { md: 0 } }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#FF9800', fontWeight: 600, fontSize: { xs: 14, md: 14 } }}>
                  🧮 {isMobile ? '견적' : '오늘/미제출 견적'} ({estimateList.length}개)
                </Typography>
                {estimateList.length === 0 ? (
                  <Typography sx={{ color: '#ccc', fontSize: { xs: 12, md: 12 } }}>오늘 제출기한이거나 미제출된 날짜 지난 견적이 없습니다.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                    {estimateList.map((item, index) => (
                      <Box key={index} sx={{ 
                        p: { xs: 1, md: 1 }, // 모바일 패딩 줄임
                        bgcolor: '#2a2a2a', 
                        borderRadius: 1, 
                        border: '1px solid #444',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: '#3a3a3a'
                        }
                      }}
                      onDoubleClick={() => {
                        setExpandCenter(false);
                        navigate('/estimates');
                      }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ 
                            fontWeight: 600, 
                            fontSize: { xs: 13, md: 14 }, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            opacity: item.submissionStatus === '제출완료' ? 0.6 : 1,
                            flex: 1
                          }}>
                            {item.siteName || item.title || item.text || item.description || item.desc || '설명 없음'}
                          </Typography>
                          {(item.company || item.description || item.desc) && (
                            <Typography sx={{ 
                              color: '#ccc', 
                              fontSize: { xs: 11, md: 12 }, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'normal',
                              lineHeight: 1.3,
                              maxHeight: '2.6em',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              opacity: item.submissionStatus === '제출완료' ? 0.6 : 1,
                              flex: 1
                            }}>
                              {item.company || item.description || item.desc}
                            </Typography>
                          )}
                        </Box>
                        {item.submissionStatus === '제출완료' ? (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            backgroundColor: 'rgba(244, 67, 54, 0.15)',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            flexShrink: 0,
                            border: '1px solid rgba(244, 67, 54, 0.3)'
                          }}>
                            <Typography sx={{ 
                              color: '#f44336', 
                              fontSize: { xs: 10, md: 11 }, 
                              fontWeight: 600
                            }}>
                              ✓ 제출완료
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'flex-end',
                            flexShrink: 0
                          }}>
                            <Typography sx={{ 
                              color: '#FF9800', 
                              fontSize: { xs: 10, md: 11 }, 
                              fontWeight: 600
                            }}>
                              {item.submissionDeadline || item.startDate}
                            </Typography>
                            {(() => {
                              const deadline = new Date(item.submissionDeadline);
                              // 한국 시간 기준으로 오늘 날짜 계산 (시간대 차이 고려)
                              const now = new Date();
                              const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
                              const today = new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate());
                              
                              // deadline도 한국 시간으로 변환
                              const deadlineKorean = new Date(deadline.getTime() + (9 * 60 * 60 * 1000));
                              const deadlineDate = new Date(deadlineKorean.getFullYear(), deadlineKorean.getMonth(), deadlineKorean.getDate());
                              
                              const diffTime = deadlineDate.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              console.log('🔥 날짜 계산 디버깅:', {
                                originalDeadline: item.submissionDeadline,
                                deadline: deadline,
                                deadlineKorean: deadlineKorean,
                                deadlineDate: deadlineDate,
                                today: today,
                                diffTime: diffTime,
                                diffDays: diffDays
                              });
                              
                              if (diffDays < 0) {
                                return (
                                  <Typography sx={{ 
                                    color: '#f44336', 
                                    fontSize: { xs: 9, md: 10 }, 
                                    fontWeight: 600
                                  }}>
                                    {Math.abs(diffDays)}일 지남
                                  </Typography>
                                );
                              } else if (diffDays === 0) {
                                return (
                                  <Typography sx={{ 
                                    color: '#FF9800', 
                                    fontSize: { xs: 9, md: 10 }, 
                                    fontWeight: 600
                                  }}>
                                    오늘
                                  </Typography>
                                );
                              } else {
                                return (
                                  <Typography sx={{ 
                                    color: '#4caf50', 
                                    fontSize: { xs: 9, md: 10 }, 
                                    fontWeight: 600
                                  }}>
                                    {diffDays}일 남음
                                  </Typography>
                                );
                              }
                            })()}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* 금일기타 목록 */}
            {(!isMobile || etcList.length > 0) && (
              <Box sx={{ flex: { xs: 'none', md: 1 }, minWidth: { md: 0 } }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#9E9E9E', fontWeight: 600, fontSize: { xs: 14, md: 14 } }}>
                  📂 {isMobile ? '기타' : '금일기타'} ({etcList.length}개)
                </Typography>
                {etcList.length === 0 ? (
                  <Typography sx={{ color: '#ccc', fontSize: { xs: 12, md: 12 } }}>오늘 기타 일정이 없습니다.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                    {etcList.map((item, index) => (
                      <Box key={index} sx={{ 
                        p: { xs: 1, md: 1 }, // 모바일 패딩 줄임
                        bgcolor: '#2a2a2a', 
                        borderRadius: 1, 
                        border: '1px solid #444',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ 
                            fontWeight: 600, 
                            fontSize: { xs: 13, md: 14 }, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            textDecoration: item.completed ? 'line-through' : 'none',
                            opacity: item.completed ? 0.6 : 1
                          }}>
                            {item.title || item.text || item.description || item.desc || '설명 없음'}
                          </Typography>
                          {(item.description || item.desc) && (item.description || item.desc).trim() && (
                            <Typography sx={{ 
                              color: '#ccc', 
                              fontSize: { xs: 11, md: 12 }, 
                              mt: 0.5, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'normal',
                              lineHeight: 1.3,
                              maxHeight: '2.6em',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              opacity: item.completed ? 0.6 : 1
                            }}>
                              {item.description || item.desc}
                            </Typography>
                          )}
                        </Box>
                        {item.completed ? (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            backgroundColor: 'rgba(76, 175, 80, 0.15)',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            flexShrink: 0,
                            border: '1px solid rgba(76, 175, 80, 0.3)'
                          }}>
                            <Typography sx={{ 
                              color: '#4CAF50', 
                              fontSize: { xs: 10, md: 11 }, 
                              fontWeight: 600
                            }}>
                              ✓ 완료
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ color: '#9E9E9E', fontSize: { xs: 12, md: 12 }, fontWeight: 600, ml: 1, flexShrink: 0 }}>
                            {item.startDate}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Slide>

      {/* 투두 불러오기 다이얼로그 */}
      <Dialog
        open={loadTodoDialog}
        onClose={() => setLoadTodoDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2,
            minHeight: isMobile ? 300 : 400,
            maxHeight: isMobile ? '80vh' : '70vh',
            width: isMobile ? '95vw' : '100%'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#424242', 
          color: '#fff',
          borderBottom: '1px solid #666',
          fontWeight: 600
        }}>
          전날 미완료 투두 불러오기
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              불러올 항목을 선택하거나 삭제할 항목을 선택하세요
              {selectedTodos.length > 0 && (
                <span style={{ color: '#2196f3', fontWeight: 600 }}>
                  {' '}({selectedTodos.length}개 선택됨)
                </span>
              )}
            </Typography>
            <Button
              size="small"
              onClick={handleSelectAll}
              sx={{ 
                fontSize: '0.7rem',
                px: 1.5,
                py: 0.5,
                minWidth: 'auto',
                bgcolor: selectedTodos.length > 0 ? '#2196f3' : '#424242',
                color: '#fff',
                borderColor: '#666',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: selectedTodos.length > 0 ? '#1976d2' : '#616161',
                  borderColor: '#888'
                }
              }}
            >
              {selectedTodos.length === yesterdayTodos.length ? '전체해제' : '전체선택'}
            </Button>
          </Box>
          
          <Box sx={{ 
            maxHeight: isMobile ? 200 : 300, 
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: isMobile ? 0.5 : 1
          }}>
            {yesterdayTodos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography sx={{ color: '#666', mb: 1, fontSize: '0.9rem' }}>
                  📭 불러올 전날 미완료 항목이 없습니다.
                </Typography>
                <Typography sx={{ color: '#999', fontSize: '0.8rem' }}>
                  전날 모든 투두가 완료되었거나 미완료 항목이 없습니다.
                </Typography>
              </Box>
            ) : (
              yesterdayTodos.map(todo => (
                <Box 
                  key={todo.id} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    p: 1, 
                    mb: 0.5,
                    borderRadius: 1,
                    bgcolor: selectedTodos.includes(todo.id) ? '#e3f2fd' : '#fff',
                    border: selectedTodos.includes(todo.id) ? '2px solid #2196f3' : '1px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: selectedTodos.includes(todo.id) ? '#e3f2fd' : '#f5f5f5',
                      borderColor: selectedTodos.includes(todo.id) ? '#1976d2' : '#ccc'
                    }
                  }}
                  onClick={() => handleTodoSelection(todo.id)}
                >
                  <Checkbox
                    checked={selectedTodos.includes(todo.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleTodoSelection(todo.id);
                    }}
                    sx={{ 
                      mr: 1, 
                      p: isMobile ? 1 : 0.5,
                      minWidth: isMobile ? 48 : 32,
                      minHeight: isMobile ? 48 : 32,
                      '& .MuiSvgIcon-root': {
                        fontSize: isMobile ? '1.5rem' : '1.25rem'
                      }
                    }}
                    size={isMobile ? "medium" : "small"}
                  />
                  <Typography sx={{ 
                    flex: 1, 
                    fontSize: isMobile ? '0.9rem' : '0.75rem', 
                    color: '#000', 
                    lineHeight: 1.2,
                    userSelect: 'none'
                  }}>
                    {todo.text}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: isMobile ? 1 : 2, 
          gap: isMobile ? 0.5 : 1,
          flexDirection: isMobile ? 'column' : 'row',
          '& > *': {
            width: isMobile ? '100%' : 'auto'
          }
        }}>
          <Button 
            onClick={() => setLoadTodoDialog(false)}
            variant="outlined"
            size="small"
            sx={{ 
              fontSize: '0.7rem',
              px: 1.5,
              py: 0.5,
              minWidth: 'auto',
              bgcolor: '#424242',
              color: '#fff',
              borderColor: '#666',
              '&:hover': {
                bgcolor: '#616161',
                borderColor: '#888'
              }
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleDeleteSelectedTodos}
            variant="outlined"
            color="error"
            size="small"
            disabled={selectedTodos.length === 0}
            sx={{ 
              fontSize: '0.7rem',
              px: 1.5,
              py: 0.5,
              minWidth: 'auto',
              bgcolor: '#424242',
              color: '#ff6b6b',
              borderColor: '#666',
              '&:hover': {
                bgcolor: '#616161',
                borderColor: '#888'
              },
              '&:disabled': {
                bgcolor: '#2a2a2a',
                color: '#666',
                borderColor: '#444'
              }
            }}
          >
            선택삭제({selectedTodos.length})
          </Button>
          <Button 
            onClick={handleLoadSelectedTodos}
            variant="contained"
            color="primary"
            size="small"
            disabled={selectedTodos.length === 0}
            sx={{ 
              fontSize: '0.7rem',
              px: 1.5,
              py: 0.5,
              minWidth: 'auto',
              bgcolor: selectedTodos.length > 0 ? '#2196f3' : '#424242',
              color: '#fff',
              fontWeight: 600,
              '&:hover': {
                bgcolor: selectedTodos.length > 0 ? '#1976d2' : '#616161'
              },
              '&:disabled': {
                bgcolor: '#2a2a2a',
                color: '#666'
              }
            }}
          >
            📥 선택불러오기 ({selectedTodos.length})
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default BottomBar; 