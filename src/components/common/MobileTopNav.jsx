import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { ArrowBack, Menu } from '@mui/icons-material';

const MobileTopNav = ({ title, onBack, onMenu, showBack = true, showMenu = true }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        bgcolor: '#181a20',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        zIndex: 1000,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showBack && onBack && (
          <IconButton
            onClick={onBack}
            sx={{
              color: '#fff',
              p: 1,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <ArrowBack />
          </IconButton>
        )}
        <Typography
          variant="h6"
          sx={{
            color: '#fff',
            fontWeight: 600,
            fontSize: '1.1rem',
            flex: 1,
          }}
        >
          {title}
        </Typography>
      </Box>
      
      {showMenu && onMenu && (
        <IconButton
          onClick={onMenu}
          sx={{
            color: '#fff',
            p: 1,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
          }}
        >
          <Menu />
        </IconButton>
      )}
    </Box>
  );
};

export default MobileTopNav; 