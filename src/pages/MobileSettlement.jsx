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
  Print
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MobileSettlement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // 상태 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settlements, setSettlements] = useState([]);
  const [filteredSettlements, setFilteredSettlements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    siteName: '',
    period: '',
    amount: '',
    status: 'pending',
    type: 'progress',
    description: ''
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
    const filtered = settlements.filter(settlement =>
      settlement.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSettlements(filtered);
  }, [settlements, searchTerm]);

  // 샘플 데이터
  useEffect(() => {
    const sampleSettlements = [
      {
        id: 1,
        siteName: '강남 아파트 신축공사',
        period: '2024년 1월',
        amount: 1500000000,
        status: 'approved',
        type: 'progress',
        description: '1차 기성금 청구',
        requestDate: '2024-01-15',
        approvalDate: '2024-01-20',
        progress: 75
      },
      {
        id: 2,
        siteName: '부산 항만시설 공사',
        period: '2024년 1월',
        amount: 2000000000,
        status: 'pending',
        type: 'final',
        description: '최종 정산 청구',
        requestDate: '2024-01-18',
        approvalDate: null,
        progress: 100
      },
      {
        id: 3,
        siteName: '대구 상업시설 리모델링',
        period: '2024년 1월',
        amount: 800000000,
        status: 'rejected',
        type: 'progress',
        description: '2차 기성금 청구',
        requestDate: '2024-01-10',
        approvalDate: null,
        progress: 45
      }
    ];
    setSettlements(sampleSettlements);
    setFilteredSettlements(sampleSettlements);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'rejected': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'pending': return <Warning />;
      case 'rejected': return <Error />;
      default: return <Info />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return '승인완료';
      case 'pending': return '승인대기';
      case 'rejected': return '승인거부';
      default: return '알 수 없음';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'progress': return '기성금';
      case 'final': return '최종정산';
      case 'additional': return '추가정산';
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

  const handleAddSettlement = () => {
    setNewSettlement({
      siteName: '',
      period: '',
      amount: '',
      status: 'pending',
      type: 'progress',
      description: ''
    });
    setAddDialogOpen(true);
  };

  const handleSaveSettlement = () => {
    const settlement = {
      ...newSettlement,
      id: Date.now(),
      amount: parseInt(newSettlement.amount),
      requestDate: new Date().toISOString().split('T')[0],
      approvalDate: null,
      progress: 0
    };
    setSettlements([...settlements, settlement]);
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

  // 정산 상태별 통계
  const getSettlementStats = () => {
    const approved = settlements.filter(s => s.status === 'approved').length;
    const pending = settlements.filter(s => s.status === 'pending').length;
    const rejected = settlements.filter(s => s.status === 'rejected').length;
    const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
    return { approved, pending, rejected, totalAmount };
  };

  const settlementStats = getSettlementStats();

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
          bgcolor: '#4caf50',
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
            정산관리
          </Typography>
          <IconButton color="inherit">
            <Receipt />
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
        <Box sx={{ p: 2, bgcolor: '#4caf50', color: 'white' }}>
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
        }}>
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontSize: '1.1rem',
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
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#66bb6a' }}>
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
        {/* 정산 통계 카드 */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Paper sx={{  p: 2, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                {settlementStats.approved}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                승인완료
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper sx={{  p: 2, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                {settlementStats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                승인대기
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 총 정산금액 카드 */}
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#e8f5e8' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                총 정산금액
              </Typography>
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(settlementStats.totalAmount)}
              </Typography>
            </Box>
            <AccountBalance sx={{ fontSize: 40, color: '#4caf50' }} />
          </Box>
        </Paper>

        {/* 검색 및 필터 */}
        <Paper sx={{  p: 2, mb: 2, borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
          <TextField
            fullWidth
            placeholder="현장명, 기간, 설명으로 검색..."
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
          </Tabs>
        </Paper>

        {/* 정산 목록 */}
        <Grid container spacing={2}>
          {filteredSettlements.map((settlement) => (
            <Grid item xs={12} key={settlement.id}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {settlement.siteName}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(settlement.status)}
                      label={getStatusText(settlement.status)}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(settlement.status),
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
                    <CalendarToday sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {settlement.period}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Receipt sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {getTypeText(settlement.type)}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {settlement.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(settlement.amount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {settlement.progress}% 완료
                    </Typography>
                  </Box>
                  
                  {/* 진행률 바 */}
                  <Box sx={{ mb: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={settlement.progress}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getStatusColor(settlement.status)
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      요청일: {settlement.requestDate}
                    </Typography>
                    {settlement.approvalDate && (
                      <Typography variant="caption" color="text.secondary">
                        승인일: {settlement.approvalDate}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                
                <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
                  <Button size="small" startIcon={<Edit />}>
                    수정
                  </Button>
                  <Button size="small" startIcon={<Download />}>
                    다운로드
                  </Button>
                  <Button size="small" startIcon={<Print />}>
                    인쇄
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
          bgcolor: '#4caf50',
          '&:hover': {
            bgcolor: '#388e3c'
          }
        }}
        
        onClick={handleAddSettlement}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAddSettlement();
        }}>
        <Add />
      </Fab>

      {/* 정산 추가 다이얼로그 */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>새 정산 청구</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="현장명"
            fullWidth
            variant="outlined"
            value={newSettlement.siteName}
            onChange={(e) => setNewSettlement({...newSettlement, siteName: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="기간"
            fullWidth
            variant="outlined"
            value={newSettlement.period}
            onChange={(e) => setNewSettlement({...newSettlement, period: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="금액"
            fullWidth
            variant="outlined"
            type="number"
            value={newSettlement.amount}
            onChange={(e) => setNewSettlement({...newSettlement, amount: e.target.value})}
            InputProps={{
              endAdornment: <InputAdornment position="end">원</InputAdornment>
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="설명"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newSettlement.description}
            onChange={(e) => setNewSettlement({...newSettlement, description: e.target.value})}
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
        
        onClick={handleSaveSettlement}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSaveSettlement;
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

export default MobileSettlement;
