import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Switch, FormControlLabel, Alert, Snackbar
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const PushNotification = () => {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [settings, setSettings] = useState({
    schedule: true,
    site: true,
    safety: true,
    budget: true,
    system: false
  });
  const [showDialog, setShowDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    checkNotificationPermission();
    loadNotificationSettings();
  }, [currentUser]);

  // 알림 권한 확인
  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  // 알림 설정 로드
  const loadNotificationSettings = async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().notificationSettings) {
        setSettings(userDoc.data().notificationSettings);
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
    }
  };

  // 알림 권한 요청
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setSnackbar({ open: true, message: '이 브라우저는 알림을 지원하지 않습니다.', severity: 'error' });
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        await subscribeToPushNotifications();
        setSnackbar({ open: true, message: '푸시 알림이 활성화되었습니다!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: '알림 권한이 거부되었습니다.', severity: 'warning' });
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      setSnackbar({ open: true, message: '알림 권한 요청 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 푸시 알림 구독
  const subscribeToPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSnackbar({ open: true, message: '서비스 워커를 지원하지 않는 브라우저입니다.', severity: 'error' });
      return;
    }

    try {
      // 서비스 워커 등록
      const registration = await navigator.serviceWorker.register('/serviceWorker.js');
      
      // 푸시 구독
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
      });

      setSubscription(pushSubscription);

      // 구독 정보를 서버에 저장
      await saveSubscriptionToServer(pushSubscription);
      
    } catch (error) {
      console.error('푸시 알림 구독 실패:', error);
      setSnackbar({ open: true, message: '푸시 알림 구독 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 구독 정보를 서버에 저장
  const saveSubscriptionToServer = async (pushSubscription) => {
    if (!currentUser) return;

    try {
      await setDoc(doc(db, 'pushSubscriptions', currentUser.uid), {
        userId: currentUser.uid,
        subscription: pushSubscription.toJSON(),
        createdAt: new Date(),
        settings: settings
      });
    } catch (error) {
      console.error('구독 정보 저장 실패:', error);
    }
  };

  // 알림 설정 변경
  const handleSettingChange = async (setting, value) => {
    const newSettings = { ...settings, [setting]: value };
    setSettings(newSettings);

    if (!currentUser) return;

    try {
      // 사용자 설정 저장
      await setDoc(doc(db, 'users', currentUser.uid), {
        notificationSettings: newSettings
      }, { merge: true });

      // 구독 정보 업데이트
      if (subscription) {
        await saveSubscriptionToServer(subscription);
      }

      setSnackbar({ open: true, message: '알림 설정이 저장되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
      setSnackbar({ open: true, message: '설정 저장 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  // 테스트 알림 보내기
  const sendTestNotification = () => {
    if (permission !== 'granted') {
      setSnackbar({ open: true, message: '알림 권한이 필요합니다.', severity: 'warning' });
      return;
    }

    new Notification('Chunwoo 알림', {
      body: '푸시 알림이 정상적으로 작동합니다!',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: 'test-notification'
    });

    setSnackbar({ open: true, message: '테스트 알림을 보냈습니다.', severity: 'success' });
  };

  // 알림 설정 다이얼로그
  const NotificationSettingsDialog = () => (
    <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>푸시 알림 설정</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>알림 권한</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            현재 상태: {permission === 'granted' ? '허용됨' : permission === 'denied' ? '거부됨' : '요청 필요'}
          </Typography>
          {permission !== 'granted' && (
            <Button 
              variant="contained" 
              onClick={requestPermission}
              startIcon={<NotificationsIcon />}
            >
              알림 권한 요청
            </Button>
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>알림 유형</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.schedule}
                onChange={(e) => handleSettingChange('schedule', e.target.checked)}
              />
            }
            label="일정 알림"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.site}
                onChange={(e) => handleSettingChange('site', e.target.checked)}
              />
            }
            label="현장 알림"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.safety}
                onChange={(e) => handleSettingChange('safety', e.target.checked)}
              />
            }
            label="안전 알림"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.budget}
                onChange={(e) => handleSettingChange('budget', e.target.checked)}
              />
            }
            label="예산 알림"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.system}
                onChange={(e) => handleSettingChange('system', e.target.checked)}
              />
            }
            label="시스템 알림"
          />
        </Box>

        {permission === 'granted' && (
          <Box>
            <Typography variant="h6" gutterBottom>테스트</Typography>
            <Button variant="outlined" onClick={sendTestNotification}>
              테스트 알림 보내기
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowDialog(false)}>닫기</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Button
        color="inherit"
        onClick={() => setShowDialog(true)}
        startIcon={<NotificationsIcon />}
        sx={{ ml: 1 }}
      >
        알림 설정
      </Button>

      <NotificationSettingsDialog />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PushNotification; 