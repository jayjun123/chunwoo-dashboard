import React from 'react';
import GanttChart from '../components/GanttChart';
import { Box, Container } from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';

const GanttChartPage = () => {
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
          pt: 2,
          pb: 3,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%'
        }}
      >
        <Box sx={{ 
          height: '100vh', 
          backgroundColor: 'background.default',
          overflow: 'hidden',
          borderRadius: 2,
          boxShadow: 3
        }}>
          <GanttChart />
        </Box>
      </Container>
    </Box>
  );
};

export default GanttChartPage; 