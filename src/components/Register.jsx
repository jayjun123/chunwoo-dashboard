import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link as MuiLink,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 입력값 검증
    if (!email || !password || !confirmPassword || !name || !organization) {
      return setError('모든 항목을 입력해주세요.');
    }

    if (password !== confirmPassword) {
      return setError('비밀번호가 일치하지 않습니다.');
    }

    if (password.length < 6) {
      return setError('비밀번호는 6자 이상이어야 합니다.');
    }

    try {
      setError('');
      setLoading(true);
      await register(email, password, name, organization);
      navigate('/register-success');
    } catch (err) {
      console.error('회원가입 오류:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.');
      } else if (err.code === 'auth/weak-password') {
        setError('비밀번호가 너무 약합니다.');
      } else if (err.code === 'auth/invalid-email') {
        setError('유효하지 않은 이메일 형식입니다.');
      } else {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
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
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 450,
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom align="center">
          회원가입
        </Typography>
        {error && (
          <Typography color="error" sx={{ mb: 2 }} align="center">
            {error}
          </Typography>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="이메일 (ID)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            helperText="로그인에 사용할 이메일 주소를 입력하세요"
          />
          <TextField
            fullWidth
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            helperText="6자 이상 입력해주세요"
          />
          <TextField
            fullWidth
            label="비밀번호 확인"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
            helperText="비밀번호를 한 번 더 입력해주세요"
          />
          <TextField
            fullWidth
            label="이름"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
            helperText="실명을 입력해주세요"
          />
          <TextField
            fullWidth
            label="소속"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            margin="normal"
            required
            helperText="소속 회사나 부서를 입력해주세요"
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? '가입 중...' : '회원가입'}
          </Button>
        </form>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            이미 계정이 있으신가요?{' '}
            <MuiLink component={Link} to="/login">
              로그인
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Register; 