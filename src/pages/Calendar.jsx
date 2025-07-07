import React from 'react';
import CustomSchedule from './CustomSchedule';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Box } from '@mui/material';

const Calendar = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      <CustomSchedule />
    </Box>
  );
};

export default Calendar; 