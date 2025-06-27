import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    profile: {
      name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      avatar: '',
    },
    notifications: {
      email: true,
      push: true,
      safety: true,
      schedule: true,
      document: true,
      system: true,
    },
    system: {
      language: 'ko',
      theme: 'light',
      timezone: 'Asia/Seoul',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginAttempts: 5,
    },
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [backupProgress, setBackupProgress] = useState(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDocs(collection(db, 'settings'));
      if (!settingsDoc.empty) {
        setSettings(settingsDoc.docs[0].data());
      }
      setLoading(false);
    } catch (error) {
      console.error('설정 로드 실패:', error);
      setError('설정을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSettingChange = async (category, setting, value) => {
    try {
      const newSettings = {
        ...settings,
        [category]: {
          ...settings[category],
          [setting]: value,
        },
      };
      setSettings(newSettings);

      const settingsRef = doc(db, 'settings', 'settings');
      await updateDoc(settingsRef, newSettings);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setError('설정을 저장하는데 실패했습니다.');
    }
  };

  const handleOpenDialog = (type) => {
    setDialogType(type);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogType('');
  };

  const handleBackup = async () => {
    try {
      setBackupProgress(0);
      // 백업 로직 구현
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setBackupProgress(i);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('백업 실패:', error);
      setError('백업에 실패했습니다.');
    }
  };

  const handleRestore = async () => {
    try {
      setBackupProgress(0);
      // 복원 로직 구현
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setBackupProgress(i);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('복원 실패:', error);
      setError('복원에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        설정
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PersonIcon />} label="프로필" />
          <Tab icon={<NotificationsIcon />} label="알림" />
          <Tab icon={<SettingsIcon />} label="시스템" />
          <Tab icon={<SecurityIcon />} label="보안" />
          <Tab icon={<BackupIcon />} label="백업/복원" />
          <Tab icon={<HistoryIcon />} label="로그" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Card>
          <CardHeader
            title="프로필 설정"
            action={
              <IconButton>
                <EditIcon />
              </IconButton>
            }
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                <Avatar
                  src={settings.profile.avatar}
                  sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                />
                <Button variant="outlined" startIcon={<CloudUploadIcon />}>
                  프로필 이미지 변경
                </Button>
              </Grid>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="이름"
                      value={settings.profile.name}
                      onChange={(e) => handleSettingChange('profile', 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="이메일"
                      value={settings.profile.email}
                      onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="전화번호"
                      value={settings.profile.phone}
                      onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="직위"
                      value={settings.profile.position}
                      onChange={(e) => handleSettingChange('profile', 'position', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="부서"
                      value={settings.profile.department}
                      onChange={(e) => handleSettingChange('profile', 'department', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardHeader title="알림 설정" />
          <CardContent>
            <List>
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="이메일 알림"
                  secondary="이메일로 알림을 받습니다"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.notifications.email}
                    onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="푸시 알림"
                  secondary="브라우저 푸시 알림을 받습니다"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.notifications.push}
                    onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="안전관리 알림"
                  secondary="안전관리 관련 알림을 받습니다"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.notifications.safety}
                    onChange={(e) => handleSettingChange('notifications', 'safety', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="일정 알림"
                  secondary="일정 관련 알림을 받습니다"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.notifications.schedule}
                    onChange={(e) => handleSettingChange('notifications', 'schedule', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardHeader title="시스템 설정" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>언어</InputLabel>
                  <Select
                    value={settings.system.language}
                    onChange={(e) => handleSettingChange('system', 'language', e.target.value)}
                    label="언어"
                  >
                    <MenuItem value="ko">한국어</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="ja">日本語</MenuItem>
                    <MenuItem value="zh">中文</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>테마</InputLabel>
                  <Select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    label="테마"
                  >
                    <MenuItem value="light">라이트</MenuItem>
                    <MenuItem value="dark">다크</MenuItem>
                    <MenuItem value="system">시스템</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>시간대</InputLabel>
                  <Select
                    value={settings.system.timezone}
                    onChange={(e) => handleSettingChange('system', 'timezone', e.target.value)}
                    label="시간대"
                  >
                    <MenuItem value="Asia/Seoul">서울 (UTC+9)</MenuItem>
                    <MenuItem value="Asia/Tokyo">도쿄 (UTC+9)</MenuItem>
                    <MenuItem value="America/New_York">뉴욕 (UTC-5)</MenuItem>
                    <MenuItem value="Europe/London">런던 (UTC+0)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>날짜 형식</InputLabel>
                  <Select
                    value={settings.system.dateFormat}
                    onChange={(e) => handleSettingChange('system', 'dateFormat', e.target.value)}
                    label="날짜 형식"
                  >
                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardHeader title="보안 설정" />
          <CardContent>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText
                  primary="2단계 인증"
                  secondary="로그인 시 추가 인증을 요구합니다"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.security.twoFactor}
                    onChange={(e) => handleSettingChange('security', 'twoFactor', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText
                  primary="세션 타임아웃"
                  secondary="자동 로그아웃 시간을 설정합니다"
                />
                <ListItemSecondaryAction>
                  <Select
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleSettingChange('security', 'sessionTimeout', e.target.value)}
                    size="small"
                  >
                    <MenuItem value={15}>15분</MenuItem>
                    <MenuItem value={30}>30분</MenuItem>
                    <MenuItem value={60}>1시간</MenuItem>
                    <MenuItem value={120}>2시간</MenuItem>
                  </Select>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {activeTab === 4 && (
        <Card>
          <CardHeader title="백업 및 복원" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      데이터 백업
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      모든 데이터를 백업 파일로 저장합니다.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<CloudDownloadIcon />}
                      onClick={() => handleOpenDialog('backup')}
                    >
                      백업 시작
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      데이터 복원
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      백업 파일에서 데이터를 복원합니다.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      onClick={() => handleOpenDialog('restore')}
                    >
                      복원 시작
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 5 && (
        <Card>
          <CardHeader title="시스템 로그" />
          <CardContent>
            <List>
              <ListItem>
                <ListItemIcon>
                  <HistoryIcon />
                </ListItemIcon>
                <ListItemText
                  primary="로그 보관 기간"
                  secondary="시스템 로그를 보관하는 기간을 설정합니다"
                />
                <ListItemSecondaryAction>
                  <Select
                    value={30}
                    size="small"
                  >
                    <MenuItem value={7}>7일</MenuItem>
                    <MenuItem value={30}>30일</MenuItem>
                    <MenuItem value={90}>90일</MenuItem>
                    <MenuItem value={365}>1년</MenuItem>
                  </Select>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <HistoryIcon />
                </ListItemIcon>
                <ListItemText
                  primary="로그 다운로드"
                  secondary="시스템 로그를 파일로 다운로드합니다"
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CloudDownloadIcon />}
                  >
                    다운로드
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {dialogType === 'backup' ? '데이터 백업' : '데이터 복원'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              {dialogType === 'backup' ? '데이터를 백업하는 중입니다...' : '데이터를 복원하는 중입니다...'}
            </Typography>
            <LinearProgress variant="determinate" value={backupProgress} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings; 