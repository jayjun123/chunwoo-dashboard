import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Alert, Snackbar } from '@mui/material';
import { CheckCircle, Error, Warning, CloudOff } from '@mui/icons-material';
import { dbConnectionManager, checkDatabaseConnection } from '../../api/database';

const DatabaseStatusMonitor = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // 초기 연결 상태 확인
    checkDatabaseConnection();

    // 연결 상태 리스너 추가
    const handleStatusChange = (status, error) => {
      setConnectionStatus(status);
      if (error) {
        setLastError(error);
        setShowAlert(true);
      }
      setErrorCount(dbConnectionManager.getErrorCount());
    };

    dbConnectionManager.addListener(handleStatusChange);

    // 주기적으로 연결 상태 확인 (5분마다)
    const interval = setInterval(() => {
      if (connectionStatus !== 'connected') {
        checkDatabaseConnection();
      }
    }, 5 * 60 * 1000);

    return () => {
      dbConnectionManager.removeListener(handleStatusChange);
      clearInterval(interval);
    };
  }, [connectionStatus]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle fontSize="small" />;
      case 'connecting':
        return <Warning fontSize="small" />;
      case 'error':
        return <Error fontSize="small" />;
      default:
        return <CloudOff fontSize="small" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '연결됨';
      case 'connecting':
        return '연결 중...';
      case 'error':
        return '연결 오류';
      default:
        return '연결 끊김';
    }
  };

  const handleRetryConnection = () => {
    checkDatabaseConnection();
  };

  const handleCloseAlert = () => {
    setShowAlert(false);
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Chip
          icon={getStatusIcon()}
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          onClick={handleRetryConnection}
          sx={{ cursor: 'pointer' }}
        />
        {errorCount > 0 && (
          <Typography variant="caption" color="text.secondary">
            오류: {errorCount}회
          </Typography>
        )}
      </Box>

      <Snackbar
        open={showAlert}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity="error"
          sx={{ width: '100%' }}
        >
          데이터베이스 연결 오류가 발생했습니다.
          {lastError && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {lastError.message}
            </Typography>
          )}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DatabaseStatusMonitor; 