import { useState, useEffect } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import { useLoading } from './LoadingProvider';

const PushNotification = () => {
  const [permission, setPermission] = useState('default');
  const [notification, setNotification] = useState(null);
  const { setLoading, setLoadingMessage } = useLoading();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    setLoading(true);
    setLoadingMessage('알림 권한 요청 중...');
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setNotification({
          type: 'success',
          message: '알림 권한이 허용되었습니다.',
        });
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      setNotification({
        type: 'error',
        message: '알림 권한 요청에 실패했습니다.',
      });
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const sendNotification = (title, options = {}) => {
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options,
      });
    }
  };

  return (
    <>
      {permission !== 'granted' && (
        <Button
          variant="contained"
          color="primary"
          onClick={requestPermission}
          sx={{ mb: 2 }}
        >
          알림 권한 요청
        </Button>
      )}

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.type}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PushNotification; 