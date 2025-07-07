import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Button, ToggleButtonGroup, ToggleButton, Tooltip, Checkbox, FormControlLabel } from '@mui/material';
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
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }
  
  // 현재 달의 날짜들
  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      monthMatrix.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // 다음 달의 날짜들
  while (currentWeek.length < 7) {
    currentWeek.push(null);
  }
  if (currentWeek.length > 0) {
    monthMatrix.push(currentWeek);
  }

  const isMobile = false; // 모바일 반응형 사용하지 않음
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
      arr.push(d);
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
      selectedTypes: item.selectedTypes || [item.type || '현장'],
      color: item.color || colorChoices[0],
      desc: item.desc || ''
    };
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
        date: targetDate,
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
    if (!editPopup.item || (!editPopup.item.text.trim() && !editPopup.item.siteName.trim()) || !editPopup.item.desc?.trim()) return;
    
    try {
      const updatedItem = {
        ...editPopup.item,
        text: editPopup.item.text || editPopup.item.siteName,
        desc: editPopup.item.desc || '',
        siteName: editPopup.item.siteName || '',
        selectedTypes: editPopup.item.selectedTypes || [],
        color: editPopup.item.color || colorChoices[0],
        updatedAt: new Date()
      };
      
      await updateSchedule(editPopup.item.id, updatedItem);
      setEditPopup({ open: false, item: null, date: '' });
      if (onSave) onSave();
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
            onClick={viewMode === 'month' ? onPrevMonth : handlePrevDays} 
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
            onClick={viewMode === 'month' ? onNextMonth : handleNextDays} 
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
        height: { xs: '380px', md: '100%' }, // 더 줄인 높이
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
          week.map((date, dayIndex) => {
            const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null;
            const items = dateStr ? calendarItems[dateStr] || [] : [];
            const isSunday = dayIndex === 0;
            const isSaturday = dayIndex === 6;
            const isTodayCell = isToday(date);
            
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
                      cursor: date ? 'pointer' : 'default',
                      position: 'relative',
                      border: snapshot.isDraggingOver 
                        ? '2px solid #3b82f6' 
                        : isTodayCell
                          ? '2px solid #ef4444'
                          : '1px solid #232837',
                      flexShrink: 0,
                      margin: 0,
                      boxSizing: 'border-box',
                      '&:hover': {
                        bgcolor: date ? '#1e293b' : '#232837'
                      }
                    }}
                  >
                    {date ? (
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
                                sx={{ fontSize: '0.8rem', color: isTodayCell ? '#fff' : isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#fff', fontWeight: 600, margin: 0, padding: 0 }}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (onDateNumberClick) {
                                    onDateNumberClick(dateStr);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                {date ? date.getDate() : ''}
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
                                sx={{ fontSize: '0.9rem', color: isTodayCell ? '#fff' : isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#fff', fontWeight: 600, margin: 0, padding: 0 }}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (onDateNumberClick) {
                                    onDateNumberClick(dateStr);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                {date ? date.getDate() : ''}
                              </Typography>
                            </>
                          )}
                        </Box>
                        {/* 항목 리스트 */}
                        <Box sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: { xs: 0.1, md: 0.2 },
                          overflowY: items.length > 3 ? 'auto' : 'hidden',
                          overflowX: 'hidden',
                          maxHeight: items.length > 3 ? '180px' : 'auto',
                          margin: 0,
                          padding: 0,
                          boxSizing: 'border-box',
                          scrollbarWidth: 'none', // Firefox
                          msOverflowStyle: 'none', // IE/Edge
                          '&::-webkit-scrollbar': {
                            display: 'none', // Chrome/Safari
                          },
                        }}>
                          {items.map((item, index) => (
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
                                  checkedItems[`${dateStr}-${item.id}`];
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
                                    onTouchStart={undefined}
                                    onTouchEnd={undefined}
                                    className={snapshot.isDragging ? 'dragging' : ''}
                                    sx={{
                                      p: { xs: 0.3, md: 0.5 },
                                      bgcolor: item.color || (isSelected ? '#3b82f6' : '#181c24'),
                                      color: '#fff',
                                      borderRadius: 1,
                                      fontWeight: 500,
                                      fontSize: { xs: '0.6rem', md: '0.875rem' },
                                      boxShadow: snapshot.isDragging ? 3 : 0,
                                      cursor: 'grab',
                                      border: '1px solid #3b82f6',
                                      transition: 'all 0.2s',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      '&:hover': {
                                        bgcolor: isSelected ? '#2563eb' : '#1e293b'
                                      }
                                    }}
                                  >
                                    <span>
                                      <>
                                        {item.type === '현장' && '[현장]'}
                                        {item.type === '회의' && '[회의]'}
                                        {item.type === '입찰' && '[입찰]'}
                                        {item.type === '현설' && '[현설]'}
                                        {item.type === '지원' && '[지원]'}
                                        {item.type === '기타' && '[기타]'}
                                        {viewMode === '3days' ? item.text : item.text.slice(0, 9)}
                                      </>
                                    </span>
                                    {onCheckItem && (
                                      <Checkbox
                                        size="small"
                                        checked={isChecked || false}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          onCheckItem(dateStr, item.id, e.target.checked);
                                        }}
                                        sx={{
                                          color: '#ffffff',
                                          p: 0,
                                          minWidth: 'auto',
                                          width: '14px',
                                          height: '14px',
                                          '&.Mui-checked': {
                                            color: '#ffffff'
                                          }
                                        }}
                                      />
                                    )}
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
                control={<Checkbox checked={(editPopup.item?.selectedTypes || []).includes('현장')} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, selectedTypes: (p.item.selectedTypes || []).includes('현장') ? (p.item.selectedTypes || []).filter(t => t !== '현장') : [...(p.item.selectedTypes || []), '현장'] } }))} />}
                label="현장"
              />
              <FormControlLabel
                control={<Checkbox checked={(editPopup.item?.selectedTypes || []).includes('회의')} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, selectedTypes: (p.item.selectedTypes || []).includes('회의') ? (p.item.selectedTypes || []).filter(t => t !== '회의') : [...(p.item.selectedTypes || []), '회의'] } }))} />}
                label="회의"
              />
              <FormControlLabel
                control={<Checkbox checked={(editPopup.item?.selectedTypes || []).includes('입찰')} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, selectedTypes: (p.item.selectedTypes || []).includes('입찰') ? (p.item.selectedTypes || []).filter(t => t !== '입찰') : [...(p.item.selectedTypes || []), '입찰'] } }))} />}
                label="입찰"
              />
              <FormControlLabel
                control={<Checkbox checked={(editPopup.item?.selectedTypes || []).includes('현설')} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, selectedTypes: (p.item.selectedTypes || []).includes('현설') ? (p.item.selectedTypes || []).filter(t => t !== '현설') : [...(p.item.selectedTypes || []), '현설'] } }))} />}
                label="현설"
              />
              <FormControlLabel
                control={<Checkbox checked={(editPopup.item?.selectedTypes || []).includes('지원')} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, selectedTypes: (p.item.selectedTypes || []).includes('지원') ? (p.item.selectedTypes || []).filter(t => t !== '지원') : [...(p.item.selectedTypes || []), '지원'] } }))} />}
                label="지원"
              />
              <FormControlLabel
                control={<Checkbox checked={(editPopup.item?.selectedTypes || []).includes('기타')} onChange={() => setEditPopup(p => ({ ...p, item: { ...p.item, selectedTypes: (p.item.selectedTypes || []).includes('기타') ? (p.item.selectedTypes || []).filter(t => t !== '기타') : [...(p.item.selectedTypes || []), '기타'] } }))} />}
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
          <Button variant="contained" onClick={handleEditSave} disabled={!(editPopup.item?.text?.trim() || editPopup.item?.siteName?.trim())}>저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomCalendar; 