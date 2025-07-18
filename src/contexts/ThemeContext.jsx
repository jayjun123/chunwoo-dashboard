import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(true); // 강제로 다크 모드

  // 라이트 테마
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',
        light: '#ff5983',
        dark: '#9a0036',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#333333',
        secondary: '#666666',
      },
      divider: '#e0e0e0',
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#1976d2',
          },
        },
      },
    },
  });

  // 다크 테마
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#f48fb1',
        light: '#f8bbd9',
        dark: '#ec407a',
      },
      background: {
        default: '#23242a',
        paper: '#2a2b32',
      },
      text: {
        primary: '#ffffff',
        secondary: '#cccccc',
      },
      divider: '#444444',
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#2a2b32',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            color: '#ffffff',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#2a2b32',
            color: '#ffffff',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#0f0f0f',
            color: '#ffffff',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#23242a',
            color: '#ffffff',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              backgroundColor: '#2a2b32',
              color: '#ffffff',
            },
            '& .MuiInputLabel-root': {
              color: '#cccccc',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#444444',
            },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#666666',
            },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1976d2',
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            color: '#ffffff',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            color: '#ffffff',
          },
        },
      },
    },
  });

  // 테마 토글 함수
  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  // 테마 설정 저장
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // 로컬 스토리지에 저장된 설정이 없을 때만 시스템 설정 따름
      if (!localStorage.getItem('theme')) {
        setDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value = {
    darkMode,
    toggleTheme,
    theme: darkMode ? darkTheme : lightTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={value.theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// export default ThemeContext; 