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
import { MENU_CONFIG, getMenusByCategory } from '../utils/menuPermissions';

const Permissions = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    roles: [],
    isActive: true
  });
  const [editedPermissions, setEditedPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchMembers();
  }, []);

  // 권한 초기화는 fetchMembers에서 처리하므로 별도 useEffect 불필요

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const membersSnapshot = await getDocs(collection(db, 'members'));
      const membersData = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      
      setPermissions(membersData);
      
      // 편집 권한 초기화
      const initialPermissions = {};
      membersData.forEach(member => {
        const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
        const isAdmin = member.role === '관리자' || member.grade === '관리자' || member.role === 'admin';
        
        if (isMaster || isAdmin) {
          // 마스터와 관리자는 모든 권한 true로 초기화
          initialPermissions[member.id] = {};
          Object.keys(MENU_CONFIG).forEach(menuKey => {
            initialPermissions[member.id][menuKey] = { access: true };
          });
        } else {
          // 일반 사용자는 기존 권한 또는 빈 객체로 초기화
          initialPermissions[member.id] = member.permissions || {};
        }
      });
      setEditedPermissions(initialPermissions);
    } catch (error) {
      console.error('멤버 데이터 로드 실패:', error);
      setError('멤버 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (permission = null) => {
    setSelectedPermission(permission);
    if (permission) {
      setFormData(permission);
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        roles: [],
        isActive: true
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedPermission(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      roles: [],
      isActive: true
    });
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
        // 자신의 권한은 저장에서 제외 (다른 사용자 권한은 저장 가능)
        const member = permissions.find(m => m.id === memberId);
        const isMemberMaster = member?.role === '마스터' || member?.grade === '마스터' || member?.role === 'master';
        const isMemberAdmin = member?.role === '관리자' || member?.grade === '관리자' || member?.role === 'admin';
        
        // 자신의 권한만 저장에서 제외
        if (member.id === currentUser?.uid) {
          continue; // 자신의 권한은 건너뛰기
        }
        
        // 일반 사용자의 경우 권한이 명시적으로 설정된 경우만 저장
        const hasAnyPermission = Object.values(perms).some(permission => permission?.access === true);
        if (!hasAnyPermission) {
          continue; // 권한이 없는 사용자는 건너뛰기
        }
        
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

  // 메뉴 카테고리 가져오기
  const getMenuCategories = () => {
    const categories = new Set();
    Object.values(MENU_CONFIG).forEach(menu => {
      categories.add(menu.category);
    });
    return Array.from(categories);
  };

  const categories = getMenuCategories();
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

  // 권한 체크: 마스터 또는 관리자만 접근 가능
  const isMaster = currentUser?.grade === '마스터' || currentUser?.role === '마스터' || currentUser?.role === 'master';
  const isAdmin = currentUser?.grade === '관리자' || currentUser?.role === '관리자' || currentUser?.role === 'admin';
  
  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">로그인이 필요합니다.</Alert>
      </Box>
    );
  }
  
  if (!isMaster && !isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          접근 권한이 없습니다. (마스터 또는 관리자만 가능)
        </Alert>
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
      minHeight: 'calc(100vh + 250px)',
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      pt: '50px', // 전체를 아래로 50px 이동
      overflow: 'hidden' // 스크롤바 숨김
    }}>
      <MobileSidebar />
      
      <Container 
        maxWidth={false} // 가로로 꽉 차게
        sx={{ 
          flex: 1,
          py: 3,
          px: 2, // 좌우 패딩 조정
          display: 'flex',
          flexDirection: 'column',
          width: '100%', // 가로 전체 사용
          overflow: 'hidden' // 스크롤바 숨김
        }}
      >
        <Box sx={{ 
          p: isMobile ? 2 : 3,
          borderRadius: 2,
          boxShadow: 3,
          bgcolor: 'background.paper'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4">
              권한 관리
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                현재 사용자:
              </Typography>
              <Chip 
                label={currentUser.name || currentUser.email}
                color="primary"
                size="small"
                variant="outlined"
              />
              <Chip 
                label={isMaster ? '마스터' : isAdmin ? '관리자' : '일반'}
                color={isMaster ? 'error' : isAdmin ? 'primary' : 'default'}
                size="small"
                variant={isMaster ? 'filled' : 'outlined'}
              />
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* 통계 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    전체 사용자
                  </Typography>
                  <Typography variant="h4">
                    {permissions.length}명
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    관리자
                  </Typography>
                  <Typography variant="h4">
                    {permissions.filter(p => p.role === '관리자').length}명
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    메뉴 수
                  </Typography>
                  <Typography variant="h4">
                    {Object.keys(MENU_CONFIG).length}개
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 메뉴 권한 관리 */}
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">메뉴 접근 권한 관리</Typography>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isSaving}
                startIcon={<CheckCircleIcon />}
              >
                {isSaving ? '저장중...' : '모든 변경사항 저장'}
              </Button>
            </Box>
            <TableContainer sx={{ 
              maxHeight: 850, 
              minHeight: 600,
              '&::-webkit-scrollbar': {
                display: 'none' // 웹킷 스크롤바 숨김
              },
              scrollbarWidth: 'none', // 파이어폭스 스크롤바 숨김
              msOverflowStyle: 'none' // IE/Edge 스크롤바 숨김
            }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>사용자</TableCell>
                    <TableCell>역할</TableCell>
                    {Object.values(MENU_CONFIG).map((menu) => (
                      <TableCell key={menu.key} align="center" sx={{ minWidth: 120 }}>
                        <Typography variant="caption" display="block" fontWeight="bold">
                          {menu.label}
                        </Typography>
                        <Chip
                          label={menu.category}
                          color={getCategoryColor(menu.category)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permissions.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {member.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.role || member.grade || '일반'}
                          color={
                            member.role === '마스터' || member.grade === '마스터' || member.role === 'master' ? 'error' :
                            member.role === '관리자' || member.role === 'admin' ? 'primary' : 'default'
                          }
                          size="small"
                          variant={member.role === '마스터' || member.grade === '마스터' || member.role === 'master' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      {Object.values(MENU_CONFIG).map((menu) => {
                        const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
                        const isAdmin = member.role === '관리자' || member.grade === '관리자' || member.role === 'admin';
                        const isCurrentUser = member.id === currentUser?.uid || member.email === currentUser?.email;
                        
                        // 권한 확인: 명시적으로 설정된 권한만 확인
                        let hasAccess = false;
                        if (isMaster) {
                          hasAccess = true; // 마스터는 항상 모든 권한
                        } else if (isAdmin) {
                          // 관리자는 기본적으로 모든 권한이지만, 명시적으로 false로 설정된 경우 false
                          const adminPermission = editedPermissions[member.id]?.[menu.key]?.access;
                          hasAccess = adminPermission !== false;
                        } else {
                          // 일반 사용자는 명시적으로 true로 설정된 경우만 true
                          hasAccess = editedPermissions[member.id]?.[menu.key]?.access === true;
                        }
                        
                        
                        // 권한 수정 제한: 마스터는 자신의 권한만 수정 불가, 관리자는 자신의 권한만 수정 불가
                        const isDisabled = (isMaster && isCurrentUser) || (isAdmin && isCurrentUser);
                        
                        return (
                          <TableCell key={menu.key} align="center">
                            <Checkbox
                              checked={hasAccess}
                              onChange={(e) => handlePermissionChange(member.id, menu.key, 'access', e.target.checked)}
                              disabled={isDisabled}
                              sx={{
                                '&.Mui-disabled': {
                                  color: isMaster ? 'success.main' : 'warning.main',
                                  '&.Mui-checked': {
                                    color: isMaster ? 'success.main' : 'warning.main',
                                  }
                                }
                              }}
                            />
                            {isMaster && isCurrentUser && (
                              <Typography variant="caption" color="success.main" display="block">
                                마스터(본인)
                              </Typography>
                            )}
                            {isMaster && !isCurrentUser && (
                              <Typography variant="caption" color="success.main" display="block">
                                마스터
                              </Typography>
                            )}
                            {isAdmin && isCurrentUser && (
                              <Typography variant="caption" color="warning.main" display="block">
                                관리자(본인)
                              </Typography>
                            )}
                            {isAdmin && !isCurrentUser && (
                              <Typography variant="caption" color="warning.main" display="block">
                                관리자
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Permissions;