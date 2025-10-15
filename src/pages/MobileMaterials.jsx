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
  Alert
} from '@mui/material';
import {
  Menu as MenuIcon,
  Add,
  Edit,
  Delete,
  Assignment,
  Inventory,
  LocalShipping,
  Warning,
  CheckCircle,
  Error,
  Info,
  Business,
  Person,
  CalendarToday,
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
  AttachMoney,
  Scale,
  Category,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MobileMaterials = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // 상태 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    price: '',
    supplier: '',
    location: '',
    status: 'available'
  });

  // 사이드바 메뉴 아이템들
  const menuItems = [
    { text: '홈', icon: <Home />, path: '/' },
    { text: '현장관리', icon: <Business />, path: '/sites' },
    { text: '일정관리', icon: <CalendarToday />, path: '/schedule' },
    { text: '안전관리', icon: <Security />, path: '/safety' },
    { text: '자재관리', icon: <Assignment />, path: '/materials', active: true },
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
    const filtered = materials.filter(material =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMaterials(filtered);
  }, [materials, searchTerm]);

  // 샘플 데이터
  useEffect(() => {
    const sampleMaterials = [
      {
        id: 1,
        name: '시멘트',
        category: '건설재료',
        quantity: 100,
        unit: '포',
        price: 15000,
        supplier: '한국시멘트',
        location: '강남 아파트 신축공사',
        status: 'available',
        minStock: 20,
        lastUpdated: '2024-01-20'
      },
      {
        id: 2,
        name: '철근',
        category: '철강재료',
        quantity: 50,
        unit: '톤',
        price: 800000,
        supplier: '포스코',
        location: '부산 항만시설 공사',
        status: 'low_stock',
        minStock: 30,
        lastUpdated: '2024-01-18'
      },
      {
        id: 3,
        name: '콘크리트',
        category: '건설재료',
        quantity: 200,
        unit: '㎥',
        price: 120000,
        supplier: '현대콘크리트',
        location: '대구 상업시설 리모델링',
        status: 'available',
        minStock: 50,
        lastUpdated: '2024-01-15'
      },
      {
        id: 4,
        name: '타일',
        category: '마감재료',
        quantity: 5,
        unit: '박스',
        price: 50000,
        supplier: '대림산업',
        location: '강남 아파트 신축공사',
        status: 'out_of_stock',
        minStock: 10,
        lastUpdated: '2024-01-10'
      }
    ];
    setMaterials(sampleMaterials);
    setFilteredMaterials(sampleMaterials);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#4caf50';
      case 'low_stock': return '#ff9800';
      case 'out_of_stock': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle />;
      case 'low_stock': return <Warning />;
      case 'out_of_stock': return <Error />;
      default: return <Info />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return '충분';
      case 'low_stock': return '부족';
      case 'out_of_stock': return '품절';
      default: return '알 수 없음';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleAddMaterial = () => {
    setNewMaterial({
      name: '',
      category: '',
      quantity: '',
      unit: '',
      price: '',
      supplier: '',
      location: '',
      status: 'available'
    });
    setAddDialogOpen(true);
  };

  const handleSaveMaterial = () => {
    const material = {
      ...newMaterial,
      id: Date.now(),
      quantity: parseInt(newMaterial.quantity),
      price: parseInt(newMaterial.price),
      minStock: 10,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setMaterials([...materials, material]);
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

  // 재고 상태별 통계
  const getStockStats = () => {
    const available = materials.filter(m => m.status === 'available').length;
    const lowStock = materials.filter(m => m.status === 'low_stock').length;
    const outOfStock = materials.filter(m => m.status === 'out_of_stock').length;
    return { available, lowStock, outOfStock };
  };

  const stockStats = getStockStats();

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
          bgcolor: '#ff9800',
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
            자재관리
          </Typography>
          <IconButton color="inherit">
            <Inventory />
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
        <Box sx={{ p: 2, bgcolor: '#ff9800', color: 'white' }}>
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
                  bgcolor: item.active ? 'rgba(255, 152, 0, 0.2)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
        }}>
                <ListItemIcon sx={{ color: item.active ? '#ffb74d' : 'white', minWidth: 40 }}>
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
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#1e1e1e' }}>
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
        {/* 재고 상태 카드 */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <Paper sx={{  p: 2, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                {stockStats.available}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                충분
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{  p: 2, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                {stockStats.lowStock}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                부족
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{  p: 2, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h4" color="error" sx={{ fontWeight: 'bold' }}>
                {stockStats.outOfStock}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                품절
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 검색 및 필터 */}
        <Paper sx={{  p: 2, mb: 2, borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
          <TextField
            fullWidth
            placeholder="자재명, 카테고리, 공급업체로 검색..."
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
            <Tab label="충분" />
            <Tab label="부족" />
            <Tab label="품절" />
          </Tabs>
        </Paper>

        {/* 자재 목록 */}
        <Grid container spacing={2}>
          {filteredMaterials.map((material) => (
            <Grid item xs={12} key={material.id}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {material.name}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(material.status)}
                      label={getStatusText(material.status)}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(material.status),
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
                    <Category sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {material.category}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Business sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {material.location}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocalShipping sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {material.supplier}
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={1} sx={{ mb: 1 }}>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Scale sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          {material.quantity} {material.unit}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AttachMoney sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          {formatCurrency(material.price)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* 재고 경고 */}
                  {material.status === 'low_stock' && (
                    <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.8rem' }}>
                      최소 재고량({material.minStock} {material.unit}) 이하
                    </Alert>
                  )}
                  {material.status === 'out_of_stock' && (
                    <Alert severity="error" sx={{ py: 0.5, fontSize: '0.8rem' }}>
                      재고 부족 - 즉시 발주 필요
                    </Alert>
                  )}
                </CardContent>
                
                <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
                  <Button size="small" startIcon={<Edit />}>
                    수정
                  </Button>
                  <Button size="small" startIcon={<LocalShipping />}>
                    발주
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
          bgcolor: '#ff9800',
          '&:hover': {
            bgcolor: '#f57c00'
          }
        }}
        
        onClick={handleAddMaterial}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAddMaterial();
        }}>
        <Add />
      </Fab>

      {/* 자재 추가 다이얼로그 */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>새 자재 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="자재명"
            fullWidth
            variant="outlined"
            value={newMaterial.name}
            onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="카테고리"
            fullWidth
            variant="outlined"
            value={newMaterial.category}
            onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="수량"
                fullWidth
                variant="outlined"
                type="number"
                value={newMaterial.quantity}
                onChange={(e) => setNewMaterial({...newMaterial, quantity: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="단위"
                fullWidth
                variant="outlined"
                value={newMaterial.unit}
                onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
              />
            </Grid>
          </Grid>
          <TextField
            margin="dense"
            label="단가"
            fullWidth
            variant="outlined"
            type="number"
            value={newMaterial.price}
            onChange={(e) => setNewMaterial({...newMaterial, price: e.target.value})}
            InputProps={{
              endAdornment: <InputAdornment position="end">원</InputAdornment>
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="공급업체"
            fullWidth
            variant="outlined"
            value={newMaterial.supplier}
            onChange={(e) => setNewMaterial({...newMaterial, supplier: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="보관위치"
            fullWidth
            variant="outlined"
            value={newMaterial.location}
            onChange={(e) => setNewMaterial({...newMaterial, location: e.target.value})}
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
        
        onClick={handleSaveMaterial}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSaveMaterial;
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

export default MobileMaterials;
