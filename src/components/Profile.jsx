import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const Profile = () => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // 프로필 수정용 상태
  const [profileData, setProfileData] = useState({
    name: '',
    organization: '',
    email: ''
  });

  // 비밀번호 변경용 상태
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || currentUser.displayName || '',
        organization: currentUser.organization || '',
        email: currentUser.email || ''
      });
    }
  }, [currentUser]);

  const handleProfileEdit = () => {
    setIsEditing(true);
  };

  const handleProfileCancel = () => {
    setProfileData({
      name: currentUser.name || currentUser.displayName || '',
      organization: currentUser.organization || '',
      email: currentUser.email || ''
    });
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  const handleProfileSave = async () => {
    if (!profileData.name.trim() || !profileData.organization.trim()) {
      setMessage({ type: 'error', text: '이름과 소속은 필수 입력 항목입니다.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Firestore 업데이트
      await updateDoc(doc(db, 'members', currentUser.uid), {
        name: profileData.name.trim(),
        organization: profileData.organization.trim(),
        updatedAt: new Date()
      });

      setMessage({ type: 'success', text: '프로필이 성공적으로 업데이트되었습니다.' });
      setIsEditing(false);
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      setMessage({ type: 'error', text: '프로필 업데이트에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: '모든 비밀번호 필드를 입력해주세요.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: '새 비밀번호는 6자 이상이어야 합니다.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // 현재 사용자 재인증
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // 비밀번호 변경
      await updatePassword(currentUser, passwordData.newPassword);

      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('비밀번호 변경 실패:', error);
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: '현재 비밀번호가 올바르지 않습니다.' });
      } else {
        setMessage({ type: 'error', text: '비밀번호 변경에 실패했습니다.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordCancel = () => {
    setIsChangingPassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setMessage({ type: '', text: '' });
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>사용자 정보를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      p: 3,
      maxWidth: 800,
      mx: 'auto',
      mt: { xs: '10px', md: 0 }
    }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          mb: 4,
          fontSize: { xs: '1.3rem', md: '2.125rem' },
          lineHeight: 1.2
        }}
      >
        회원 프로필
      </Typography>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 프로필 정보 카드 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" component="h2">
                  기본 정보
                </Typography>
                {!isEditing ? (
                  <IconButton onClick={handleProfileEdit} color="primary">
                    <EditIcon />
                  </IconButton>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={handleProfileSave} color="primary" disabled={loading}>
                      <SaveIcon />
                    </IconButton>
                    <IconButton onClick={handleProfileCancel} color="error">
                      <CancelIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="이름"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="소속"
                    value={profileData.organization}
                    onChange={(e) => setProfileData({ ...profileData, organization: e.target.value })}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="이메일"
                    value={profileData.email}
                    disabled
                    InputProps={{
                      startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    helperText="이메일은 변경할 수 없습니다"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 프로필 아바타 및 권한 정보 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{
              textAlign: 'center',
              p: { xs: 1.5, md: 2 },
            }}>
              <Avatar
                src={currentUser.photoURL}
                alt={currentUser.name || currentUser.displayName}
                sx={{ width: 100, height: 100, mx: 'auto', mb: 1.2 }}
              />
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontSize: { xs: '1.05rem', md: '1.25rem' },
                  mb: { xs: 0.5, md: 1.5 }
                }}
              >
                {currentUser.name || currentUser.displayName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                gutterBottom
                sx={{
                  fontSize: { xs: '0.85rem', md: '1rem' },
                  mb: { xs: 0.5, md: 1.5 }
                }}
              >
                {currentUser.organization}
              </Typography>
              <Divider sx={{ my: { xs: 1, md: 2 } }} />
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.5, md: 1 } }}>
                  <SecurityIcon sx={{ mr: 1, fontSize: 16 }} />
                  권한: {currentUser.role === 'team' ? 
                    (currentUser.teamGrade === 'B' ? 'TEAM B' : 
                     currentUser.teamGrade === 'A' ? 'TEAM A' : 'TEAM') :
                   currentUser.role === 'admin' ? 'ADMIN' :
                   currentUser.role === 'master' ? 'MASTER' : 'USER'}
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.5, md: 1 } }}>
                  <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                  등급: {currentUser.role === 'team' ? 
                    (currentUser.teamGrade === 'B' ? 'TEAM B' : 
                     currentUser.teamGrade === 'A' ? 'TEAM A' : 'TEAM') :
                   currentUser.role === 'admin' ? 'ADMIN' :
                   currentUser.role === 'master' ? 'MASTER' : 'USER'}
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon sx={{ mr: 1, fontSize: 16 }} />
                  가입일: {currentUser.createdAt ? new Date(currentUser.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 비밀번호 변경 버튼 */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setIsChangingPassword(true)}
                sx={{ mb: 2 }}
              >
                비밀번호 변경
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={isChangingPassword} onClose={handlePasswordCancel} maxWidth="sm" fullWidth>
        <DialogTitle>비밀번호 변경</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="현재 비밀번호"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="새 비밀번호"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              margin="normal"
              required
              helperText="6자 이상 입력해주세요"
            />
            <TextField
              fullWidth
              label="새 비밀번호 확인"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              margin="normal"
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePasswordCancel}>취소</Button>
          <Button 
            onClick={handlePasswordChange} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? '변경 중...' : '변경'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile; 