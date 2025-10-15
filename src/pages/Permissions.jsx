import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Alert,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const menuList = [
  { key: 'sites', label: '현장관리' },
  { key: 'safety', label: '안전관리' },
  { key: 'schedule', label: '일정관리' },
  { key: 'cost', label: '원가관리' },
  { key: 'documents', label: '문서관리' },
  { key: 'daema-team', label: '시공팀' },
  { key: 'discussions', label: '토론/의견' },
  { key: 'vendors', label: '협력업체' },
  { key: 'progress', label: '예정' },
];
const permissionTypes = [
  { key: 'read', label: '읽기' },
  { key: 'edit', label: '수정' },
  { key: 'delete', label: '삭제' },
];

const Permissions = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [permissions, setPermissions] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    isActive: true,
    roles: [],
  });
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const [editedPermissions, setEditedPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // 임시 데이터
  useEffect(() => {
    setPermissions([
      {
        id: 1,
        name: '대시보드',
        description: '대시보드 접근 및 조회 권한',
        category: '기본',
        isActive: true,
        roles: ['관리자', '일반'],
      },
      {
        id: 2,
        name: '멤버관리',
        description: '멤버 추가, 수정, 삭제 권한',
        category: '관리',
        isActive: true,
        roles: ['관리자'],
      },
      {
        id: 3,
        name: '문서관리',
        description: '문서 업로드, 다운로드, 삭제 권한',
        category: '문서',
        isActive: true,
        roles: ['관리자', '일반'],
      },
      {
        id: 4,
        name: '보고서',
        description: '보고서 작성 및 조회 권한',
        category: '문서',
        isActive: true,
        roles: ['관리자', '일반'],
      },
      {
        id: 5,
        name: '비용관리',
        description: '비용 등록 및 조회 권한',
        category: '재무',
        isActive: true,
        roles: ['관리자'],
      },
      {
        id: 6,
        name: '공급업체관리',
        description: '공급업체 등록 및 관리 권한',
        category: '관리',
        isActive: true,
        roles: ['관리자'],
      },
    ]);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const membersRef = collection(db, 'members');
      const snapshot = await getDocs(membersRef);
      const membersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMembers(membersList);
      setEditedPermissions({});
    } catch (error) {
      console.error('회원 목록 조회 실패:', error);
      setError('회원 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleOpen = (permission = null) => {
    if (permission) {
      setSelectedPermission(permission);
      setFormData({
        name: permission.name,
        description: permission.description,
        category: permission.category,
        isActive: permission.isActive,
        roles: permission.roles,
      });
    } else {
      setSelectedPermission(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        isActive: true,
        roles: [],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedPermission(null);
  };

  const handleSubmit = () => {
    if (selectedPermission) {
      // 수정
      setPermissions(permissions.map(permission =>
        permission.id === selectedPermission.id ? { ...permission, ...formData } : permission
      ));
    } else {
      // 추가
      setPermissions([...permissions, {
        id: Date.now(),
        ...formData,
      }]);
    }
    handleClose();
  };

  const handleDelete = (id) => {
    setPermissions(permissions.filter(permission => permission.id !== id));
  };

  const handlePermissionChange = (memberId, menuKey, permKey, checked) => {
    setEditedPermissions(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [menuKey]: {
          ...((prev[memberId] && prev[memberId][menuKey]) || {}),
          [permKey]: checked
        }
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(editedPermissions);
      for (const [memberId, perms] of updates) {
        const memberRef = doc(db, 'members', memberId);
        await updateDoc(memberRef, {
          permissions: perms
        });
      }
      await fetchMembers();
      setError('');
    } catch (error) {
      console.error('권한 변경 실패:', error);
      setError('권한 변경에 실패했습니다.');
    }
    setIsSaving(false);
  };

  const categories = ['기본', '관리', '문서', '재무', '기타'];
  const roles = ['관리자', '일반'];

  const getCategoryColor = (category) => {
    switch (category) {
      case '기본':
        return 'primary';
      case '관리':
        return 'secondary';
      case '문서':
        return 'info';
      case '재무':
        return 'success';
      default:
        return 'default';
    }
  };

  const scrollFocus = (ref) => () => {
    setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const inputRef1 = useRef();
  const inputRef2 = useRef();

  if (!currentUser || currentUser.grade !== '마스터') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">접근 권한이 없습니다. (마스터만 가능)</Alert>
      </Box>
    );
  }

  // PC에서만 사용가능
  if (isMobile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          권한관리는 PC에서만 사용 가능합니다. 데스크톱 환경에서 접속해주세요.
        </Alert>
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
          p: isMobile ? 2 : 3,
          borderRadius: 2,
          boxShadow: 3,
          bgcolor: 'background.paper'
        }}>
      <Typography variant="h4" gutterBottom>
        권한 관리

      </Typography>

      {/* 통계 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                전체 권한
              </Typography>
              <Typography variant="h4">
                {permissions.length}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                활성 권한
              </Typography>
              <Typography variant="h4">
                {permissions.filter(permission => permission.isActive).length}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                카테고리 수
              </Typography>
              <Typography variant="h4">
                {new Set(permissions.map(p => p.category)).size}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 권한 목록 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">권한 목록</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            권한 추가
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>권한명</TableCell>
                <TableCell>설명</TableCell>
                <TableCell>카테고리</TableCell>
                <TableCell>역할</TableCell>
                <TableCell>상태</TableCell>
                <TableCell align="center">관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SecurityIcon color="primary" />
                      {permission.name}
                    </Box>
                  </TableCell>
                  <TableCell>{permission.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={permission.category}
                      color={getCategoryColor(permission.category)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {permission.roles.map((role) => (
                        <Chip
                          key={role}
                          label={role}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={permission.isActive ? '활성' : '비활성'}
                      color={permission.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleOpen(permission)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(permission.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 권한 추가/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPermission ? '권한 수정' : '권한 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="권한명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              inputRef={inputRef1}
              onFocus={scrollFocus(inputRef1)}
            />
            <TextField
              label="설명"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              inputRef={inputRef2}
              onFocus={scrollFocus(inputRef2)}
            />
            <FormControl>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={formData.category}
                label="카테고리"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                inputRef={inputRef1}
                onFocus={scrollFocus(inputRef1)}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>역할</InputLabel>
              <Select
                multiple
                value={formData.roles}
                label="역할"
                onChange={(e) => setFormData({ ...formData, roles: e.target.value })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" onClick={() => {}} />
                    ))}
                  </Box>
                )}
                inputRef={inputRef1}
                onFocus={scrollFocus(inputRef1)}
              >
                {roles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  inputRef={inputRef1}
                  onFocus={scrollFocus(inputRef1)}
                />
              }
              label="활성화"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedPermission ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>이메일</TableCell>
              <TableCell>이름</TableCell>
              {menuList.map(menu => (
                <TableCell key={menu.key} align="center">
                  {menu.label}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell colSpan={2}></TableCell>
              {menuList.map(menu => (
                <TableCell key={menu.key} align="center">
                  {permissionTypes.map(perm => (
                    <span key={perm.key} style={{ margin: '0 4px', fontWeight: 600, fontSize: 13 }}>{perm.label}</span>
                  ))}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.name}</TableCell>
                {menuList.map(menu => (
                  <TableCell key={menu.key} align="center">
                    {permissionTypes.map(perm => {
                      const checked = (editedPermissions[member.id]?.[menu.key]?.[perm.key]) ?? (member.permissions?.[menu.key]?.[perm.key] ?? false);
                      return (
                        <FormControlLabel
                          key={perm.key}
                          control={
                            <Checkbox
                              checked={checked}
                              onChange={e => handlePermissionChange(member.id, menu.key, perm.key, e.target.checked)}
                              size="small"
                            />
                          }
                          label={perm.label}
                        />
                      );
                    })}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isSaving || Object.keys(editedPermissions).length === 0}
        >
          저장
        </Button>
      </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Permissions; 
