import React, { useState, useEffect } from 'react';
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
  Avatar,
  useTheme,
  useMediaQuery,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Person as PersonIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Pending as PendingIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const Members = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser, refreshUserInfo } = useAuth();
  
  // 상태 관리
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissionDialog, setPermissionDialog] = useState({ open: false, member: null });
  const [permissionSettings, setPermissionSettings] = useState({});
  const [roleDialog, setRoleDialog] = useState({ open: false, member: null });
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTeamGrade, setSelectedTeamGrade] = useState('');
  const [approvalDialog, setApprovalDialog] = useState({ open: false, member: null });
  const [approvalRole, setApprovalRole] = useState('user');
  const [approvalTeamGrade, setApprovalTeamGrade] = useState('A');

  // 권한 옵션 - Firebase에서 가져올 수 있지만 기본값으로 설정
  const permissionOptions = ['읽기', '쓰기', '읽기/쓰기', '권한없음'];
  const menuItems = ['메인메뉴', '일정관리', '현장관리', '문서관리', '설정'];
  const teamGrades = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  // 역할 정의 - Firebase에서 가져올 수 있지만 기본값으로 설정
  const roles = {
    master: { label: '마스터', color: 'error', icon: AdminIcon, hidden: true },
    admin: { label: '관리자', color: 'warning', icon: SecurityIcon },
    team: { label: '대마팀', color: 'info', icon: GroupIcon },
    user: { label: '일반회원', color: 'default', icon: PersonIcon },
    pending: { label: '보류', color: 'secondary', icon: PendingIcon }
  };

  // 역할 변경 권한 체크
  const canChangeRole = (member) => {
    // 마스터는 절대 변경 불가
    if (member.role === 'master') {
      return false;
    }
    // 마스터는 모든 사용자 변경 가능
    if (currentUser && currentUser.role === 'master') {
      return true;
    }
    // 관리자는 마스터 제외한 사용자 변경 가능
    if (currentUser && currentUser.role === 'admin') {
      return member.role !== 'master';
    }
    // 일반회원과 대마팀은 변경 불가
    return false;
  };

  // 역할 변경 다이얼로그 열기
  const openRoleDialog = (member) => {
    setRoleDialog({ open: true, member });
    setSelectedRole(member.role || 'user');
    setSelectedTeamGrade(member.teamGrade || 'A');
  };

  // 역할 변경 저장
  const saveRoleChange = async () => {
    try {
      const { member } = roleDialog;
      await handleRoleChange(member.id, selectedRole, selectedRole === 'team' ? selectedTeamGrade : null);
      setRoleDialog({ open: false, member: null });
      setSelectedRole('');
      setSelectedTeamGrade('');
      // 성공 메시지 표시
      alert(`${member.name}의 역할이 ${roles[selectedRole]?.label}로 변경되었습니다.`);
    } catch (error) {
      console.error('역할 변경 실패:', error);
      setError('역할 변경에 실패했습니다.');
    }
  };

  // 승인 다이얼로그 열기
  const openApprovalDialog = (member) => {
    setApprovalDialog({ open: true, member });
    setApprovalRole('user');
    setApprovalTeamGrade('A');
  };

  // 승인 처리
  const handleApproval = async () => {
    try {
      const { member } = approvalDialog;
      await handleStatusChange(member.id, 'approved', approvalRole, approvalRole === 'team' ? approvalTeamGrade : null);
      setApprovalDialog({ open: false, member: null });
      setApprovalRole('user');
      setApprovalTeamGrade('A');
    } catch (error) {
      console.error('승인 처리 실패:', error);
      setError('승인 처리에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // 샘플 데이터 초기화 (필요한 경우에만)
  const initializeSampleData = async () => {
    try {
      const membersRef = collection(db, 'members');
      const snapshot = await getDocs(membersRef);
      
      // 데이터가 없으면 샘플 데이터 생성
      if (snapshot.empty) {
        await createSampleMembers();
      }
    } catch (error) {
      console.error('샘플 데이터 초기화 실패:', error);
    }
  };

  // 샘플 회원 데이터 생성
  const createSampleMembers = async () => {
    const sampleMembers = [
      {
        name: '정보류회원',
        email: 'pending@example.com',
        role: 'user',
        status: 'pending',
        createdAt: new Date(),
        permissions: {}
      }
    ];

    try {
      for (const member of sampleMembers) {
        await addDoc(collection(db, 'members'), member);
      }
      console.log('보류명단 샘플 데이터가 생성되었습니다.');
    } catch (error) {
      console.error('샘플 데이터 생성 실패:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const membersRef = collection(db, 'members');
      const snapshot = await getDocs(membersRef);
      const membersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 데이터가 없으면 샘플 데이터 생성
      if (membersList.length === 0) {
        console.log('Firebase에 데이터가 없어 샘플 데이터를 생성합니다.');
        await createSampleMembers();
        // 샘플 데이터 생성 후 다시 불러오기
        const newSnapshot = await getDocs(membersRef);
        const newMembersList = newSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 회원과 보류 회원 분리
        const activeMembers = newMembersList.filter(member => member.status !== 'pending');
        const pendingMembersList = newMembersList.filter(member => member.status === 'pending');

        setMembers(activeMembers);
        setPendingMembers(pendingMembersList);
      } else {
        // 기존 데이터가 있으면 그대로 사용
        console.log(`Firebase에서 ${membersList.length}개의 회원 데이터를 불러왔습니다.`);
        const activeMembers = membersList.filter(member => member.status !== 'pending');
        const pendingMembersList = membersList.filter(member => member.status === 'pending');

        setMembers(activeMembers);
        setPendingMembers(pendingMembersList);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('회원 목록 조회 실패:', error);
      setError('회원 목록을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleStatusChange = async (memberId, newStatus, selectedRole = 'user', teamGrade = null) => {
    try {
      const memberRef = doc(db, 'members', memberId);
      let updateData = { status: newStatus };

      if (newStatus === 'approved') {
        updateData.role = selectedRole;
        updateData.approvedAt = new Date();
        
        if (selectedRole === 'team' && teamGrade) {
          updateData.teamGrade = teamGrade;
        }
        
        // 역할별 기본 권한 설정
        const defaultPermissions = getDefaultPermissions(selectedRole);
        if (defaultPermissions) {
          updateData.permissions = defaultPermissions;
        }
      } else if (newStatus === 'rejected') {
        updateData.rejectedAt = new Date();
      }

      await updateDoc(memberRef, updateData);
      await fetchMembers();
    } catch (error) {
      console.error('상태 변경 실패:', error);
      setError('상태 변경에 실패했습니다.');
    }
  };

  const handleRoleChange = async (memberId, newRole, teamGrade = null) => {
    try {
      const memberRef = doc(db, 'members', memberId);
      const updateData = { 
        role: newRole,
        updatedAt: new Date()
      };

      if (newRole === 'team' && teamGrade) {
        updateData.teamGrade = teamGrade;
      }

      // 역할별 기본 권한 설정
      const defaultPermissions = getDefaultPermissions(newRole);
      if (defaultPermissions) {
        updateData.permissions = defaultPermissions;
      }

      await updateDoc(memberRef, updateData);
      await fetchMembers();
      
      // 현재 사용자의 역할이 변경된 경우 AuthContext 새로고침
      if (memberId === currentUser?.uid) {
        await refreshUserInfo();
      }
    } catch (error) {
      console.error('역할 변경 실패:', error);
      setError('역할 변경에 실패했습니다.');
    }
  };

  // 역할별 기본 권한 반환
  const getDefaultPermissions = (role) => {
    switch (role) {
      case 'admin':
        return {
          '메인메뉴': '읽기/쓰기',
          '일정관리': '읽기/쓰기',
          '현장관리': '읽기/쓰기',
          '문서관리': '읽기/쓰기',
          '설정': '읽기/쓰기'
        };
      case 'team':
        return {
          '메인메뉴': '읽기/쓰기',
          '일정관리': '읽기/쓰기',
          '현장관리': '읽기',
          '문서관리': '읽기',
          '설정': '읽기'
        };
      case 'user':
        return {
          '메인메뉴': '읽기',
          '일정관리': '읽기',
          '현장관리': '읽기',
          '문서관리': '읽기',
          '설정': '권한없음'
        };
      default:
        return null;
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (window.confirm('정말로 이 회원을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'members', memberId));
        await fetchMembers();
      } catch (error) {
        console.error('회원 삭제 실패:', error);
        setError('회원 삭제에 실패했습니다.');
      }
    }
  };

  const openPermissionDialog = (member) => {
    setPermissionDialog({ open: true, member });
    setPermissionSettings(member.permissions || {});
  };

  const savePermissions = async () => {
    try {
      const { member } = permissionDialog;
      const memberRef = doc(db, 'members', member.id);
      await updateDoc(memberRef, {
        permissions: permissionSettings,
        updatedAt: new Date()
      });
      setPermissionDialog({ open: false, member: null });
      await fetchMembers();
    } catch (error) {
      console.error('권한 저장 실패:', error);
      setError('권한 저장에 실패했습니다.');
    }
  };

  const getRoleLabel = (member) => {
    if (member.role === 'team' && member.teamGrade) {
      return `대마팀(${member.teamGrade})`;
    }
    return roles[member.role]?.label || '미정';
  };

  const getRoleColor = (member) => {
    return roles[member.role]?.color || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>회원 목록을 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        회원/권한 관리
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 탭 메뉴 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>회원명단</Typography>
                <Badge badgeContent={members.length} color="primary" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>로그인 대기(보류) 명단</Typography>
                <Badge badgeContent={pendingMembers.length} color="warning" />
              </Box>
            } 
          />
        </Tabs>
      </Paper>

      {/* 회원명단 탭 */}
      {activeTab === 0 && (
        <>
          {/* 모바일: 카드형 UI */}
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {members.map((member) => (
                <Card key={member.id} sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar src={member.avatar} sx={{ width: 50, height: 50 }}>
                      {member.name?.[0] || 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {member.name || '이름 없음'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {member.email || '이메일 없음'}
                      </Typography>
                    </Box>
                    <Chip 
                      label={getRoleLabel(member)} 
                      color={getRoleColor(member)} 
                      size="small"
                      onClick={canChangeRole(member) ? () => openRoleDialog(member) : undefined}
                      sx={{ 
                        fontWeight: 600,
                        cursor: canChangeRole(member) ? 'pointer' : 'default',
                        '&:hover': canChangeRole(member) ? {
                          opacity: 0.8,
                          transform: 'scale(1.05)',
                          transition: 'all 0.2s ease'
                        } : {}
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      가입일: {member.createdAt ? format(member.createdAt.toDate(), 'yyyy-MM-dd') : '-'}
                    </Typography>
                    {member.phone && (
                      <Typography variant="body2" color="textSecondary">
                        연락처: {member.phone}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    {canChangeRole(member) && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => openRoleDialog(member)}
                        startIcon={<EditIcon />}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        역할변경
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => openPermissionDialog(member)}
                      startIcon={<SecurityIcon />}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      권한설정
                    </Button>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>
              ))}
            </Box>
          ) : (
            /* PC: 테이블형 UI */
            <Paper>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>회원정보</TableCell>
                      <TableCell>역할</TableCell>
                      <TableCell>가입일</TableCell>
                      <TableCell>권한설정</TableCell>
                      <TableCell>관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar src={member.avatar}>
                              {member.name?.[0] || 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">{member.name || '이름 없음'}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                {member.email || '이메일 없음'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={getRoleLabel(member)} 
                              color={getRoleColor(member)} 
                              size="small"
                              onClick={canChangeRole(member) ? () => openRoleDialog(member) : undefined}
                              sx={{
                                cursor: canChangeRole(member) ? 'pointer' : 'default',
                                '&:hover': canChangeRole(member) ? {
                                  opacity: 0.8,
                                  transform: 'scale(1.05)',
                                  transition: 'all 0.2s ease'
                                } : {}
                              }}
                            />
                            {canChangeRole(member) && (
                              <Tooltip title="역할 변경">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => openRoleDialog(member)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {member.createdAt ? format(member.createdAt.toDate(), 'yyyy-MM-dd') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openPermissionDialog(member)}
                            startIcon={<SecurityIcon />}
                          >
                            권한설정
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="삭제">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteMember(member.id)}
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
            </Paper>
          )}
        </>
      )}

      {/* 보류 명단 탭 */}
      {activeTab === 1 && (
        <>
          {/* 모바일: 카드형 UI */}
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pendingMembers.map((member) => (
                <Card key={member.id} sx={{ p: 2, borderRadius: 2, boxShadow: 2, bgcolor: '#fff3e0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar src={member.avatar} sx={{ width: 50, height: 50 }}>
                      {member.name?.[0] || 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {member.name || '이름 없음'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {member.email || '이메일 없음'}
                      </Typography>
                    </Box>
                    <Chip 
                      label="대기중" 
                      color="warning" 
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      신청일: {member.createdAt ? format(member.createdAt.toDate(), 'yyyy-MM-dd') : '-'}
                    </Typography>
                    {member.phone && (
                      <Typography variant="body2" color="textSecondary">
                        연락처: {member.phone}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      onClick={() => openApprovalDialog(member)}
                      startIcon={<CheckCircleIcon />}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      승인
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleStatusChange(member.id, 'rejected')}
                      startIcon={<CancelIcon />}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      거부
                    </Button>
                  </Box>
                </Card>
              ))}
            </Box>
          ) : (
            /* PC: 테이블형 UI */
            <Paper>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>회원정보</TableCell>
                      <TableCell>신청일</TableCell>
                      <TableCell>권한 부여</TableCell>
                      <TableCell>관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar src={member.avatar}>
                              {member.name?.[0] || 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">{member.name || '이름 없음'}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                {member.email || '이메일 없음'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {member.createdAt ? format(member.createdAt.toDate(), 'yyyy-MM-dd') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              size="small"
                              color="success"
                              onClick={() => openApprovalDialog(member)}
                              startIcon={<CheckCircleIcon />}
                            >
                              승인
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              onClick={() => handleStatusChange(member.id, 'rejected')}
                              startIcon={<CancelIcon />}
                            >
                              거부
                            </Button>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteMember(member.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {/* 권한 설정 다이얼로그 */}
      <Dialog 
        open={permissionDialog.open} 
        onClose={() => setPermissionDialog({ open: false, member: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          권한 설정 - {permissionDialog.member?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                메뉴별 권한 설정
              </Typography>
            </Grid>
            {menuItems.map((menu) => (
              <Grid item xs={12} sm={6} key={menu}>
                <FormControl fullWidth>
                  <InputLabel>{menu}</InputLabel>
                  <Select
                    value={permissionSettings[menu] || '권한없음'}
                    onChange={(e) => setPermissionSettings(prev => ({
                      ...prev,
                      [menu]: e.target.value
                    }))}
                    label={menu}
                  >
                    {permissionOptions.map((option) => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialog({ open: false, member: null })}>
            취소
          </Button>
          <Button onClick={savePermissions} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 역할 변경 다이얼로그 */}
      <Dialog 
        open={roleDialog.open} 
        onClose={() => setRoleDialog({ open: false, member: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          역할 변경 - {roleDialog.member?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                역할 선택
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>역할</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  label="역할"
                >
                  {Object.entries(roles).map(([role, { label, hidden }]) => (
                    <MenuItem key={role} value={role} disabled={hidden}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {selectedRole === 'team' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>팀 등급</InputLabel>
                  <Select
                    value={selectedTeamGrade}
                    onChange={(e) => setSelectedTeamGrade(e.target.value)}
                    label="팀 등급"
                  >
                    {teamGrades.map((grade) => (
                      <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog({ open: false, member: null })}>
            취소
          </Button>
          <Button onClick={saveRoleChange} variant="contained">
            저장
          </Button>
                 </DialogActions>
       </Dialog>

       {/* 승인 다이얼로그 */}
       <Dialog 
         open={approvalDialog.open} 
         onClose={() => setApprovalDialog({ open: false, member: null })}
         maxWidth="md"
         fullWidth
       >
         <DialogTitle>
           회원 승인 - {approvalDialog.member?.name}
         </DialogTitle>
         <DialogContent>
           <Grid container spacing={2} sx={{ mt: 1 }}>
             <Grid item xs={12}>
               <Typography variant="h6" gutterBottom>
                 승인할 역할 선택
               </Typography>
             </Grid>
             <Grid item xs={12}>
               <FormControl fullWidth>
                 <InputLabel>역할</InputLabel>
                 <Select
                   value={approvalRole}
                   onChange={(e) => setApprovalRole(e.target.value)}
                   label="역할"
                 >
                   {Object.entries(roles).filter(([role, { hidden }]) => !hidden).map(([role, { label }]) => (
                     <MenuItem key={role} value={role}>{label}</MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Grid>
             {approvalRole === 'team' && (
               <Grid item xs={12}>
                 <FormControl fullWidth>
                   <InputLabel>팀 등급</InputLabel>
                   <Select
                     value={approvalTeamGrade}
                     onChange={(e) => setApprovalTeamGrade(e.target.value)}
                     label="팀 등급"
                   >
                     {teamGrades.map((grade) => (
                       <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                     ))}
                   </Select>
                 </FormControl>
               </Grid>
             )}
           </Grid>
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setApprovalDialog({ open: false, member: null })}>
             취소
           </Button>
           <Button onClick={handleApproval} variant="contained" color="success">
             승인
           </Button>
         </DialogActions>
       </Dialog>
     </Box>
   );
 };

export default Members; 