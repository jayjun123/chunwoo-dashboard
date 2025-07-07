import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Container,
  Alert,
  AlertTitle
} from '@mui/material';
import { 
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon
} from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // 에러 로깅 서비스에 전송 (선택사항)
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}
          >
            <Box sx={{ mb: 3 }}>
              <ErrorIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.9)' }} />
            </Box>
            
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
              오류가 발생했습니다
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
              {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
            </Typography>

            <Alert 
              severity="info" 
              sx={{ 
                mb: 3, 
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' }
              }}
            >
              <AlertTitle sx={{ color: 'white' }}>문제 해결 방법</AlertTitle>
              페이지를 새로고침하거나 홈으로 돌아가서 다시 시도해보세요.
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  }
                }}
              >
                페이지 새로고침
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={() => window.location.href = '/'}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                홈으로 이동
              </Button>
            </Box>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Box sx={{ mt: 4, textAlign: 'left' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
                  개발자 정보 (개발 모드에서만 표시)
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)', maxHeight: 200, overflow: 'auto' }}>
                  <Typography variant="body2" component="pre" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                    {this.state.error && this.state.error.stack}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 