import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link as MuiLink,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const navigate = useNavigate();
  
  // useAuth 훅 사용 시 에러 처리
  let auth = null;
  try {
    auth = useAuth();
  } catch (error) {
    console.error('AuthContext 에러:', error);
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Alert severity="error">
          인증 시스템을 초기화할 수 없습니다. 페이지를 새로고침해주세요.
        </Alert>
      </Box>
    );
  }

  const { login, loginWithGoogle } = auth;

  // 컴포넌트 마운트 시 저장된 이메일 불러오기
  React.useEffect(() => {

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      
      // 로그인 성공 시 이메일 저장 처리
      if (rememberEmail) {

      } else {
        
      }
      
      navigate('/');
    } catch (err) {
      console.error('로그인 에러:', err);
      
      // Firebase 인증 오류 코드별 메시지
      let errorMessage = '로그인에 실패했습니다.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = '등록되지 않은 이메일입니다.';
          break;
        case 'auth/wrong-password':
          errorMessage = '비밀번호가 올바르지 않습니다.';
          break;
        case 'auth/invalid-email':
          errorMessage = '올바르지 않은 이메일 형식입니다.';
          break;
        case 'auth/user-disabled':
          errorMessage = '비활성화된 계정입니다.';
          break;
        case 'auth/too-many-requests':
          errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
          break;
        case 'auth/network-request-failed':
          errorMessage = '네트워크 연결을 확인해주세요.';
          break;
        case 'auth/invalid-api-key':
        case 'auth/api-key-not-valid':
          errorMessage = 'Firebase 설정에 문제가 있습니다. 관리자에게 문의하세요.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = '이 로그인 방법이 허용되지 않습니다.';
          break;
        case 'auth/weak-password':
          errorMessage = '비밀번호가 너무 약합니다.';
          break;
        default:
          errorMessage = err.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: 2,
        position: 'relative',
      }}
    >
      {/* PC 버전 알림 문구 */}
      {!isMobile && (
        <Box
          sx={{
            position: 'fixed',
            top: '140px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 123, 255, 0.1)',
            color: '#007bff',
            padding: '20px 80px',
            borderRadius: '8px',
            fontSize: '21px',
            fontWeight: '500',
            textAlign: 'center',
            maxWidth: '600px',
            boxShadow: '0 2px 8px rgba(0, 123, 255, 0.2)',
            zIndex: 1000,
            border: '1px solid rgba(0, 123, 255, 0.3)'
          }}
        >
          🏗️ 천우건업(주) 현장관리시스템
        </Box>
      )}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 2,
          bgcolor: 'background.paper',
          position: 'relative',
        }}
      >
        {/* 모바일에서만 보이는 알림 글 */}
        {isMobile && (
          <Box
            sx={{
              position: 'absolute',
              top: -80,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              width: '100%',
              maxWidth: 350,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: '#1976d2',
                fontSize: '1.21rem',
                lineHeight: 1.4,
                mb: 1,
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              🏗️ 천우건업(주) 현장관리시스템
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#666',
                fontSize: '0.94rem',
                fontWeight: 500,
                opacity: 0.9,
              }}
            >
              안전하고 효율적인 건설 현장 관리의 새로운 기준
            </Typography>
          </Box>
        )}
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ 
            fontWeight: 'bold',
            mb: 3,
            color: 'primary.main'
          }}
        >
          로그인
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoComplete="email"
            error={!!error}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
            error={!!error}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                color="primary"
              />
            }
            label="아이디 저장"
            sx={{ 
              mb: 2,
              '& .MuiFormControlLabel-label': {
                fontSize: '0.9rem',
                color: 'text.secondary'
              }
            }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            sx={{ 
              height: 48,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              mb: 2
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : '로그인'}
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <MuiLink 
            component={Link} 
            to="/forgot-password" 
            variant="body2"
            sx={{ 
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' }
            }}
          >
            비밀번호를 잊으셨나요?
          </MuiLink>
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            계정이 없으신가요?{' '}
            <MuiLink 
              component={Link} 
              to="/register"
              sx={{ 
                color: 'primary.main',
                fontWeight: 'bold',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              회원가입
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login; 