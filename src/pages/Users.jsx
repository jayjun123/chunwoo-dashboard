import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Button, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Chip, FormControl, InputLabel, Select, MenuItem, Switch,
  FormControlLabel, Alert, Snackbar, Tooltip, Avatar,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
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
  master: { label: '마스터', color: 'error', icon: AdminIcon },
  admin: { label: '관리자', color: 'warning', icon: AdminIcon },
  user: { label: '일반회원', color: 'info', icon: PersonIcon },
  '대마팀': { label: '대마팀', color: 'success', icon: SecurityIcon },
  '보류': { label: '보류', color: 'default', icon: PersonIcon }
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
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    permissions: [],
    isActive: true,
    department: '',
    position: ''
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 현재 로그인한 사용자 정보 (실제로는 AuthContext에서 가져와야 함)
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    name: '김철수',
    email: 'kim@example.com',
    role: 'admin',
    team: '관리팀'
  });

  const inputRef1 = useRef();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // members 컬렉션에서 사용자 데이터 조회
      const usersQuery = query(collection(db, 'members'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // 기본값 설정
        role: doc.data().role || 'user',
        permissions: doc.data().permissions || [],
        isActive: doc.data().isActive !== false, // 기본값 true
        department: doc.data().department || '',
        position: doc.data().position || ''
      }));
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '사용자 목록을 불러오는데 실패했습니다.',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // 역할 변경 권한 확인
  const canChangeRole = (user) => {
    if (currentUser.role === 'master') return true;
    if (currentUser.role === 'admin') return user.role !== 'master';
    return false; // 일반회원과 대마팀은 역할 변경 불가
  };

  const handleRoleClick = (user) => {
    if (!canChangeRole(user)) {
      setSnackbar({
        open: true,
        message: '역할을 변경할 권한이 없습니다.',
        severity: 'warning'
      });
      return;
    }
    setEditingRoleId(user.id);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      // 역할에 따라 grade 기본값 설정 (직책은 별도로 설정 가능)
      let newGrade = '사원';
      if (newRole === 'master') {
        newGrade = '마스터';
      } else if (newRole === 'admin') {
        newGrade = '관리자';
      } else if (newRole === 'team') {
        newGrade = '팀원'; // 기본값, 필요시 팀장, 대리 등으로 수정 가능
      } else if (newRole === 'user') {
        newGrade = '사원';
      } else if (newRole === 'pending') {
        newGrade = '보류';
      }

      await updateDoc(doc(db, 'members', userId), { 
        role: newRole,
        grade: newGrade 
      });
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole, grade: newGrade } : user
      ));
      setEditingRoleId(null);
      setSnackbar({
        open: true,
        message: '역할이 변경되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('역할 변경 실패:', error);
      setSnackbar({
        open: true,
        message: '역할 변경에 실패했습니다.',
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
        role: 'user',
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
        await updateDoc(doc(db, 'members', selectedUser.id), formData);
        setSnackbar({
          open: true,
          message: '사용자 정보가 수정되었습니다.',
          severity: 'success'
        });
      } else {
        await addDoc(collection(db, 'members'), {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
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
        await deleteDoc(doc(db, 'members', userId));
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

  const scrollFocus = (ref) => () => {
    setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>사용자 목록을 불러오는 중...</Typography>
      </Box>
    );
  }

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
          pt: 2,
          pb: 3,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%'
        }}
      >
        <Box sx={{ 
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          bgcolor: 'background.paper'
        }}>
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

      {users.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            등록된 사용자가 없습니다
          </Typography>
          <Typography variant="body2" color="textSecondary">
            새 사용자를 추가해보세요
          </Typography>
        </Paper>
      ) : (
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
                      <Avatar src={user.avatar}>{user.name?.[0] || 'U'}</Avatar>
                      <Typography>{user.name || '이름 없음'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email || '이메일 없음'}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.department || '-'}</Typography>
                    <Typography variant="caption" color="textSecondary">{user.position || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    {editingRoleId === user.id ? (
                      <Select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        onBlur={() => setEditingRoleId(null)}
                        autoFocus
                        size="small"
                        sx={{ minWidth: 120 }}
                      >
                        {Object.entries(ROLES).map(([key, { label }]) => (
                          <MenuItem key={key} value={key}>{label}</MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <Chip
                        label={ROLES[user.role]?.label || '일반회원'}
                        color={ROLES[user.role]?.color || 'info'}
                        size="small"
                        icon={ROLES[user.role]?.icon || PersonIcon}
                        onClick={() => handleRoleClick(user)}
                        sx={{ 
                          cursor: canChangeRole(user) ? 'pointer' : 'default',
                          '&:hover': canChangeRole(user) ? {
                            transform: 'scale(1.05)',
                            boxShadow: 1
                          } : {}
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {user.permissions?.length > 0 ? (
                        user.permissions.map((permission) => (
                          <Chip
                            key={permission}
                            label={PERMISSIONS[permission] || permission}
                            size="small"
                            variant="outlined"
                          />
                        ))
                      ) : (
                        <Typography variant="caption" color="textSecondary">권한 없음</Typography>
                      )}
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
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUser ? '사용자 정보 수정' : '새 사용자 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12} sm={6}>
              <TextField
                label="이름"
                value={formData.name ?? ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                inputRef={inputRef1}
                onFocus={scrollFocus(inputRef1)}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="이메일"
                type="email"
                value={formData.email ?? ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
                inputRef={inputRef1}
                onFocus={scrollFocus(inputRef1)}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="부서"
                value={formData.department ?? ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                fullWidth
                inputRef={inputRef1}
                onFocus={scrollFocus(inputRef1)}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="직책"
                value={formData.position ?? ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                fullWidth
                inputRef={inputRef1}
                onFocus={scrollFocus(inputRef1)}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>역할</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="역할"
                  inputRef={inputRef1}
                  onFocus={scrollFocus(inputRef1)}
                >
                  {Object.entries(ROLES).map(([key, { label }]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="활성 상태"
                inputRef={inputRef1}
                onFocus={scrollFocus(inputRef1)}
              />
            </Grid>
            <Grid xs={12}>
              <Typography variant="subtitle1" gutterBottom>권한 설정</Typography>
              <Grid container spacing={1}>
                {Object.entries(PERMISSIONS).map(([key, label]) => (
                  <Grid key={key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.permissions.includes(key)}
                          onChange={() => handlePermissionChange(key)}
                        />
                      }
                      label={label}
                      inputRef={inputRef1}
                      onFocus={scrollFocus(inputRef1)}
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
      </Container>
    </Box>
  );
};

export default Users; 