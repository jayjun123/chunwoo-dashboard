import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Button, ToggleButtonGroup, ToggleButton, Tooltip, Checkbox, FormControlLabel } from '@mui/material';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarViewWeekIcon from '@mui/icons-material/ViewWeek';
import CalendarViewDayIcon from '@mui/icons-material/ViewDay';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { exportCalendarToExcel } from "../utils/exportUtils";
import useMediaQuery from '@mui/material/useMediaQuery';
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

const CustomCalendar = ({ 
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
  onOpenPopup
}) => {
  const colorChoices = ['#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];

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

  const isMobile = useMediaQuery('(max-width:600px)');
  const containerHeight = isMobile
    ? '620px'
    : '100%';

  const [mobileListPopup, setMobileListPopup] = useState({ open: false, date: '', items: [] });
  const [selectedDate, setSelectedDate] = useState(() => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayStr;
  });
  const [mobileAddPopup, setMobileAddPopup] = useState({ open: false, date: selectedDate, site: '', etc: '' });
  const [currentViewDate, setCurrentViewDate] = useState(today); // 3일/7일 보기에서 현재 표시되는 시작 날짜

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

  const handleMobileListPopup = (dateStr) => {
    setMobileListPopup({ open: true, date: dateStr, items: calendarItems[dateStr] || [] });
  };
  const handleMobileAddPopup = (dateStr) => {
    setMobileAddPopup({ open: true, date: dateStr, site: '', etc: '' });
  };

  // 일정 추가 핸들러
  const handleMobileAddSave = async (dateStr, siteTitle, siteName, selectedTypes, selectedColor, etc) => {
    if (!siteTitle || !siteName) return;
    await addSchedule({
      text: siteTitle,
      etc,
      startDate: dateStr,
      type: 'site',
      siteName,
      selectedTypes,
      selectedColor
    });
    setMobileAddPopup({ open: false, date: '', site: '', etc: '' });
    if (onSave) onSave();
  };

  // 오늘의 일정 저장 핸들러
  const handleTodaySave = async () => {
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (!mobileAddPopup.site) return;
    await addSchedule({
      text: mobileAddPopup.site,
      etc: mobileAddPopup.etc,
      startDate: dateStr,
      type: 'site',
    });
    setMobileAddPopup(p => ({ ...p, site: '', etc: '' }));
    if (onSave) onSave();
  };

  // 모바일 기타입력사항 자동저장 debounce
  const debounce = (func, delay) => {
    let timer;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  };
  const handleEtcChange = async (item, value) => {
    if (!item.id) return;
    await updateSchedule(item.id, { ...item, etc: value });
  };
  const handleEtcChangeDebounced = debounce(handleEtcChange, 1000);

  // 날짜 클릭 핸들러(모바일)
  const handleMobileDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setMobileAddPopup(p => ({ ...p, date: dateStr }));
  };

  // 플러스 버튼 onClick 핸들러를 handleOpenPopup(selectedDate)로 연결
  const handleOpenPopup = (date) => {
    if (isMobile) {
      setMobileAddPopup({ open: true, date: date, siteTitle: '', siteName: '', selectedTypes: [], selectedColor: colorChoices[0], etc: '' });
    } else if (onOpenPopup) {
      onOpenPopup(date);
    }
  };

  // Autocomplete options 중복 제거
  const uniqueSiteNames = Array.from(new Set(sites.map(s => s.name).filter(Boolean)));

  useEffect(() => {
    if (isMobile) {
      const hasTodayPanel = true; // 오늘의 일정 패널은 항상 렌더됨
      if (hasTodayPanel) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile]);

  return (
    <Box sx={{
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
                    {items[rubric.source.index]?.text?.slice(0, 6)}
                  </Box>
                )}
              >
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    onClick={() => {
                      if (isMobile && dateStr) {
                        handleMobileDateClick(dateStr);
                      } else if (!isMobile) {
                        onCellClick && onCellClick(dateStr);
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
                          {/* 항목 개수 */}
                          <Typography
                            sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' }, color: '#6b7280', fontWeight: 500, margin: 0, padding: 0 }}
                            onClick={e => {
                              e.stopPropagation();
                              if (!isMobile && onCountClick) onCountClick(dateStr);
                              // 모바일은 아무 동작 없음
                            }}
                            style={{ cursor: !isMobile ? 'pointer' : 'default' }}
                          >
                            [{items.length}]
                          </Typography>
                          {/* 날짜(숫자) */}
                          <Typography
                            sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' }, color: isTodayCell ? '#fff' : isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#fff', fontWeight: 600, margin: 0, padding: 0 }}
                            onClick={e => {
                              e.stopPropagation();
                              if (!isMobile && onDateNumberClick) onDateNumberClick(dateStr);
                              // 모바일은 아무 동작 없음
                            }}
                            style={{ cursor: !isMobile ? 'pointer' : 'default' }}
                          >
                            {date ? date.getDate() : ''}
                          </Typography>
                        </Box>
                        {/* 항목 리스트 */}
                        <Box sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: { xs: 0.1, md: 0.2 },
                          overflow: 'hidden',
                          margin: 0,
                          padding: 0,
                          boxSizing: 'border-box',
                          '&::-webkit-scrollbar': {
                            width: '3px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: '#1e293b',
                            borderRadius: '2px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: '#3b82f6',
                            borderRadius: '2px',
                          },
                        }}>
                          {(viewMode === 'month' && isMobile
                            ? items.slice(0, 3)
                            : items
                          ).map((item, index) => (
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
                                  checkedItems[`${dateStr}_${item.id}`];
                                return (
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={e => {
                                      e.stopPropagation();
                                      onItemClick(dateStr, item.id);
                                    }}
                                    onDoubleClick={undefined}
                                    onTouchStart={undefined}
                                    onTouchEnd={undefined}
                                    className={snapshot.isDragging ? 'dragging' : ''}
                                    sx={{
                                      p: { xs: 0.3, md: 0.5 },
                                      bgcolor: item.color || (isSelected ? '#3b82f6' : '#181c24'),
                                      color: '#fff',
                                      borderRadius: 1,
                                      fontWeight: 500,
                                      fontSize: { xs: '0.6rem', md: '0.9375rem' },
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
                                    <span>{viewMode === '3days' ? item.text : (isMobile ? item.text.slice(0, 3) : item.text.slice(0, 6))}</span>
                                    {onCheckItem && !(viewMode === 'month' && isMobile) && (
                                      <Checkbox
                                        size="small"
                                        checked={isChecked || false}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          onCheckItem(dateStr, item.id, e.target.checked);
                                        }}
                                        sx={{
                                          color: '#3b82f6',
                                          p: 0,
                                          minWidth: 'auto',
                                          width: '14px',
                                          height: '14px',
                                          '&.Mui-checked': {
                                            color: '#22c55e'
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
      {isMobile && (
        <>
          {/* 오늘의 일정 전용 셀 */}
          <Box sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: '46px',
            zIndex: 1201,
            width: '100vw',
            p: 2,
            bgcolor: '#232837',
            borderRadius: 2,
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            {/* 오늘의 일정 상단: 날짜+요일+일정, 추가버튼 한 줄 */}
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle1" sx={{ color: '#FFA726', fontWeight: 700, fontSize: '1.26rem', whiteSpace: 'nowrap', mr: 1 }}>
                {(() => {
                  const d = new Date(selectedDate);
                  return `${d.getMonth() + 1}월${d.getDate()}일(${['일','월','화','수','목','금','토'][d.getDay()]}) 일정`;
                })()}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <IconButton size="small" color="primary" onClick={() => handleOpenPopup(selectedDate)} sx={{ ml: 1, bgcolor: '#FFA726', color: '#fff', '&:hover': { bgcolor: '#fb8c00' } }}>
                <AddIcon />
              </IconButton>
            </Box>
            {/* 일정 리스트/입력란: selectedDate 기준으로 렌더 */}
            {(calendarItems[selectedDate]?.length > 0) ? (
              calendarItems[selectedDate].map((item, idx) => (
                <Box key={item.id || idx} sx={{ color: '#fff', mb: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.97rem' }}>{item.text}</span>
                  <input
                    type="text"
                    value={item.etc || ''}
                    placeholder="기타"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 26,
                      background: '#181c24',
                      color: '#fff',
                      border: '1px solid #333',
                      borderRadius: 3,
                      fontSize: '0.85rem',
                      padding: '2px 6px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      marginLeft: 6,
                    }}
                    onChange={e => handleEtcChangeDebounced(item, e.target.value)}
                  />
                </Box>
              ))
            ) : (
              <div style={{ color: '#aaa', marginBottom: 8 }}>일정 없음</div>
            )}
            {/* 일정 리스트 팝업 */}
            <Dialog open={mobileListPopup.open} onClose={() => setMobileListPopup({ ...mobileListPopup, open: false })} fullWidth>
              <DialogTitle>{mobileListPopup.date} 일정</DialogTitle>
              <DialogContent>
                {mobileListPopup.items.length > 0 ? (
                  mobileListPopup.items.map((item, idx) => (
                    <div key={item.id || idx} style={{ marginBottom: 8 }}>{item.text}</div>
                  ))
                ) : (
                  <div>일정 없음</div>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setMobileListPopup({ ...mobileListPopup, open: false })}>닫기</Button>
              </DialogActions>
            </Dialog>
            {/* 일정 추가 팝업 */}
            <Dialog open={mobileAddPopup.open} onClose={() => setMobileAddPopup({ ...mobileAddPopup, open: false })} fullWidth>
              <DialogTitle>{mobileAddPopup.date} 일정 추가</DialogTitle>
              <DialogContent>
                <TextField
                  label="제목"
                  value={mobileAddPopup.siteTitle || ''}
                  onChange={e => setMobileAddPopup(p => ({ ...p, siteTitle: e.target.value }))}
                  fullWidth
                  sx={{ mb: 2 }}
                  autoFocus
                />
                {/* 모바일에서만 현장명 검색: 제목 아래, 분류 선택 위 */}
                {isMobile && (
                  <Autocomplete
                    options={uniqueSiteNames}
                    value={mobileAddPopup.siteName || ''}
                    onInputChange={(_, v) => setMobileAddPopup(p => ({ ...p, siteName: v }))}
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
                      control={<Checkbox checked={mobileAddPopup.selectedTypes?.includes('현장')} onChange={() => setMobileAddPopup(p => ({ ...p, selectedTypes: p.selectedTypes?.includes('현장') ? p.selectedTypes.filter(t => t !== '현장') : [...(p.selectedTypes || []), '현장'] }))} />}
                      label="현장"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={mobileAddPopup.selectedTypes?.includes('회의')} onChange={() => setMobileAddPopup(p => ({ ...p, selectedTypes: p.selectedTypes?.includes('회의') ? p.selectedTypes.filter(t => t !== '회의') : [...(p.selectedTypes || []), '회의'] }))} />}
                      label="회의"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={mobileAddPopup.selectedTypes?.includes('입찰')} onChange={() => setMobileAddPopup(p => ({ ...p, selectedTypes: p.selectedTypes?.includes('입찰') ? p.selectedTypes.filter(t => t !== '입찰') : [...(p.selectedTypes || []), '입찰'] }))} />}
                      label="입찰"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={mobileAddPopup.selectedTypes?.includes('현설')} onChange={() => setMobileAddPopup(p => ({ ...p, selectedTypes: p.selectedTypes?.includes('현설') ? p.selectedTypes.filter(t => t !== '현설') : [...(p.selectedTypes || []), '현설'] }))} />}
                      label="현설"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={mobileAddPopup.selectedTypes?.includes('지원')} onChange={() => setMobileAddPopup(p => ({ ...p, selectedTypes: p.selectedTypes?.includes('지원') ? p.selectedTypes.filter(t => t !== '지원') : [...(p.selectedTypes || []), '지원'] }))} />}
                      label="지원"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={mobileAddPopup.selectedTypes?.includes('기타')} onChange={() => setMobileAddPopup(p => ({ ...p, selectedTypes: p.selectedTypes?.includes('기타') ? p.selectedTypes.filter(t => t !== '기타') : [...(p.selectedTypes || []), '기타'] }))} />}
                      label="기타"
                    />
                  </Box>
                </Box>
                {/* 색상 선택 */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {colorChoices.map(color => (
                    <Box
                      key={color}
                      onClick={() => setMobileAddPopup(p => ({ ...p, selectedColor: color }))}
                      sx={{
                        width: 24, height: 24, borderRadius: '50%',
                        bgcolor: color, cursor: 'pointer',
                        border: mobileAddPopup.selectedColor === color ? '3px solid #fff' : '2px solid #888',
                        boxShadow: mobileAddPopup.selectedColor === color ? '0 0 0 2px #1976d2' : 'none',
                        transition: 'all 0.15s'
                      }}
                    />
                  ))}
                </Box>
                {/* 설명(일정) 입력란을 맨 아래로 이동 */}
                <TextField
                  label="설명"
                  value={mobileAddPopup.etc}
                  onChange={e => setMobileAddPopup(p => ({ ...p, etc: e.target.value }))}
                  fullWidth
                  sx={{ mt: 2 }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setMobileAddPopup({ ...mobileAddPopup, open: false })}>취소</Button>
                <Button variant="contained" onClick={() => handleMobileAddSave(mobileAddPopup.date, mobileAddPopup.siteTitle, mobileAddPopup.siteName, mobileAddPopup.selectedTypes, mobileAddPopup.selectedColor, mobileAddPopup.etc)} disabled={!(mobileAddPopup.siteTitle?.trim() || mobileAddPopup.siteName?.trim())}>추가</Button>
              </DialogActions>
            </Dialog>
          </Box>
        </>
      )}
    </Box>
  );
};

export default CustomCalendar; 