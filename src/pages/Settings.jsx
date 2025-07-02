import React, { useState, useEffect, useContext } from 'react';
import Layout from '../components/Layout';
import {
  Box, Grid, Paper, Typography, Switch, FormControlLabel, TextField,
  Button, Divider, List, ListItem, ListItemText, ListItemIcon,
  IconButton, Avatar, Card, CardContent, Select, MenuItem,
  InputLabel, FormControl, Alert, Snackbar, CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      daily: true,
      weekly: true,
      siteUpdates: true,
      safetyAlerts: true
    },
    appearance: {
      theme: 'light',
      fontSize: 'medium',
      density: 'comfortable'
    },
    language: 'ko',
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      passwordExpiry: 90
    }
  });
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    avatar: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // fire8803@naver.com은 무조건 마스터 권한
  const isMaster = currentUser?.email === 'fire8803@naver.com' || currentUser?.grade === '마스터';

  useEffect(() => {
    fetchSettings();
  }, [currentUser]);

  const fetchSettings = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Firestore에서 사용자 정보 fetch
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSettings(data.settings || settings);
        setProfile(data.profile || profile);
        // fire8803@naver.com은 무조건 마스터로 동기화
        if (currentUser.email === 'fire8803@naver.com' && data.grade !== '마스터') {
          await updateDoc(doc(db, 'users', currentUser.uid), { grade: '마스터' });
        }
      } else {
        // 신규 유저면 기본값 저장
        await setDoc(doc(db, 'users', currentUser.uid), {
          settings,
          profile,
          grade: currentUser.email === 'fire8803@naver.com' ? '마스터' : '일반회원'
        });
      }
      setLoading(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '설정을 불러오는데 실패했습니다.',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        settings,
        profile
      });
      setSnackbar({
        open: true,
        message: '설정이 저장되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '설정 저장에 실패했습니다.',
        severity: 'error'
      });
    }
    setSaving(false);
  };

  const handleNotificationChange = (key) => (event) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: event.target.checked
      }
    }));
  };

  const handleAppearanceChange = (key) => (event) => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [key]: event.target.value
      }
    }));
  };

  const handleProfileChange = (key) => (event) => {
    setProfile(prev => ({
      ...prev,
      [key]: event.target.value
    }));
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>설정</Typography>
        <Grid container spacing={3}>
          {/* 프로필 */}
          <Grid>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                  <Avatar src={profile.avatar} sx={{ width: 80, height: 80, mb: 1 }} />
                  <Typography variant="h6">{profile.name || '이름 없음'}</Typography>
                  <Typography variant="body2" color="textSecondary">{profile.email || currentUser.email}</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <List>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText
                      primary="이름"
                      secondary={
                        <TextField
                          fullWidth
                          value={profile.name ?? ''}
                          onChange={handleProfileChange('name')}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText
                      primary="이메일"
                      secondary={
                        <TextField
                          fullWidth
                          value={profile.email ?? currentUser.email}
                          onChange={handleProfileChange('email')}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText
                      primary="연락처"
                      secondary={
                        <TextField
                          fullWidth
                          value={profile.phone ?? ''}
                          onChange={handleProfileChange('phone')}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText
                      primary="부서"
                      secondary={
                        <TextField
                          fullWidth
                          value={profile.department ?? ''}
                          onChange={handleProfileChange('department')}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText
                      primary="직위"
                      secondary={
                        <TextField
                          fullWidth
                          value={profile.position ?? ''}
                          onChange={handleProfileChange('position')}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* 설정 섹션 */}
          <Grid>
            <Grid container spacing={3}>
              {/* 알림 설정 */}
              <Grid>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <NotificationsIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">알림 설정</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.notifications.email}
                            onChange={handleNotificationChange('email')}
                          />
                        }
                        label="이메일 알림"
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.notifications.push}
                            onChange={handleNotificationChange('push')}
                          />
                        }
                        label="푸시 알림"
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.notifications.daily}
                            onChange={handleNotificationChange('daily')}
                          />
                        }
                        label="일일 요약"
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.notifications.weekly}
                            onChange={handleNotificationChange('weekly')}
                          />
                        }
                        label="주간 보고서"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* 외관 설정 */}
              <Grid>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PaletteIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">외관 설정</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid>
                      <FormControl fullWidth>
                        <InputLabel>테마</InputLabel>
                        <Select
                          value={settings.appearance.theme}
                          onChange={handleAppearanceChange('theme')}
                          label="테마"
                        >
                          <MenuItem value="light">라이트</MenuItem>
                          <MenuItem value="dark">다크</MenuItem>
                          <MenuItem value="system">시스템</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid>
                      <FormControl fullWidth>
                        <InputLabel>글자 크기</InputLabel>
                        <Select
                          value={settings.appearance.fontSize}
                          onChange={handleAppearanceChange('fontSize')}
                          label="글자 크기"
                        >
                          <MenuItem value="small">작게</MenuItem>
                          <MenuItem value="medium">보통</MenuItem>
                          <MenuItem value="large">크게</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* 보안 설정 */}
              <Grid>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SecurityIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">보안 설정</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.security.twoFactor}
                            onChange={e => setSettings(prev => ({
                              ...prev,
                              security: { ...prev.security, twoFactor: e.target.checked }
                            }))}
                          />
                        }
                        label="2단계 인증"
                      />
                    </Grid>
                    <Grid>
                      <FormControl fullWidth>
                        <InputLabel>세션 타임아웃</InputLabel>
                        <Select
                          value={settings.security.sessionTimeout}
                          onChange={e => setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, sessionTimeout: e.target.value }
                          }))}
                          label="세션 타임아웃"
                        >
                          <MenuItem value={15}>15분</MenuItem>
                          <MenuItem value={30}>30분</MenuItem>
                          <MenuItem value={60}>1시간</MenuItem>
                          <MenuItem value={120}>2시간</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* 저장 버튼 */}
          <Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '설정 저장'}
              </Button>
            </Box>
          </Grid>
        </Grid>

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
    </Layout>
  );
};

export default Settings; 