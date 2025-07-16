import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, IconButton, Button, ToggleButtonGroup, ToggleButton, Tooltip, Checkbox, FormControlLabel, useMediaQuery, useTheme } from '@mui/material';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarViewWeekIcon from '@mui/icons-material/ViewWeek';
import CalendarViewDayIcon from '@mui/icons-material/ViewDay';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { exportCalendarToExcel } from "../utils/exportUtils";

import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { addSchedule, updateSchedule } from '../api/schedules';
import AddIcon from '@mui/icons-material/Add';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CustomCalendar = (props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('xl'));



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
    sites = [],
    onOpenPopup,
    onAddSchedule
  } = props;
  

  const colorChoices = ['#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];

  // 현장명 중복 제거
  const uniqueSiteNames = [...new Set(sites.map(site => site.name).filter(Boolean))];

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
  const [copiedItem, setCopiedItem] = useState(null); // 복사된 항목 상태
  const [selectedDate, setSelectedDate] = useState(() => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayStr;
  });

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
    return (text, type) => {
      const typePrefix = 
        type === '현장' ? '[현장]' : 
        type === '회의' ? '[회의]' : 
        type === '입찰' ? '[입찰]' : 
        type === '현설' ? '[현설]' : 
        type === '지원' ? '[지원]' : 
        type === '기타' ? '[기타]' : '';
      
      const fullText = typePrefix + (text || '');
      
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
    
    try {
      const newItem = {
        text: copiedItem.text || '',
        type: copiedItem.type || '기타',
        desc: copiedItem.desc || '',
        siteId: copiedItem.siteId || '',
        date: new Date(targetDate + 'T12:00:00'), // Date 객체로 변환
        color: copiedItem.color || colorChoices[0], // 기본 색상 설정
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
        height: { xs: 430, md: '100%' },
        minHeight: { xs: containerHeight, md: 'auto' },
        maxHeight: { xs: containerHeight, md: 'none' },
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
        overflow: 'hidden',
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
              ? `${year}년 ${String(month + 1).padStart(2, '0')}월`
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={onViewModeChange} size="small"
            sx={isMobile ? { gap: '6px', '& .MuiToggleButton-root': { p: '6px', minWidth: 36, minHeight: 36, fontSize: '1.1rem' }, '& .MuiSvgIcon-root': { fontSize: '1.4rem' } } : {}}>
            <Tooltip title="3일 보기"><ToggleButton value="3days"><CalendarViewDayIcon /></ToggleButton></Tooltip>
            <Tooltip title="7일 보기"><ToggleButton value="week"><CalendarViewWeekIcon /></ToggleButton></Tooltip>
            <Tooltip title="월간 보기"><ToggleButton value="month"><CalendarMonthIcon /></ToggleButton></Tooltip>
          </ToggleButtonGroup>
          <IconButton
            onClick={onDeleteSelected}
            disabled={!Array.isArray(selectedItems) || selectedItems.length === 0}
            sx={isMobile ? { bgcolor: '#ef4444', color: '#fff', p: '6px', ml: '4px', fontSize: '1.3rem', borderRadius: 2, minWidth: 36, minHeight: 36 } : { display: 'none' }}
          >
            <DeleteIcon sx={{ fontSize: 22 }} />
          </IconButton>
          {!isMobile && (
            <>
              <Button
                variant="contained"
                onClick={onExcel}
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
                onClick={onDeleteSelected}
                disabled={!Array.isArray(selectedItems) || selectedItems.length === 0}
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
        {WEEKDAYS.slice(0, viewMode === '3days' ? 3 : viewMode === 'week' ? 7 : 7).map((day, index) => (
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
        ))}
      </Box>

      {/* 달력 그리드 */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${viewMode === '3days' ? 3 : viewMode === 'week' ? 7 : 7}, 1fr)`,
        gridTemplateRows: viewMode === 'month' ? `repeat(${weekCount}, 1fr)` : '1fr',
        gap: { xs: '2px', md: '4px' },
        height: { xs: '440px', md: '100%' }, // 모바일에서 60px 증가
        width: '100%',
        minHeight: 0,
        position: 'relative',
        margin: 0,
        padding: 0,
        mb: 0,
        pb: 0,
        alignItems: 'stretch',
        justifyContent: 'stretch',
        overflow: 'hidden',
        boxSizing: 'border-box',
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
                        item.type === '현설' ? '[현설]' : 
                        item.type === '지원' ? '[지원]' : 
                        item.type === '기타' ? '[기타]' : '';
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
                    }
                    onCellClick && onCellClick(dateStr);
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
                    gap: { xs: 0.2, md: 0.3 },
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
                              {/* 날짜(숫자) - 왼쪽 정렬 */}
                              <Typography
                                sx={{
                                  fontSize: '0.8rem',
                                  color: cell.isCurrentMonth 
                                    ? (isTodayCell ? '#fff' : isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#fff')
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
                              {/* 추가 버튼 - 오른쪽 끝 */}
                              <IconButton
                                onClick={e => {
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
                                  e.stopPropagation();
                                  if (onCountClick) {
                                    onCountClick(dateStr);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                [{items.length}]
                              </Typography>
                              {/* 날짜(숫자) */}
                              <Typography
                                sx={{
                                  fontSize: '0.8rem',
                                  color: cell.isCurrentMonth 
                                    ? (isTodayCell ? '#fff' : isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#fff')
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
                            gap: { xs: 0.1, md: 0.2 },
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            maxHeight: { xs: '280px', md: '240px' },
                            margin: 0,
                            padding: 0,
                            boxSizing: 'border-box',
                            scrollbarWidth: 'none', // Firefox에서 스크롤바 완전히 숨기기
                            msOverflowStyle: 'none', // IE/Edge에서 스크롤바 숨기기
                            '&::-webkit-scrollbar': {
                              display: 'none', // Webkit 브라우저에서 스크롤바 완전히 숨기기
                            },
                            '&::-webkit-scrollbar-track': {
                              display: 'none',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              display: 'none',
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
                                return (
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={e => {
                                      e.stopPropagation();
                                      console.log('일정 클릭됨:', dateStr, item.id);
                                      onItemClick(dateStr, item.id);
                                    }}
                                    onDoubleClick={e => {
                                      e.stopPropagation();
                                      console.log('일정 더블클릭됨:', dateStr, item);
                                      handleItemDoubleClick(dateStr, item);
                                    }}
                                    onTouchStart={e => {
                                      e.stopPropagation();
                                      console.log('일정 터치 시작:', dateStr, item.id);
                                      // 터치 시작 시 드래그 준비
                                      e.target.style.transform = 'scale(1.05)';
                                      e.target.style.zIndex = '9999';
                                    }}
                                    onTouchMove={e => {
                                      e.stopPropagation();
                                      // 터치 이동 시 드래그 효과
                                    }}
                                    onTouchEnd={e => {
                                      e.stopPropagation();
                                      console.log('일정 터치 종료:', dateStr, item.id);
                                      e.target.style.transform = '';
                                      e.target.style.zIndex = '';
                                    }}
                                    className={snapshot.isDragging ? 'dragging' : ''}
                                    sx={{
                                      p: { xs: 0.3, md: 0.4 },
                                      bgcolor: item.color || (isSelected ? '#3b82f6' : '#181c24'),
                                      color: '#fff',
                                      borderRadius: 1,
                                      fontWeight: 500,
                                      fontSize: viewMode === '3days' 
                                        ? { xs: '1.3rem', md: '1.3rem' }  // 3일 보기에서는 더 큰 글씨
                                        : { xs: '0.6rem', md: '0.75rem' }, // 기타 보기에서는 기존 크기
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
                                        : { xs: 'auto', md: '24px' }, // 기타 보기에서는 기존 높이
                                      maxHeight: viewMode === '3days' 
                                        ? { xs: 'auto', md: '28px' }  // 3일 보기에서는 더 높은 높이
                                        : { xs: 'auto', md: '24px' }, // 기타 보기에서는 기존 높이
                                      lineHeight: { xs: 'auto', md: '1.2' },
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      opacity: cell.isCurrentMonth ? 1 : 0.6,
                                      '&:hover': {
                                        bgcolor: isSelected ? '#2563eb' : '#1e293b'
                                      }
                                    }}
                                  >
                                    <Tooltip 
                                      title={(() => {
                                        const typePrefix = 
                                          item.type === '현장' ? '[현장]' : 
                                          item.type === '회의' ? '[회의]' : 
                                          item.type === '입찰' ? '[입찰]' : 
                                          item.type === '현설' ? '[현설]' : 
                                          item.type === '지원' ? '[지원]' : 
                                          item.type === '기타' ? '[기타]' : '';
                                        return typePrefix + (item.text || '') + (item.desc ? `\n${item.desc}` : '');
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
                                          cursor: 'help',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: 'block'
                                        }}
                                      >
                                        {getResponsiveText(item.text, item.type)}
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
                                        justifyContent: 'center'
                                      }}
                                    >
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
          {/* 현장명 검색 선택 */}
          <Autocomplete
            options={uniqueSiteNames}
            value={editPopup.item?.siteName || ''}
            onInputChange={(_, v) => setEditPopup(p => ({ ...p, item: { ...p.item, siteName: v } }))}
            renderInput={(params) => <TextField {...params} label="현장명 검색" />}
            freeSolo
            sx={{ mb: 2 }}
          />
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
                control={<Checkbox checked={editPopup.item?.type === '입찰'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '입찰' } }))} />}
                label="입찰"
              />
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '현설'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '현설' } }))} />}
                label="현설"
              />
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '지원'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '지원' } }))} />}
                label="지원"
              />
              <FormControlLabel
                control={<Checkbox checked={editPopup.item?.type === '기타'} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, type: '기타' } }))} />}
                label="기타"
              />
            </Box>
          </Box>
          {/* 색상 선택 */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {colorChoices.map(color => (
              <Box
                key={color}
                onClick={() => setEditPopup(p => ({ ...p, item: { ...p.item, color: color } }))}
                sx={{
                  width: 24, height: 24, borderRadius: '50%',
                  bgcolor: color, cursor: 'pointer',
                  border: editPopup.item?.color === color ? '3px solid #fff' : '2px solid #888',
                  boxShadow: editPopup.item?.color === color ? '0 0 0 2px #1976d2' : 'none',
                  transition: 'all 0.15s'
                }}
              />
            ))}
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
    </Box>
  );
};

export default CustomCalendar; 