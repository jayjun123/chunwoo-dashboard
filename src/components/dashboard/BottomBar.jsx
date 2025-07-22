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
  const [etcList, setEtcList] = useState([]); // 금일기타용 별도 상태
  const [sitesList, setSitesList] = useState([]); // 현장 목록

  // 햄버거 메뉴 Drawer 상태
  const [drawerOpen, setDrawerOpen] = useState(false);

  // PopupProvider 컨텍스트 사용하지 않음 (필요시 나중에 추가)
  const registerPopup = () => {};
  const unregisterPopup = () => {};
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
  const [weatherLocation, setWeatherLocation] = useState('대구');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weatherData, setWeatherData] = useState({
    current: {
      temp: 0,
      weather: '',
      icon: '01d'
    },
    daily: []
  });
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [settingsTab, setSettingsTab] = useState(0); // 0:회원, 1:권한, 2:설정

  const [inputValue, setInputValue] = useState(weatherLocation);

  // Popover 앵커 상태
  const [anchorElSettings, setAnchorElSettings] = useState(null);
  const [anchorElWeather, setAnchorElWeather] = useState(null);

  // todoList의 최신 값을 참조하기 위한 ref
  const todoListRef = useRef(todoList);
  todoListRef.current = todoList;

  // 날씨 아이콘 매핑 - 각 상태에 맞는 아이콘 사용
  const weatherIcons = {
    '01d': <WbSunnyIcon sx={{ color: '#FFD600', fontSize: 28 }} />, // 맑음 - 노란색 해
    '01n': <WbSunnyIcon sx={{ color: '#FFD600', fontSize: 28 }} />, // 맑음(밤) - 노란색 해
    '02d': <CloudIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 구름많음 - 파란색 구름
    '02n': <CloudIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 구름많음(밤) - 파란색 구름
    '03d': <CloudIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 흐림 - 파란색 구름
    '03n': <CloudIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 흐림(밤) - 파란색 구름
    '04d': <CloudIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 흐림 - 파란색 구름
    '04n': <CloudIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 흐림(밤) - 파란색 구름
    '09d': <OpacityIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 소나기 - 파란색 물방울
    '09n': <OpacityIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 소나기(밤) - 파란색 물방울
    '10d': <OpacityIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 비 - 파란색 물방울
    '10n': <OpacityIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 비(밤) - 파란색 물방울
    '11d': <ThunderstormIcon sx={{ color: '#FFD600', fontSize: 28 }} />, // 번개 - 노란색 번개
    '11n': <ThunderstormIcon sx={{ color: '#FFD600', fontSize: 28 }} />, // 번개(밤) - 노란색 번개
    '13d': <AcUnitIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 눈 - 파란색 눈송이
    '13n': <AcUnitIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 눈(밤) - 파란색 눈송이
    '50d': <VisibilityIcon sx={{ color: '#90CAF9', fontSize: 28 }} />, // 안개 - 파란색 안개
    '50n': <VisibilityIcon sx={{ color: '#90CAF9', fontSize: 28 }} />  // 안개(밤) - 파란색 안개
  };

  // 날씨 상태 한글 매핑
  const weatherStatus = {
    'Clear': '맑음',
    'Clouds': '구름',
    'Rain': '비',
    'Snow': '눈',
    'Thunderstorm': '번개',
    'Drizzle': '이슬비',
    'Mist': '안개'
  };

  // 날짜를 'YYYY. M. D (요일)' 한글로 포맷팅하는 함수
  function formatDate(date) {
    const week = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(date);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${week[d.getDay()]})`;
  }

  // 기상청 날씨 코드 변환 함수(상태/아이콘) - 실제 API 코드에 맞게 수정
  const getWeatherStatus = (code) => {
    const status = {
      '1': '맑음',
      '3': '구름많음',
      '4': '흐림'
    };
    return status[code] || '날씨 정보 없음';
  };
  const getWeatherIcon = (code) => {
    const icons = {
      '1': '01d', // 맑음
      '3': '02d', // 구름많음
      '4': '04d'  // 흐림
    };
    return icons[code] || '01d';
  };

  // 기상청 PTY(강수형태) + SKY(하늘상태) 조합으로 아이콘 결정
  function getWeatherIconByKMA(sky, pty) {
    if (pty && pty !== '0') {
      if (pty === '1' || pty === '4') return '10d'; // 비, 소나기
      if (pty === '2') return '13d'; // 비/눈
      if (pty === '3') return '13d'; // 눈
    }
    if (sky === '1') return '01d'; // 맑음
    if (sky === '3') return '02d'; // 구름많음
    if (sky === '4') return '04d'; // 흐림
    return '01d';
  }

  // 대구 달서구 nx, ny: 89, 90
  const getLocationCoords = (location) => {
    // 주요 도시별 좌표 (기상청 격자 좌표)
    const locationCoords = {
      '서울': { nx: 60, ny: 127 },
      '부산': { nx: 98, ny: 76 },
      '대구': { nx: 89, ny: 90 },
      '인천': { nx: 55, ny: 124 },
      '광주': { nx: 58, ny: 74 },
      '대전': { nx: 67, ny: 100 },
      '울산': { nx: 102, ny: 84 },
      '세종': { nx: 66, ny: 103 },
      '수원': { nx: 60, ny: 120 },
      '성남': { nx: 62, ny: 123 },
      '안양': { nx: 59, ny: 123 },
      '안산': { nx: 58, ny: 121 },
      '고양': { nx: 57, ny: 128 },
      '용인': { nx: 64, ny: 119 },
      '부천': { nx: 56, ny: 125 },
      '광명': { nx: 58, ny: 125 },
      '평택': { nx: 62, ny: 114 },
      '과천': { nx: 60, ny: 124 },
      '오산': { nx: 62, ny: 118 },
      '시흥': { nx: 57, ny: 123 },
      '군포': { nx: 59, ny: 122 },
      '의왕': { nx: 60, ny: 122 },
      '하남': { nx: 64, ny: 126 },
      '이천': { nx: 68, ny: 121 },
      '안성': { nx: 65, ny: 115 },
      '김포': { nx: 55, ny: 128 },
      '화성': { nx: 57, ny: 119 },
      '여주': { nx: 71, ny: 121 },
      '양평': { nx: 69, ny: 125 },
      '포천': { nx: 64, ny: 134 },
      '연천': { nx: 61, ny: 138 },
      '가평': { nx: 69, ny: 133 },
      '춘천': { nx: 73, ny: 134 },
      '원주': { nx: 76, ny: 122 },
      '강릉': { nx: 92, ny: 131 },
      '태백': { nx: 95, ny: 119 },
      '정선': { nx: 89, ny: 123 },
      '속초': { nx: 87, ny: 141 },
      '삼척': { nx: 98, ny: 125 },
      '동해': { nx: 97, ny: 127 },
      '횡성': { nx: 75, ny: 125 },
      '영월': { nx: 86, ny: 119 },
      '평창': { nx: 84, ny: 123 },
      '철원': { nx: 65, ny: 139 },
      '화천': { nx: 72, ny: 139 },
      '양구': { nx: 77, ny: 139 },
      '인제': { nx: 80, ny: 138 },
      '고성': { nx: 85, ny: 145 },
      '양양': { nx: 88, ny: 138 },
      '제주': { nx: 53, ny: 38 },
      '서귀포': { nx: 52, ny: 33 }
    };
    
    // 입력된 지역명에서 매칭되는 좌표 찾기
    for (const [city, coords] of Object.entries(locationCoords)) {
      if (location.includes(city)) {
        return coords;
      }
    }
    
    // 기본값: 대구
    return { nx: 89, ny: 90 };
  };
  const fetchWeatherData = useCallback(async (location) => {
    try {
      setWeatherLoading(true);
      const { nx, ny } = getLocationCoords(location);
      const serviceKey = import.meta.env.VITE_WEATHER_API_KEY;
      
      if (!serviceKey) {
        console.warn('날씨 API 키가 설정되지 않았습니다. 날씨 기능이 비활성화됩니다.');
        setWeatherLoading(false);
        return; // 에러를 throw하지 않고 조용히 종료
      }
      
      const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${serviceKey}&numOfRows=1000&pageNo=1&dataType=JSON&base_date=${format(new Date(), 'yyyyMMdd')}&base_time=0500&nx=${nx}&ny=${ny}`;
      console.log('기상청 fetch URL:', url);
      const response = await fetch(url);
      const text = await response.text();
      console.log('기상청 날씨 API 원본 응답:', text);
      let data;
      try {
        data = JSON.parse(text);
        console.log('기상청 날씨 API 응답(JSON):', data);
      } catch (jsonErr) {
        console.warn('날씨 API 응답이 JSON 형식이 아닙니다. 기본 날씨 정보를 사용합니다.');
        // API 오류 시 기본 날씨 정보 사용
        const defaultWeatherData = {
          current: {
            temp: 20,
            weather: '맑음',
            icon: '01d'
          },
          daily: [
            {
              date: new Date(),
              temp: 20,
              icon: '01d',
              weather: '맑음',
              pop: 0
            }
          ]
        };
        setWeatherData(defaultWeatherData);
        setWeatherLoading(false);
        return;
      }
      const weatherItems = data?.response?.body?.items?.item || [];
      // 실제로 데이터가 있는 날짜만 추출해서 3일치만 표시
      const uniqueDates = [...new Set(weatherItems.map(item => item.fcstDate))].slice(0, 3);
      const days = uniqueDates.map(dateStr => {
        const d = new Date(dateStr.slice(0,4), dateStr.slice(4,6)-1, dateStr.slice(6,8));
        const dayItems = weatherItems.filter(item => item.fcstDate === dateStr);
        const tempItem = dayItems.find(item => item.category === 'TMP');
        // 가장 가까운 시간대의 PTY/SKY 선택
        const nowHour = new Date().getHours();
        const getClosest = (cat) => {
          const arr = dayItems.filter(item => item.category === cat);
          if (arr.length === 0) return null;
          return arr.sort((a, b) => Math.abs(Number(a.fcstTime) - nowHour*100) - Math.abs(Number(b.fcstTime) - nowHour*100))[0];
        };
        const skyItem = getClosest('SKY');
        const ptyItem = getClosest('PTY');
        // POP(강수확률) 중 최대값
        const popItems = dayItems.filter(item => item.category === 'POP');
        const maxPop = popItems.length > 0 ? Math.max(...popItems.map(item => Number(item.fcstValue))) : '-';
        return {
          date: d,
          temp: tempItem ? Math.round(parseFloat(tempItem.fcstValue)) : '-',
          icon: getWeatherIconByKMA(skyItem?.fcstValue, ptyItem?.fcstValue),
          weather: getWeatherStatus(skyItem?.fcstValue),
          pop: maxPop
        };
      });
      // 현재 날씨(가장 가까운 PTY, SKY)
      const now = format(new Date(), 'yyyyMMddHHmm');
      const getClosestNow = (cat) => {
        const arr = weatherItems.filter(item => item.category === cat && item.fcstDate === format(new Date(), 'yyyyMMdd'));
        if (arr.length === 0) return null;
        const nowHour = new Date().getHours();
        return arr.sort((a, b) => Math.abs(Number(a.fcstTime) - nowHour*100) - Math.abs(Number(b.fcstTime) - nowHour*100))[0];
      };
      const currentSky = getClosestNow('SKY');
      const currentPty = getClosestNow('PTY');
      const currentTemp = weatherItems.find(item => item.category === 'TMP');
      const weatherDataObj = {
        current: {
          temp: currentTemp ? Math.round(parseFloat(currentTemp.fcstValue)) : '-',
          weather: getWeatherStatus(currentSky?.fcstValue),
          icon: getWeatherIconByKMA(currentSky?.fcstValue, currentPty?.fcstValue)
        },
        daily: days
      };
      // 지역별 캐시 키
      const cacheKey = `cachedWeatherData_${location}`;
      const cacheTimeKey = `cachedWeatherTime_${location}`;
      localStorage.setItem(cacheKey, JSON.stringify(weatherDataObj));
      localStorage.setItem(cacheTimeKey, new Date().toISOString());
      setWeatherData(weatherDataObj);
    } catch (error) {
      console.error('날씨 데이터 조회 실패:', error);
      // 날씨 오류 알림 제거
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // 날씨 기능 비활성화 (필요 없음)
  /*
  useEffect(() => {
    const checkAndFetchWeather = () => {
      const now = new Date();
      const hour = now.getHours();
      const cacheKey = `cachedWeatherData_${weatherLocation}`;
      const cacheTimeKey = `cachedWeatherTime_${weatherLocation}`;
      const shouldFetchFromAPI = hour === 3 || hour === 12 || hour === 16;
      const cachedWeather = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(cacheTimeKey);
      if (shouldFetchFromAPI) {
        fetchWeatherData(weatherLocation);
      } else if (cachedWeather && cachedTime) {
        const cacheTime = new Date(cachedTime);
        const hoursSinceCache = (now - cacheTime) / (1000 * 60 * 60);
        if (hoursSinceCache < 24) {
          setWeatherData(JSON.parse(cachedWeather));
        } else {
          fetchWeatherData(weatherLocation);
        }
      } else {
        fetchWeatherData(weatherLocation);
      }
    };
    checkAndFetchWeather();
    const interval = setInterval(checkAndFetchWeather, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [weatherLocation, fetchWeatherData]);
  */

  // 현장 데이터 fetch (stats용)
  useEffect(() => {
    const unsubSites = onSnapshot(collection(db, 'sites'), (snapshot) => {
      const arr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 진행중인 현장만 필터링
      const activeSites = arr.filter(site => site.status === '진행중');
      
      console.log('🔥 현장 데이터:', activeSites.length, '개', activeSites);
      
      // stats 업데이트 (현장 수)
      setStats(prev => ({
        ...prev,
        todaySites: activeSites.length
      }));
    }, (err) => {
      console.error('🔥 현장 데이터 연동 오류:', err);
      setError('현장 데이터를 불러오는 중 오류가 발생했습니다.');
    });

    return () => {
      console.log('🔥 현장 데이터 연동 해제');
      unsubSites();
    };
  }, []);

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
        
        // 오늘 00:00:00 ~ 23:59:59 사이에 생성된 항목만
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        return itemDate >= todayStart && itemDate <= todayEnd;
      });
      
      console.log('🔥 Firebase에서 가져온 오늘 일정 (클라이언트 필터링):', todaySchedules);
      
      // 금일현장 (type에 '현장' 포함)
      const todaySites = todaySchedules.filter(item => 
        item.type && 
        item.type.includes('현장')
      );
      console.log('🔥 금일현장:', todaySites.length, '개', todaySites);
      
      // 금일입찰 (type에 '입찰' 포함)
      const todayBids = todaySchedules.filter(item => 
        item.type && 
        item.type.includes('입찰')
      );
      console.log('🔥 금일입찰:', todayBids.length, '개', todayBids);
      
      // 금일회의 (type에 '회의' 포함)
      const todayMeetings = todaySchedules.filter(item => 
        item.type && 
        item.type.includes('회의')
      );
      console.log('🔥 금일회의:', todayMeetings.length, '개', todayMeetings);
      
      // 금일현설 (type에 '현설' 포함)
      const todaySetup = todaySchedules.filter(item => 
        item.type && 
        item.type.includes('현설')
      );
      console.log('🔥 금일현설:', todaySetup.length, '개', todaySetup);
      
      // 금일견적 (type에 '견적' 포함)
      const todayEstimate = todaySchedules.filter(item => 
        item.type && 
        item.type.includes('견적')
      );
      console.log('🔥 금일견적:', todayEstimate.length, '개', todayEstimate);
      
      // 금일기타 (type에 '기타' 포함)
      const todayEtc = todaySchedules.filter(item => 
        item.type && 
        item.type.includes('기타')
      );
      console.log('🔥 금일기타:', todayEtc.length, '개', todayEtc);
      
      // stats를 한 번에 업데이트
      const newStats = {
        todaySites: todaySites.length,
        progressCount: todayBids.length,
        discussionCount: todayMeetings.length,
        safetyCount: todaySetup.length,
        estimateCount: todayEstimate.length,
        etcCount: todayEtc.length
      };
      
      console.log('🔥 하단바 stats 업데이트:', newStats);
      
      setStats(prev => ({
        ...prev,
        ...newStats
      }));
      
      setProgressList(todaySites.slice(-5).reverse());
      setDiscussionList(todayBids.slice(-5).reverse());
      setSafetyList(todayMeetings.slice(-5).reverse());
      setSetupList(todaySetup.slice(-5).reverse());
      setEstimateList(todayEstimate.slice(-5).reverse());
      setEtcList(todayEtc.slice(-5).reverse());
    }, (err) => {
      console.error('🔥 하단바 일정 연동 오류:', err);
      setError('일정관리 데이터를 불러오는 중 오류가 발생했습니다.');
    });

    return () => {
      console.log('🔥 하단바 일정 연동 해제');
      unsubSchedules();
    };
  }, []);

  // ToDoList fetch + 최근 20개 (별도 관리)
  useEffect(() => {
    const unsubTodos = onSnapshot(collection(db, 'todos'), (snapshot) => {
      const arr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 현재 사용자의 투두리스트만 필터링
      const userTodos = arr.filter(item => item.userId === currentUser?.uid);
      
      // 오늘 날짜 필터링
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const todayTodos = userTodos.filter(item => {
        if (!item.createdAt) return false;
        
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
      
      setStats(prev => ({ ...prev, todoDone: done, todoTotal: sorted.length }));
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
      await addDoc(collection(db, 'todos'), {
        text: todoInput.trim(),
        completed: false,
        userId: currentUser.uid,
        date: new Date().toISOString().slice(0, 10), // 반드시 추가!
        createdAt: new Date(),
        updatedAt: new Date(),
        timestamp: Date.now() // 정확한 시간순 정렬을 위한 타임스탬프 추가
      });
      setTodoInput('');
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
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD 형식

      devLog('전날 날짜:', yesterdayStr);

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
        if (!todo.createdAt) return false;
        
        let todoDate;
        if (todo.createdAt.toDate) {
          todoDate = todo.createdAt.toDate();
        } else if (todo.createdAt instanceof Date) {
          todoDate = todo.createdAt;
        } else {
          todoDate = new Date(todo.createdAt);
        }
        
        return todoDate >= yesterdayStart && todoDate <= yesterdayEnd;
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
      
      const today = new Date().toISOString().slice(0, 10);
      
      // 오늘 이미 존재하는 투두 체크 (중복 방지)
      const todayQuery = query(
        collection(db, 'todos'),
        where('userId', '==', currentUser.uid),
        where('date', '==', today)
      );
      const todaySnapshot = await getDocs(todayQuery);
      const existingTodos = todaySnapshot.docs.map(doc => doc.data().text);
      
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
            date: today,
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
  // 날씨 아이콘 클릭 핸들러
  const handleWeatherIconClick = (e) => {
    setAnchorElWeather(e.currentTarget);
  };
  const handleWeatherClose = () => {
    setAnchorElWeather(null);
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
          <Typography sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {!isMobile && <span style={{ marginRight: '16px' }}>TODAY'S</span>}
            <EngineeringIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#FFD600', mr: 0.5 }} />
            {!isMobile && '[현장]'} {stats.todaySites ?? 0}
          </Typography>
          <Typography sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#4FC3F7', mr: 0.5 }} />
            {!isMobile && '[입찰]'} {stats.progressCount ?? 0}
          </Typography>
          <Typography sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ForumIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#FF7043', mr: 0.5 }} />
            {!isMobile && '[회의]'} {stats.discussionCount ?? 0}
          </Typography>
          <Typography sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SafetyHelmetIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#81C784', mr: 0.5 }} />
            {!isMobile && '[현설]'} {stats.safetyCount ?? 0}
          </Typography>
          <Typography 
            sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
            onClick={() => {
              console.log('하단바 견적 버튼 클릭 - 하단바 확장');
              // 하단바 확장만 하도록 수정 (페이지 이동 제거)
            }}
          >
            <CalculateIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#FF9800', mr: 0.5 }} />
            {!isMobile && '[견적]'} {stats.estimateCount ?? 0}
          </Typography>
          <Typography sx={{ fontSize: isMobile ? 12 : 15, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CategoryIcon sx={{ fontSize: isMobile ? 14 : 18, color: '#9E9E9E', mr: 0.5 }} />
            {!isMobile && '[기타]'} {stats.etcCount ?? 0}
          </Typography>
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
              const today = new Date();
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
              const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
              
              const todayTodos = todoList.filter(item => {
                if (!item.createdAt) return false;
                
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
                            {item.title || item.text || item.description || item.desc || '설명 없음'}
                          </Typography>
                          {(item.description || item.desc) && (item.description || item.desc).trim() && (
                            <Typography sx={{ color: '#ccc', fontSize: { xs: 11, md: 12 }, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description || item.desc}
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
            {(!isMobile || discussionList.length > 0) && (
              <Box sx={{ flex: { xs: 'none', md: 1 }, minWidth: { md: 0 } }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#4FC3F7', fontWeight: 600, fontSize: { xs: 14, md: 14 } }}>
                  📈 {isMobile ? '입찰' : '금일입찰'} ({discussionList.length}개)
                </Typography>
                {discussionList.length === 0 ? (
                  <Typography sx={{ color: '#ccc', fontSize: { xs: 12, md: 12 } }}>오늘 입찰 일정이 없습니다.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                    {discussionList.map((item, index) => (
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
                            <Typography sx={{ color: '#ccc', fontSize: { xs: 11, md: 12 }, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description || item.desc}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ color: '#4FC3F7', fontSize: { xs: 12, md: 12 }, fontWeight: 600, ml: 1, flexShrink: 0 }}>
                          {item.startDate}
                        </Typography>
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
                            <Typography sx={{ color: '#ccc', fontSize: { xs: 11, md: 12 }, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                            <Typography sx={{ color: '#ccc', fontSize: { xs: 11, md: 12 }, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

            {/* 금일견적 목록 */}
            {(!isMobile || estimateList.length > 0) && (
              <Box sx={{ flex: { xs: 'none', md: 1 }, minWidth: { md: 0 } }}>
                <Typography variant="h6" sx={{ mb: 1, color: '#FF9800', fontWeight: 600, fontSize: { xs: 14, md: 14 } }}>
                  🧮 {isMobile ? '견적' : '금일견적'} ({estimateList.length}개)
                </Typography>
                {estimateList.length === 0 ? (
                  <Typography sx={{ color: '#ccc', fontSize: { xs: 12, md: 12 } }}>오늘 견적 일정이 없습니다.</Typography>
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
                        alignItems: 'center'
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: { xs: 13, md: 14 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title || item.text || item.description || item.desc || '설명 없음'}
                          </Typography>
                          {(item.description || item.desc) && (item.description || item.desc).trim() && (
                            <Typography sx={{ color: '#ccc', fontSize: { xs: 11, md: 12 }, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description || item.desc}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ color: '#FF9800', fontSize: { xs: 12, md: 12 }, fontWeight: 600, ml: 1, flexShrink: 0 }}>
                          {item.startDate}
                        </Typography>
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
                          <Typography sx={{ fontWeight: 600, fontSize: { xs: 13, md: 14 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title || item.text || item.description || item.desc || '설명 없음'}
                          </Typography>
                          {(item.description || item.desc) && (item.description || item.desc).trim() && (
                            <Typography sx={{ color: '#ccc', fontSize: { xs: 11, md: 12 }, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description || item.desc}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ color: '#9E9E9E', fontSize: { xs: 12, md: 12 }, fontWeight: 600, ml: 1, flexShrink: 0 }}>
                          {item.startDate}
                        </Typography>
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