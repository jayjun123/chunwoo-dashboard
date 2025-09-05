import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  Alert,
  Tooltip,
  LinearProgress,
  Divider,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLoading } from './common/LoadingProvider';

import { exportToExcel } from '../utils/excelUtils.jsx';
import * as XLSX from 'xlsx';
import { useMediaQuery } from '@mui/material';
import SearchableSiteSelect from './common/SearchableSiteSelect';
import '../styles/GanttChart.css';

const GanttChart = () => {
  const theme = useTheme();
  const { setLoading, setLoadingMessage } = useLoading();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [error, setError] = useState('');
  const [sites, setSites] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSites, setSelectedSites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [useYearMode, setUseYearMode] = useState(true); // 연도 모드 사용 여부
  const [isFullscreen, setIsFullscreen] = useState(false); // 전체화면 모드
  const [viewMode, setViewMode] = useState('quarter'); // halfyear, quarter, year, mobile
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [selectedSiteForColor, setSelectedSiteForColor] = useState(null);
  const chartContainerRef = useRef(null);
  
  // 드래그 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  
  // 반기 계산 (6개월)
  const getCurrentHalfYear = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // 반기별 시작월 계산 (0, 6)
    const halfYearStartMonth = Math.floor(currentMonth / 6) * 6;
    const halfYearEndMonth = halfYearStartMonth + 5;
    
    return {
      startDate: new Date(currentYear, halfYearStartMonth, 1).toISOString().slice(0, 10),
      endDate: new Date(currentYear, halfYearEndMonth + 1, 0).toISOString().slice(0, 10)
    };
  };
  
  // 분기 계산 (3개월)
  const getCurrentQuarter = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // 분기별 시작월 계산 (0, 3, 6, 9)
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    return {
      startDate: new Date(currentYear, quarterStartMonth, 1).toISOString().slice(0, 10),
      endDate: new Date(currentYear, quarterEndMonth + 1, 0).toISOString().slice(0, 10)
    };
  };

  // 1년 모드 계산 (52주)
  const getCurrentYear = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    return {
      startDate: new Date(currentYear, 0, 1).toISOString().slice(0, 10),
      endDate: new Date(currentYear, 11, 31).toISOString().slice(0, 10)
    };
  };
  
  // 모바일용 1개월 계산
  const getCurrentMonth = () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 이번달 1일
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // 이번달 마지막일
    
    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10)
    };
  };

  const [dateRange, setDateRange] = useState(isMobile ? getCurrentMonth() : getCurrentQuarter());
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: '진행중',
    manager: '',
    address: ''
  });
  const [siteColors, setSiteColors] = useState({});

  // 현장 목록 로드
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const sitesQuery = query(collection(db, 'sites'));
        const snapshot = await getDocs(sitesQuery);
        const sitesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('🔥 공정표 - 현장 데이터 로드:', sitesData);
        setSites(sitesData);
        
        // 저장된 색상 정보 로드
        const savedColors = {};
        sitesData.forEach(site => {
          if (site.customColor) {
            savedColors[site.id] = site.customColor;
          }
        });
        setSiteColors(savedColors);
      } catch (error) {
        console.error('현장 목록 조회 실패:', error);
        setError('현장 목록을 불러오는데 실패했습니다.');
      }
    };
    fetchSites();
  }, []);

  // 선택된 연도의 전체 날짜 범위 계산
  const dateRangeObj = useMemo(() => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    return { start, end };
  }, [dateRange]);

  // 날짜 배열 생성 (설정된 기간에 따라)
  const dateArray = useMemo(() => {
    const dates = [];
    const current = new Date(dateRangeObj.start);
    
    // 1년 모드에서는 주 단위로 표시
    if (viewMode === 'year') {
      // 첫 주의 시작일(일요일)로 조정
      const dayOfWeek = current.getDay();
      current.setDate(current.getDate() - dayOfWeek);
      
      while (current <= dateRangeObj.end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7); // 7일씩 증가
      }
    } else {
      // 기존 로직: 1일 단위
      while (current <= dateRangeObj.end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    
    return dates;
  }, [dateRangeObj, viewMode]);

  // 오늘 날짜 인덱스 계산
  const todayIndex = useMemo(() => {
    const today = new Date();
    return dateArray.findIndex(date => 
      date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear()
    );
  }, [dateArray]);

  // 현장별 공사기간 처리
  const siteSchedules = useMemo(() => {
    const grouped = {};
    
    // 선택된 현장만 필터링 (선택된 현장이 없으면 모든 현장 표시)
    const filteredSites = selectedSites.length > 0 ? 
      sites.filter(site => selectedSites.includes(site.id)) : sites;
    
    filteredSites.forEach(site => {
      // 현장의 공사기간 처리
      let startDate, endDate;
      
      if (site.startDate) {
        if (site.startDate.toDate) {
          startDate = site.startDate.toDate();
        } else if (site.startDate instanceof Date) {
          startDate = site.startDate;
        } else {
          // 문자열 날짜 처리 (YYYY.MM.DD 또는 YYYY-MM-DD)
          const dateStr = site.startDate.replace(/\./g, '-');
          startDate = new Date(dateStr + 'T12:00:00');
        }
      }
      
      if (site.endDate) {
        if (site.endDate.toDate) {
          endDate = site.endDate.toDate();
        } else if (site.endDate instanceof Date) {
          endDate = site.endDate;
        } else {
          // 문자열 날짜 처리 (YYYY.MM.DD 또는 YYYY-MM-DD)
          const dateStr = site.endDate.replace(/\./g, '-');
          endDate = new Date(dateStr + 'T12:00:00');
        }
      }
      
      // 공사기간이 설정된 현장만 처리
      if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        // 선택된 기간과 겹치는지 확인
        const hasOverlap = (startDate <= dateRangeObj.end && endDate >= dateRangeObj.start);
        
        if (hasOverlap) {
          // 기간 경계 처리: 이전 기간에서 시작된 현장은 시작일을 설정된 시작일로 조정
          const displayStartDate = startDate < dateRangeObj.start ? 
            new Date(dateRangeObj.start) : startDate;
          // 다음 기간으로 넘어가는 현장은 종료일을 설정된 종료일로 조정
          const displayEndDate = endDate > dateRangeObj.end ? 
            new Date(dateRangeObj.end) : endDate;
          
          grouped[site.id] = {
            site,
            schedule: {
              id: site.id,
              text: site?.name,
              desc: site.address || '',
              startDate: displayStartDate,
              endDate: displayEndDate,
              status: site.status || '진행중',
              progress: 0, // 진행률은 별도 계산 필요
              siteId: site.id,
              siteName: site.name
            }
          };
        }
      }
    });

    console.log('🔥 공정표 - 처리된 현장 데이터:', grouped);
    return grouped;
  }, [sites, dateRangeObj, selectedSites]);

  // 현장의 위치와 너비 계산 (기간 경계 고려)
  const getSitePosition = (schedule) => {
    let startIndex, endIndex, duration;
    
    if (viewMode === 'year') {
      // 1년 모드: 주 단위로 계산
      const startWeek = Math.floor((schedule.startDate - dateRangeObj.start) / (1000 * 60 * 60 * 24 * 7));
      const endWeek = Math.floor((schedule.endDate - dateRangeObj.start) / (1000 * 60 * 60 * 24 * 7));
      startIndex = startWeek;
      endIndex = endWeek;
      duration = Math.max(1, endIndex - startIndex + 1);
    } else {
      // 기존 로직: 일 단위로 계산
      startIndex = Math.floor((schedule.startDate - dateRangeObj.start) / (1000 * 60 * 60 * 24));
      endIndex = Math.floor((schedule.endDate - dateRangeObj.start) / (1000 * 60 * 60 * 24));
      duration = Math.max(1, endIndex - startIndex + 1);
    }
    
    const adjustedStartIndex = startIndex;
    const adjustedDuration = duration;
    
    // 1년 모드에서도 컴팩트한 너비 사용
    const unitWidth = isMobile ? 30 * zoomLevel : 40 * zoomLevel;
    
    console.log('🔥 위치 계산:', {
      siteName: schedule.text,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      dateRangeStart: dateRangeObj.start,
      startIndex,
      endIndex,
      duration,
      adjustedStartIndex,
      adjustedDuration,
      viewMode,
      unitWidth,
      left: adjustedStartIndex * unitWidth,
      width: adjustedDuration * unitWidth
    });
    
    return {
      left: Math.max(0, adjustedStartIndex * unitWidth),
      width: Math.max(unitWidth, adjustedDuration * unitWidth),
      startIndex: adjustedStartIndex,
      duration: adjustedDuration
    };
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case '완료': return theme.palette.success.main;
      case '진행중': return theme.palette.primary.main;
      case '지연': return theme.palette.error.main;
      case '예정': return theme.palette.info.main;
      case '계획': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  // 현장별 색상 (사용자 정의 색상 우선, 없으면 상태별 색상)
  const getSiteColor = (siteId, status) => {
    const site = sites.find(s => s.id === siteId);
    return site?.customColor || siteColors[siteId] || getStatusColor(status);
  };

  // 더블클릭 처리
  const handleSiteDoubleClick = (schedule, e) => {
    e.stopPropagation();
    console.log('더블클릭된 현장:', schedule);
    handleColorDialogOpen(schedule.id);
  };

  // 색상 선택 다이얼로그 열기
  const handleColorDialogOpen = (siteId) => {
    console.log('색상 다이얼로그 열기 - 현장 ID:', siteId);
    setSelectedSiteForColor(siteId);
    setColorDialogOpen(true);
  };

  // 색상 변경
  const handleColorChange = async (newColor) => {
    if (!selectedSiteForColor) return;
    
    console.log('색상 변경 시도:', { siteId: selectedSiteForColor, newColor });
    
    try {
      // Firebase에 색상 저장
      await updateDoc(doc(db, 'sites', selectedSiteForColor), {
        customColor: newColor,
        updatedAt: new Date()
      });
      
      // 로컬 상태 업데이트
      setSiteColors(prev => ({
        ...prev,
        [selectedSiteForColor]: newColor
      }));
      
      console.log('색상 변경 성공:', newColor);
      setColorDialogOpen(false);
      setSelectedSiteForColor(null);
    } catch (error) {
      console.error('색상 저장 실패:', error);
      setError('색상 저장에 실패했습니다.');
    }
  };

  // 색상 옵션들
  const colorOptions = [
    { name: '파란색', value: theme.palette.primary.main },
    { name: '보라색', value: theme.palette.secondary.main },
    { name: '초록색', value: theme.palette.success.main },
    { name: '빨간색', value: theme.palette.error.main },
    { name: '주황색', value: theme.palette.warning.main },
    { name: '하늘색', value: theme.palette.info.main },
    { name: '자주색', value: '#9c27b0' },
    { name: '주황색', value: '#ff9800' },
    { name: '갈색', value: '#795548' },
    { name: '청회색', value: '#607d8b' },
    { name: '핑크색', value: '#e91e63' },
    { name: '연두색', value: '#8bc34a' },
    { name: '청록색', value: '#00bcd4' },
    { name: '보라색', value: '#673ab7' },
    { name: '회색', value: '#9e9e9e' },
    { name: '검정색', value: '#000000' }
  ];

  // 진행률에 따른 색상
  const getProgressColor = (progress) => {
    if (progress >= 80) return theme.palette.success.main;
    if (progress >= 50) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // 오늘 날짜로 스크롤하는 함수
  const scrollToToday = () => {
    if (chartContainerRef.current) {
      const todayPosition = todayIndex * (isMobile ? 30 * zoomLevel : 40 * zoomLevel);
      const containerWidth = chartContainerRef.current.clientWidth;
      const scrollPosition = todayPosition - (containerWidth / 2);
      chartContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  };

  // 드래그 시작 (마우스)
  const handleMouseDown = (e) => {
    if (chartContainerRef.current && e.button === 0) { // 좌클릭만
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setScrollStart({ 
        left: chartContainerRef.current.scrollLeft, 
        top: chartContainerRef.current.scrollTop 
      });
      e.preventDefault();
    }
  };

  // 드래그 시작 (터치)
  const handleTouchStart = (e) => {
    if (chartContainerRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setScrollStart({ 
        left: chartContainerRef.current.scrollLeft, 
        top: chartContainerRef.current.scrollTop 
      });
      e.preventDefault();
    }
  };

  // 드래그 중 (마우스)
  const handleMouseMove = (e) => {
    if (isDragging && chartContainerRef.current) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      chartContainerRef.current.scrollLeft = scrollStart.left - deltaX;
      chartContainerRef.current.scrollTop = scrollStart.top - deltaY;
      e.preventDefault();
    }
  };

  // 드래그 중 (터치)
  const handleTouchMove = (e) => {
    if (isDragging && chartContainerRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      
      chartContainerRef.current.scrollLeft = scrollStart.left - deltaX;
      chartContainerRef.current.scrollTop = scrollStart.top - deltaY;
      e.preventDefault();
    }
  };

  // 드래그 끝
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 전역 마우스/터치 이벤트 등록
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStart, scrollStart]);

  // 모바일 감지 시 자동으로 모바일 뷰로 변경
  useEffect(() => {
    if (isMobile) {
      handleViewModeChange('mobile');
    }
  }, [isMobile]);

  // 컴포넌트 마운트 시 오늘 날짜로 스크롤
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 100);
    return () => clearTimeout(timer);
  }, [zoomLevel, dateRange]);

  // 뷰 모드 변경
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    switch (mode) {
      case 'halfyear':
        setDateRange(getCurrentHalfYear());
        break;
      case 'quarter':
        setDateRange(getCurrentQuarter());
        break;
      case 'year':
        setDateRange(getCurrentYear());
        break;
      case 'mobile':
        setDateRange(getCurrentMonth());
        break;
      default:
        setDateRange(getCurrentHalfYear());
    }
  };

  // 전체화면 토글
  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 줌 레벨 조정
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  // 연도 변경 시 기간도 함께 변경
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    setUseYearMode(true);
    // 선택된 연도의 현재 분기로 설정
    const today = new Date();
    const currentMonth = today.getMonth();
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    
    setDateRange({
      startDate: new Date(newYear, quarterStartMonth, 1).toISOString().slice(0, 10),
      endDate: new Date(newYear, quarterEndMonth + 1, 0).toISOString().slice(0, 10)
    });
  };

  // 기간 변경
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    setUseYearMode(false); // 기간을 수동으로 설정하면 연도 모드 해제
  };

  // 현장 선택 변경
  const handleSiteSelection = (siteId) => {
    setSelectedSites(prev => {
      if (prev.includes(siteId)) {
        return prev.filter(id => id !== siteId);
      } else {
        return [...prev, siteId];
      }
    });
  };

  // 모든 현장 선택/해제
  const handleSelectAllSites = () => {
    if (selectedSites.length === sites.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(sites.map(site => site.id));
    }
  };

  // 공사기간 계산
  const getConstructionPeriod = (site) => {
    if (!site.startDate || !site.endDate) return '공사기간 미정';
    
    let startDate, endDate;
    
    if (site.startDate.toDate) {
      startDate = site.startDate.toDate();
    } else if (site.startDate instanceof Date) {
      startDate = site.startDate;
    } else {
      // 문자열 날짜 처리 (YYYY.MM.DD 또는 YYYY-MM-DD)
      const dateStr = site.startDate.replace(/\./g, '-');
      startDate = new Date(dateStr + 'T12:00:00');
    }
    
    if (site.endDate.toDate) {
      endDate = site.endDate.toDate();
    } else if (site.endDate instanceof Date) {
      endDate = site.endDate;
    } else {
      // 문자열 날짜 처리 (YYYY.MM.DD 또는 YYYY-MM-DD)
      const dateStr = site.endDate.replace(/\./g, '-');
      endDate = new Date(dateStr + 'T12:00:00');
    }
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return '공사기간 미정';
    }
    
    return `${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}`;
  };

  // 현장 저장
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage('현장 정보 저장 중...');
    try {
      const siteData = {
        ...formData,
        startDate: new Date(formData.startDate + 'T12:00:00'),
        endDate: new Date(formData.endDate + 'T12:00:00'),
        updatedAt: new Date()
      };

      if (editingSite) {
        await updateDoc(doc(db, 'sites', editingSite.id), siteData);
      } else {
        await addDoc(collection(db, 'sites'), {
          ...siteData,
          createdAt: new Date()
        });
      }
      
      setIsModalOpen(false);
      setEditingSite(null);
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        status: '진행중',
        manager: '',
        address: ''
      });
    } catch (error) {
      console.error('현장 저장 실패:', error);
      setError('현장 저장에 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // 현장 삭제
  const handleDelete = async (siteId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'sites', siteId));
      } catch (error) {
        console.error('현장 삭제 실패:', error);
        setError('현장 삭제에 실패했습니다.');
      }
    }
  };

  // 현장 편집 모달 열기
  const handleEdit = (site) => {
    setEditingSite(site);
    
    // 날짜 형식 변환
    let startDateStr = '';
    let endDateStr = '';
    
    if (site.startDate) {
      if (site.startDate.toDate) {
        startDateStr = site.startDate.toDate().toISOString().slice(0, 10);
      } else if (site.startDate instanceof Date) {
        startDateStr = site.startDate.toISOString().slice(0, 10);
      } else {
        // 문자열 날짜를 YYYY-MM-DD 형식으로 변환
        startDateStr = site.startDate.replace(/\./g, '-');
      }
    }
    
    if (site.endDate) {
      if (site.endDate.toDate) {
        endDateStr = site.endDate.toDate().toISOString().slice(0, 10);
      } else if (site.endDate instanceof Date) {
        endDateStr = site.endDate.toISOString().slice(0, 10);
      } else {
        // 문자열 날짜를 YYYY-MM-DD 형식으로 변환
        endDateStr = site.endDate.replace(/\./g, '-');
      }
    }
    
    setFormData({
      name: site?.name || '',
      startDate: startDateStr,
      endDate: endDateStr,
      status: site.status || '진행중',
      manager: site.manager || '',
      address: site.address || ''
    });
    setIsModalOpen(true);
  };

  // 새 현장 모달 열기
  const handleAdd = () => {
    setEditingSite(null);
    setFormData({
      name: '',
      startDate: currentDate.toISOString().slice(0, 10),
      endDate: currentDate.toISOString().slice(0, 10),
      status: '진행중',
      manager: '',
      address: ''
    });
    setIsModalOpen(true);
  };

  // 엑셀 내보내기 함수 (막대 차트 포함)
  const handleExportExcel = () => {
    try {
      console.log('현장현황표 엑셀 내보내기 시작');
      
      // 현재 표시된 현장들의 데이터 준비
      const displaySites = selectedSites.length > 0 
        ? sites.filter(site => selectedSites.includes(site.id))
        : sites;

      if (displaySites.length === 0) {
        alert('내보낼 현장 데이터가 없습니다.');
        return;
      }

      // 엑셀 데이터 생성 (진행률을 숫자로 포함)
      const exportData = displaySites.map((site, index) => {
        const startDate = site.startDate ? new Date(site.startDate).toLocaleDateString('ko-KR') : '';
        const endDate = site.endDate ? new Date(site.endDate).toLocaleDateString('ko-KR') : '';
        const progressValue = site.progress ? Number(site.progress) : 0;
        
        return {
          'No.': index + 1,
          '현장명': site?.name || '',
          '현장장': site.manager || '',
          '주소': site.address || '',
          '상태': site.status || '',
          '착공일': startDate,
          '준공예정일': endDate,
          '계약금액': site.contractAmount ? Number(site.contractAmount) : 0,
          '진행률(%)': progressValue,
          '진행률_표시': progressValue + '%',
          '비고': site.note || ''
        };
      });

      // 요약 정보 추가
      const summaryData = [
        { '항목': '총 현장 수', '값': displaySites.length },
        { '항목': '진행중 현장', '값': displaySites.filter(site => site.status === '진행중').length },
        { '항목': '완료 현장', '값': displaySites.filter(site => site.status === '완료').length },
        { '항목': '계획중 현장', '값': displaySites.filter(site => site.status === '계획중').length },
        { '항목': '현재 보기 모드', '값': viewMode === 'halfyear' ? '반기 보기' : 
                                        viewMode === 'quarter' ? '분기 보기' : 
                                        viewMode === 'year' ? '1년 보기' : '기간 보기' },
        { '항목': '선택된 연도', '값': selectedYear + '년' }
      ];

      // 차트 데이터 생성 (더 상세한 정보 포함)
      const chartData = displaySites.map(site => ({
        '현장명': site?.name || '',
        '진행률(%)': site.progress ? Number(site.progress) : 0,
        '계약금액(백만원)': site.contractAmount ? Math.round(Number(site.contractAmount) / 1000000) : 0,
        '상태': site.status || '',
        '현장장': site.manager || '',
        '착공일': site.startDate ? new Date(site.startDate).toLocaleDateString('ko-KR') : '',
        '준공예정일': site.endDate ? new Date(site.endDate).toLocaleDateString('ko-KR') : ''
      }));

      // 상태별 통계 데이터
      const statusStats = [
        { '상태': '진행중', '개수': displaySites.filter(site => site.status === '진행중').length },
        { '상태': '완료', '개수': displaySites.filter(site => site.status === '완료').length },
        { '상태': '계획중', '개수': displaySites.filter(site => site.status === '계획중').length },
        { '상태': '지연', '개수': displaySites.filter(site => site.status === '지연').length },
        { '상태': '예정', '개수': displaySites.filter(site => site.status === '예정').length }
      ];

      // 진행률 구간별 통계
      const progressRanges = [
        { '구간': '0-20%', '개수': displaySites.filter(site => (site.progress || 0) >= 0 && (site.progress || 0) <= 20).length },
        { '구간': '21-40%', '개수': displaySites.filter(site => (site.progress || 0) >= 21 && (site.progress || 0) <= 40).length },
        { '구간': '41-60%', '개수': displaySites.filter(site => (site.progress || 0) >= 41 && (site.progress || 0) <= 60).length },
        { '구간': '61-80%', '개수': displaySites.filter(site => (site.progress || 0) >= 61 && (site.progress || 0) <= 80).length },
        { '구간': '81-100%', '개수': displaySites.filter(site => (site.progress || 0) >= 81 && (site.progress || 0) <= 100).length }
      ];

      // 컬럼 너비 설정 (한글 텍스트 고려)
      const columnWidths = [
        { wch: 8 },   // No.
        { wch: 25 },  // 현장명
        { wch: 15 },  // 현장장
        { wch: 40 },  // 주소
        { wch: 12 },  // 상태
        { wch: 12 },  // 착공일
        { wch: 12 },  // 준공예정일
        { wch: 20 },  // 계약금액
        { wch: 10 },  // 진행률(%)
        { wch: 12 },  // 진행률_표시
        { wch: 30 }   // 비고
      ];

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      
      // 메인 데이터 시트
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = columnWidths;
      XLSX.utils.book_append_sheet(wb, ws, '현장현황표');
      
      // 요약 시트
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, '요약');
      
      // 차트용 데이터 시트
      const wsChart = XLSX.utils.json_to_sheet(chartData);
      XLSX.utils.book_append_sheet(wb, wsChart, '차트데이터');
      
      // 상태별 통계 시트
      const wsStatusStats = XLSX.utils.json_to_sheet(statusStats);
      XLSX.utils.book_append_sheet(wb, wsStatusStats, '상태통계');
      
      // 진행률 구간별 통계 시트
      const wsProgressRanges = XLSX.utils.json_to_sheet(progressRanges);
      XLSX.utils.book_append_sheet(wb, wsProgressRanges, '진행률통계');

      // 간트 차트 데이터 생성 (각 현장의 공사기간을 가로 막대기로 표시)
      const ganttData = displaySites.map(site => {
        const startDate = site.startDate ? new Date(site.startDate) : null;
        const endDate = site.endDate ? new Date(site.endDate) : null;
        
        return {
          '현장명': site?.name || '',
          '현장장': site.manager || '',
          '착공일': startDate ? startDate.toISOString().split('T')[0] : '',
          '준공예정일': endDate ? endDate.toISOString().split('T')[0] : '',
          '공사기간(일)': startDate && endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : 0,
          '상태': site.status || '',
          '진행률(%)': site.progress ? Number(site.progress) : 0,
          '계약금액(백만원)': site.contractAmount ? Math.round(Number(site.contractAmount) / 1000000) : 0
        };
      });

      // 간트 차트 시트
      const wsGantt = XLSX.utils.json_to_sheet(ganttData);
      XLSX.utils.book_append_sheet(wb, wsGantt, '간트차트');

      // 파일명 생성
      const dateStr = new Date().toISOString().split('T')[0];
      const finalFileName = `현장현황표_${dateStr}.xlsx`;

      // 엑셀 파일 다운로드
      XLSX.writeFile(wb, finalFileName);

      alert('현장현황표가 엑셀 파일로 다운로드되었습니다.\n\n📊 차트 만들기 가이드:\n\n🎯 간트 차트 (현장별 공사기간):\n   - "간트차트" 시트 선택\n   - A1:H' + (ganttData.length + 1) + ' 범위 선택\n   - 삽입 → 차트 → 막대 차트 (가로 막대)\n   - 가로축: 날짜, 세로축: 현장명\n\n1️⃣ 진행률 막대 차트:\n   - "차트데이터" 시트 선택\n   - A1:B' + (chartData.length + 1) + ' 범위 선택\n   - 삽입 → 차트 → 막대 차트\n\n2️⃣ 계약금액 막대 차트:\n   - "차트데이터" 시트 선택\n   - A1:C' + (chartData.length + 1) + ' 범위 선택\n   - 삽입 → 차트 → 막대 차트\n\n3️⃣ 상태별 파이 차트:\n   - "상태통계" 시트 선택\n   - A1:B6 범위 선택\n   - 삽입 → 차트 → 파이 차트\n\n4️⃣ 진행률 구간별 차트:\n   - "진행률통계" 시트 선택\n   - A1:B6 범위 선택\n   - 삽입 → 차트 → 막대 차트');
      console.log('엑셀 파일명:', finalFileName);
      
      return { success: true, fileName: finalFileName };
    } catch (error) {
      console.error('현장현황표 엑셀 내보내기 오류:', error);
      alert('엑셀 내보내기 중 오류가 발생했습니다.');
    }
  };



  return (
    <Box sx={{ 
      p: isFullscreen ? 0 : 3, 
      top: '68px', // 상단에서 68px 떨어진 위치
      height: isFullscreen ? '100vh' : 'calc(100vh - 68px)', // 전체 화면 높이에서 68px 뺀 값
      width: isFullscreen ? '100vw' : '100%',
      position: 'fixed', // 화면 고정
      left: 0,
      zIndex: 1000,
      backgroundColor: 'background.paper',
      overflow: 'auto' // 스크롤 가능하도록 설정
    }}>
      <Typography variant={isMobile ? "h6" : "h4"} sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        p: isFullscreen ? 2 : 0,
        borderBottom: 1,
        borderColor: 'divider',
        pt: 0,
        pb: 1,
        position: 'sticky', // 상단에 고정
        top: 0, // 최상단에 고정
        zIndex: 1001, // 다른 요소들 위에 표시
        backgroundColor: 'background.paper' // 배경색 설정
      }}>
        <TimelineIcon color="primary" />
        현장 현황표 {isMobile ? 
          '(1개월 보기)' :
          (viewMode === 'halfyear' ? 
            '(반기 보기)' : 
            viewMode === 'quarter' ? 
              '(분기 보기)' : 
            viewMode === 'year' ? 
              '(1년 보기)' : 
              `(${dateRange.startDate} ~ ${dateRange.endDate})`
          )
        }
        {isFullscreen && (
          <IconButton 
            onClick={handleFullscreenToggle} 
            size="small" 
            sx={{ ml: 'auto' }}
          >
            <FullscreenExitIcon />
          </IconButton>
        )}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 컨트롤 패널 */}
      <Card sx={{ 
        mb: 3,
        position: 'sticky', // 상단에 고정
        top: isMobile ? '40px' : '60px', // 제목 아래에 고정
        zIndex: 999, // 제목보다 낮은 z-index
        backgroundColor: 'background.paper' // 배경색 설정
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: isMobile ? 0.5 : 2,
                flexDirection: isMobile ? 'column' : 'row',
                width: '100%'
              }}>
                {!isMobile && (
                  <Typography variant="h6">
                    현장별 진행 상황 ({Object.keys(siteSchedules).length}개 현장)
                  </Typography>
                )}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: isMobile ? 0.5 : 2,
                  flexDirection: isMobile ? 'row' : 'row',
                  flexWrap: isMobile ? 'wrap' : 'nowrap'
                }}>
                <FormControl size="small" sx={{ minWidth: isMobile ? 60 : 120 }}>
                  <InputLabel sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>연도</InputLabel>
                  <Select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    label="연도"
                    sx={{ 
                      fontSize: isMobile ? '0.7rem' : 'inherit',
                      '& .MuiSelect-select': { 
                        color: useYearMode ? 'primary.main' : 'text.secondary',
                        fontWeight: useYearMode ? 'bold' : 'normal',
                        fontSize: isMobile ? '0.7rem' : 'inherit'
                      }
                    }}
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                      <MenuItem key={year} value={year} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>{year}년</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <SearchableSiteSelect
                  sites={sites}
                  selectedSites={selectedSites}
                  onSiteSelection={setSelectedSites}
                  onSelectAll={handleSelectAllSites}
                  size="small"
                  sx={{ minWidth: isMobile ? 80 : 200 }}
                  getConstructionPeriod={getConstructionPeriod}
                />
                <TextField
                  size="small"
                  label="시작일"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    minWidth: isMobile ? 80 : 140,
                    fontSize: isMobile ? '0.7rem' : 'inherit',
                    '& .MuiInputBase-input': { 
                      color: !useYearMode ? 'primary.main' : 'text.secondary',
                      fontWeight: !useYearMode ? 'bold' : 'normal',
                      fontSize: isMobile ? '0.7rem' : 'inherit'
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: isMobile ? '0.7rem' : 'inherit'
                    }
                  }}
                />
                <Typography variant="body2" color={!useYearMode ? 'primary.main' : 'text.secondary'} fontWeight={!useYearMode ? 'bold' : 'normal'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
                  ~
                </Typography>
                <TextField
                  size="small"
                  label="종료일"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    minWidth: isMobile ? 80 : 140,
                    fontSize: isMobile ? '0.7rem' : 'inherit',
                    '& .MuiInputBase-input': { 
                      color: !useYearMode ? 'primary.main' : 'text.secondary',
                      fontWeight: !useYearMode ? 'bold' : 'normal',
                      fontSize: isMobile ? '0.7rem' : 'inherit'
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: isMobile ? '0.7rem' : 'inherit'
                    }
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* PC 전용 컨트롤 */}
              {!isMobile && (
                <>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>보기 모드</InputLabel>
                    <Select
                      value={viewMode}
                      onChange={(e) => handleViewModeChange(e.target.value)}
                      label="보기 모드"
                    >
                      <MenuItem value="quarter">분기 (3개월)</MenuItem>
                      <MenuItem value="halfyear">반기 (6개월)</MenuItem>
                      <MenuItem value="year">1년 (52주)</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip title={isFullscreen ? "전체화면 해제" : "전체화면"}>
                    <IconButton onClick={handleFullscreenToggle} size="small">
                      {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="오늘 날짜로 이동">
                    <IconButton onClick={scrollToToday} size="small">
                      <TodayIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="축소">
                    <IconButton onClick={handleZoomOut} size="small">
                      <ZoomOutIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="확대">
                    <IconButton onClick={handleZoomIn} size="small">
                      <ZoomInIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="엑셀 내보내기">
                    <IconButton onClick={handleExportExcel} size="small" color="success">
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>

                </>
              )}
              
              {/* 모바일 전용 컨트롤 */}
              {isMobile && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    1개월 보기
                  </Typography>
                  <Tooltip title="오늘 날짜로 이동">
                    <IconButton onClick={scrollToToday} size="small">
                      <TodayIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="엑셀 내보내기">
                    <IconButton onClick={handleExportExcel} size="small" color="success">
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>

                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 공정표 차트 */}
      <Paper sx={{ 
        p: isMobile ? 1 : 3, 
        overflow: 'auto', 
        mt: isMobile ? 1 : 2.5, 
        maxHeight: isFullscreen ? 'calc(100vh - 80px)' : isMobile ? 'calc(60vh + 50px)' : 'calc(70vh + 50px)',
        height: isFullscreen ? 'calc(100vh - 80px)' : 'auto',
        // 모바일 터치 개선
        touchAction: isMobile ? 'pan-x pan-y' : 'auto',
        WebkitOverflowScrolling: 'touch',
        userSelect: 'none',
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px'
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#2d3748',
          borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#4a5568',
          borderRadius: '4px',
          border: '1px solid #2d3748'
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#718096'
        },
        '&::-webkit-scrollbar-corner': {
          backgroundColor: '#2d3748'
        },
        scrollbarWidth: 'thin',
        scrollbarColor: '#4a5568 #2d3748',
        cursor: isDragging ? 'grabbing' : 'grab'
      }} 
      ref={chartContainerRef} 
      className="gantt-timeline"
      onMouseDown={handleMouseDown}>
        <Box sx={{ 
          position: 'relative', 
          minHeight: isMobile ? 400 : 600,
          width: '100%',
          maxWidth: '100%',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1
        }}>
          {/* 날짜 헤더 */}
          <Box sx={{ 
            position: 'sticky', 
            top: 0, 
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            zIndex: 10,
            mt: 5
          }}>
            <Grid container sx={{ 
              width: '100%',
              maxWidth: '100%'
            }}>
              {/* 날짜 열들 */}
              <Grid xs={12} sx={{ display: 'flex' }}>
                {dateArray.map((date, index) => {
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();
                  
                  return (
                    <Box
                      key={index}
                      sx={{
                        flex: 1,
                        minWidth: isMobile ? 25 : 35,
                        borderRight: 1,
                        borderColor: 'divider',
                        p: isMobile ? 0.25 : 0.5,
                        textAlign: 'center',
                        backgroundColor: date.getDay() === 0 ? 'primary.dark' : 'background.paper',
                        position: 'relative',
                        border: isToday ? '2px solid #ff0000' : 'none',
                        boxShadow: isToday ? '0 0 5px rgba(255, 0, 0, 0.5)' : 'none'
                      }}
                    >
                      <Typography variant={isMobile ? "caption" : "body2"} display="block" color={date.getDay() === 0 ? 'yellow.300' : 'white'} fontWeight="bold" sx={{ pt: viewMode === 'year' ? (isMobile ? 1 : 1.5) : (isMobile ? 1.5 : 2.5), fontSize: viewMode === 'year' ? (isMobile ? '0.7rem' : '0.8rem') : (isMobile ? '0.6rem' : 'inherit') }}>
                        {viewMode === 'year' ? `${date.getMonth() + 1}/${date.getDate()}` : date.getDate()}
                      </Typography>
                      <Typography variant={isMobile ? "caption" : "body2"} color={date.getDay() === 0 ? 'yellow.300' : 'white'} sx={{ pt: viewMode === 'year' ? 0.25 : (isMobile ? 0.25 : 0.5), fontSize: viewMode === 'year' ? (isMobile ? '0.6rem' : '0.7rem') : (isMobile ? '0.5rem' : 'inherit') }}>
                        {viewMode === 'year' ? 
                          `${Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1}주` : 
                          (isMobile ? `${date.getMonth() + 1}/${date.getDate()}` : date.toLocaleDateString('ko-KR', { weekday: 'short' }))
                        }
                      </Typography>
                      
                      {/* 월 표시 */}
                      {date.getDate() === 1 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -30,
                            left: 0,
                            width: 120 * zoomLevel,
                            textAlign: 'center',
                            zIndex: 5
                          }}
                        >
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              backgroundColor: 'white',
                              color: 'black',
                              px: 2,
                              py: 1,
                              borderRadius: 2,
                              fontWeight: 'bold',
                              fontSize: '1.2rem',
                              border: 1,
                              borderColor: 'primary.main'
                            }}
                          >
                            {date.getMonth() + 1}월
                          </Typography>
                        </Box>
                      )}
                      
                      {/* 월 구분선 */}
                      {date.getDate() === 1 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '2px',
                            backgroundColor: 'primary.main',
                            opacity: 0.7
                          }}
                        />
                      )}
                      
                      {/* 오늘 날짜 표시 */}
                      {isToday && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            border: 2,
                            borderColor: '#ff0000',
                            backgroundColor: 'transparent',
                            opacity: 1,
                            pointerEvents: 'none',
                            boxShadow: '0 0 5px rgba(255, 0, 0, 0.5)'
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Grid>
            </Grid>
          </Box>

          {/* 현장별 공사기간 행들 */}
          <Box sx={{ 
            minWidth: isMobile ? 
              dateArray.length * (30 * zoomLevel) + 150 : 
              dateArray.length * (40 * zoomLevel) + 200, 
            mt: isMobile ? 1 : 3 
          }}>
            {Object.entries(siteSchedules).map(([siteId, { site, schedule }]) => (
              <Grid 
                key={siteId} 
                container 
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  minHeight: isMobile ? 40 : 60,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                {/* 현장명 열 */}
                {!isMobile && (
                  <Grid xs={2} sx={{ 
                    borderRight: 1, 
                    borderColor: 'divider',
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'white',
                    zIndex: 10
                  }}>
                    <Typography variant="body2" fontWeight="bold" noWrap color="black">
                      {site?.name}
                    </Typography>
                    <Typography variant="caption" color="black" noWrap>
                      {getConstructionPeriod(site)}
                    </Typography>
                  </Grid>
                )}
                
                {/* 공사기간 차트 영역 */}
                <Grid xs={isMobile ? 12 : 10} sx={{ position: 'relative', minHeight: viewMode === 'year' ? (isMobile ? 30 : 40) : (isMobile ? 40 : 60) }}>
                    {schedule && (
                                              <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            left: getSitePosition(schedule).left,
                            width: getSitePosition(schedule).width,
                            height: viewMode === 'year' ? (isMobile ? 12 : 16) : (isMobile ? 16 : 20),
                            backgroundColor: getSiteColor(site.id, schedule.status),
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: 1,
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateY(-50%) scale(1.02)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        onDoubleClick={(e) => handleSiteDoubleClick(schedule, e)}
                      >
                        {/* 현장명 */}
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: isMobile ? 'black' : 'white',
                            fontWeight: 'bold',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                            fontSize: viewMode === 'year' ? (isMobile ? '0.4rem' : '0.5rem') : (isMobile ? '0.5rem' : '0.6rem'),
                            textAlign: 'center',
                            px: isMobile ? 0.25 : 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {schedule.text}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
              </Grid>
            ))}
          </Box>


        </Box>
      </Paper>

      {/* 현장 추가/편집 모달 */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSite ? '현장 편집' : '새 현장 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="현장명"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid xs={6}>
                <TextField
                  fullWidth
                  label="착공일"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid xs={6}>
                <TextField
                  fullWidth
                  label="준공예정일"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid xs={6}>
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
                    <MenuItem value="지연">지연</MenuItem>
                    <MenuItem value="계획">계획</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={6}>
                <TextField
                  fullWidth
                  label="현장장"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="주소"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSite ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 색상 선택 다이얼로그 */}
      <Dialog open={colorDialogOpen} onClose={() => setColorDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          현장 색상 선택
          {selectedSiteForColor && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {sites.find(s => s.id === selectedSiteForColor)?.name || '선택된 현장'}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {colorOptions.map((colorOption) => (
                <Grid xs={3} key={colorOption.value}>
                  <Box
                    sx={{
                      width: '100%',
                      height: 60,
                      backgroundColor: colorOption.value,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      '&:hover': {
                        border: '2px solid #1976d2',
                        transform: 'scale(1.05)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => handleColorChange(colorOption.value)}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: colorOption.value === '#000000' ? 'white' : 
                               colorOption.value === '#9e9e9e' ? 'white' : 'black',
                        fontWeight: 'bold',
                        textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
                      }}
                    >
                      {colorOption.name}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColorDialogOpen(false)}>취소</Button>
        </DialogActions>
      </Dialog>

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: translateY(-50%) scale(1); }
            50% { transform: translateY(-50%) scale(1.2); }
            100% { transform: translateY(-50%) scale(1); }
          }
        `}
      </style>
    </Box>
  );
};

export default GanttChart; 