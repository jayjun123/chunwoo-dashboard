import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';

const TestDiscussion = () => {
  const [count, setCount] = useState(0);

  console.log('🔥 TestDiscussion 컴포넌트 로드됨');

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      p: 4
    }}>
      <Typography variant="h4" sx={{ mb: 4, color: '#333' }}>
        토론 테스트 페이지
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 2, color: '#666' }}>
        이 페이지가 보인다면 컴포넌트가 정상적으로 로드된 것입니다.
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ color: '#333' }}>
          카운터: {count}
        </Typography>
      </Box>
      
      <Button 
        variant="contained" 
        onClick={() => setCount(count + 1)}
        sx={{ 
          backgroundColor: '#FEE500',
          color: '#1A1A1A',
          '&:hover': { backgroundColor: '#FFD700' }
        }}
      >
        클릭해보세요
      </Button>
      
      <Typography variant="body2" sx={{ mt: 4, color: '#999', textAlign: 'center' }}>
        이 버튼이 작동한다면 React 상태 관리가 정상입니다.
      </Typography>
    </Box>
  );
};

export default TestDiscussion; 