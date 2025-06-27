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
} from '@mui/material';
import {
  Person as PersonIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const Members = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
    permissions: [],
    status: '활성',
  });
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const [editedGrades, setEditedGrades] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const grades = ['마스터', '관리자', '대마팀', '일반회원', '예정'];

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
      setEditedGrades({});
    } catch (error) {
      console.error('회원 목록 조회 실패:', error);
      setError('회원 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleGradeChange = (memberId, newGrade) => {
    setEditedGrades(prev => ({ ...prev, [memberId]: newGrade }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(editedGrades);
      for (const [memberId, newGrade] of updates) {
        const memberRef = doc(db, 'members', memberId);
        await updateDoc(memberRef, {
          grade: newGrade,
          role: newGrade === '마스터' ? 'admin' :
                newGrade === '관리자' ? 'admin' :
                newGrade === '대마팀' ? 'team' : 'user'
        });
      }
      await fetchMembers();
      setError('');
    } catch (error) {
      console.error('회원 등급 변경 실패:', error);
      setError('회원 등급 변경에 실패했습니다.');
    }
    setIsSaving(false);
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case '마스터': return 'error';
      case '관리자': return 'warning';
      case '대마팀': return 'info';
      case '일반회원': return 'default';
      case '예정': return 'secondary';
      default: return 'default';
    }
  };

  const handleOpen = (member = null) => {
    if (member) {
      setSelectedMember(member);
      setFormData({
        name: member.name,
        role: member.role,
        department: member.department,
        email: member.email,
        phone: member.phone,
        permissions: member.permissions,
        status: member.status,
      });
    } else {
      setSelectedMember(null);
      setFormData({
        name: '',
        role: '일반',
        department: '',
        email: '',
        phone: '',
        permissions: ['대시보드'],
        status: '활성',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedMember(null);
  };

  const handleSubmit = () => {
    if (selectedMember) {
      // 수정
      setMembers(members.map(member =>
        member.id === selectedMember.id ? { ...member, ...formData } : member
      ));
    } else {
      // 추가
      setMembers([...members, {
        id: Date.now(),
        ...formData,
        joinDate: format(new Date(), 'yyyy-MM-dd'),
      }]);
    }
    handleClose();
  };

  const handleDelete = (id) => {
    setMembers(members.filter(member => member.id !== id));
  };

  const roles = ['관리자', '일반'];
  const departments = ['시공팀', '안전팀', '자재팀', '설계팀', '기타'];
  const allPermissions = ['대시보드', '멤버관리', '문서관리', '보고서', '비용관리', '공급업체관리'];
  const statuses = ['활성', '비활성'];

  const getStatusColor = (status) => {
    return status === '활성' ? 'success' : 'error';
  };

  if (!currentUser || (currentUser.grade !== '마스터' && currentUser.grade !== '관리자')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">접근 권한이 없습니다.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Typography variant="h4" gutterBottom>
        회원 관리
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 통계 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                전체 멤버
              </Typography>
              <Typography variant="h4">
                {members.length}명
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                활성 멤버
              </Typography>
              <Typography variant="h4">
                {members.filter(member => member.status === '활성').length}명
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
                {members.filter(member => member.role === '관리자').length}명
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 멤버 목록 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">멤버 목록</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            멤버 추가
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>이름</TableCell>
                <TableCell>이메일</TableCell>
                <TableCell>등급</TableCell>
                <TableCell>가입일</TableCell>
                <TableCell>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                      {member.name}
                    </Box>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={editedGrades[member.id] || member.grade || '일반회원'} 
                      color={getGradeColor(editedGrades[member.id] || member.grade)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {member.createdAt ? new Date(member.createdAt.toDate()).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={editedGrades[member.id] || member.grade || '일반회원'}
                        onChange={(e) => handleGradeChange(member.id, e.target.value)}
                        disabled={currentUser.grade !== '마스터' && member.grade === '마스터'}
                      >
                        {grades.map((grade) => (
                          <MenuItem key={grade} value={grade}>
                            {grade}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 멤버 추가/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedMember ? '멤버 수정' : '멤버 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="이름"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <FormControl>
              <InputLabel>역할</InputLabel>
              <Select
                value={formData.role}
                label="역할"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                {roles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>부서</InputLabel>
              <Select
                value={formData.department}
                label="부서"
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                {departments.map((department) => (
                  <MenuItem key={department} value={department}>
                    {department}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="이메일"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="연락처"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <FormControl>
              <InputLabel>권한</InputLabel>
              <Select
                multiple
                value={formData.permissions}
                label="권한"
                onChange={(e) => setFormData({ ...formData, permissions: e.target.value })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {allPermissions.map((permission) => (
                  <MenuItem key={permission} value={permission}>
                    {permission}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                label="상태"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedMember ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isSaving || Object.keys(editedGrades).length === 0}
        >
          저장
        </Button>
      </Box>
    </Box>
  );
};

export default Members; 