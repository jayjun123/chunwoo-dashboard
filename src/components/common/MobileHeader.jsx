import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Home, Business, Security, Assignment, Chat, Person, Star, Timeline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// 네비게이션 아이템들 (문서/보고서/설정 제외)
const navigationItems = [
  { icon: <Home />, path: '/', label: '홈' },
  { icon: <Star />, path: '/importantsite', label: '주요현장' },
  { icon: <Business />, path: '/sites', label: '현장' },

  { icon: <Timeline />, path: '/gantt', label: '현장일정' },
  { icon: <Assignment />, path: '/progress', label: '기성' },
  { icon: <Security />, path: '/safety', label: '안전' },
  { icon: <Chat />, path: '/discussions', label: '협의' },
  { icon: <Person />, path: '/profile', label: '프로필' },
];

export default function MobileHeader() {
  const navigate = useNavigate();
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100vw',
        minWidth: 0,
        height: 53,
        minHeight: 53,
        maxHeight: 53,
        bgcolor: '#0f0f0f',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1,
        zIndex: 9999,
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        gap: 0.5, 
        flex: 1, 
        justifyContent: 'center',
        alignItems: 'center',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        marginTop: '24px',
        '&::-webkit-scrollbar': { display: 'none' }
      }}>
        {navigationItems.map((item, index) => (
          <Tooltip key={index} title={item.label} placement="bottom" arrow>
            <IconButton
              size="small"
              onClick={() => navigate(item.path)}
              sx={{
                color: '#fff',
                p: 0.5,
                minWidth: 36,
                height: 36,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
                '&:active': {
                  bgcolor: 'rgba(255,255,255,0.2)',
                }
              }}
            >
              {item.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
} 