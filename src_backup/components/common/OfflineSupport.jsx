import { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useLoading } from './LoadingProvider';

const OfflineSupport = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { setLoading, setLoadingMessage } = useLoading();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLoadingMessage('온라인 상태로 복귀했습니다.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLoadingMessage('오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Snackbar
      open={!isOnline}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="warning" sx={{ width: '100%' }}>
        오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.
      </Alert>
    </Snackbar>
  );
};

export default OfflineSupport; 