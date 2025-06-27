import React from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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
  sx = {} 
}) => {
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

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: { xs: 1, md: 2 },
      p: { xs: 1, md: 2 },
      bgcolor: '#181c24',
      borderRadius: 4,
      mt: -3,
      ...sx
    }}>
      {/* 네비게이션 + 연월 + 버튼 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        width: '100%', 
        mb: 2,
        position: 'relative'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={onPrevMonth} sx={{ color: '#fff', p: 0.5 }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h5" sx={{ 
            color: '#fff', 
            fontWeight: 700, 
            letterSpacing: 1, 
            ml: 1, 
            minWidth: 140, 
            textAlign: 'left',
            fontSize: { xs: '1.2rem', md: '1.5rem' }
          }}>
            {year}년 {String(month + 1).padStart(2, '0')}월
          </Typography>
          <IconButton onClick={onNextMonth} sx={{ color: '#fff', p: 0.5 }}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            onClick={onSave}
            sx={{ 
              bgcolor: '#3b82f6', 
              color: '#fff', 
              fontWeight: 700, 
              borderRadius: 2, 
              px: 3, 
              '&:hover': { bgcolor: '#2563eb' } 
            }}
          >
            저장
          </Button>
          <Button 
            variant="contained" 
            onClick={onDeleteSelected}
            disabled={selectedItems.length === 0}
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
            삭제 ({selectedItems.length})
          </Button>
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
        </Box>
      </Box>

      {/* 요일 헤더 */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: { xs: '2px', md: '5px' },
        mb: '20px',
      }}>
        {WEEKDAYS.map((day, index) => (
          <Box
            key={day}
            sx={{
              textAlign: 'center',
              py: 0,
              minHeight: '18px',
              color: index === 0 ? '#ef4444' : index === 6 ? '#3b82f6' : '#fff',
              fontWeight: 600,
              fontSize: '20px',
            }}
          >
            {day}
          </Box>
        ))}
      </Box>

      {/* 달력 그리드 */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: { xs: '2px', md: '5px' },
        flex: 1,
        minHeight: 0,
        position: 'relative',
        '& .dragging': {
          zIndex: 99999,
          position: 'relative',
          transform: 'scale(1.05)',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
        }
      }}>
        {monthMatrix.map((week, weekIndex) => (
          week.map((date, dayIndex) => {
            const dateStr = date ? `${year}-${String(month + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null;
            const items = dateStr ? calendarItems[dateStr] || [] : [];
            const isSunday = dayIndex === 0;
            const isSaturday = dayIndex === 6;
            
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
                    onClick={() => date && onDateClick(dateStr)}
                    sx={{
                      bgcolor: snapshot.isDraggingOver ? '#1e293b' : '#232837',
                      borderRadius: { xs: 1, md: 2 },
                      p: { xs: 0.5, md: 1 },
                      minHeight: { xs: '60px', md: '100px' },
                      display: 'flex',
                      flexDirection: 'column',
                      gap: { xs: 0.5, md: 1 },
                      cursor: date ? 'pointer' : 'default',
                      position: 'relative',
                      border: snapshot.isDraggingOver 
                        ? '2px solid #3b82f6' 
                        : isToday(date)
                          ? '2px solid #ef4444'
                          : '1px solid #232837',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: date ? '#1e293b' : '#232837'
                      }
                    }}
                  >
                    {/* 날짜 셀 헤더 */}
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      mb: 0.5
                    }}>
                      {/* 항목 개수 */}
                      <Typography sx={{
                        fontSize: { xs: '0.7rem', md: '0.8rem' },
                        color: '#6b7280',
                        fontWeight: 500
                      }}>
                        [{items.length}]
                      </Typography>
                      {/* 날짜 */}
                      <Typography sx={{
                        fontSize: { xs: '0.8rem', md: '0.9rem' },
                        color: isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#fff',
                        fontWeight: 600
                      }}>
                        {date ? date.getDate() : ''}
                      </Typography>
                    </Box>
                    {/* 항목 리스트 */}
                    <Box sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      overflow: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '4px',
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
                      {items.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={`cell-${dateStr}-${item.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => {
                            const isSelected = selectedItems.some(
                              sel => sel.date === dateStr && sel.id === item.id
                            );
                            return (
                              <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onItemClick(dateStr, item.id);
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  onItemDoubleClick(dateStr, item);
                                }}
                                onTouchStart={(e) => {
                                  e.stopPropagation();
                                  onItemTouchStart(dateStr, item);
                                }}
                                onTouchEnd={(e) => {
                                  e.stopPropagation();
                                  onItemTouchEnd();
                                }}
                                className={snapshot.isDragging ? 'dragging' : ''}
                                sx={{
                                  p: { xs: 0.5, md: 0.75 },
                                  bgcolor: isSelected ? '#3b82f6' : '#181c24',
                                  color: '#fff',
                                  borderRadius: 1,
                                  fontWeight: 500,
                                  fontSize: { xs: '0.7rem', md: '0.8rem' },
                                  boxShadow: snapshot.isDragging ? 3 : 0,
                                  cursor: 'grab',
                                  border: '1px solid #3b82f6',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    bgcolor: isSelected ? '#2563eb' : '#1e293b'
                                  }
                                }}
                              >
                                {item.text.slice(0, 6)}
                              </Box>
                            );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  </Box>
                )}
              </Droppable>
            );
          })
        ))}
      </Box>
    </Box>
  );
};

export default CustomCalendar; 