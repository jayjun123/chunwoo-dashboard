import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const RegisterSuccess = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleResendVerification = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }

      await sendEmailVerification(user);
      setSuccess('인증 이메일이 재전송되었습니다.');
    } catch (error) {
      console.error('이메일 재전송 실패:', error);
      let errorMessage = '이메일 재전송에 실패했습니다.';
      
      switch (error.code) {
        case 'auth/too-many-requests':
          errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
          break;
        case 'auth/user-not-found':
          errorMessage = '사용자 정보를 찾을 수 없습니다.';
          break;
        default:
          errorMessage = '이메일 재전송 중 오류가 발생했습니다.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            회원가입 완료
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            건설현장 관리 시스템에 가입해주셔서 감사합니다.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="body1" paragraph>
            이메일 인증이 필요합니다.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            가입하신 이메일 주소로 인증 링크를 보내드렸습니다.
            이메일을 확인하시고 인증을 완료해주세요.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            이메일을 받지 못하셨나요?
            스팸 메일함을 확인해보시거나, 아래 버튼을 클릭하여 인증 이메일을 재전송해주세요.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleResendVerification}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : '인증 이메일 재전송'}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/login')}
          >
            로그인 페이지로 이동
          </Button>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            도움이 필요하신가요?{' '}
            <Link href="/support" underline="hover">
              고객 지원
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegisterSuccess; 