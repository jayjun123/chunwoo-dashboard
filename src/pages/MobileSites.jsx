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
  Card,
  CardContent,
  CardActions,
  Badge,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  InputAdornment,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import {
  Menu as MenuIcon,
  Add,
  Edit,
  Delete,
  Search,
  LocationOn,
  Business,
  Person,
  Phone,
  Email,
  CalendarToday,
  AttachMoney,
  Home,
  Security,
  Assignment,
  Chat,
  Description,
  Assessment,
  Settings,
  Star,
  Timeline,
  FilterList,
  ViewList,
  ViewModule,
  MoreVert,
  CheckCircle,
  Warning,
  Error
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MobileSites = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // 상태 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [newSite, setNewSite] = useState({
    name: '',
    address: '',
    manager: '',
    phone: '',
    email: '',
    startDate: '',
    budget: '',
    status: 'active'
  });

  // 사이드바 메뉴 아이템들
  const menuItems = [
    { text: '홈', icon: <Home />, path: '/' },
    { text: '현장관리', icon: <Business />, path: '/sites', active: true },
    { text: '일정관리', icon: <CalendarToday />, path: '/schedule' },
    { text: '안전관리', icon: <Security />, path: '/safety' },
    { text: '자재관리', icon: <Assignment />, path: '/materials' },
    { text: '토론방', icon: <Chat />, path: '/discussions' },
    { text: '문서관리', icon: <Description />, path: '/documents' },
    { text: '분석', icon: <Assessment />, path: '/analysis' },
    { text: '설정', icon: <Settings />, path: '/settings' }
  ];

  // 탭 변경
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // 검색 필터링
  useEffect(() => {
    const filtered = sites.filter(site =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.manager.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSites(filtered);
  }, [sites, searchTerm]);

  // 샘플 데이터
  useEffect(() => {
    const sampleSites = [
      {
        id: 1,
        name: '강남 아파트 신축공사',
        address: '서울시 강남구 테헤란로 123',
        manager: '김현장',
        phone: '010-1234-5678',
        email: 'kim@example.com',
        startDate: '2024-01-15',
        budget: '5000000000',
        status: 'active',
        progress: 75,
        priority: 'high'
      },
      {
        id: 2,
        name: '부산 항만시설 공사',
        address: '부산시 해운대구 센텀동로 456',
        manager: '이현장',
        phone: '010-2345-6789',
        email: 'lee@example.com',
        startDate: '2024-02-01',
        budget: '8000000000',
        status: 'active',
        progress: 45,
        priority: 'medium'
      },
      {
        id: 3,
        name: '대구 상업시설 리모델링',
        address: '대구시 수성구 동대구로 789',
        manager: '박현장',
        phone: '010-3456-7890',
        email: 'park@example.com',
        startDate: '2024-03-10',
        budget: '3000000000',
        status: 'planning',
        progress: 20,
        priority: 'low'
      }
    ];
    setSites(sampleSites);
    setFilteredSites(sampleSites);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'planning': return '#ff9800';
      case 'completed': return '#2196f3';
      case 'paused': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'planning': return <Warning />;
      case 'completed': return <CheckCircle />;
      case 'paused': return <Error />;
      default: return <Warning />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleAddSite = () => {
    setNewSite({
      name: '',
      address: '',
      manager: '',
      phone: '',
      email: '',
      startDate: '',
      budget: '',
      status: 'active'
    });
    setAddDialogOpen(true);
  };

  const handleSaveSite = () => {
    const site = {
      ...newSite,
      id: Date.now(),
      progress: 0,
      priority: 'medium'
    };
    setSites([...sites, site]);
    setAddDialogOpen(false);
  };

  const handleSiteClick = (site) => {
    setSelectedSite(site);
    // 현장 상세 페이지로 이동하거나 모달 표시
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
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative'
    }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: isMobile ? 5.5 : 5.5,
          pb: 3,
          px: isMobile ? 1 : 3,
          ml: isMobile ? 0 : 'auto',
          mr: isMobile ? 0 : 'auto',
          maxWidth: isMobile ? '100%' : 'none'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: '100vh',
          bgcolor: '#121212',
          borderRadius: 2,
          boxShadow: 3
        }}>
          {/* 상단 앱바 */}
          <AppBar 
            position="relative" 
            sx={{ 
              bgcolor: '#1e1e1e',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px 8px 0 0'
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
            현장관리
          </Typography>
          <IconButton
        color="inherit" 
            
        onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          () => setViewMode(viewMode === 'list' ? 'grid' : 'list');
        }}
        
          
        sx={{ ...sx, touchAction: 'none' }}>
            {viewMode === 'list' ? <ViewModule /> : <ViewList />}
          </IconButton>
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
            bgcolor: '#1a1a1a',
            color: 'white'
          },
        }}
      >
        <Box sx={{ p: 2, bgcolor: '#1e1e1e', color: 'white' }}>
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
                  bgcolor: item.active ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                  touchAction: 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <ListItemIcon sx={{ color: item.active ? '#42a5f5' : 'white', minWidth: 40 }}>
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
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#42a5f5' }}>
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
        {/* 검색 및 필터 */}
        <Paper sx={{  p: 2, mb: 2, borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
          <TextField
            fullWidth
            placeholder="현장명, 주소, 현장장으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 'auto' }}
          >
            <Tab label="전체" />
            <Tab label="진행중" />
            <Tab label="계획중" />
            <Tab label="완료" />
          </Tabs>
        </Paper>

        {/* 현장 목록 */}
        <Grid container spacing={2}>
          {filteredSites.map((site) => (
            <Grid item xs={12} key={site.id}>
              <Card 
                sx={{ 
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
                onClick={() => handleSiteClick(site)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {site.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        icon={getStatusIcon(site.status)}
                        label={site.status === 'active' ? '진행중' : site.status === 'planning' ? '계획중' : site.status === 'completed' ? '완료' : '일시정지'}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(site.status),
                          color: 'white',
                          fontSize: '0.7rem',
                          whiteSpace: 'nowrap',
                          '& .MuiChip-label': {
                            whiteSpace: 'nowrap'
                          }
                        }}
                      />
                      <Chip
                        label={site.priority === 'high' ? '긴급' : site.priority === 'medium' ? '보통' : '낮음'}
                        size="small"
                        sx={{
                          bgcolor: getPriorityColor(site.priority),
                          color: 'white',
                          fontSize: '0.7rem',
                          whiteSpace: 'nowrap',
                          '& .MuiChip-label': {
                            whiteSpace: 'nowrap'
                          }
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {site.address}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Person sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {site.manager}
                    </Typography>
                    <Phone sx={{ fontSize: '1rem', ml: 2, mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {site.phone}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AttachMoney sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                        {formatCurrency(site.budget)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                      {site.progress}%
                    </Typography>
                  </Box>
                  
                  {/* 진행률 바 */}
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ 
                      width: '100%', 
                      height: 4, 
                      bgcolor: 'grey.200', 
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ 
                        width: `${site.progress}%`, 
                        height: '100%', 
                        bgcolor: getStatusColor(site.status),
                        transition: 'width 0.3s ease'
                      }} />
                    </Box>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
                  <Button size="small" startIcon={<Edit />}>
                    수정
                  </Button>
                  <Button size="small" startIcon={<Delete />} color="error">
                    삭제
                  </Button>
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton size="small">
                    <MoreVert />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 플로팅 액션 버튼 */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#1e1e1e',
          '&:hover': {
            bgcolor: '#1565c0'
          }
        }}
        
        onClick={handleAddSite}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAddSite();
        }}>
        <Add />
      </Fab>

      {/* 현장 추가 다이얼로그 */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>새 현장 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="현장명"
            fullWidth
            variant="outlined"
            value={newSite.name}
            onChange={(e) => setNewSite({...newSite, name: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="주소"
            fullWidth
            variant="outlined"
            value={newSite.address}
            onChange={(e) => setNewSite({...newSite, address: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="현장장"
            fullWidth
            variant="outlined"
            value={newSite.manager}
            onChange={(e) => setNewSite({...newSite, manager: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="연락처"
            fullWidth
            variant="outlined"
            value={newSite.phone}
            onChange={(e) => setNewSite({...newSite, phone: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="이메일"
            fullWidth
            variant="outlined"
            value={newSite.email}
            onChange={(e) => setNewSite({...newSite, email: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="시작일"
            type="date"
            fullWidth
            variant="outlined"
            value={newSite.startDate}
            onChange={(e) => setNewSite({...newSite, startDate: e.target.value})}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="예산"
            fullWidth
            variant="outlined"
            value={newSite.budget}
            onChange={(e) => setNewSite({...newSite, budget: e.target.value})}
            InputProps={{
              endAdornment: <InputAdornment position="end">원</InputAdornment>
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
        
        onClick={() => setAddDialogOpen(false)}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          () => setAddDialogOpen(false);
        }}
        
        sx={{ ...sx, touchAction: 'none' }}>취소</Button>
          <Button
        
        onClick={handleSaveSite}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSaveSite;
        }}
         variant="contained"
        sx={{ ...sx, touchAction: 'none' }}>저장</Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Container>
    </Box>
  );
};

export default MobileSites;
