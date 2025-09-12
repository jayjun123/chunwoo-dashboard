import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';

const UserManual = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      py: 4,
      pt: 8  // 상단 패딩을 64px (8 * 8px) 추가
    }}>
      <Container maxWidth="lg">
        <Paper 
          elevation={3}
          sx={{ 
            height: '80vh',
            overflow: 'hidden',
            borderRadius: 2
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="h5" component="h1">
              📖 천우 건설현장관리시스템 사용설명서
            </Typography>
          </Box>
          <Box
            sx={{
              height: 'calc(100% - 80px)',
              overflow: 'hidden',
            }}
          >
            <iframe
              src="/사용설명서.html"
              width="100%"
              height="100%"
              style={{
                border: 'none',
              }}
              title="사용설명서"
            />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default UserManual;
