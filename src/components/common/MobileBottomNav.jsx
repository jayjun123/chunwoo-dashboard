import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Box
} from '@mui/material';
import {
  Home as HomeIcon,
  Business as SitesIcon,
  Schedule as ScheduleIcon,
  Warning as SafetyIcon,
  Chat as ChatIcon,
  AttachMoney as ProgressIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // 네비게이션 아이템 정의 (핵심 기능만 유지)
  const navItems = [
    { path: '/', label: '홈', icon: HomeIcon },
    { path: '/sites', label: '현장', icon: SitesIcon },
    { path: '/schedule', label: '일정', icon: ScheduleIcon },
    { path: '/safety', label: '안전', icon: SafetyIcon },
    { path: '/discussions', label: '토론', icon: ChatIcon },
    { path: '/progress', label: '기성', icon: ProgressIcon }
  ];

  // 현재 페이지 인덱스
  const currentIndex = navItems.findIndex(item => item.path === location.pathname);

  // 네비게이션 변경 핸들러
  const handleNavigationChange = (event, newValue) => {
    if (newValue !== null) {
      navigate(navItems[newValue].path);
    }
  };

  // 터치 피드백을 위한 스타일
  const touchFeedbackStyle = {
    '&:active': {
      transform: 'scale(0.95)',
      transition: 'transform 0.1s ease'
    },
    '&:hover': {
      bgcolor: 'action.hover'
    }
  };

  return (
    <>
      {/* 하단 네비게이션 - 모바일에서만 표시 */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTop: 1,
          borderColor: 'divider',
          display: { xs: 'block', md: 'none' }
        }}
        elevation={3}
      >
        <BottomNavigation
          value={currentIndex}
          onChange={handleNavigationChange}
          showLabels
          sx={{
            height: 70,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '6px 8px',
              ...touchFeedbackStyle
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.7rem',
              marginTop: '4px'
            }
          }}
        >
          {navItems.map((item, index) => {
            const IconComponent = item.icon;
            
            return (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={<IconComponent />}
                sx={{
                  '&.Mui-selected': {
                    color: 'primary.main'
                  }
                }}
              />
            );
          })}
        </BottomNavigation>
      </Paper>

      {/* 하단 여백 (네비게이션 바 높이만큼) */}
      <Box sx={{ height: 70, display: { xs: 'block', md: 'none' } }} />
    </>
  );
};

export default MobileBottomNav; 