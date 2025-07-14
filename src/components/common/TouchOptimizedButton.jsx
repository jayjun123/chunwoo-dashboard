import React from 'react';
import { Button, IconButton, Fab, Box } from '@mui/material';
import { useMediaQuery } from '@mui/material';

const TouchOptimizedButton = ({ 
  children, 
  variant = 'contained', 
  size = 'medium',
  icon,
  fab = false,
  mobileOnly = false,
  desktopOnly = false,
  touchFeedback = true,
  ...props 
}) => {
  const isMobile = useMediaQuery('(max-width:600px)');

  // 모바일/데스크톱 전용 조건 확인
  if (mobileOnly && !isMobile) return null;
  if (desktopOnly && isMobile) return null;

  // 터치 피드백 스타일
  const touchFeedbackStyle = touchFeedback ? {
    '&:active': {
      transform: 'scale(0.95)',
      transition: 'transform 0.1s ease'
    },
    '&:hover': {
      transform: isMobile ? 'none' : 'scale(1.02)',
      transition: 'transform 0.2s ease'
    }
  } : {};

  // 모바일 최적화 스타일
  const mobileOptimizedStyle = isMobile ? {
    minHeight: 48, // 터치 최소 크기
    minWidth: 48,
    padding: '12px 16px',
    fontSize: '1rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    '&:active': {
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      transform: 'translateY(1px)'
    }
  } : {};

  // 아이콘만 있는 버튼인 경우
  if (icon && !children) {
    return (
      <IconButton
        {...props}
        sx={{
          ...mobileOptimizedStyle,
          ...touchFeedbackStyle,
          ...props.sx
        }}
      >
        {icon}
      </IconButton>
    );
  }

  // FAB 버튼인 경우
  if (fab) {
    return (
      <Fab
        {...props}
        sx={{
          ...mobileOptimizedStyle,
          ...touchFeedbackStyle,
          ...props.sx
        }}
      >
        {icon || children}
      </Fab>
    );
  }

  // 일반 버튼
  return (
    <Button
      variant={variant}
      size={size}
      {...props}
      sx={{
        ...mobileOptimizedStyle,
        ...touchFeedbackStyle,
        ...props.sx
      }}
    >
      {icon && (
        <Box component="span" sx={{ mr: children ? 1 : 0 }}>
          {icon}
        </Box>
      )}
      {children}
    </Button>
  );
};

export default TouchOptimizedButton; 