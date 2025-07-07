import React, { createContext, useContext, useState } from 'react';
import { 
  Backdrop, 
  CircularProgress, 
  Typography, 
  Box,
  Fade,
  LinearProgress,
  Button
} from '@mui/material';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingType, setLoadingType] = useState('spinner'); // 'spinner' | 'linear' | 'button'

  const showLoading = (message = '', type = 'spinner', progress = 0) => {
    setLoading(true);
    setLoadingMessage(message);
    setLoadingType(type);
    setLoadingProgress(progress);
  };

  const hideLoading = () => {
    setLoading(false);
    setLoadingMessage('');
    setLoadingProgress(0);
  };

  const updateProgress = (progress) => {
    setLoadingProgress(progress);
  };

  const renderLoadingContent = () => {
    switch (loadingType) {
      case 'linear':
        return (
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <LinearProgress 
              variant="determinate" 
              value={loadingProgress} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                }
              }} 
            />
            {loadingMessage && (
              <Typography variant="body1" sx={{ mt: 2, color: 'white' }}>
                {loadingMessage}
              </Typography>
            )}
            {loadingProgress > 0 && (
              <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.7)' }}>
                {Math.round(loadingProgress)}%
              </Typography>
            )}
          </Box>
        );
      
      case 'button':
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              disabled
              sx={{ 
                mb: 2,
                minWidth: 120,
                position: 'relative'
              }}
            >
              <CircularProgress 
                size={20} 
                sx={{ 
                  color: 'white',
                  position: 'absolute',
                  left: '50%',
                  marginLeft: '-10px'
                }} 
              />
              <span style={{ visibility: 'hidden' }}>처리 중...</span>
            </Button>
            {loadingMessage && (
              <Typography variant="body1" sx={{ color: 'white' }}>
                {loadingMessage}
              </Typography>
            )}
          </Box>
        );
      
      default: // spinner
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress 
              size={60} 
              thickness={4}
              sx={{ 
                color: 'white',
                mb: 2
              }} 
            />
            {loadingMessage && (
              <Typography 
                variant="h6" 
                sx={{ 
                  mt: 2, 
                  color: 'white',
                  textAlign: 'center',
                  maxWidth: 400,
                  lineHeight: 1.4
                }}
              >
                {loadingMessage}
              </Typography>
            )}
            {loadingProgress > 0 && (
              <Typography 
                variant="body2" 
                sx={{ 
                  mt: 1, 
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 500
                }}
              >
                {Math.round(loadingProgress)}% 완료
              </Typography>
            )}
          </Box>
        );
    }
  };

  return (
    <LoadingContext.Provider value={{ 
      showLoading, 
      hideLoading, 
      updateProgress,
      loading,
      loadingMessage,
      loadingProgress 
    }}>
      {children}
      <Fade in={loading} timeout={300}>
        <Backdrop
          sx={{
            color: '#fff',
            zIndex: (theme) => theme.zIndex.drawer + 2,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
          }}
          open={loading}
        >
          {renderLoadingContent()}
        </Backdrop>
      </Fade>
    </LoadingContext.Provider>
  );
};

export default LoadingProvider; 