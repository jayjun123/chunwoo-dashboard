import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const Notifications = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [openSettings, setOpenSettings] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    notificationTypes: {
      safety: true,
      schedule: true,
      document: true,
      system: true,
    },
  });
  const [selectedType, setSelectedType] = useState('all');

  const notificationTypes = {
    safety: {
      label: '안전관리',
      icon: <WarningIcon color="error" />,
    },
    schedule: {
      label: '일정',
      icon: <EventIcon color="primary" />,
    },
    document: {
      label: '문서',
      icon: <AssignmentIcon color="info" />,
    },
    system: {
      label: '시스템',
      icon: <InfoIcon color="action" />,
    },
  };

  useEffect(() => {
    loadNotifications();
    loadSettings();
  }, []);

  const loadNotifications = () => {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(notificationsData);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('알림 로드 실패:', error);
      setError('알림을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDocs(collection(db, 'notificationSettings'));
      if (!settingsDoc.empty) {
        setSettings(settingsDoc.docs[0].data());
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
      setError('알림 설정을 불러오는데 실패했습니다.');
    }
  };

  const handleOpenSettings = () => {
    setOpenSettings(true);
  };

  const handleCloseSettings = () => {
    setOpenSettings(false);
  };

  const handleSettingsChange = async (e) => {
    const { name, checked } = e.target;
    const newSettings = {
      ...settings,
      [name]: checked,
    };
    setSettings(newSettings);

    try {
      const settingsRef = doc(db, 'notificationSettings', 'settings');
      await updateDoc(settingsRef, newSettings);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setError('알림 설정을 저장하는데 실패했습니다.');
    }
  };

  const handleNotificationTypeChange = async (type) => {
    const newSettings = {
      ...settings,
      notificationTypes: {
        ...settings.notificationTypes,
        [type]: !settings.notificationTypes[type],
      },
    };
    setSettings(newSettings);

    try {
      const settingsRef = doc(db, 'notificationSettings', 'settings');
      await updateDoc(settingsRef, newSettings);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setError('알림 설정을 저장하는데 실패했습니다.');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('알림 삭제 실패:', error);
      setError('알림을 삭제하는데 실패했습니다.');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('알림 상태 업데이트 실패:', error);
      setError('알림 상태를 업데이트하는데 실패했습니다.');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (selectedType === 'all') return true;
    return notification.type === selectedType;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          알림
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={handleOpenSettings}
        >
          알림 설정
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>알림 유형</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                label="알림 유형"
              >
                <MenuItem value="all">전체 알림</MenuItem>
                {Object.entries(notificationTypes).map(([type, { label }]) => (
                  <MenuItem key={type} value={type}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <List>
        {filteredNotifications.map((notification) => (
          <Paper key={notification.id} sx={{ mb: 2 }}>
            <ListItem
              alignItems="flex-start"
              sx={{
                bgcolor: notification.read ? 'inherit' : 'action.hover',
              }}
            >
              <ListItemIcon>
                {notificationTypes[notification.type]?.icon || <NotificationsIcon />}
              </ListItemIcon>
              <ListItemText
                primary={notification.title}
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                    >
                      {notification.message}
                    </Typography>
                    <br />
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </Typography>
                  </>
                }
              />
              <ListItemSecondaryAction>
                {!notification.read && (
                  <IconButton
                    edge="end"
                    onClick={() => handleMarkAsRead(notification.id)}
                    sx={{ mr: 1 }}
                  >
                    <NotificationsOffIcon />
                  </IconButton>
                )}
                <IconButton
                  edge="end"
                  onClick={() => handleDeleteNotification(notification.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>

      <Dialog open={openSettings} onClose={handleCloseSettings} maxWidth="sm" fullWidth>
        <DialogTitle>알림 설정</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              알림 수신 방법
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={handleSettingsChange}
                  name="emailNotifications"
                />
              }
              label="이메일 알림"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.pushNotifications}
                  onChange={handleSettingsChange}
                  name="pushNotifications"
                />
              }
              label="푸시 알림"
            />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              알림 유형
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(notificationTypes).map(([type, { label }]) => (
                <Grid item xs={12} key={type}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notificationTypes[type]}
                        onChange={() => handleNotificationTypeChange(type)}
                      />
                    }
                    label={label}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Notifications; 