import React from 'react';
import CustomSchedule from './CustomSchedule';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Box, Container } from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';

const Calendar = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  
  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative'
    }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: isMobile ? 2 : 3,
          pb: 3,
          px: isMobile ? 1 : 3,
          ml: isMobile ? 0 : 'auto',
          mr: isMobile ? 0 : 'auto',
          maxWidth: isMobile ? '100%' : '1400px'
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: '100%',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            borderRadius: 2,
            boxShadow: 3,
            bgcolor: 'background.paper'
          }}
        >
          <CustomSchedule />
        </Box>
      </Container>
    </Box>
  );
};

export default Calendar; 