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
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Add,
  Edit,
  Delete,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Business,
  Person,
  CalendarToday,
  Assignment,
  Security,
  Chat,
  Description,
  Assessment,
  Settings,
  Home,
  Star,
  Timeline,
  FilterList,
  ViewList,
  ViewModule,
  MoreVert,
  Search,
  Receipt,
  AccountBalance,
  Payment,
  CheckCircle,
  Warning,
  Error,
  Info,
  Download,
  Upload,
  Print,
  Calculate,
  FileCopy,
  Send
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MobileEstimates = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // 상태 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [estimates, setEstimates] = useState([]);
  const [filteredEstimates, setFilteredEstimates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEstimate, setNewEstimate] = useState({
    projectName: '',
    client: '',
    amount: '',
    status: 'draft',
    type: 'construction',
    description: '',
    validUntil: ''
  });

  // 사이드바 메뉴 아이템들
  const menuItems = [
    { text: '홈', icon: <Home />, path: '/' },
    { text: '현장관리', icon: <Business />, path: '/sites' },
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
    const filtered = estimates.filter(estimate =>
      estimate.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEstimates(filtered);
  }, [estimates, searchTerm]);

  // 샘플 데이터
  useEffect(() => {
    const sampleEstimates = [
      {
        id: 1,
        projectName: '강남 오피스텔 신축공사',
        client: 'ABC건설',
        amount: 5000000000,
        status: 'approved',
        type: 'construction',
        description: '지하 2층, 지상 20층 오피스텔 신축',
        validUntil: '2024-02-15',
        createdDate: '2024-01-10',
        approvedDate: '2024-01-12'
      },
      {
        id: 2,
        projectName: '부산 항만시설 리모델링',
        client: '부산항만공사',
        amount: 3000000000,
        status: 'pending',
        type: 'renovation',
        description: '기존 항만시설 현대화 공사',
        validUntil: '2024-02-20',
        createdDate: '2024-01-15',
        approvedDate: null
      },
      {
        id: 3,
        projectName: '대구 상업시설 증축',
        client: '대구시청',
        amount: 1500000000,
        status: 'rejected',
        type: 'expansion',
        description: '기존 상업시설 2층 증축',
        validUntil: '2024-02-10',
        createdDate: '2024-01-08',
        approvedDate: null
      },
      {
        id: 4,
        projectName: '서울 아파트 리모델링',
        client: '서울시주택공사',
        amount: 800000000,
        status: 'draft',
        type: 'renovation',
        description: '기존 아파트 내부 리모델링',
        validUntil: '2024-02-25',
        createdDate: '2024-01-20',
        approvedDate: null
      }
    ];
    setEstimates(sampleEstimates);
    setFilteredEstimates(sampleEstimates);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'rejected': return '#f44336';
      case 'draft': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'pending': return <Warning />;
      case 'rejected': return <Error />;
      case 'draft': return <Edit />;
      default: return <Info />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return '승인완료';
      case 'pending': return '승인대기';
      case 'rejected': return '승인거부';
      case 'draft': return '초안';
      default: return '알 수 없음';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'construction': return '신축공사';
      case 'renovation': return '리모델링';
      case 'expansion': return '증축공사';
      case 'maintenance': return '유지보수';
      default: return '기타';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleAddEstimate = () => {
    setNewEstimate({
      projectName: '',
      client: '',
      amount: '',
      status: 'draft',
      type: 'construction',
      description: '',
      validUntil: ''
    });
    setAddDialogOpen(true);
  };

  const handleSaveEstimate = () => {
    const estimate = {
      ...newEstimate,
      id: Date.now(),
      amount: parseInt(newEstimate.amount),
      createdDate: new Date().toISOString().split('T')[0],
      approvedDate: null
    };
    setEstimates([...estimates, estimate]);
    setAddDialogOpen(false);
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

  // 견적 상태별 통계
  const getEstimateStats = () => {
    const approved = estimates.filter(e => e.status === 'approved').length;
    const pending = estimates.filter(e => e.status === 'pending').length;
    const rejected = estimates.filter(e => e.status === 'rejected').length;
    const draft = estimates.filter(e => e.status === 'draft').length;
    const totalAmount = estimates.reduce((sum, e) => sum + e.amount, 0);
    return { approved, pending, rejected, draft, totalAmount };
  };

  const estimateStats = getEstimateStats();

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
          bgcolor: '#2196f3',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
          toggleDrawer;
        }}
        
            sx={{ mr: 2, touchAction: 'none' }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
            청구/견적
          </Typography>
          <IconButton color="inherit">
            <Calculate />
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
        <Box sx={{ p: 2, bgcolor: '#2196f3', color: 'white' }}>
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
                  bgcolor: 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              
        sx={{ 
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#1e1e1e',
          touchAction: 'none',
          '&:hover': {
            bgcolor: '#ff9800'
          }
        }}>
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontSize: '0.95rem',
                      fontWeight: 'normal'
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
        {/* 견적 통계 카드 */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Paper sx={{  p: 1.5, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
                {estimateStats.approved}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                승인완료
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{  p: 1.5, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h5" color="warning.main" sx={{ fontWeight: 'bold' }}>
                {estimateStats.pending}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                승인대기
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{  p: 1.5, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h5" color="error" sx={{ fontWeight: 'bold' }}>
                {estimateStats.rejected}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                승인거부
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{  p: 1.5, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h5" color="grey.600" sx={{ fontWeight: 'bold' }}>
                {estimateStats.draft}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                초안
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 총 견적금액 카드 */}
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#2E7D32' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                총 견적금액
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(estimateStats.totalAmount)}
              </Typography>
            </Box>
            <AttachMoney sx={{ fontSize: 40, color: '#2196f3' }} />
          </Box>
        </Paper>

        {/* 검색 및 필터 */}
        <Paper sx={{  p: 2, mb: 2, borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
          <TextField
            fullWidth
            placeholder="프로젝트명, 고객사, 설명으로 검색..."
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
            <Tab label="승인완료" />
            <Tab label="승인대기" />
            <Tab label="승인거부" />
            <Tab label="초안" />
          </Tabs>
        </Paper>

        {/* 견적 목록 */}
        <Grid container spacing={2}>
          {filteredEstimates.map((estimate) => (
            <Grid item xs={12} key={estimate.id}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {estimate.projectName}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(estimate.status)}
                      label={getStatusText(estimate.status)}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(estimate.status),
                        color: 'white',
                        fontSize: '0.7rem',
                        whiteSpace: 'nowrap',
                        '& .MuiChip-label': {
                          whiteSpace: 'nowrap'
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Business sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {estimate.client}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Assignment sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {getTypeText(estimate.type)}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {estimate.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(estimate.amount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      유효기간: {estimate.validUntil}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      작성일: {estimate.createdDate}
                    </Typography>
                    {estimate.approvedDate && (
                      <Typography variant="caption" color="text.secondary">
                        승인일: {estimate.approvedDate}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                
                <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
                  <Button size="small" startIcon={<Edit />}>
                    수정
                  </Button>
                  <Button size="small" startIcon={<FileCopy />}>
                    복사
                  </Button>
                  <Button size="small" startIcon={<Send />}>
                    전송
                  </Button>
                  <Button size="small" startIcon={<Download />}>
                    다운로드
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
          bgcolor: '#2196f3',
          '&:hover': {
            bgcolor: '#1e1e1e'
          }
        }}
        
        onClick={handleAddEstimate}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAddEstimate();
        }}
        
      
        sx={{ 
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#1e1e1e',
          touchAction: 'none',
          '&:hover': {
            bgcolor: '#ff9800'
          }
        }}>
        <Add />
      </Fab>

      {/* 견적 추가 다이얼로그 */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>새 견적 작성</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="프로젝트명"
            fullWidth
            variant="outlined"
            value={newEstimate.projectName}
            onChange={(e) => setNewEstimate({...newEstimate, projectName: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="고객사"
            fullWidth
            variant="outlined"
            value={newEstimate.client}
            onChange={(e) => setNewEstimate({...newEstimate, client: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="견적금액"
            fullWidth
            variant="outlined"
            type="number"
            value={newEstimate.amount}
            onChange={(e) => setNewEstimate({...newEstimate, amount: e.target.value})}
            InputProps={{
              endAdornment: <InputAdornment position="end">원</InputAdornment>
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="유효기간"
            type="date"
            fullWidth
            variant="outlined"
            value={newEstimate.validUntil}
            onChange={(e) => setNewEstimate({...newEstimate, validUntil: e.target.value})}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="프로젝트 설명"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newEstimate.description}
            onChange={(e) => setNewEstimate({...newEstimate, description: e.target.value})}
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
        
        sx={{ 
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#1e1e1e',
          touchAction: 'none',
          '&:hover': {
            bgcolor: '#ff9800'
          }
        }}>취소</Button>
          <Button
        
        onClick={handleSaveEstimate}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSaveEstimate;
        }}
         variant="contained"
        sx={{ 
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#1e1e1e',
          touchAction: 'none',
          '&:hover': {
            bgcolor: '#ff9800'
          }
        }}>저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileEstimates;
