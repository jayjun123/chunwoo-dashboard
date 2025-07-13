import React from 'react';
import { Box, useMediaQuery } from '@mui/material';
import GisungStatusPage from '../components/GisungStatusPage';
import MobileLayout from '../components/common/MobileLayout';

const GisungManagement = () => {
  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <MobileLayout>
      <Box sx={{ bgcolor: '#1a1d21', minHeight: '100vh', mt: isMobile ? '0px' : '50px' }}>
        <GisungStatusPage />
      </Box>
    </MobileLayout>
  );
};

export default GisungManagement; 