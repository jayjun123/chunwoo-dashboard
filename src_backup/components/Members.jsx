import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const gradeOptions = ['마스터', '관리자', '대마팀', '일반회원', '예정'];

const Members = () => {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    position: '',
    status: '활성',
    joinDate: '',
    profileImage: '',
    description: ''
  });
  const { currentUser } = useAuth();
  const isAdmin = currentUser && (currentUser.grade === '마스터' || currentUser.grade === '관리자' || currentUser.role === '마스터' || currentUser.role === '관리자' || currentUser.email === 'fire8803@naver.com' || currentUser.uid === 'HpF5IrlTscYbWPsUhtdzV05sjbF2');

  useEffect(() => {
    fetchMembers();
    fetchRoles();
  }, []);

  const fetchMembers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'members'));
      const memberList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMembers(memberList);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'roles'));
      const roleList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRoles(roleList);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleOpen = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData(member);
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        department: '',
        position: '',
        status: '활성',
        joinDate: '',
        profileImage: '',
        description: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingMember(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await updateDoc(doc(db, 'members', editingMember.id), formData);
      } else {
        await addDoc(collection(db, 'members'), formData);
      }
      handleClose();
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
    }
  };

  const handleDelete = async (memberId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'members', memberId));
        fetchMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '활성':
        return 'success';
      case '휴직':
        return 'warning';
      case '퇴사':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : '미지정';
  };

  const handleGradeChange = async (member, newGrade) => {
    try {
      await updateDoc(doc(db, 'members', member.id), { grade: newGrade });
      fetchMembers();
    } catch (error) {
      alert('등급 변경 실패');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">멤버 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          멤버 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>프로필</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>연락처</TableCell>
              <TableCell>부서</TableCell>
              <TableCell>직책</TableCell>
              <TableCell>등급</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <Avatar src={member.profileImage}>
                    {member.name[0]}
                  </Avatar>
                </TableCell>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>{member.department}</TableCell>
                <TableCell>{member.position}</TableCell>
                <TableCell>
                  {isAdmin && member.grade !== '마스터' ? (
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={member.grade || '예정'}
                        onChange={e => handleGradeChange(member, e.target.value)}
                        disabled={member.grade === '마스터'}
                      >
                        {gradeOptions.map(opt => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip label={member.grade || '예정'} size="small" />
                  )}
                  {isAdmin && member.grade === '예정' && (
                    <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={() => handleGradeChange(member, '일반회원')}>승인</Button>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={member.status}
                    color={getStatusColor(member.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpen(member)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(member.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMember ? '멤버 수정' : '새 멤버 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="이름"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="연락처"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>역할</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="역할"
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="부서"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="직책"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="상태"
              >
                <MenuItem value="활성">활성</MenuItem>
                <MenuItem value="휴직">휴직</MenuItem>
                <MenuItem value="퇴사">퇴사</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="입사일"
              type="date"
              value={formData.joinDate}
              onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="프로필 이미지 URL"
              value={formData.profileImage}
              onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingMember ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Members; 