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
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Menu as MenuIcon,
  Add,
  Edit,
  Delete,
  Security,
  Warning,
  CheckCircle,
  Error,
  Info,
  Business,
  Person,
  CalendarToday,
  Assignment,
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
  Report,
  Construction,
  LocalHospital,
  Speed,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MobileSafety = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // 상태 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [safetyData, setSafetyData] = useState({
    incidents: [],
    inspections: [],
    trainings: [],
    reports: []
  });
  const [selectedTab, setSelectedTab] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'low',
    date: '',
    location: '',
    reporter: ''
  });

  // 사이드바 메뉴 아이템들
  const menuItems = [
    { text: '홈', icon: <Home />, path: '/' },
    { text: '현장관리', icon: <Business />, path: '/sites' },
    { text: '일정관리', icon: <CalendarToday />, path: '/schedule' },
    { text: '안전관리', icon: <Security />, path: '/safety', active: true },
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

  // 샘플 데이터
  useEffect(() => {
    const sampleData = {
      incidents: [
        {
          id: 1,
          title: '안전모 미착용 사고',
          description: '작업자가 안전모를 착용하지 않고 작업 중 부상',
          severity: 'high',
          date: '2024-01-15',
          location: '강남 아파트 신축공사',
          reporter: '김안전',
          status: 'investigating'
        },
        {
          id: 2,
          title: '장비 점검 누락',
          description: '크레인 정기점검을 실시하지 않음',
          severity: 'medium',
          date: '2024-01-10',
          location: '부산 항만시설 공사',
          reporter: '이안전',
          status: 'resolved'
        }
      ],
      inspections: [
        {
          id: 1,
          title: '월간 안전점검',
          date: '2024-01-20',
          location: '강남 아파트 신축공사',
          inspector: '김안전',
          score: 85,
          issues: 3
        },
        {
          id: 2,
          title: '장비 안전점검',
          date: '2024-01-18',
          location: '부산 항만시설 공사',
          inspector: '이안전',
          score: 92,
          issues: 1
        }
      ],
      trainings: [
        {
          id: 1,
          title: '안전교육 - 개인보호구',
          date: '2024-01-25',
          participants: 25,
          instructor: '박교육',
          status: 'scheduled'
        },
        {
          id: 2,
          title: '응급처치 교육',
          date: '2024-01-22',
          participants: 30,
          instructor: '최교육',
          status: 'completed'
        }
      ],
      reports: [
        {
          id: 1,
          title: '월간 안전보고서',
          period: '2024년 1월',
          incidents: 2,
          inspections: 5,
          trainings: 3,
          status: 'draft'
        }
      ]
    };
    setSafetyData(sampleData);
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <Error />;
      case 'medium': return <Warning />;
      case 'low': return <Info />;
      default: return <Info />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'investigating': return '#ff9800';
      case 'resolved': return '#4caf50';
      case 'scheduled': return '#2196f3';
      case 'completed': return '#4caf50';
      case 'draft': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#4caf50';
    if (score >= 70) return '#ff9800';
    return '#f44336';
  };

  const handleAddIncident = () => {
    setNewIncident({
      title: '',
      description: '',
      severity: 'low',
      date: '',
      location: '',
      reporter: ''
    });
    setAddDialogOpen(true);
  };

  const handleSaveIncident = () => {
    const incident = {
      ...newIncident,
      id: Date.now(),
      status: 'investigating'
    };
    setSafetyData({
      ...safetyData,
      incidents: [...safetyData.incidents, incident]
    });
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
          bgcolor: '#f44336',
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
            안전관리
          </Typography>
          <IconButton color="inherit">
            <Report />
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
        <Box sx={{ p: 2, bgcolor: '#f44336', color: 'white' }}>
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
                  bgcolor: item.active ? 'rgba(255, 87, 34, 0.2)' : 'transparent',
                  touchAction: 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}>
                <ListItemIcon sx={{ color: item.active ? '#ff5722' : 'white', minWidth: 40 }}>
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
        {/* 안전 지표 카드 */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Paper sx={{  p: 2, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h4" color="error" sx={{ fontWeight: 'bold' }}>
                {safetyData.incidents.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                안전사고
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper sx={{  p: 2, textAlign: 'center', borderRadius: 2 , bgcolor: '#1e1e1e', color: 'white' }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                {safetyData.inspections.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                안전점검
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 탭 네비게이션 */}
        <Paper sx={{  borderRadius: 2, overflow: 'hidden' , bgcolor: '#1e1e1e', color: 'white' }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ bgcolor: '#1e1e1e' }}
          >
            <Tab label="사고/사건" />
            <Tab label="안전점검" />
            <Tab label="안전교육" />
            <Tab label="보고서" />
          </Tabs>
        </Paper>

        {/* 탭 컨텐츠 */}
        <Box sx={{ mt: 2 }}>
          {/* 사고/사건 탭 */}
          {selectedTab === 0 && (
            <Grid container spacing={2}>
              {safetyData.incidents.map((incident) => (
                <Grid item xs={12} key={incident.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                          {incident.title}
                        </Typography>
                        <Chip
                          icon={getSeverityIcon(incident.severity)}
                          label={incident.severity === 'high' ? '심각' : incident.severity === 'medium' ? '보통' : '경미'}
                          size="small"
                          sx={{
                            bgcolor: getSeverityColor(incident.severity),
                            color: 'white',
                            fontSize: '0.7rem',
                            whiteSpace: 'nowrap',
                            '& .MuiChip-label': {
                              whiteSpace: 'nowrap'
                            }
                          }}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {incident.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Business sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          {incident.location}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            {incident.reporter}
                          </Typography>
                        </Box>
                        <Chip
                          label={incident.status === 'investigating' ? '조사중' : '해결완료'}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(incident.status),
                            color: 'white',
                            fontSize: '0.7rem',
                            whiteSpace: 'nowrap',
                            '& .MuiChip-label': {
                              whiteSpace: 'nowrap'
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* 안전점검 탭 */}
          {selectedTab === 1 && (
            <Grid container spacing={2}>
              {safetyData.inspections.map((inspection) => (
                <Grid item xs={12} key={inspection.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem', mb: 1 }}>
                        {inspection.title}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Business sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          {inspection.location}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          {inspection.inspector}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          점검점수: {inspection.score}점
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          발견사항: {inspection.issues}건
                        </Typography>
                      </Box>
                      
                      <LinearProgress
                        variant="determinate"
                        value={inspection.score}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: getScoreColor(inspection.score)
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* 안전교육 탭 */}
          {selectedTab === 2 && (
            <Grid container spacing={2}>
              {safetyData.trainings.map((training) => (
                <Grid item xs={12} key={training.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem', mb: 1 }}>
                        {training.title}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ fontSize: '1rem', mr: 0.5, color: '#ccc' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          강사: {training.instructor}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          참가자: {training.participants}명
                        </Typography>
                        <Chip
                          label={training.status === 'scheduled' ? '예정' : '완료'}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(training.status),
                            color: 'white',
                            fontSize: '0.7rem',
                            whiteSpace: 'nowrap',
                            '& .MuiChip-label': {
                              whiteSpace: 'nowrap'
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* 보고서 탭 */}
          {selectedTab === 3 && (
            <Grid container spacing={2}>
              {safetyData.reports.map((report) => (
                <Grid item xs={12} key={report.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem', mb: 1 }}>
                        {report.title}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {report.period}
                      </Typography>
                      
                      <Grid container spacing={1} sx={{ mb: 1 }}>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="error">
                              {report.incidents}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              사고/사건
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="primary">
                              {report.inspections}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              안전점검
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="success.main">
                              {report.trainings}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              안전교육
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Chip
                          label={report.status === 'draft' ? '초안' : '완료'}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(report.status),
                            color: 'white',
                            fontSize: '0.7rem',
                            whiteSpace: 'nowrap',
                            '& .MuiChip-label': {
                              whiteSpace: 'nowrap'
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      {/* 플로팅 액션 버튼 */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#f44336',
          '&:hover': {
            bgcolor: '#d32f2f'
          }
        }}
        
        onClick={handleAddIncident}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAddIncident();
        }}>
        <Add />
      </Fab>

      {/* 사고/사건 추가 다이얼로그 */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>새 사고/사건 등록</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="제목"
            fullWidth
            variant="outlined"
            value={newIncident.title}
            onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="설명"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newIncident.description}
            onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="현장"
            fullWidth
            variant="outlined"
            value={newIncident.location}
            onChange={(e) => setNewIncident({...newIncident, location: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="신고자"
            fullWidth
            variant="outlined"
            value={newIncident.reporter}
            onChange={(e) => setNewIncident({...newIncident, reporter: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="발생일"
            type="date"
            fullWidth
            variant="outlined"
            value={newIncident.date}
            onChange={(e) => setNewIncident({...newIncident, date: e.target.value})}
            InputLabelProps={{ shrink: true }}
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
        
        onClick={handleSaveIncident}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSaveIncident;
        }}
         variant="contained"
        sx={{ ...sx, touchAction: 'none' }}>저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileSafety;
