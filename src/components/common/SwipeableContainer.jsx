import React from 'react';
import { Box } from '@mui/material';

const SwipeableContainer = ({ children }) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y'
      }}
    >
      {children}
    </Box>
  );
};

export default SwipeableContainer; 