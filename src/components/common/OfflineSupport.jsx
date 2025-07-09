import { useState, useEffect } from 'react';
import { Snackbar, Alert, Box, Typography, Button } from '@mui/material';
import { WifiOff, Wifi, Refresh } from '@mui/icons-material';
import { useLoading } from './LoadingProvider';

const OfflineSupport = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      showLoading('온라인 상태로 복귀했습니다. 데이터를 동기화하고 있습니다...', 'spinner');
      
      // 3초 후 로딩 숨김
      setTimeout(() => {
        hideLoading();
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    // 초기 상태 설정
    if (!navigator.onLine) {
      setShowOfflineAlert(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showLoading, hideLoading]);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      showLoading('네트워크 연결을 확인하고 있습니다...', 'spinner');
      setTimeout(() => {
        hideLoading();
        if (navigator.onLine) {
          window.location.reload();
        }
      }, 2000);
    }
  };

  if (isOnline) return null;

  return (
    <>
      <Snackbar
        open={showOfflineAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 9999 }}
      >
        <Alert 
          severity="warning" 
          sx={{ 
            width: '100%',
            maxWidth: 400,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetry}
              startIcon={<Refresh />}
            >
              재시도
            </Button>
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WifiOff fontSize="small" />
            <Typography variant="body2">
              오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
};

export default OfflineSupport; 