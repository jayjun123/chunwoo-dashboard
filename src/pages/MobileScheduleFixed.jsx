import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  Avatar,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  CalendarToday,
  Add,
  ChevronLeft,
  ChevronRight,
  Home,
  Business,
  Security,
  Assignment,
  Chat,
  Description,
  Assessment,
  Settings,
  Person
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MobileScheduleFixed = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // 상태 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    type: 'work'
  });

  // 사이드바 메뉴 아이템들
  const menuItems = [
    { text: '홈', icon: <Home />, path: '/' },
    { text: '현장관리', icon: <Business />, path: '/sites' },
    { text: '일정관리', icon: <CalendarToday />, path: '/schedule', active: true },
    { text: '안전관리', icon: <Security />, path: '/safety' },
    { text: '자재관리', icon: <Assignment />, path: '/materials' },
    { text: '토론방', icon: <Chat />, path: '/discussions' },
    { text: '문서관리', icon: <Description />, path: '/documents' },
    { text: '분석', icon: <Assessment />, path: '/analysis' },
    { text: '설정', icon: <Settings />, path: '/settings' }
  ];

  // 샘플 일정 데이터
  useEffect(() => {
    const sampleSchedules = [
      {
        id: 1,
        title: '현장 점검',
        description: '강남 아파트 현장 점검',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        type: 'work'
      },
      {
        id: 2,
        title: '회의',
        description: '월간 진행상황 회의',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '14:00',
        type: 'meeting'
      }
    ];
    setSchedules(sampleSchedules);
  }, []);

  // 달력 생성 함수 (간단하고 확실한 버전)
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 이번 달 첫째 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=일요일
    
    const calendar = [];
    
    // 이전 달의 빈 칸들
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // 이번 달의 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      calendar.push({
        day,
        date,
        isToday: date.toDateString() === new Date().toDateString()
      });
    }
    
    return calendar;
  };

  const changeMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleAddSchedule = () => {
    setNewSchedule({
      title: '',
      description: '',
      date: selectedDate.toISOString().split('T')[0],
      time: '',
      type: 'work'
    });
    setAddDialogOpen(true);
  };

  const handleSaveSchedule = () => {
    const schedule = {
      ...newSchedule,
      id: Date.now()
    };
    setSchedules([...schedules, schedule]);
    setAddDialogOpen(false);
  };

  const getScheduleColor = (type) => {
    const colors = {
      work: '#1976d2',
      personal: '#43a047',
      meeting: '#ff9800',
      deadline: '#f44336'
    };
    return colors[type] || '#1976d2';
  };

  // 사이드바 토글
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // 메뉴 아이템 클릭
  const handleMenuClick = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const calendar = generateCalendar();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      bgcolor: '#121212'
    }}>
      {/* 상단 앱바 */}
      <AppBar 
        position="fixed" 
        sx={{ 
          bgcolor: '#1e1e1e',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={toggleDrawer}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleDrawer();
            }}
            sx={{ mr: 2, touchAction: 'none' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
            일정관리
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 사이드바 */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={toggleDrawer}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRight: '1px solid #333'
          },
        }}
      >
        <Box sx={{ p: 2, bgcolor: '#2E7D32', color: 'white' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            천우건업
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            현장관리시스템
          </Typography>
        </Box>
        
        <List sx={{ flexGrow: 1, pt: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleMenuClick(item.path)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleMenuClick(item.path);
                }}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  bgcolor: item.active ? 'rgba(46, 125, 50, 0.3)' : 'transparent',
                  touchAction: 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <ListItemIcon sx={{ color: item.active ? '#4caf50' : 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontSize: '0.95rem',
                      fontWeight: item.active ? 'bold' : 'normal'
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#4caf50' }}>
              {currentUser?.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {currentUser?.email || '사용자'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* 메인 컨텐츠 */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 2, 
          mt: '56px',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          bgcolor: '#121212'
        }}
      >
        {/* 월 네비게이션 */}
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#1e1e1e', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton 
              onClick={() => changeMonth(-1)}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                changeMonth(-1);
              }}
              sx={{ touchAction: 'none' }}
            >
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </Typography>
            <IconButton 
              onClick={() => changeMonth(1)}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                changeMonth(1);
              }}
              sx={{ touchAction: 'none' }}
            >
              <ChevronRight />
            </IconButton>
          </Box>
        </Paper>

        {/* 달력 */}
        <Paper sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: '#1e1e1e', color: 'white' }}>
          {/* 요일 헤더 */}
          <Grid container>
            {weekDays.map((day) => (
              <Grid item xs key={day}>
                <Box sx={{ 
                  p: 1, 
                  textAlign: 'center', 
                  bgcolor: '#2a2a2a',
                  color: 'white',
                  borderBottom: '1px solid #444',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  {day}
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* 달력 날짜들 */}
          <Grid container>
            {calendar.map((dayObj, index) => (
              <Grid item xs key={index}>
                {dayObj ? (
                  <Box
                    onClick={() => handleDateClick(dayObj.date)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDateClick(dayObj.date);
                    }}
                    sx={{
                      minHeight: 60,
                      p: 1,
                      borderRight: '1px solid #444',
                      borderBottom: '1px solid #444',
                      cursor: 'pointer',
                      bgcolor: dayObj.isToday ? '#2E7D32' : '#1e1e1e',
                      color: dayObj.isCurrentMonth ? 'white' : '#666',
                      touchAction: 'none',
                      '&:hover': {
                        bgcolor: '#333'
                      },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: dayObj.isToday ? 'bold' : 'normal',
                        color: dayObj.isToday ? '#4caf50' : 'inherit'
                      }}
                    >
                      {dayObj.day}
                    </Typography>
                    {/* 일정 표시 */}
                    {schedules.filter(schedule => 
                      schedule.date === dayObj.date.toISOString().split('T')[0]
                    ).slice(0, 1).map((schedule, idx) => (
                      <Chip
                        key={idx}
                        label={schedule.title}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          bgcolor: getScheduleColor(schedule.type),
                          color: 'white',
                          mt: 0.5,
                          whiteSpace: 'nowrap',
                          '& .MuiChip-label': {
                            px: 0.5,
                            whiteSpace: 'nowrap'
                          }
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ minHeight: 60, borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0' }} />
                )}
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* 선택된 날짜의 일정 목록 */}
        <Paper sx={{ p: 2, mt: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 일정
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {schedules.filter(schedule => 
              schedule.date === selectedDate.toISOString().split('T')[0]
            ).map((schedule, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  bgcolor: 'white'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {schedule.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {schedule.time} - {schedule.description}
                </Typography>
              </Box>
            ))}
            {schedules.filter(schedule => 
              schedule.date === selectedDate.toISOString().split('T')[0]
            ).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                등록된 일정이 없습니다.
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {/* 플로팅 액션 버튼 */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#2E7D32',
          color: 'white',
          touchAction: 'none',
          '&:hover': {
            bgcolor: '#1B5E20'
          }
        }}
        onClick={handleAddSchedule}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAddSchedule();
        }}
      >
        <Add />
      </Fab>

      {/* 일정 추가 다이얼로그 */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>새 일정 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="제목"
            fullWidth
            variant="outlined"
            value={newSchedule.title}
            onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="설명"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newSchedule.description}
            onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="날짜"
            type="date"
            fullWidth
            variant="outlined"
            value={newSchedule.date}
            onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="시간"
            type="time"
            fullWidth
            variant="outlined"
            value={newSchedule.time}
            onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>취소</Button>
          <Button onClick={handleSaveSchedule} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileScheduleFixed;
