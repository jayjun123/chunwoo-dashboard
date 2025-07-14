import React from 'react';
import GanttChart from '../components/GanttChart';
import { Box } from '@mui/material';

const GanttChartPage = () => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <GanttChart />
    </Box>
  );
};

export default GanttChartPage; 