import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Button, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Chip, FormControl, InputLabel, Select, MenuItem, Switch,
  FormControlLabel, Alert, Snackbar, Tooltip, Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const ROLES = {
  ADMIN: { label: '관리자', color: 'error', icon: AdminIcon },
  MANAGER: { label: '매니저', color: 'warning', icon: SecurityIcon },
  USER: { label: '일반사용자', color: 'info', icon: PersonIcon }
};

const PERMISSIONS = {
  SITE_MANAGEMENT: '현장 관리',
  USER_MANAGEMENT: '사용자 관리',
  COST_MANAGEMENT: '원가 관리',
  SAFETY_MANAGEMENT: '안전 관리',
  REPORT_VIEW: '보고서 조회',
  REPORT_EDIT: '보고서 작성',
  SETTINGS_ACCESS: '설정 접근'
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'USER',
    permissions: [],
    isActive: true,
    department: '',
    position: ''
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(usersQuery);
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '사용자 목록을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleOpen = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        isActive: user.isActive,
        department: user.department || '',
        position: user.position || ''
      });
    } else {
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'USER',
        permissions: [],
        isActive: true,
        department: '',
        position: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedUser) {
        await updateDoc(doc(db, 'users', selectedUser.id), formData);
        setSnackbar({
          open: true,
          message: '사용자 정보가 수정되었습니다.',
          severity: 'success'
        });
      } else {
        await addDoc(collection(db, 'users'), {
          ...formData,
          createdAt: new Date()
        });
        setSnackbar({
          open: true,
          message: '새 사용자가 추가되었습니다.',
          severity: 'success'
        });
      }
      handleClose();
      fetchUsers();
    } catch (error) {
      console.error('사용자 저장 실패:', error);
      setSnackbar({
        open: true,
        message: '사용자 정보 저장에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setSnackbar({
          open: true,
          message: '사용자가 삭제되었습니다.',
          severity: 'success'
        });
        fetchUsers();
      } catch (error) {
        console.error('사용자 삭제 실패:', error);
        setSnackbar({
          open: true,
          message: '사용자 삭제에 실패했습니다.',
          severity: 'error'
        });
      }
    }
  };

  const handlePermissionChange = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">회원/권한 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          새 사용자 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>사용자</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>부서/직책</TableCell>
              <TableCell>역할</TableCell>
              <TableCell>권한</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={user.avatar}>{user.name?.[0]}</Avatar>
                    <Typography>{user.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Typography variant="body2">{user.department}</Typography>
                  <Typography variant="caption" color="textSecondary">{user.position}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={ROLES[user.role].label}
                    color={ROLES[user.role].color}
                    size="small"
                    icon={ROLES[user.role].icon}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {user.permissions?.map((permission) => (
                      <Chip
                        key={permission}
                        label={PERMISSIONS[permission]}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? '활성' : '비활성'}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="수정">
                    <IconButton size="small" onClick={() => handleOpen(user)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="삭제">
                    <IconButton size="small" onClick={() => handleDelete(user.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUser ? '사용자 정보 수정' : '새 사용자 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="이름"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="이메일"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="부서"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="직책"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>역할</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="역할"
                >
                  {Object.entries(ROLES).map(([key, { label }]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="활성 상태"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>권한 설정</Typography>
              <Grid container spacing={1}>
                {Object.entries(PERMISSIONS).map(([key, label]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.permissions.includes(key)}
                          onChange={() => handlePermissionChange(key)}
                        />
                      }
                      label={label}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedUser ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Users; 