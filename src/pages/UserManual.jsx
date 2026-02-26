import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';

const UserManual = () => {
  return (
    <Box sx={{ 
      height: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: '64px',
      '&::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      <MobileSidebar />
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          flex: 1,
          minHeight: 0,
          py: 1,
          pt: 1,
          pb: 1,
          px: 0,
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
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
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            <iframe
              src="/사용설명서.html"
              width="100%"
              height="100%"
              style={{ border: 'none', display: 'block' }}
              title="사용설명서"
            />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default UserManual;
