import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = () => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <Tooltip title={darkMode ? '라이트 모드로 변경' : '다크 모드로 변경'}>
      <IconButton
        color="inherit"
        onClick={toggleTheme}
        sx={{ ml: 1 }}
      >
        {darkMode ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle; 