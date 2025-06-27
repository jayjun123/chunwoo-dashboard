import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const EVENT_TYPES = [
  { value: '일정', label: '일정', color: '#4caf50' },
  { value: '회의', label: '회의', color: '#2196f3' },
  { value: '교육', label: '교육', color: '#ff9800' },
  { value: '행사', label: '행사', color: '#f44336' },
  { value: '기타', label: '기타', color: '#9c27b0' }
];

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const Calendar = ({ sites = [], schedules = [], onAddSchedule, onEditSchedule, onDeleteSchedule }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [todaySites, setTodaySites] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    open: false,
    mode: 'add',
    data: {
      title: '',
      type: '일정',
      startDate: '',
      endDate: '',
      description: '',
      siteId: ''
    }
  });

  useEffect(() => {
    const handleSchedulesUpdated = () => {
      const today = new Date().toISOString().split('T')[0];
      const todaySchedules = schedules.filter(s => s.startDate === today);
      window.dispatchEvent(new CustomEvent('updateDashboard', {
        detail: { todayScheduleCount: todaySchedules.length }
      }));
    };

    window.addEventListener('schedulesUpdated', handleSchedulesUpdated);
    return () => window.removeEventListener('schedulesUpdated', handleSchedulesUpdated);
  }, [schedules]);

  useEffect(() => {
    // 오늘 날짜의 현장 목록 가져오기
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const q = query(collection(db, 'sites'), where('status', '==', '진행중'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todaySitesList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(site => {
          const startDate = new Date(site.startDate).toISOString().split('T')[0];
          const endDate = new Date(site.endDate).toISOString().split('T')[0];
          return startDate <= todayStr && endDate >= todayStr;
        });
      setTodaySites(todaySitesList);
      
      // 대시보드바에 금일 현장 수 업데이트
      window.dispatchEvent(new CustomEvent('updateDashboard', {
        detail: { todaySites: todaySitesList.length }
      }));
    });

    return () => unsubscribe();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setScheduleForm({
      open: true,
      mode: 'add',
      data: {
        title: '',
        type: '일정',
        startDate: date.toISOString().split('T')[0],
        endDate: date.toISOString().split('T')[0],
        description: '',
        siteId: ''
      }
    });
  };

  const handleScheduleClick = (schedule, e) => {
    e.stopPropagation();
    if (e.detail === 2) {
      setScheduleForm({
        open: true,
        mode: 'edit',
        data: { ...schedule }
      });
    } else {
      setSelectedSchedules(prev => {
        const isSelected = prev.some(s => s.id === schedule.id);
        return isSelected 
          ? prev.filter(s => s.id !== schedule.id)
          : [...prev, schedule];
      });
    }
  };

  const handleScheduleTouch = (schedule, e) => {
    const touch = e.touches[0];
    const timeout = setTimeout(() => {
      handleScheduleClick(schedule, { ...e, detail: 2 });
    }, 500);
    e.target.dataset.timeout = timeout;
  };

  const handleScheduleTouchEnd = (e) => {
    clearTimeout(e.target.dataset.timeout);
  };

  const handleSaveChanges = async () => {
    try {
      for (const change of pendingChanges) {
        if (change.type === 'add') {
          await onAddSchedule(change.data);
        } else if (change.type === 'edit') {
          await onEditSchedule(change.data.id, change.data);
        }
      }
      setPendingChanges([]);
      window.dispatchEvent(new CustomEvent('schedulesUpdated'));
    } catch (error) {
      console.error('일정 저장 실패:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSchedules.length === 0) return;
    if (!window.confirm(`선택한 ${selectedSchedules.length}개의 일정을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(selectedSchedules.map(s => onDeleteSchedule(s.id)));
      setSelectedSchedules([]);
      window.dispatchEvent(new CustomEvent('schedulesUpdated'));
    } catch (error) {
      console.error('일정 삭제 실패:', error);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const schedule = schedules.find(s => s.id === result.draggableId);
    if (!schedule) return;

    const newSchedule = {
      ...schedule,
      startDate: result.destination.droppableId
    };

    setPendingChanges(prev => [...prev, {
      type: 'edit',
      data: newSchedule
    }]);
  };

  const getMonthMatrix = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const matrix = [];
    let day = 1 - firstDayOfWeek;
    
    for (let row = 0; row < 6; row++) {
      const week = [];
      for (let col = 0; col < 7; col++, day++) {
        if (day < 1 || day > daysInMonth) {
          week.push(null);
        } else {
          week.push(new Date(year, month, day));
        }
      }
      matrix.push(week);
    }
    return matrix;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 'none', px: 0, boxSizing: 'border-box', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', left: '-20px' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2,
        px: 0,
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-start' }}>
          <IconButton onClick={handlePrevMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 700 }}
          >
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </Typography>
          <IconButton onClick={handleNextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end', marginRight: '30px' }}>
          <Button variant="contained" color="primary" size="small" sx={{ fontWeight: 700 }} onClick={handleSaveChanges}>저장</Button>
          <Button variant="outlined" color="error" size="small" sx={{ fontWeight: 700 }} onClick={handleDeleteSelected}>삭제</Button>
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '5px',
        width: 'calc(100% - 35px)',
        maxWidth: 'calc(100% - 35px)',
        mb: 0.5,
        mt: '5px',
        mx: 'auto',
        px: 0,
      }}>
        {WEEK_DAYS.map((day, idx) => (
          <Typography
            key={day}
            variant="caption"
            sx={{
              textAlign: 'center',
              color: idx === 0 ? 'error.main' : idx === 6 ? 'primary.main' : 'text.secondary',
              fontWeight: 'bold',
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              lineHeight: 1.8
            }}
          >
            {day}
          </Typography>
        ))}
      </Box>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: 'repeat(6, auto)',
          gap: '5px',
          flex: 1,
          px: 0,
          position: 'relative',
          width: 'calc(100% - 35px)',
          minWidth: 0,
          maxWidth: 'calc(100% - 35px)',
          boxSizing: 'border-box',
          mx: 'auto',
          px: 0,
          overflowX: 'auto',
        }}>
          {getMonthMatrix().flat().map((date, idx) => {
            const colIdx = idx % 7;
            const isToday = date && (date.toDateString() === new Date().toDateString());
            const isSunday = colIdx === 0;
            const isSaturday = colIdx === 6;
            const dateStr = date ? date.toISOString().split('T')[0] : '';
            const daySchedules = date ? schedules.filter(s => s.startDate === dateStr) : [];
            const daySites = date ? todaySites.filter(site => {
              const startDate = new Date(site.startDate).toISOString().split('T')[0];
              const endDate = new Date(site.endDate).toISOString().split('T')[0];
              return startDate <= dateStr && endDate >= dateStr;
            }) : [];
            return (
              <Droppable droppableId={String(dateStr || `empty-${idx}`)} key={dateStr || `empty-${idx}`} type="extra">
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 62 + Math.max(0, daySchedules.length - 3) * 32,
                      p: 0.25,
                      border: isToday ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                      borderColor: isToday ? 'primary.main' : 'divider',
                      bgcolor: date ? (snapshot.isDraggingOver ? '#1e293b' : 'background.paper') : 'action.hover',
                      cursor: date ? 'pointer' : 'default',
                      '&:hover': date ? { bgcolor: 'action.hover' } : {},
                      position: 'relative',
                      overflow: 'visible',
                      height: 'auto',
                      boxSizing: 'border-box',
                      margin: 0,
                      width: '100%',
                      minWidth: 0,
                      maxWidth: '100%',
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                    }}
                    onClick={() => date && handleDayClick(date)}
                  >
                    {date && (
                      <>
                        <Typography
                          variant="caption"
                          sx={{
                            position: 'absolute',
                            top: 2,
                            left: 4,
                            color: '#90caf9',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            zIndex: 2
                          }}
                        >
                          [{daySites.length}]
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 4,
                            color: isSunday ? 'error.main' : isSaturday ? 'primary.main' : 'text.secondary',
                            fontWeight: isToday ? 'bold' : 'normal',
                            fontSize: '0.95rem',
                            zIndex: 2
                          }}
                        >
                          {date.getDate()}
                        </Typography>
                        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflow: 'visible' }}>
                          {daySchedules.map((schedule, sIdx) => {
                            const eventType = EVENT_TYPES.find(t => t.value === schedule.type);
                            const isSelected = selectedSchedules.some(s => s.id === schedule.id);
                            return (
                              <Draggable draggableId={String(schedule.id)} index={sIdx} key={String(schedule.id)}>
                                {(provided, snapshot) => (
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={(e) => handleScheduleClick(schedule, e)}
                                    onTouchStart={(e) => handleScheduleTouch(schedule, e)}
                                    onTouchEnd={handleScheduleTouchEnd}
                                    sx={{
                                      p: 0.5,
                                      bgcolor: eventType?.color || '#757575',
                                      color: 'white',
                                      borderRadius: 1,
                                      fontSize: '0.75rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      cursor: 'pointer',
                                      opacity: snapshot.isDragging ? 0.7 : 1,
                                      boxShadow: snapshot.isDragging ? 3 : 0,
                                      '&:hover': { opacity: 0.8 },
                                      minHeight: 28,
                                      maxHeight: 32,
                                      mb: 0.5,
                                      border: isSelected ? '2px solid white' : 'none'
                                    }}
                                  >
                                    {schedule.title}
                                  </Box>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </Box>
                      </>
                    )}
                  </Box>
                )}
              </Droppable>
            );
          })}
        </Box>
      </DragDropContext>

      <Dialog 
        open={scheduleForm.open} 
        onClose={() => setScheduleForm({ ...scheduleForm, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {scheduleForm.mode === 'add' ? '새 일정' : '일정 수정'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="제목"
              name="title"
              value={scheduleForm.data.title}
              onChange={(e) => setScheduleForm({
                ...scheduleForm,
                data: { ...scheduleForm.data, title: e.target.value }
              })}
              required
            />
            <TextField
              fullWidth
              select
              label="유형"
              name="type"
              value={scheduleForm.data.type}
              onChange={(e) => setScheduleForm({
                ...scheduleForm,
                data: { ...scheduleForm.data, type: e.target.value }
              })}
              required
            >
              {EVENT_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="현장"
              name="siteId"
              value={scheduleForm.data.siteId}
              onChange={(e) => setScheduleForm({
                ...scheduleForm,
                data: { ...scheduleForm.data, siteId: e.target.value }
              })}
            >
              {sites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="시작일"
              name="startDate"
              type="date"
              value={scheduleForm.data.startDate}
              onChange={(e) => setScheduleForm({
                ...scheduleForm,
                data: { ...scheduleForm.data, startDate: e.target.value }
              })}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="종료일"
              name="endDate"
              type="date"
              value={scheduleForm.data.endDate}
              onChange={(e) => setScheduleForm({
                ...scheduleForm,
                data: { ...scheduleForm.data, endDate: e.target.value }
              })}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="설명"
              name="description"
              value={scheduleForm.data.description}
              onChange={(e) => setScheduleForm({
                ...scheduleForm,
                data: { ...scheduleForm.data, description: e.target.value }
              })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {scheduleForm.mode === 'edit' && (
            <Button
              onClick={async () => {
                try {
                  await onDeleteSchedule(scheduleForm.data.id);
                  setScheduleForm({ ...scheduleForm, open: false });
                  window.dispatchEvent(new CustomEvent('schedulesUpdated'));
                } catch (error) {
                  console.error('일정 삭제 실패:', error);
                }
              }}
              color="error"
              startIcon={<DeleteIcon />}
            >
              삭제
            </Button>
          )}
          <Button onClick={() => setScheduleForm({ ...scheduleForm, open: false })}>
            취소
          </Button>
          <Button
            onClick={async () => {
              try {
                if (scheduleForm.mode === 'add') {
                  await onAddSchedule(scheduleForm.data);
                } else {
                  await onEditSchedule(scheduleForm.data.id, scheduleForm.data);
                }
                setScheduleForm({ ...scheduleForm, open: false });
                window.dispatchEvent(new CustomEvent('schedulesUpdated'));
              } catch (error) {
                console.error('일정 저장 실패:', error);
              }
            }}
            variant="contained"
            startIcon={scheduleForm.mode === 'add' ? <AddIcon /> : <EditIcon />}
          >
            {scheduleForm.mode === 'add' ? '추가' : '수정'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar; 