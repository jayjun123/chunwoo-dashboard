import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Block as BlockIcon,
  CheckCircle as ApproveIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as StatsIcon
} from '@mui/icons-material';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, addDoc, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const AdvancedUserManagement = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // 권한 레벨 정의
  const permissionLevels = [
    { value: 'master', label: '마스터', color: 'error', description: '모든 권한' },
    { value: 'admin', label: '관리자', color: 'warning', description: '사용자 관리 권한' },
    { value: 'team', label: '팀장', color: 'info', description: '팀 관리 권한' },
    { value: 'user', label: '일반회원', color: 'default', description: '기본 권한' },
    { value: 'pending', label: '보류', color: 'secondary', description: '승인 대기' }
  ];

  // 사용자 상태
  const userStatuses = [
    { value: 'active', label: '활성', color: 'success' },
    { value: 'inactive', label: '비활성', color: 'default' },
    { value: 'blocked', label: '차단', color: 'error' }
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  // 사용자 목록 로드
  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('사용자 로드 실패:', error);
      setSnackbar({ open: true, message: '사용자 목록 로드 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 사용자 추가
  const handleAddUser = async (userData) => {
    try {
      const newUser = {
        ...userData,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        status: 'active',
        lastLoginAt: null,
        loginCount: 0
      };

      await addDoc(collection(db, 'users'), newUser);
      await loadUsers();
      setShowAddDialog(false);
      setSnackbar({ open: true, message: '사용자가 추가되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('사용자 추가 실패:', error);
      setSnackbar({ open: true, message: '사용자 추가 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 사용자 수정
  const handleEditUser = async (userData) => {
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        ...userData,
        updatedAt: new Date(),
        updatedBy: currentUser.uid
      });
      
      await loadUsers();
      setShowEditDialog(false);
      setSelectedUser(null);
      setSnackbar({ open: true, message: '사용자 정보가 수정되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('사용자 수정 실패:', error);
      setSnackbar({ open: true, message: '사용자 수정 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (userId) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      await loadUsers();
      setSnackbar({ open: true, message: '사용자가 삭제되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      setSnackbar({ open: true, message: '사용자 삭제 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 사용자 상태 변경
  const handleStatusChange = async (userId, newStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: currentUser.uid
      });
      
      await loadUsers();
      setSnackbar({ open: true, message: '사용자 상태가 변경되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('상태 변경 실패:', error);
      setSnackbar({ open: true, message: '상태 변경 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 사용자 통계
  const getUserStats = () => {
    const stats = {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      inactive: users.filter(u => u.status === 'inactive').length,
      blocked: users.filter(u => u.status === 'blocked').length,
      byRole: {
        master: users.filter(u => u.role === 'master').length,
        admin: users.filter(u => u.role === 'admin').length,
        team: users.filter(u => u.role === 'team').length,
        user: users.filter(u => u.role === 'user').length,
        pending: users.filter(u => u.role === 'pending').length
      }
    };
    return stats;
  };

  // 사용자 추가 다이얼로그
  const AddUserDialog = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      role: 'user',
      department: '',
      position: '',
      permissions: {
        canViewSites: true,
        canEditSites: false,
        canManageUsers: false,
        canViewReports: true,
        canEditReports: false
      }
    });

    const handleSave = () => {
      if (!formData.name || !formData.email) {
        setSnackbar({ open: true, message: '필수 정보를 입력해주세요.', severity: 'warning' });
        return;
      }
      handleAddUser(formData);
    };

    return (
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 사용자 추가</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="이름"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="전화번호"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>권한</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="권한"
                >
                  {permissionLevels.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="부서"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="직책"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </Grid>
            
            {/* 권한 설정 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>권한 설정</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.permissions.canViewSites}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, canViewSites: e.target.checked }
                        })}
                      />
                    }
                    label="현장 조회"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.permissions.canEditSites}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, canEditSites: e.target.checked }
                        })}
                      />
                    }
                    label="현장 수정"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.permissions.canManageUsers}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, canManageUsers: e.target.checked }
                        })}
                      />
                    }
                    label="사용자 관리"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.permissions.canViewReports}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, canViewReports: e.target.checked }
                        })}
                      />
                    }
                    label="보고서 조회"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // 사용자 통계 카드
  const UserStatsCard = () => {
    const stats = getUserStats();
    
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>전체 사용자</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>활성 사용자</Typography>
              <Typography variant="h4" color="success.main">{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>관리자</Typography>
              <Typography variant="h4" color="warning.main">{stats.byRole.admin + stats.byRole.master}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>승인 대기</Typography>
              <Typography variant="h4" color="info.main">{stats.byRole.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">사용자 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowAddDialog(true)}
        >
          새 사용자 추가
        </Button>
      </Box>

      {/* 사용자 통계 */}
      <UserStatsCard />

      {/* 탭 메뉴 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="전체 사용자" />
          <Tab label="활성 사용자" />
          <Tab label="승인 대기" />
          <Tab label="차단된 사용자" />
        </Tabs>
      </Paper>

      {/* 사용자 목록 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>사용자</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>권한</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>마지막 로그인</TableCell>
              <TableCell>가입일</TableCell>
              <TableCell>액션</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users
              .filter(user => {
                switch (activeTab) {
                  case 1: return user.status === 'active';
                  case 2: return user.role === 'pending';
                  case 3: return user.status === 'blocked';
                  default: return true;
                }
              })
              .map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{user.name?.[0] || 'U'}</Avatar>
                      <Box>
                        <Typography variant="body2">{user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.department} • {user.position}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={permissionLevels.find(p => p.value === user.role)?.label || user.role}
                      color={permissionLevels.find(p => p.value === user.role)?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={userStatuses.find(s => s.value === user.status)?.label || user.status}
                      color={userStatuses.find(s => s.value === user.status)?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt ? new Date(user.lastLoginAt.toDate()).toLocaleDateString() : '로그인 없음'}
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="상세보기">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowViewDialog(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditDialog(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {user.status === 'active' ? (
                        <Tooltip title="차단">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleStatusChange(user.id, 'blocked')}
                          >
                            <BlockIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="활성화">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleStatusChange(user.id, 'active')}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="삭제">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 다이얼로그들 */}
      <AddUserDialog />

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdvancedUserManagement; 