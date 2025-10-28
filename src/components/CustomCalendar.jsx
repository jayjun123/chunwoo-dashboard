import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, IconButton, Button, ToggleButtonGroup, ToggleButton, Tooltip, Checkbox, FormControlLabel, useMediaQuery, useTheme, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarViewWeekIcon from '@mui/icons-material/ViewWeek';
import CalendarViewDayIcon from '@mui/icons-material/ViewDay';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { exportCalendarToExcel } from "../utils/excelUtils.jsx";

import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { addSchedule, updateSchedule } from '../api/schedules';
import AddIcon from '@mui/icons-material/Add';
import { getKoreanHolidays, getHolidayInfo } from '../utils/koreanHolidays';
import { isAdminUserSync, isMasterUserSync } from '../utils/masterUtils';
import { useAuth } from '../contexts/AuthContext';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CustomCalendar = (props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();

  // 분류별 색상 매핑 함수
  const getCategoryColor = (itemType) => {
    const colorMap = {
      '현장': '#ff6b6b',      // 빨간색
      '회의': '#4ecdc4',      // 청록색
      '전자입찰': '#45b7d1',  // 파란색
      '현설': '#96ceb4',      // 연두색
      '실측': '#feca57',      // 노란색
      '기타': '#a55eea',      // 보라색
      '날씨': '#ff9ff3',      // 핑크색
      '휴무': '#6c5ce7',      // 보라색
      '검사': '#fd79a8',      // 핑크색
      '시설': '#00b894',      // 초록색
      '관리': '#e17055',      // 주황색
      '보수': '#74b9ff',      // 하늘색
      '정비': '#a29bfe',      // 연보라색
      '청소': '#00cec9',      // 청록색
      '안전점검': '#fd79a8',  // 핑크색
      '설비점검': '#6c5ce7',  // 보라색
      '환경점검': '#00b894',  // 초록색
      '품질점검': '#e17055',  // 주황색
      '보안점검': '#74b9ff'   // 하늘색
    };
    
    return colorMap[itemType] || '#181c24'; // 기본 색상
  };

  // 권한 체크
  const canEdit = isAdminUserSync(currentUser) || isMasterUserSync(currentUser);
  const canDelete = isAdminUserSync(currentUser) || isMasterUserSync(currentUser);
  const canAdd = isAdminUserSync(currentUser) || isMasterUserSync(currentUser);
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('xl'));
  const navigate = useNavigate();

  // 기간 설정 상태
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomPeriod, setUseCustomPeriod] = useState(false);
  
  // 현장 선택 상태
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  
  // 현장별 일정 필터링 함수
  const filterCalendarItemsBySite = (calendarItems, siteId) => {
    if (!siteId) return calendarItems;

    const filteredItems = {};
    Object.keys(calendarItems).forEach(dateStr => {
      const dayItems = calendarItems[dateStr] || [];
      const filteredDayItems = dayItems.filter(item => item.siteId === siteId);
      if (filteredDayItems.length > 0) {
        filteredItems[dateStr] = filteredDayItems;
      }
    });
    return filteredItems;
  };

  console.log('🔍 CustomCalendar 렌더링:', {
    calendarItems: props.calendarItems,
    calendarItemsCount: Object.keys(props.calendarItems || {}).length,
    sites: props.sites,
    sitesCount: props.sites?.length || 0,
    year: props.year,
    month: props.month,
    viewMode: props.viewMode
  });



  const {
    year, 
    month, 
    calendarItems = {}, 
    onDragEnd, 
    onPrevMonth, 
    onNextMonth,
    onDateClick,
    onItemClick,
    onItemDoubleClick,
    onItemTouchStart,
    onItemTouchEnd,
    selectedItems,
    onDeleteSelected,
    onSave,
    onExcel,
    onCheckItem,
    checkedItems,
    sx = {},
    viewMode = 'month',
    onViewModeChange,
    onDateNumberClick,
    onCountClick,
    onCellClick,
    onCellDoubleClick,
    sites = [],
    onOpenPopup,
    onAddSchedule,
    onSiteNameDoubleClick,
    copiedItem: propCopiedItem,
  } = props;
  

  const colorChoices = ['transparent', '#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];


  // 현장명 중복 제거
  const uniqueSiteNames = [...new Set(sites.map(site => site?.name).filter(Boolean))];

  // 오늘 날짜 확인
  const today = new Date();
  const isToday = (date) => {
    return date && 
           date.getFullYear() === today.getFullYear() && 
           date.getMonth() === today.getMonth() && 
           date.getDate() === today.getDate();
  };

  // 해당 월의 첫 날과 마지막 날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 달력 데이터 생성
  const monthMatrix = [];
  let currentWeek = [];

  // 이전 달의 날짜들
  const firstDayOfWeek = firstDay.getDay();
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    currentWeek.push({
      date: new Date(year, month - 1, prevMonthLastDate - i),
      isCurrentMonth: false
    });
  }

  // 현재 달의 날짜들
  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push({
      date: new Date(year, month, day),
      isCurrentMonth: true
    });
    if (currentWeek.length === 7) {
      monthMatrix.push(currentWeek);
      currentWeek = [];
    }
  }

  // 다음 달의 날짜들
  let nextDay = 1;
  while (currentWeek.length < 7) {
    currentWeek.push({
      date: new Date(year, month + 1, nextDay++),
      isCurrentMonth: false
    });
  }
  if (currentWeek.length > 0) {
    monthMatrix.push(currentWeek);
  }

  // 모바일 반응형은 useMediaQuery로 처리
  const containerHeight = '100%';

  const [currentViewDate, setCurrentViewDate] = useState(today); // 3일/7일 보기에서 현재 표시되는 시작 날짜
  const [editPopup, setEditPopup] = useState({ open: false, item: null, date: '' }); // 수정 팝업 상태
  const [copiedItem, setCopiedItem] = useState(propCopiedItem || null); // 복사된 항목 상태

  // propCopiedItem이 변경될 때마다 copiedItem 업데이트
  useEffect(() => {
    setCopiedItem(propCopiedItem || null);
  }, [propCopiedItem]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayStr;
  });
  
  // 터치 관련 상태 관리
  const [touchStates, setTouchStates] = useState({});

  // 현재 표시 날짜 기준으로 날짜 배열 생성 (3일/7일 보기용)
  const getNDays = (n, startDate) => {
    const baseDate = startDate || today;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      arr.push({
        date: d,
        isCurrentMonth: true // 3일/7일 보기에서는 항상 현재 월로 간주
      });
    }
    return arr;
  };

  // 3일/7일 보기 네비게이션 함수들
  const handlePrevDays = () => {
    const currentDate = currentViewDate || today;
    const newDate = new Date(currentDate);
    if (viewMode === '3days') {
      newDate.setDate(currentDate.getDate() - 3);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    }
    setCurrentViewDate(newDate);
  };

  const handleNextDays = () => {
    const currentDate = currentViewDate || today;
    const newDate = new Date(currentDate);
    if (viewMode === '3days') {
      newDate.setDate(currentDate.getDate() + 3);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    }
    setCurrentViewDate(newDate);
  };

  const handleToday = () => {
    setCurrentViewDate(today);
  };

  // viewMode가 변경될 때 currentViewDate를 오늘로 리셋
  React.useEffect(() => {
    setCurrentViewDate(today);
  }, [viewMode]);

  // 월별, 3일, 7일 보기 분기
  const renderDates = React.useMemo(() => {
    if (viewMode === '3days') {
      return [getNDays(3, currentViewDate || today)];
    } else if (viewMode === 'week') {
      return [getNDays(7, currentViewDate || today)];
    } else {
      return monthMatrix;
    }
  }, [viewMode, currentViewDate, monthMatrix, today]);

  const weekCount = renderDates.length; // 5 또는 6

  // 반응형 글자수 조절 함수
  const getResponsiveText = useMemo(() => {
    return (text, type, item) => {
      const typePrefix = 
        type === '현장' ? '[현장]' : 
        type === '회의' ? '[회의]' : 
        type === '입찰' ? '[입찰]' : 
        type === '전자입찰' ? '[전자입찰]' : 
        type === '현설' ? '[현설]' : 
        type === '견적' ? '[견적]' : 
        type === '실측' ? '[실측]' : 
        type === '기타' ? '' : ''; // 기타 분류 시 [기타] 붙이지 않음
      
      // 견적 일정의 경우 title 필드도 확인
      let displayText = text || '';
      if (type === '견적' && item && item.title) {
        displayText = item.title;
      }
      
      const fullText = typePrefix + (displayText || '');
      
      // 보기 모드에 따른 처리
      if (viewMode === '3days' || viewMode === 'week') {
        return fullText; // 3일/주 보기에서는 전체 텍스트
      } else if (viewMode === 'month') {
        // 월 보기에서는 화면 크기에 따라 조절 (PC 버전은 더 엄격하게)
        if (isLargeDesktop) {
          return fullText.length > 12 ? fullText.slice(0, 12) + '...' : fullText;
        } else if (isDesktop) {
          return fullText.length > 10 ? fullText.slice(0, 10) + '...' : fullText;
        } else if (isTablet) {
          return fullText.length > 8 ? fullText.slice(0, 8) + '...' : fullText;
        } else if (isMobile) {
          return fullText.length > 8 ? fullText.slice(0, 8) + '...' : fullText;
        } else {
          return fullText.length > 8 ? fullText.slice(0, 8) + '...' : fullText;
        }
      } else {
        return fullText; // 기타 보기에서는 전체 텍스트
      }
    };
  }, [viewMode, isLargeDesktop, isDesktop, isTablet, isMobile]);

  // 플러스 버튼 onClick 핸들러를 handleOpenPopup(selectedDate)로 연결
  const handleOpenPopup = (date) => {
    if (onOpenPopup) {
      onOpenPopup(date);
    }
  };

  // 날짜 클릭 시 selectedDate 업데이트
  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
  };

  // 현장명 더블클릭 핸들러 (수정 팝업 열기)
  const handleItemDoubleClick = (date, item) => {
    // 견적 일정인 경우 견적 페이지로 이동하여 해당 견적 띄우기
    if (item && (item.isEstimate || item.id.startsWith('estimate_'))) {
      const estimateId = item.id.replace('estimate_', '');
      console.log('견적 더블클릭 - 견적 ID:', estimateId);
      navigate('/estimates', { 
        state: { 
          selectedEstimateId: estimateId,
          fromSchedule: true 
        } 
      });
      return;
    }
    
    // 기존 데이터를 새로운 형식에 맞게 설정
    const editItem = {
      ...item,
      text: item.text || '',
      siteName: item.siteName || '',
      type: item.type || '현장',
      color: item.color || colorChoices[0],
      desc: item.desc || ''
    };
    console.log('수정 팝업 열기:', editItem);
    setEditPopup({ open: true, item: editItem, date });
  };

  // 키보드 이벤트 핸들러 (복사/붙여넣기)
  const handleKeyDown = (e) => {
    console.log('키보드 이벤트:', e.key, 'Ctrl:', e.ctrlKey);
    
    // Ctrl+C: 복사
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      console.log('Ctrl+C 감지됨');
      if (selectedItems && selectedItems.length > 0) {
        // 선택된 항목 중 첫 번째 항목을 복사
        const selectedItem = selectedItems[0];
        const item = calendarItems[selectedItem.date]?.find(item => item.id === selectedItem.id);
        if (item) {
          setCopiedItem(item);
          console.log('항목 복사됨:', item);
          alert('항목이 복사되었습니다!');
        } else {
          console.log('복사할 항목을 찾을 수 없음');
        }
      } else {
        console.log('선택된 항목이 없음');
      }
    }
    
    // Ctrl+V: 붙여넣기
    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      console.log('Ctrl+V 감지됨');
      console.log('현재 선택된 날짜:', selectedDate);
      console.log('복사된 항목:', copiedItem);
      if (copiedItem && selectedDate) {
        console.log('붙여넣기 시도:', selectedDate);
        handlePasteItem(selectedDate);
      } else {
        console.log('복사된 항목이 없거나 선택된 날짜가 없음');
        if (!copiedItem) alert('복사된 항목이 없습니다. Ctrl+C로 항목을 복사하세요.');
        if (!selectedDate) alert('붙여넣을 날짜를 선택하세요.');
      }
    }
  };

  // 붙여넣기 핸들러
  const handlePasteItem = async (targetDate) => {
    if (!copiedItem) return;
    
    console.log('붙여넣기 핸들러 호출됨, 대상 날짜:', targetDate);
    
    try {
      const newItem = {
        text: copiedItem.text || '',
        type: copiedItem.type || '기타',
        desc: copiedItem.desc || '',
        siteId: copiedItem.siteId || '',
        date: new Date(targetDate + 'T12:00:00'), // Date 객체로 변환
        color: copiedItem.color === 'transparent' ? colorChoices[0] : (copiedItem.color || colorChoices[0]), // 기본 색상 설정
        siteName: copiedItem.siteName || '',
        selectedTypes: copiedItem.selectedTypes || [copiedItem.type || '기타'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // undefined 값 제거
      Object.keys(newItem).forEach(key => {
        if (newItem[key] === undefined) {
          delete newItem[key];
        }
      });
      
      console.log('붙여넣을 항목:', newItem);
      
      if (onAddSchedule) {
        await onAddSchedule(newItem);
      } else {
        // 기본 addSchedule 함수 사용
        await addSchedule(newItem);
      }
      console.log('항목 붙여넣기 완료:', targetDate);
    } catch (error) {
      console.error('항목 붙여넣기 실패:', error);
      alert('항목 붙여넣기에 실패했습니다.');
    }
  };

  // 현장명 클릭 핸들러 (현장관리 페이지로 이동)
  const handleSiteNameClick = (siteName) => {
    if (siteName) {
      // 현장관리 페이지로 이동하면서 해당 현장을 선택된 상태로 전달
      navigate('/sites', { 
        state: { 
          selectedSiteName: siteName,
          autoSelectSite: true 
        } 
      });
      // 팝업 닫기
      setEditPopup({ open: false, item: null, date: '' });
    }
  };

  // 수정 팝업 저장 핸들러
  const handleEditSave = async () => {
    if (!editPopup.item || (!editPopup.item.text?.trim() && !editPopup.item.siteName?.trim())) return;
    
    try {
      const updatedItem = {
        ...editPopup.item,
        text: editPopup.item.text || editPopup.item.siteName,
        desc: editPopup.item.desc || '',
        siteName: editPopup.item.siteName || '',
        type: editPopup.item.type || '현장',
        color: editPopup.item.color || colorChoices[0],
        weather: editPopup.item.weather || '☀️',
        updatedAt: new Date()
      };
      
      console.log('수정할 데이터:', updatedItem);
      
      await updateSchedule(editPopup.item.id, updatedItem);
      setEditPopup({ open: false, item: null, date: '' });
      if (onSave) onSave();
      console.log('일정 수정 완료');
    } catch (error) {
      console.error('일정 수정 실패:', error);
      alert('일정 수정에 실패했습니다.');
    }
  };

  return (
    <Box 
      onKeyDown={handleKeyDown}
      tabIndex={0}
      sx={{
        width: '100%',
        height: { xs: 'calc(100vh - 53px - 70px)', md: 'calc(100vh - 100px)' }, // PC에서 100px 줄임
        minHeight: { xs: 'calc(100vh - 53px - 70px)', md: 'calc(100vh - 100px)' },
        maxHeight: { xs: 'calc(100vh - 53px - 70px)', md: 'calc(100vh - 100px)' },
        position: { xs: 'relative', md: 'static' },
        top: { xs: '-30px', md: '0' },
        mr: { xs: '0', md: '0' },
        pr: { xs: '0', md: '0' },
        paddingRight: { xs: '0', md: '0' },
        ml: { xs: '30px', md: '0' },
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        margin: 0,
        padding: { xs: 1, md: 2 },
        bgcolor: '#181c24',
        borderRadius: 4,
        mt: 0,
        boxSizing: 'border-box',
        overflow: { xs: 'hidden', md: 'hidden' }, // 모바일에서 스크롤 비활성화
        outline: 'none', // 포커스 테두리 제거
        ...sx
      }}>
      {/* 네비게이션 + 연월 + 버튼 */}
      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        margin: 0,
        padding: 0,
        mb: 2,
        position: 'relative',
        boxSizing: 'border-box',
        gap: { xs: 1.5, md: 2 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          {/* 복사 상태 표시 */}
          {copiedItem && (
            <Box sx={{
              bgcolor: '#22c55e',
              color: '#fff',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              <span>📋</span>
              <span>복사됨: {copiedItem.text?.slice(0, 10)}...</span>
            </Box>
          )}
          <IconButton 
            onClick={() => {
              console.log('이전 달 버튼 클릭됨');
              console.log('viewMode:', viewMode);
              console.log('onPrevMonth 함수:', onPrevMonth);
              if (viewMode === 'month') {
                console.log('월간 보기에서 이전 달 호출');
                onPrevMonth && onPrevMonth();
              } else {
                console.log('3일/주간 보기에서 이전 날짜 호출');
                handlePrevDays();
              }
            }} 
            sx={{ color: '#fff', p: 1, minWidth: 40, minHeight: 40 }}
          >
            <ChevronLeftIcon sx={{ fontSize: 28 }} />
          </IconButton>
          <Typography variant="h5" sx={{
            color: '#fff',
            fontWeight: 700,
            letterSpacing: 1,
            ml: 1,
            minWidth: 100,
            textAlign: viewMode === 'month' ? 'left' : 'center',
            fontSize: { xs: '1.2rem', md: '1.5rem' },
            m: isMobile ? 0 : undefined,
            flexShrink: 0,
            flex: viewMode === 'month' ? 'none' : 1
          }}>
            {viewMode === 'month' 
              ? (
                <Typography
                  sx={{
                    cursor: 'pointer',
                    fontSize: { xs: '1.2rem', md: '1.5rem' },
                    '&:hover': {
                      color: '#ff9800',
                      textDecoration: 'underline'
                    }
                  }}
                  onClick={() => setShowPeriodDialog(true)}
                >
                  {year}년 {String(month + 1).padStart(2, '0')}월
                </Typography>
              )
              : viewMode === '3days'
                ? (() => {
                    const currentDate = currentViewDate || today;
                    const endDate = new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{currentDate.getMonth() + 1}/{currentDate.getDate()}</span>
                        <span 
                          onClick={handleToday}
                          sx={{ 
                            cursor: 'pointer', 
                            color: '#3b82f6',
                            '&:hover': { color: '#2563eb' },
                            fontWeight: 600
                          }}
                        >
                          ~
                        </span>
                        <span>{endDate.getMonth() + 1}/{endDate.getDate()}</span>
                      </Box>
                    );
                  })()
                : (() => {
                    const currentDate = currentViewDate || today;
                    const endDate = new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{currentDate.getMonth() + 1}/{currentDate.getDate()}</span>
                        <span 
                          onClick={handleToday}
                          sx={{ 
                            cursor: 'pointer', 
                            color: '#3b82f6',
                            '&:hover': { color: '#2563eb' },
                            fontWeight: 600
                          }}
                        >
                          ~
                        </span>
                        <span>{endDate.getMonth() + 1}/{endDate.getDate()}</span>
                      </Box>
                    );
                  })()
            }
          </Typography>
          <IconButton 
            onClick={() => {
              console.log('다음 달 버튼 클릭됨');
              console.log('viewMode:', viewMode);
              console.log('onNextMonth 함수:', onNextMonth);
              if (viewMode === 'month') {
                console.log('월간 보기에서 다음 달 호출');
                onNextMonth && onNextMonth();
              } else {
                console.log('3일/주간 보기에서 다음 날짜 호출');
                handleNextDays();
              }
            }} 
            sx={{ color: '#fff', p: 1, minWidth: 40, minHeight: 40 }}
          >
            <ChevronRightIcon sx={{ fontSize: 28 }} />
          </IconButton>

        </Box>
        
        {/* 기간 설정 표시 */}
        {useCustomPeriod && startDate && endDate && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            bgcolor: '#ff9800', 
            color: '#fff', 
            px: 2, 
            py: 1, 
            borderRadius: 2,
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            <span>
              {new Date(startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ 
              {new Date(endDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
            <IconButton
              size="small"
              onClick={() => {
                setUseCustomPeriod(false);
                setStartDate('');
                setEndDate('');
              }}
              sx={{ 
                color: '#fff', 
                p: 0.5,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
              }}
            >
              ×
            </IconButton>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={onViewModeChange} size="small"
            sx={{
              gap: '6px',
              '& .MuiToggleButton-root': { 
                p: '6px', 
                minWidth: 36, 
                minHeight: 36, 
                fontSize: '1.1rem',
                bgcolor: '#2a2b32',
                color: '#fff',
                border: '1px solid #444',
                '&:hover': {
                  bgcolor: '#333'
                },
                '&.Mui-selected': {
                  bgcolor: '#1976d2',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: '#1565c0'
                  }
                }
              },
              '& .MuiSvgIcon-root': { 
                fontSize: '1.4rem',
                color: '#fff'
              }
            }}>
            <Tooltip title="3일 보기"><ToggleButton value="3days"><CalendarViewDayIcon /></ToggleButton></Tooltip>
            <Tooltip title="7일 보기"><ToggleButton value="week"><CalendarViewWeekIcon /></ToggleButton></Tooltip>
            <Tooltip title="월간 보기"><ToggleButton value="month"><CalendarMonthIcon /></ToggleButton></Tooltip>
          </ToggleButtonGroup>
          <IconButton
            onClick={() => {
              if (!canDelete) {
                alert('일정 삭제 권한이 없습니다. 관리자에게 문의하세요.');
                return;
              }
              onDeleteSelected();
            }}
            disabled={!Array.isArray(selectedItems) || selectedItems.length === 0 || !canDelete}
            sx={isMobile ? { bgcolor: '#ef4444', color: '#fff', p: '6px', ml: '4px', fontSize: '1.3rem', borderRadius: 2, minWidth: 36, minHeight: 36 } : { display: 'none' }}
          >
            <DeleteIcon sx={{ fontSize: 22 }} />
          </IconButton>

          {!isMobile && (
            <>
              <Button
                variant="contained"
                onClick={() => {
                  try {
                    console.log('📊 엑셀 다운로드 버튼 클릭');
                    
                    // 설정된 기간이 있으면 해당 기간의 데이터만 필터링
                    let filteredCalendarItems = calendarItems;
                    if (useCustomPeriod && startDate && endDate) {
                      console.log('🔍 사용자 정의 기간으로 필터링:', { startDate, endDate });
                      filteredCalendarItems = {};
                      
                      const start = new Date(startDate);
                      const end = new Date(endDate);
                      
                      Object.keys(calendarItems).forEach(dateStr => {
                        const date = new Date(dateStr);
                        if (date >= start && date <= end) {
                          filteredCalendarItems[dateStr] = calendarItems[dateStr];
                        }
                      });
                      
                      console.log('📅 필터링된 데이터:', Object.keys(filteredCalendarItems).length, '개');
                    }
                    
                    if (onExcel && typeof onExcel === 'function') {
                      // 현장별 필터링 적용
                      let finalFilteredItems = filteredCalendarItems;
                      if (selectedSite) {
                        finalFilteredItems = filterCalendarItemsBySite(filteredCalendarItems, selectedSite.id);
                        console.log('현장별 필터링 적용:', selectedSite.name, Object.keys(finalFilteredItems).length, '일');
                      }
                      
                      // 필터링된 데이터를 전달
                      onExcel(finalFilteredItems, useCustomPeriod ? { startDate, endDate, selectedSite } : null);
                    } else {
                      console.warn('⚠️ onExcel 함수가 정의되지 않았습니다.');
                      alert('엑셀 다운로드 기능을 사용할 수 없습니다.');
                    }
                  } catch (error) {
                    console.error('❌ 엑셀 다운로드 오류:', error);
                    alert('엑셀 다운로드 중 오류가 발생했습니다: ' + error.message);
                  }
                }}
                sx={{
                  bgcolor: '#22c55e',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 3,
                  '&:hover': { bgcolor: '#16a34a' }
                }}
              >
                EXCEL
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  if (!canDelete) {
                    alert('일정 삭제 권한이 없습니다. 관리자에게 문의하세요.');
                    return;
                  }
                  onDeleteSelected();
                }}
                disabled={!Array.isArray(selectedItems) || selectedItems.length === 0 || !canDelete}
                sx={{
                  bgcolor: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 3,
                  '&:hover': { bgcolor: '#b91c1c' },
                  '&.Mui-disabled': {
                    bgcolor: '#4b5563',
                    color: '#9ca3af'
                  }
                }}
              >
                삭제 ({Array.isArray(selectedItems) ? selectedItems.length : 0})
              </Button>

            </>
          )}
        </Box>
      </Box>

      {/* 요일 헤더 */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${viewMode === '3days' ? 3 : viewMode === 'week' ? 7 : 7}, 1fr)`,
        gap: { xs: '2px', md: '4px' },
        margin: 0,
        padding: 0,
        mb: 1,
        boxSizing: 'border-box'
      }}>
        {(viewMode === '3days' || viewMode === 'week') ? (
          // 3일보기, 7일보기에서는 실제 날짜의 요일과 날짜 표시
          renderDates[0].map((cell, index) => {
            const dayOfWeek = cell.date ? ['일', '월', '화', '수', '목', '금', '토'][cell.date.getDay()] : '';
            const dateString = cell.date ? `${cell.date.getMonth() + 1}/${cell.date.getDate()}` : '';
            const dateStr = cell.date ? `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}` : null;
            const holidayInfo = dateStr ? getHolidayInfo(dateStr, year) : null;
            const isHoliday = holidayInfo?.isHoliday || false;
            const holidayName = holidayInfo?.name || '';
            
            return (
              <Box
                key={index}
                sx={{
                  textAlign: 'center',
                  py: 0,
                  minHeight: '18px',
                  color: cell.date && cell.date.getDay() === 0 ? '#ef4444' : 
                         cell.date && cell.date.getDay() === 6 ? '#3b82f6' : 
                         isHoliday ? '#ef4444' : '#fff',
                  fontWeight: 600,
                  fontSize: '20px',
                  margin: 0,
                  padding: 0,
                  boxSizing: 'border-box'
                }}
              >
                {holidayName && (
                  <span style={{ fontSize: '16px', color: isHoliday ? '#ef4444' : '#ffa726', fontWeight: 500, marginRight: '4px' }}>
                    {holidayName}
                  </span>
                )}
                {dateString} {dayOfWeek}
              </Box>
            );
          })
        ) : (
          // 월간보기에서는 고정 요일 표시
          WEEKDAYS.slice(0, 7).map((day, index) => (
            <Box
              key={day}
              sx={{
                textAlign: 'center',
                py: 0,
                minHeight: '18px',
                color: index === 0 ? '#ef4444' : index === 6 ? '#3b82f6' : '#fff',
                fontWeight: 600,
                fontSize: '20px',
                margin: 0,
                padding: 0,
                boxSizing: 'border-box'
              }}
            >
              {day}
            </Box>
          ))
        )}
      </Box>

      {/* 달력 그리드 */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${viewMode === '3days' ? 3 : viewMode === 'week' ? 7 : 7}, 1fr)`,
        gridTemplateRows: viewMode === 'month' ? `repeat(${weekCount}, 1fr)` : '1fr',
        gap: { xs: '2px', md: '4px' },
        height: { xs: 'calc(100vh - 53px - 70px - 120px)', md: '100%' }, // 모바일에서 헤더+하단바+네비게이션 제외
        width: '100%',
        minHeight: 0,
        position: 'relative',
        margin: 0,
        padding: 0,
        mb: 0,
        pb: 0,
        alignItems: 'stretch',
        justifyContent: 'stretch',
        overflow: { xs: 'hidden', md: 'hidden' }, // 모바일에서 스크롤 비활성화
        boxSizing: 'border-box',
        touchAction: { xs: 'none', md: 'auto' }, // 모바일에서 터치 스크롤 비활성화
        '& .dragging': {
          zIndex: 99999,
          position: 'relative',
          transform: 'scale(1.05)',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
        }
      }}>
        {renderDates.map((week, weekIndex) => (
          week.map((cell, dayIndex) => {
            const dateStr = cell.date ? `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}` : null;
            const items = dateStr ? calendarItems[dateStr] || [] : [];
            const isSunday = dayIndex === 0;
            const isSaturday = dayIndex === 6;
            const isTodayCell = isToday(cell.date);
            
            // 한국 기념일 정보 가져오기
            const holidayInfo = dateStr ? getHolidayInfo(dateStr, year) : null;
            const isHoliday = holidayInfo?.isHoliday || false;
            const holidayName = holidayInfo?.name || '';
            
            return (
              <Droppable
                key={`${weekIndex}-${dayIndex}`}
                droppableId={dateStr || `empty-${weekIndex}-${dayIndex}`}
                renderClone={(provided, snapshot, rubric) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    sx={{
                      p: { xs: 0.5, md: 0.75 },
                      bgcolor: '#3b82f6',
                      color: '#fff',
                      borderRadius: 1,
                      fontWeight: 500,
                      fontSize: { xs: '0.7rem', md: '0.8rem' },
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      cursor: 'grab',
                      border: '2px solid #3b82f6',
                      transition: 'all 0.2s',
                      width: '100%',
                      zIndex: 99999,
                      position: 'fixed',
                      pointerEvents: 'none',
                    }}
                  >
                    {(() => {
                      const item = items[rubric.source.index];
                      if (!item) return '';
                      const typePrefix = 
                        item.type === '현장' ? '[현장]' : 
                        item.type === '회의' ? '[회의]' : 
                        item.type === '입찰' ? '[입찰]' : 
                        item.type === '전자입찰' ? '[전자입찰]' : 
                        item.type === '현설' ? '[현설]' : 
                        item.type === '지원' ? '[지원]' : 
                        item.type === '실측' ? '[실측]' : 
                        item.type === '기타' ? '' : ''; // 기타 분류 시 [기타] 붙이지 않음
                      return typePrefix + (viewMode === '3days' ? item.text : item.text.slice(0, 9));
                    })()}
                  </Box>
                )}
              >
                {(provided, snapshot) => (
                                  <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="calendar-cell"
                  onClick={() => {
                    if (dateStr) {
                      setSelectedDate(dateStr);
                      console.log('날짜 클릭됨:', dateStr);
                    }
                  }}
                  onDoubleClick={() => {
                    if (dateStr) {
                      onCellDoubleClick && onCellDoubleClick(dateStr);
                    }
                  }}
                  sx={{
                    bgcolor: snapshot.isDraggingOver ? '#1e293b' : '#232837',
                    borderRadius: { xs: 1, md: 2 },
                    p: 0,
                    pt: 0,
                    pb: 0,
                    height: '100%',
                    minHeight: 0,
                    width: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: 0.1, md: 0.2 },
                    cursor: dateStr ? 'pointer' : 'default',
                    position: 'relative',
                    border: snapshot.isDraggingOver 
                      ? '2px solid #3b82f6' 
                      : isTodayCell
                        ? '2px solid #ef4444'
                        : '1px solid #232837',
                    flexShrink: 0,
                    margin: 0,
                    boxSizing: 'border-box',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': {
                      display: 'none',
                    },
                    '&::-webkit-scrollbar-track': {
                      display: 'none',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      display: 'none',
                    },
                    '&:hover': {
                      bgcolor: dateStr ? '#1e293b' : '#232837'
                    }
                  }}
                >
                    {dateStr ? (
                      <>
                        {/* 날짜 셀 헤더 */}
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          margin: 0,
                          padding: 0,
                          boxSizing: 'border-box'
                        }}>
                          {/* 모바일: 날짜를 왼쪽으로, 추가 버튼을 오른쪽으로 */}
                          {isMobile ? (
                            <>
                              {/* 기념일과 날짜(숫자) - 같은 라인 */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {/* 기념일 이름 표시 */}
                                {holidayName && (
                                  <Typography
                                    sx={{
                                      fontSize: '0.8rem',
                                      color: isHoliday ? '#ef4444' : '#ffa726',
                                      fontWeight: 500,
                                      margin: 0,
                                      padding: 0,
                                      opacity: cell.isCurrentMonth ? 1 : 0.6,
                                      lineHeight: 1
                                    }}
                                  >
                                    {holidayName}
                                  </Typography>
                                )}
                                <Typography
                                  sx={{
                                    fontSize: '0.8rem',
                                    color: cell.isCurrentMonth 
                                      ? (isTodayCell ? '#fff' : isHoliday ? '#ef4444' : isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#fff')
                                      : '#bbb',
                                    fontWeight: isTodayCell ? 'bold' : 600,
                                    margin: 0,
                                    padding: 0,
                                    opacity: cell.isCurrentMonth ? 1 : 0.6
                                  }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (onDateNumberClick) {
                                      onDateNumberClick(dateStr);
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {cell.date ? cell.date.getDate() : ''}
                                </Typography>
                              </Box>
                              {/* 추가 버튼 - 오른쪽 끝 */}
                              <IconButton
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDateNumberClick) {
                                    onDateNumberClick(dateStr);
                                  }
                                }}
                                sx={{
                                  p: 0.5,
                                  minWidth: 'auto',
                                  width: '20px',
                                  height: '20px',
                                  color: '#3b82f6',
                                  '&:hover': {
                                    bgcolor: 'rgba(59, 130, 246, 0.1)'
                                  }
                                }}
                              >
                                <AddIcon sx={{ fontSize: '14px' }} />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              {/* PC: 기존 레이아웃 유지 */}
                              {/* 항목 개수 */}
                              <Typography
                                sx={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500, margin: 0, padding: 0 }}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onCountClick) {
                                    onCountClick(dateStr);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                [{items.length}]
                              </Typography>
                              {/* 기념일과 날짜(숫자) - 같은 라인 */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {/* 기념일 이름 표시 */}
                                {holidayName && (
                                  <Typography
                                    sx={{
                                      fontSize: '0.7rem',
                                      color: isHoliday ? '#ef4444' : '#ffa726',
                                      fontWeight: 500,
                                      margin: 0,
                                      padding: 0,
                                      opacity: cell.isCurrentMonth ? 1 : 0.6,
                                      lineHeight: 1
                                    }}
                                  >
                                    {holidayName}
                                  </Typography>
                                )}
                                <Typography
                                  sx={{
                                    fontSize: '0.8rem',
                                    color: cell.isCurrentMonth 
                                      ? (isTodayCell ? '#fff' : isHoliday ? '#ef4444' : isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#fff')
                                      : '#bbb',
                                    fontWeight: isTodayCell ? 'bold' : 600,
                                    margin: 0,
                                    padding: 0,
                                    opacity: cell.isCurrentMonth ? 1 : 0.6
                                  }}
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (onDateNumberClick) {
                                      onDateNumberClick(dateStr);
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {cell.date ? cell.date.getDate() : ''}
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Box>
                        {/* 항목 리스트 */}
                        <Box 
                          className="calendar-events"
                          sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: { xs: 0.1, md: 0.3 },
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            maxHeight: { xs: '280px', md: '240px' },
                            margin: 0,
                            padding: 0,
                            boxSizing: 'border-box',
                            scrollbarWidth: 'none', // Firefox에서 스크롤바 완전히 숨기기
                            msOverflowStyle: 'none', // IE/Edge에서 스크롤바 숨기기
                            // 아이패드 PWA 환경에서 스크롤 영역 두꺼워짐 방지
                            touchAction: 'auto', // 기본 터치 동작 허용
                            WebkitOverflowScrolling: 'touch', // iOS 부드러운 스크롤
                            overscrollBehavior: 'contain', // 스크롤 바운스 제한
                            '&::-webkit-scrollbar': {
                              display: 'none', // Webkit 브라우저에서 스크롤바 완전히 숨기기
                            },
                            '&::-webkit-scrollbar-track': {
                              display: 'none',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              display: 'none',
                            },
                            // 아이패드에서 스크롤 영역 최적화
                            '@media (min-width: 768px) and (max-width: 1024px)': {
                              touchAction: 'pan-y', // 아이패드에서 세로 스크롤만 허용
                              WebkitOverflowScrolling: 'touch',
                              overscrollBehavior: 'contain',
                            },
                          }}
                        >
                          {items
                            .sort((a, b) => {
                              // 모바일에서는 입력 순서대로, 데스크톱에서는 드래그 순서 유지
                              if (window.innerWidth <= 768) {
                                return (a.createdAt || 0) - (b.createdAt || 0);
                              }
                              return 0;
                            })
                            .map((item, index) => (
                            <Draggable
                              key={item.id}
                              draggableId={`cell-${dateStr}-${item.id}`}
                              index={index}
                            >
                              {(provided, snapshot) => {
                                const isSelected = Array.isArray(selectedItems) && selectedItems.some(
                                  sel => sel.date === dateStr && sel.id === item.id
                                );
                                const isChecked = checkedItems && typeof checkedItems === 'object' && 
                                  checkedItems[`${dateStr}-${item.id}`] === true;
                                
                                // 터치 관련 상태 관리
                                const itemKey = `${dateStr}-${item.id}`;
                                const touchState = touchStates[itemKey] || {};
                                
                                const handleTouchStart = (e) => {
                                  e.stopPropagation();
                                  console.log('일정 터치 시작:', dateStr, item.id);
                                  
                                  const touch = e.touches[0];
                                  const newTouchState = {
                                    startTime: Date.now(),
                                    startY: touch.clientY,
                                    startX: touch.clientX,
                                    isLongPress: false,
                                    isScrolling: false,
                                    timer: null
                                  };
                                  
                                  setTouchStates(prev => ({
                                    ...prev,
                                    [itemKey]: newTouchState
                                  }));
                                  
                                  // 전역 상태로도 저장 (ScheduleManagement에서 확인용)
                                  window.touchStates = {
                                    ...window.touchStates,
                                    [itemKey]: newTouchState
                                  };
                                  
                                  // 길게 누르기 타이머 설정 (1.5초)
                                  const timer = setTimeout(() => {
                                    console.log('길게 누르기 감지됨 - 드래그 준비:', dateStr, item.id);
                                    setTouchStates(prev => ({
                                      ...prev,
                                      [itemKey]: { ...prev[itemKey], isLongPress: true }
                                    }));
                                    
                                    // 전역 상태 업데이트
                                    window.touchStates = {
                                      ...window.touchStates,
                                      [itemKey]: { ...window.touchStates[itemKey], isLongPress: true }
                                    };
                                    e.target.style.transform = 'scale(1.1)';
                                    e.target.style.zIndex = '9999';
                                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                                    e.target.setAttribute('data-drag-ready', 'true');
                                  }, 1500);
                                  
                                  setTouchStates(prev => ({
                                    ...prev,
                                    [itemKey]: { ...prev[itemKey], timer }
                                  }));
                                };
                                
                                const handleTouchMove = (e) => {
                                  e.stopPropagation();
                                  if (!touchState.startTime || !touchState.startY) return;
                                  
                                  const touch = e.touches[0];
                                  const deltaY = Math.abs(touch.clientY - touchState.startY);
                                  const deltaX = Math.abs(touch.clientX - (touchState.startX || touch.clientX));
                                  const deltaTime = Date.now() - touchState.startTime;
                                  
                                  // 스크롤 감지 조건 강화
                                  const isScrolling = (
                                    deltaY > 5 || // 수직 이동이 5px 이상
                                    deltaTime < 300 || // 터치 시간이 300ms 미만
                                    (deltaY > deltaX && deltaY > 3) // 수직 이동이 가로 이동보다 크고 3px 이상
                                  );
                                  
                                  if (isScrolling) {
                                    // 스크롤 동작으로 간주하여 드래그 취소
                                    if (touchState.timer) {
                                      clearTimeout(touchState.timer);
                                    }
                                    setTouchStates(prev => ({
                                      ...prev,
                                      [itemKey]: { ...prev[itemKey], isLongPress: false, timer: null, isScrolling: true }
                                    }));
                                    
                                    // 전역 상태 업데이트
                                    window.touchStates = {
                                      ...window.touchStates,
                                      [itemKey]: { ...window.touchStates[itemKey], isLongPress: false, timer: null, isScrolling: true }
                                    };
                                    e.target.style.transform = '';
                                    e.target.style.zIndex = '';
                                    e.target.style.boxShadow = '';
                                    e.target.removeAttribute('data-drag-ready');
                                  }
                                };
                                
                                const handleTouchEnd = (e) => {
                                  e.stopPropagation();
                                  console.log('일정 터치 종료:', dateStr, item.id);
                                  
                                  // 타이머 정리
                                  if (touchState.timer) {
                                    clearTimeout(touchState.timer);
                                  }
                                  
                                  // 길게 누르지 않았고 스크롤하지 않았으면 클릭 이벤트 처리
                                  if (!touchState.isLongPress && !touchState.isScrolling && touchState.startTime && (Date.now() - touchState.startTime) < 1500) {
                                    console.log('일정 클릭됨:', dateStr, item.id);
                                    onItemClick(dateStr, item.id);
                                  }
                                  
                                  // 상태 초기화
                                  setTouchStates(prev => {
                                    const newStates = { ...prev };
                                    delete newStates[itemKey];
                                    return newStates;
                                  });
                                  
                                  // 전역 상태에서도 제거
                                  if (window.touchStates) {
                                    delete window.touchStates[itemKey];
                                  }
                                  e.target.style.transform = '';
                                  e.target.style.zIndex = '';
                                  e.target.style.boxShadow = '';
                                  e.target.removeAttribute('data-drag-ready');
                                };
                                
                                return (
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={e => {
                                      e.stopPropagation();
                                      // 터치 이벤트가 아닌 경우에만 클릭 처리
                                      if (!touchState.startTime || touchState.isScrolling) {
                                        return; // 스크롤 중이면 클릭 무시
                                      }
                                      console.log('일정 클릭됨:', dateStr, item.id);
                                      onItemClick(dateStr, item.id);
                                    }}

                                    onDoubleClick={e => {
                                      e.stopPropagation();
                                      console.log('일정 더블클릭됨:', dateStr, item);
                                      handleItemDoubleClick(dateStr, item);
                                    }}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    className={snapshot.isDragging ? 'dragging' : ''}
                                    sx={{
                                      p: { xs: 0.1, sm: 0.1, md: 0.4 },
                                      bgcolor: item.color === 'transparent' ? 'transparent' : (item.color || getCategoryColor(item.itemType) || (isSelected ? '#3b82f6' : '#181c24')),
                                      color: item.color === 'transparent' ? '#fff' : '#fff',
                                      borderRadius: 1,
                                      fontWeight: 500,
                                      fontSize: viewMode === '3days' 
                                        ? { xs: '1.1rem', md: '1.1rem' }  // 3일 보기에서는 더 큰 글씨
                                        : { xs: '0.7rem', sm: '0.7rem', md: '0.8rem' }, // 글씨 크기 줄임
                                      boxShadow: snapshot.isDragging ? 3 : 0,
                                      cursor: 'grab',
                                      border: isSelected
                                        ? '2.5px dashed #ff5252'
                                        : '1px solid #3b82f6',
                                      transition: 'all 0.2s',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      textAlign: 'left',
                                      minHeight: viewMode === '3days' 
                                        ? { xs: 'auto', md: '28px' }  // 3일 보기에서는 더 높은 높이
                                        : { xs: '20px', sm: '18px', md: '28px' }, // PC에서 높이 증가
                                      maxHeight: viewMode === '3days' 
                                        ? { xs: 'auto', md: '28px' }  // 3일 보기에서는 더 높은 높이
                                        : { xs: '20px', sm: '18px', md: '28px' }, // PC에서 높이 증가
                                      lineHeight: { xs: '1.0', sm: '1.0', md: '1.2' },
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      opacity: cell.isCurrentMonth ? 1 : 0.6,
                                      '&:hover': {
                                        bgcolor: isSelected ? '#2563eb' : '#1e293b'
                                      },
                                      // 터치 액션 설정
                                      touchAction: 'pan-y', // 수직 스크롤만 허용
                                      userSelect: 'none', // 텍스트 선택 방지
                                      WebkitUserSelect: 'none',
                                      MozUserSelect: 'none',
                                      msUserSelect: 'none',
                                      position: 'relative' // 테두리 클릭 영역을 위한 상대 위치
                                    }}
                                  >
                                    {/* 테두리 클릭 영역 */}
                                    <Box
                                      onClick={e => {
                                        e.stopPropagation();
                                        console.log('테두리 클릭됨:', dateStr, item.id);
                                        onItemClick(dateStr, item.id);
                                      }}
                                      sx={{
                                        position: 'absolute',
                                        top: '-3px',
                                        left: '-3px',
                                        right: '-3px',
                                        bottom: '-3px',
                                        border: '3px solid transparent',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        zIndex: 1,
                                        '&:hover': {
                                          borderColor: 'rgba(255, 255, 255, 0.3)'
                                        }
                                      }}
                                    />
                                    <Tooltip 
                                      title={(() => {
                                        const typePrefix = 
                                          item.type === '현장' ? '[현장]' : 
                                          item.type === '회의' ? '[회의]' : 
                                          item.type === '입찰' ? '[입찰]' : 
                                          item.type === '전자입찰' ? '[전자입찰]' : 
                                          item.type === '현설' ? '[현설]' : 
                                          item.type === '견적' ? '[견적]' : 
                                          item.type === '실측' ? '[실측]' : 
                                          item.type === '기타' ? '' : ''; // 기타 분류 시 [기타] 붙이지 않음
                                        const siteName = item.siteName || '';
                                        const title = item.text || '';
                                        
                                        // 현장이름과 제목이 중복되는 경우 제목에서 현장이름 제거
                                        let displayTitle = title;
                                        if (siteName && title.includes(siteName)) {
                                          displayTitle = title.replace(siteName, '').trim();
                                        }
                                        
                                        const fullText = typePrefix + (siteName ? `${siteName} ` : '') + displayTitle;
                                        return fullText + (item.desc ? `\n${item.desc}` : '');
                                      })()}
                                      placement="top"
                                      arrow
                                    >
                                      <span 
                                        className="calendar-item-text"
                                        style={{ 
                                          flex: 1, 
                                          textAlign: 'left',
                                          marginRight: '8px',
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: 'block'
                                        }}
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          if (onSiteNameDoubleClick && item.siteName) {
                                            onSiteNameDoubleClick(item.siteName);
                                          }
                                        }}

                                      >
                                        {getResponsiveText(item.text, item.type, item)}
                                      </span>
                                    </Tooltip>
                                    <Box
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      sx={{
                                        padding: '4px',
                                        marginLeft: 'auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      {/* 날씨 아이콘 - 현장, 현설, 실측, 기타만 표시 */}
                                      {item.weather && item.weather !== '없음' && (item.type === '현장' || item.type === '현설' || item.type === '실측' || item.type === '기타') && (
                                        <Box
                                          sx={{
                                            fontSize: { xs: '0.8rem', md: '0.9rem' },
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          {item.weather}
                                        </Box>
                                      )}
                                      
                                      <Checkbox
                                        size="small"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          console.log('체크박스 변경:', dateStr, item.id, e.target.checked);
                                          if (onCheckItem) {
                                            onCheckItem(dateStr, item.id, e.target.checked);
                                          }
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                        sx={{
                                          color: '#ffffff',
                                          p: 0,
                                          minWidth: 'auto',
                                          width: { xs: '16px', md: '14px' },
                                          height: { xs: '16px', md: '14px' },
                                          '&.Mui-checked': {
                                            color: '#ffffff'
                                          }
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                );
                              }}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Box>
                      </>
                    ) : (
                      <span style={{ visibility: 'hidden' }}>0</span>
                    )}
                  </Box>
                )}
              </Droppable>
            );
          })
        ))}
      </Box>


      {/* 수정 팝업 */}
      <Dialog 
        open={editPopup.open} 
        onClose={() => setEditPopup({ open: false, item: null, date: '' })} 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setEditPopup({ open: false, item: null, date: '' });
          }
        }}
      >
        <DialogTitle>{editPopup.date} 일정 수정</DialogTitle>
        <DialogContent>
          <TextField
            label="제목"
            value={editPopup.item?.text || ''}
            onChange={e => setEditPopup(p => ({ ...p, item: { ...p.item, text: e.target.value } }))}
            fullWidth
            sx={{ mb: 2 }}
            autoFocus
          />
          {/* 현장명 클릭 가능한 카드 */}
          {editPopup.item?.siteName ? (
            <Card 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  borderColor: '#1976d2'
                },
                border: '1px solid #e0e0e0',
                transition: 'all 0.2s'
              }}
              onClick={() => handleSiteNameClick(editPopup.item.siteName)}
            >
              <CardContent sx={{ py: 1, px: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  🏗️ {editPopup.item.siteName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  클릭하여 현장 세부내역으로 이동
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Autocomplete
              options={uniqueSiteNames}
              value={editPopup.item?.siteName || ''}
              onInputChange={(_, v) => setEditPopup(p => ({ ...p, item: { ...p.item, siteName: v } }))}
              renderInput={(params) => <TextField {...params} label="현장명 검색" />}
              freeSolo
              sx={{ mb: 2 }}
            />
          )}
          {/* 분류 선택 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>분류 선택</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '현장'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '현장' } }))} />}
                label="현장"
              />
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '회의'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '회의' } }))} />}
                label="회의"
              />
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '전자입찰'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '전자입찰' } }))} />}
                label="전자입찰"
              />
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '현설'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '현설' } }))} />}
                label="현설"
              />
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '실측'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '실측' } }))} />}
                label="실측"
              />
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '기타'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '기타' } }))} />}
                label="기타"
              />
            </Box>
          </Box>
          {/* 색상 선택과 날씨 선택 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>색상 선택</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
            {colorChoices.map(color => (
              <Box
                key={color}
                onClick={() => setEditPopup(p => ({ ...p, item: { ...p.item, color: color } }))}
                sx={{
                  width: 24, height: 24, borderRadius: '50%',
                  bgcolor: color === 'transparent' ? 'transparent' : color,
                  cursor: 'pointer',
                  border: editPopup.item?.color === color ? '3px solid #fff' : '2px solid #888',
                  boxShadow: editPopup.item?.color === color ? '0 0 0 2px #1976d2' : 'none',
                  transition: 'all 0.15s',
                  position: 'relative',
                  ...(color === 'transparent' && {
                    '&::after': {
                      content: '"없음"',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '0.6rem',
                      color: '#666',
                      fontWeight: 'bold'
                    }
                  })
                }}
              />
            ))}
              </Box>
            </Box>
            
            {/* 날씨 선택 - 현장, 현설, 실측, 기타만 표시 */}
            {(() => {
              const currentType = editPopup.item?.type;
              const showWeather = currentType === '현장' || currentType === '현설' || currentType === '실측' || currentType === '기타';
              
              if (!showWeather) return null;
              
              return (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>날씨 선택</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['☀️', '☔', '⛄', '🌀', '없음'].map((weather, index) => (
                      <Box
                        key={index}
                        onClick={() => setEditPopup(p => ({ ...p, item: { ...p.item, weather } }))}
                        sx={{
                          width: 32, height: 32, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          border: (editPopup.item?.weather || '☀️') === weather ? '2px solid #1976d2' : '2px solid #ccc',
                          backgroundColor: weather === '없음' ? '#666' : ((editPopup.item?.weather || '☀️') === weather ? 'rgba(25, 118, 210, 0.1)' : 'transparent'),
                          transition: 'all 0.15s',
                          fontSize: '1.2rem'
                        }}
                      >
                        {weather === '없음' ? '' : weather}
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })()}
          </Box>
          {/* 설명(일정) 입력란을 맨 아래로 이동 */}
          <TextField
            label="설명"
            value={editPopup.item?.desc || ''}
            onChange={e => setEditPopup(p => ({ ...p, item: { ...p.item, desc: e.target.value } }))}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPopup({ open: false, item: null, date: '' })}>취소</Button>
          <Button 
            variant="contained" 
            onClick={handleEditSave} 
            disabled={!editPopup.item || (!editPopup.item.text?.trim() && !editPopup.item.siteName?.trim())}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 기간 설정 다이얼로그 */}
      <Dialog 
        open={showPeriodDialog} 
        onClose={() => setShowPeriodDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#fff', bgcolor: '#232b3b' }}>
          기간 설정
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#232b3b', color: '#fff' }}>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="시작일"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff9800' },
                  '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            />
            <TextField
              label="종료일"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#666' },
                  '&:hover fieldset': { borderColor: '#ff9800' },
                  '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            />
            
            {/* 현장 선택 드롭다운 */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#fff', mb: 1 }}>
                현장 선택 (선택사항)
              </Typography>
              <Autocomplete
                options={props.sites || []}
                getOptionLabel={(option) => option.name || ''}
                value={selectedSite}
                onChange={(event, newValue) => {
                  setSelectedSite(newValue);
                }}
                inputValue={siteSearchTerm}
                onInputChange={(event, newInputValue) => {
                  setSiteSearchTerm(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`현장 선택 (검색 가능) - ${(props.sites || []).length}개 현장`}
                    placeholder="현장명을 입력하세요"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        '& fieldset': { borderColor: '#666' },
                        '&:hover fieldset': { borderColor: '#ff9800' },
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root': { color: '#ccc' }
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1" sx={{ color: '#fff' }}>
                        {option.name}
                      </Typography>
                      {option.address && (
                        <Typography variant="body2" sx={{ color: '#ccc' }}>
                          {option.address}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                sx={{
                  '& .MuiAutocomplete-popupIndicator': { color: '#ff9800' },
                  '& .MuiAutocomplete-clearIndicator': { color: '#ff9800' }
                }}
              />
              
              {/* 디버깅용 현장 목록 표시 */}
              {(props.sites || []).length === 0 && (
                <Typography variant="body2" sx={{ color: '#ff6666', mt: 1 }}>
                  현장 데이터가 없습니다. 현장을 먼저 등록해주세요.
                </Typography>
              )}
            </Box>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={useCustomPeriod}
                  onChange={(e) => setUseCustomPeriod(e.target.checked)}
                  sx={{ color: '#ff9800' }}
                />
              }
              label="사용자 정의 기간 사용"
              sx={{ color: '#fff' }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#232b3b' }}>
          <Button 
            onClick={() => setShowPeriodDialog(false)}
            sx={{ color: '#ccc' }}
          >
            취소
          </Button>
          <Button 
            onClick={() => {
              if (startDate && endDate) {
                setUseCustomPeriod(true);
                setShowPeriodDialog(false);
              } else {
                alert('시작일과 종료일을 모두 입력해주세요.');
              }
            }}
            variant="contained"
            disabled={!startDate || !endDate}
            sx={{ 
              bgcolor: '#ff9800',
              '&:hover': { bgcolor: '#f57c00' }
            }}
          >
            설정 완료
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomCalendar; 