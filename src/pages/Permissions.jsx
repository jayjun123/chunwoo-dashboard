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
      
      // 편집 권한 초기화 - 세분화된 권한 체계
      const initialPermissions = {};
      membersData.forEach(member => {
        const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
        const isAdmin = member.role === '관리자' || member.grade === '관리자' || member.role === 'admin';
        
        initialPermissions[member.id] = {};
        Object.keys(MENU_CONFIG).forEach(menuKey => {
          const menuConfig = MENU_CONFIG[menuKey];
          const existingPermissions = member.permissions?.[menuKey] || {};
          
          if (isMaster) {
            // 마스터는 모든 권한 true
            initialPermissions[member.id][menuKey] = {
              view: true,
              create: true,
              edit: true,
              delete: true,
              manage: true
            };
          } else if (isAdmin) {
            // 관리자는 기본 권한 + 기존 설정
            const defaultAdminPerms = menuConfig.defaultPermissions.admin;
            initialPermissions[member.id][menuKey] = {
              view: existingPermissions.view ?? defaultAdminPerms.view,
              create: existingPermissions.create ?? defaultAdminPerms.create,
              edit: existingPermissions.edit ?? defaultAdminPerms.edit,
              delete: existingPermissions.delete ?? defaultAdminPerms.delete,
              manage: existingPermissions.manage ?? defaultAdminPerms.manage
            };
          } else {
            // 일반 사용자는 기본 권한 + 기존 설정
            const defaultUserPerms = menuConfig.defaultPermissions.user;
            initialPermissions[member.id][menuKey] = {
              view: existingPermissions.view ?? defaultUserPerms.view,
              create: existingPermissions.create ?? defaultUserPerms.create,
              edit: existingPermissions.edit ?? defaultUserPerms.edit,
              delete: existingPermissions.delete ?? defaultUserPerms.delete,
              manage: existingPermissions.manage ?? defaultUserPerms.manage
            };
          }
        });
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

  // 전체 선택/해제 함수
  const handleSelectAll = (memberId, menuKey, checked) => {
    setEditedPermissions(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [menuKey]: {
          view: checked,
          create: checked,
          edit: checked,
          delete: checked,
          manage: checked
        }
      }
    }));
  };

  // 특정 권한 타입 전체 선택/해제 함수
  const handleSelectAllByPermission = (memberId, permKey, checked) => {
    setEditedPermissions(prev => {
      const newPermissions = { ...prev };
      Object.keys(MENU_CONFIG).forEach(menuKey => {
        if (!newPermissions[memberId]) {
          newPermissions[memberId] = {};
        }
        if (!newPermissions[memberId][menuKey]) {
          newPermissions[memberId][menuKey] = {};
        }
        newPermissions[memberId][menuKey][permKey] = checked;
      });
      return newPermissions;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('💾 권한 저장 시작...', editedPermissions);
      
      const updates = Object.entries(editedPermissions);
      let savedCount = 0;
      
      for (const [memberId, perms] of updates) {
        const member = permissions.find(m => m.id === memberId);
        
        // 자신의 권한은 저장에서 제외
        if (member && (member.id === currentUser?.uid || member.email === currentUser?.email)) {
          console.log(`⏭️ 자신의 권한은 저장에서 제외: ${member.name}`);
          continue;
        }
        
        // 권한이 변경된 경우만 저장
        const originalPermissions = member?.permissions || {};
        const hasChanges = JSON.stringify(originalPermissions) !== JSON.stringify(perms);
        
        if (!hasChanges) {
          console.log(`⏭️ 변경사항 없음: ${member?.name || memberId}`);
          continue;
        }
        
        console.log(`💾 권한 저장 중: ${member?.name || memberId}`, perms);
        
        const memberRef = doc(db, 'members', memberId);
        await updateDoc(memberRef, {
          permissions: perms,
          updatedAt: new Date().toISOString()
        });
        
        savedCount++;
        console.log(`✅ 권한 저장 완료: ${member?.name || memberId}`);
      }
      
      console.log(`🎉 총 ${savedCount}명의 권한이 저장되었습니다.`);
      
      // 데이터 새로고침
      await fetchMembers();
      setError('');
      
      // 성공 메시지 표시
      alert(`${savedCount}명의 권한이 성공적으로 저장되었습니다.`);
      
    } catch (error) {
      console.error('❌ 권한 변경 실패:', error);
      setError(`권한 변경에 실패했습니다: ${error.message}`);
      alert(`권한 저장에 실패했습니다: ${error.message}`);
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
      height: '1000px',
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
                    <TableCell align="center" sx={{ minWidth: 100 }}>
                      <Typography variant="caption" display="block" fontWeight="bold" sx={{ mb: 1 }}>
                        전체 선택
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>보기</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>쓰기</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>수정</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>삭제</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>관리</Typography>
                      </Box>
                    </TableCell>
                    {Object.values(MENU_CONFIG).map((menu) => (
                      <TableCell key={menu.key} align="center" sx={{ minWidth: 150 }}>
                        <Typography variant="caption" display="block" fontWeight="bold" sx={{ mb: 1 }}>
                          {menu.label}
                        </Typography>
                        <Chip
                          label={menu.category}
                          color={getCategoryColor(menu.category)}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>보기</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>쓰기</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>수정</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>삭제</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>관리</Typography>
                        </Box>
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
                      {/* 전체 선택 컬럼 */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                          {/* 보기 전체 선택 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox
                              size="small"
                              checked={Object.values(MENU_CONFIG).every(menu => {
                                const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
                                const isAdmin = member.role === '관리자' || member.grade === '관리자' || member.role === 'admin';
                                const permissions = editedPermissions[member.id]?.[menu.key] || {};
                                return isMaster || permissions.view === true || (isAdmin && permissions.view !== false);
                              })}
                              onChange={(e) => handleSelectAllByPermission(member.id, 'view', e.target.checked)}
                              disabled={(member.role === '마스터' || member.grade === '마스터' || member.role === 'master') && (member.id === currentUser?.uid || member.email === currentUser?.email)}
                              sx={{ p: 0.5 }}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>보기</Typography>
                          </Box>
                          
                          {/* 쓰기 전체 선택 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox
                              size="small"
                              checked={Object.values(MENU_CONFIG).every(menu => {
                                const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
                                const isAdmin = member.role === '관리자' || member.grade === '관리자' || member.role === 'admin';
                                const permissions = editedPermissions[member.id]?.[menu.key] || {};
                                return isMaster || permissions.create === true || (isAdmin && permissions.create !== false);
                              })}
                              onChange={(e) => handleSelectAllByPermission(member.id, 'create', e.target.checked)}
                              disabled={(member.role === '마스터' || member.grade === '마스터' || member.role === 'master') && (member.id === currentUser?.uid || member.email === currentUser?.email)}
                              sx={{ p: 0.5 }}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>쓰기</Typography>
                          </Box>
                          
                          {/* 수정 전체 선택 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox
                              size="small"
                              checked={Object.values(MENU_CONFIG).every(menu => {
                                const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
                                const isAdmin = member.role === '관리자' || member.grade === '관리자' || member.role === 'admin';
                                const permissions = editedPermissions[member.id]?.[menu.key] || {};
                                return isMaster || permissions.edit === true || (isAdmin && permissions.edit !== false);
                              })}
                              onChange={(e) => handleSelectAllByPermission(member.id, 'edit', e.target.checked)}
                              disabled={(member.role === '마스터' || member.grade === '마스터' || member.role === 'master') && (member.id === currentUser?.uid || member.email === currentUser?.email)}
                              sx={{ p: 0.5 }}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>수정</Typography>
                          </Box>
                          
                          {/* 삭제 전체 선택 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox
                              size="small"
                              checked={Object.values(MENU_CONFIG).every(menu => {
                                const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
                                const permissions = editedPermissions[member.id]?.[menu.key] || {};
                                return isMaster || permissions.delete === true;
                              })}
                              onChange={(e) => handleSelectAllByPermission(member.id, 'delete', e.target.checked)}
                              disabled={(member.role === '마스터' || member.grade === '마스터' || member.role === 'master') && (member.id === currentUser?.uid || member.email === currentUser?.email)}
                              sx={{ p: 0.5 }}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>삭제</Typography>
                          </Box>
                          
                          {/* 관리 전체 선택 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox
                              size="small"
                              checked={Object.values(MENU_CONFIG).every(menu => {
                                const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
                                const permissions = editedPermissions[member.id]?.[menu.key] || {};
                                return isMaster || permissions.manage === true;
                              })}
                              onChange={(e) => handleSelectAllByPermission(member.id, 'manage', e.target.checked)}
                              disabled={(member.role === '마스터' || member.grade === '마스터' || member.role === 'master') && (member.id === currentUser?.uid || member.email === currentUser?.email)}
                              sx={{ p: 0.5 }}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>관리</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      {Object.values(MENU_CONFIG).map((menu) => {
                        const isMaster = member.role === '마스터' || member.grade === '마스터' || member.role === 'master';
                        const isAdmin = member.role === '관리자' || member.grade === '관리자' || member.role === 'admin';
                        const isCurrentUser = member.id === currentUser?.uid || member.email === currentUser?.email;
                        
                        // 권한 확인: 세분화된 권한 체계
                        const permissions = editedPermissions[member.id]?.[menu.key] || {};
                        const hasView = isMaster || permissions.view === true || (isAdmin && permissions.view !== false);
                        const hasCreate = isMaster || permissions.create === true || (isAdmin && permissions.create !== false);
                        const hasEdit = isMaster || permissions.edit === true || (isAdmin && permissions.edit !== false);
                        const hasDelete = isMaster || permissions.delete === true;
                        const hasManage = isMaster || permissions.manage === true;
                        
                        // 권한 수정 제한: 마스터는 자신의 권한만 수정 불가, 관리자는 자신의 권한만 수정 불가
                        const isDisabled = (isMaster && isCurrentUser) || (isAdmin && isCurrentUser);
                        
                        return (
                          <TableCell key={menu.key} align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                              {/* 보기 권한 */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Checkbox
                                  size="small"
                                  checked={hasView}
                                  onChange={(e) => handlePermissionChange(member.id, menu.key, 'view', e.target.checked)}
                                  disabled={isDisabled}
                                  sx={{ p: 0.5 }}
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>보기</Typography>
                              </Box>
                              
                              {/* 쓰기 권한 */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Checkbox
                                  size="small"
                                  checked={hasCreate}
                                  onChange={(e) => handlePermissionChange(member.id, menu.key, 'create', e.target.checked)}
                                  disabled={isDisabled}
                                  sx={{ p: 0.5 }}
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>쓰기</Typography>
                              </Box>
                              
                              {/* 수정 권한 */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Checkbox
                                  size="small"
                                  checked={hasEdit}
                                  onChange={(e) => handlePermissionChange(member.id, menu.key, 'edit', e.target.checked)}
                                  disabled={isDisabled}
                                  sx={{ p: 0.5 }}
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>수정</Typography>
                              </Box>
                              
                              {/* 삭제 권한 */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Checkbox
                                  size="small"
                                  checked={hasDelete}
                                  onChange={(e) => handlePermissionChange(member.id, menu.key, 'delete', e.target.checked)}
                                  disabled={isDisabled}
                                  sx={{ p: 0.5 }}
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>삭제</Typography>
                              </Box>
                              
                              {/* 관리 권한 */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Checkbox
                                  size="small"
                                  checked={hasManage}
                                  onChange={(e) => handlePermissionChange(member.id, menu.key, 'manage', e.target.checked)}
                                  disabled={isDisabled}
                                  sx={{ p: 0.5 }}
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>관리</Typography>
                              </Box>
                            </Box>
                            
                            {isMaster && isCurrentUser && (
                              <Typography variant="caption" color="success.main" display="block" sx={{ mt: 1 }}>
                                마스터(본인)
                              </Typography>
                            )}
                            {isMaster && !isCurrentUser && (
                              <Typography variant="caption" color="success.main" display="block" sx={{ mt: 1 }}>
                                마스터
                              </Typography>
                            )}
                            {isAdmin && isCurrentUser && (
                              <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
                                관리자(본인)
                              </Typography>
                            )}
                            {isAdmin && !isCurrentUser && (
                              <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
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