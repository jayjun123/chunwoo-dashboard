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
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  CalendarToday,
  Add,
  Edit,
  Delete,
  CheckCircle,
  RadioButtonUnchecked,
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
  Person,
  Star,
  Timeline,
  Search,
  FilterList,
  ViewWeek,
  ViewModule,
  CalendarViewMonth
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MobileSchedule = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // 상태 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day
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

  // 날짜 관련 함수들
  const formatDate = (date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // 이전 달의 마지막 날들
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonth.getDate() - i,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate() - i)
      });
    }

    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = date.toDateString() === new Date().toDateString();
      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        date
      });
    }

    // 다음 달의 첫 날들 (42개 셀을 채우기 위해)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push({
        day,
        isCurrentMonth: false,
        isToday: false,
        date: nextMonth
      });
    }

    return days;
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
    setViewMode('day');
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
    // 일정 저장 로직
    console.log('일정 저장:', newSchedule);
    setAddDialogOpen(false);
    setNewSchedule({
      title: '',
      description: '',
      date: '',
      time: '',
      type: 'work'
    });
  };

  const getScheduleColor = (type) => {
    const colors = {
      work: '#1976d2',
      personal: '#43a047',
      meeting: '#ffa000',
      deadline: '#ef5350'
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

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      bgcolor: '#f5f5f5'
    }}>
      {/* 상단 앱바 */}
      <AppBar 
        position="fixed" 
        sx={{ 
          bgcolor: '#2E7D32',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
            일정관리
          </Typography>
          <IconButton color="inherit" onClick={() => setViewMode('month')}>
            <CalendarViewMonth />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* 사이드바 */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={toggleDrawer}
        ModalProps={{
          keepMounted: true, // 모바일 성능 향상
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            bgcolor: '#1a1a1a',
            color: 'white'
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
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  bgcolor: item.active ? 'rgba(46, 125, 50, 0.2)' : 'transparent',
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
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* 월 네비게이션 */}
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton onClick={() => changeMonth(-1)}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </Typography>
            <IconButton onClick={() => changeMonth(1)}>
              <ChevronRight />
            </IconButton>
          </Box>
        </Paper>

        {/* 달력 뷰 */}
        {viewMode === 'month' && (
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* 요일 헤더 */}
            <Grid container>
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <Grid item xs key={day}>
                  <Box sx={{ 
                    p: 1, 
                    textAlign: 'center', 
                    bgcolor: '#f5f5f5',
                    borderBottom: '1px solid #e0e0e0',
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
              {getMonthDays().map((dayObj, index) => (
                <Grid item xs key={index}>
                  <Box
                    onClick={() => handleDateClick(dayObj.date)}
                    sx={{
                      minHeight: 60,
                      p: 1,
                      borderRight: '1px solid #e0e0e0',
                      borderBottom: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      bgcolor: dayObj.isToday ? '#e3f2fd' : 'white',
                      color: dayObj.isCurrentMonth ? 'text.primary' : 'text.disabled',
                      '&:hover': {
                        bgcolor: '#f5f5f5'
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
                        color: dayObj.isToday ? '#1976d2' : 'inherit'
                      }}
                    >
                      {dayObj.day}
                    </Typography>
                    {/* 일정 표시 */}
                    {schedules.filter(schedule => 
                      new Date(schedule.date).toDateString() === dayObj.date.toDateString()
                    ).slice(0, 2).map((schedule, idx) => (
                      <Chip
                        key={idx}
                        label={schedule.title}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.7rem',
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
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* 일별 뷰 */}
        {viewMode === 'day' && (
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              {formatDate(selectedDate)}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {schedules.filter(schedule => 
                new Date(schedule.date).toDateString() === selectedDate.toDateString()
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
            </Box>
          </Paper>
        )}
      </Box>

      {/* 플로팅 액션 버튼 */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#2E7D32',
          '&:hover': {
            bgcolor: '#1B5E20'
          }
        }}
        onClick={handleAddSchedule}
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

export default MobileSchedule;
