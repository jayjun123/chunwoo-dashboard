import React, { useState } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import GisungStatusPage from '../components/GisungStatusPage';
import MobileLayout from '../components/common/MobileLayout';

const GisungManagement = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [currentMonth] = useState(new Date());

  return (
    <MobileLayout>
      <Box sx={{ bgcolor: '#1a1d21', minHeight: '100vh' }}>
        <GisungStatusPage 
          viewType="month"
          currentMonth={currentMonth}
          selectedSites={[]}
          filteredData={[]}
        />
      </Box>
    </MobileLayout>
  );
};

export default GisungManagement; 