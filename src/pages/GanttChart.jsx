import React from 'react';
import GanttChart from '../components/GanttChart';
import { Box } from '@mui/material';

const GanttChartPage = () => {
  return (
    <Box sx={{ 
      height: '100vh', 
      backgroundColor: 'background.default',
      overflow: 'hidden'
    }}>
      <GanttChart />
    </Box>
  );
};

export default GanttChartPage; 