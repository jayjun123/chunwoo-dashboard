import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Engineering as EngineeringIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const ConstructionTeam = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 상태 관리
  const [teams, setTeams] = useState([]);
  const [sites, setSites] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    teamName: '',
    managerName: '',
    memberCount: '',
    phone: '',
    email: '',
    currentSites: [],
    otherCompanySites: '',
    ownSites: '',
    notes: '',
    status: 'active'
  });

  // 데이터 로드
  useEffect(() => {
    loadTeams();
    loadSites();
  }, []);

  const loadTeams = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'constructionTeams'));
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsData);
    } catch (error) {
      console.error('시공팀 데이터 로드 오류:', error);
    }
  };

  const loadSites = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'sites'));
      const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(sitesData);
    } catch (error) {
      console.error('현장 데이터 로드 오류:', error);
    }
  };

  const handleOpenDialog = (team = null) => {
    setEditingTeam(team);
    if (team) {
      setFormData(team);
    } else {
      setFormData({
        teamName: '',
        managerName: '',
        memberCount: '',
        phone: '',
        email: '',
        currentSites: [],
        otherCompanySites: '',
        ownSites: '',
        notes: '',
        status: 'active'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTeam(null);
    setFormData({
      teamName: '',
      managerName: '',
      memberCount: '',
      phone: '',
      email: '',
      currentSites: [],
      otherCompanySites: '',
      ownSites: '',
      notes: '',
      status: 'active'
    });
  };

  const handleSave = async () => {
    try {
      if (editingTeam) {
        await updateDoc(doc(db, 'constructionTeams', editingTeam.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'constructionTeams'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }

      // 현장 데이터도 업데이트
      await updateSiteConstructionTeam(formData);

      setSnackbar({
        open: true,
        message: `${editingTeam ? '수정' : '추가'}되었습니다.`,
        severity: 'success'
      });
      handleCloseDialog();
      loadTeams();
    } catch (error) {
      console.error('저장 오류:', error);
      setSnackbar({
        open: true,
        message: '저장 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const updateSiteConstructionTeam = async (teamData) => {
    try {
      // 현재 진행 현장들을 찾아서 시공팀 정보 업데이트
      const sitesToUpdate = sites.filter(site => 
        teamData.currentSites.some(currentSite => 
          site.name === currentSite || site.id === currentSite
        )
      );

      for (const site of sitesToUpdate) {
        await updateDoc(doc(db, 'sites', site.id), {
          constructionTeam: teamData.teamName,
          constructionManager: teamData.managerName,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('현장 업데이트 오류:', error);
    }
  };

  const handleDelete = async (teamId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'constructionTeams', teamId));
        setSnackbar({
          open: true,
          message: '삭제되었습니다.',
          severity: 'success'
        });
        loadTeams();
      } catch (error) {
        console.error('삭제 오류:', error);
        setSnackbar({
          open: true,
          message: '삭제 중 오류가 발생했습니다.',
          severity: 'error'
        });
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'pending': return '대기';
      default: return '알 수 없음';
    }
  };

  const getCurrentSitesCount = (team) => {
    return team.currentSites ? team.currentSites.length : 0;
  };

  return (
    <Box sx={{ 
      p: isMobile ? 2 : 3, 
      pt: isMobile ? 10 : 11,
      bgcolor: '#0f1419', 
      minHeight: '100vh',
      color: '#fff'
    }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 'bold', 
          color: '#f59e42',
          mb: 1
        }}>
          시공팀 관리
        </Typography>
        <Typography variant="body1" sx={{ color: '#bbb' }}>
          시공팀 정보와 현장 배정을 관리하세요
        </Typography>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EngineeringIcon sx={{ color: '#f59e42', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {teams.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    총 시공팀
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ color: '#3b82f6', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {teams.reduce((sum, team) => sum + (Number(team.memberCount) || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    총 인원수
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkIcon sx={{ color: '#10b981', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {teams.reduce((sum, team) => sum + getCurrentSitesCount(team), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    진행 현장
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1d21', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ color: '#f59e42', mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {teams.filter(team => team.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    활성 팀
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 시공팀 목록 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#f59e42' }}>
          시공팀 목록 ({teams.length}개)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#f59e42', '&:hover': { bgcolor: '#d97706' } }}
        >
          시공팀 추가
        </Button>
      </Box>

      {/* 시공팀 카드 목록 */}
      <Grid container spacing={3}>
        {teams.map((team) => (
          <Grid item xs={12} md={6} key={team.id}>
            <Card sx={{ 
              bgcolor: '#1a1d21', 
              border: '1px solid #333',
              '&:hover': { borderColor: '#f59e42' }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                      {team.teamName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonIcon sx={{ color: '#3b82f6', mr: 1, fontSize: 16 }} />
                      <Typography variant="body2" sx={{ color: '#bbb' }}>
                        소장: {team.managerName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <GroupIcon sx={{ color: '#10b981', mr: 1, fontSize: 16 }} />
                      <Typography variant="body2" sx={{ color: '#bbb' }}>
                        인원: {team.memberCount}명
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Chip 
                      label={getStatusText(team.status)} 
                      color={getStatusColor(team.status)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(team)}
                        sx={{ color: '#3b82f6' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(team.id)}
                        sx={{ color: '#ef4444' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 2, bgcolor: '#333' }} />

                {/* 진행 현장 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#f59e42', mb: 1, fontWeight: 'bold' }}>
                    진행 현장 ({getCurrentSitesCount(team)}개)
                  </Typography>
                  {team.currentSites && team.currentSites.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {team.currentSites.map((site, index) => (
                        <Chip
                          key={index}
                          label={site}
                          size="small"
                          sx={{ bgcolor: '#374151', color: '#fff' }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                      진행 현장 없음
                    </Typography>
                  )}
                </Box>

                {/* 연락처 정보 */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <PhoneIcon sx={{ color: '#3b82f6', mr: 1, fontSize: 14 }} />
                    <Typography variant="body2" sx={{ color: '#bbb' }}>
                      {team.phone || '연락처 없음'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ color: '#3b82f6', mr: 1, fontSize: 14 }} />
                    <Typography variant="body2" sx={{ color: '#bbb' }}>
                      {team.email || '이메일 없음'}
                    </Typography>
                  </Box>
                </Box>

                {/* 기타 정보 */}
                {(team.otherCompanySites || team.ownSites || team.notes) && (
                  <Box sx={{ mt: 2 }}>
                    {team.otherCompanySites && (
                      <Typography variant="body2" sx={{ color: '#bbb', mb: 0.5 }}>
                        타업체 현장: {team.otherCompanySites}
                      </Typography>
                    )}
                    {team.ownSites && (
                      <Typography variant="body2" sx={{ color: '#bbb', mb: 0.5 }}>
                        자기 현장: {team.ownSites}
                      </Typography>
                    )}
                    {team.notes && (
                      <Typography variant="body2" sx={{ color: '#bbb', fontStyle: 'italic' }}>
                        기타: {team.notes}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          {editingTeam ? '시공팀 수정' : '시공팀 추가'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="시공팀명"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="소장님 이름"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="시공팀 인원"
                  type="number"
                  value={formData.memberCount}
                  onChange={(e) => setFormData({ ...formData, memberCount: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#bbb' }}>상태</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    sx={{ color: '#fff' }}
                  >
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="inactive">비활성</MenuItem>
                    <MenuItem value="pending">대기</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="연락처"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="이메일"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#bbb' }}>현재 진행 현장</InputLabel>
                  <Select
                    multiple
                    value={formData.currentSites}
                    onChange={(e) => setFormData({ ...formData, currentSites: e.target.value })}
                    sx={{ color: '#fff' }}
                  >
                    {sites.map((site) => (
                      <MenuItem key={site.id} value={site.name}>
                        {site.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="타업체 현장"
                  value={formData.otherCompanySites}
                  onChange={(e) => setFormData({ ...formData, otherCompanySites: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="자기 현장"
                  value={formData.ownSites}
                  onChange={(e) => setFormData({ ...formData, ownSites: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="기타사항"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff' } }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21' }}>
          <Button onClick={handleCloseDialog} sx={{ color: '#bbb' }}>
            취소
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#f59e42' }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConstructionTeam; 