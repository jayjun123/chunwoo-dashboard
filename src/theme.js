import { createTheme } from '@mui/material/styles';

// 공통 테마 설정
const commonSettings = {
  typography: {
    fontFamily: [
      'Pretendard',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
};

// 라이트 테마
export const lightTheme = createTheme({
  ...commonSettings,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
    },
  },
  // 전역 z-index 관리 시스템
  zIndex: {
    // 기본 z-index 값들
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
    
    // 커스텀 z-index 값들 (우선순위 순)
    popup: 2000,        // 기본 팝업
    modal: 2100,        // 기본 모달
    dialog: 2200,       // 다이얼로그
    dropdown: 2300,     // 드롭다운 메뉴
    tooltip: 2400,      // 툴팁
    notification: 2500, // 알림
    loading: 2600,      // 로딩 오버레이
    critical: 2700,     // 중요한 모달 (삭제 확인 등)
  },
});

// 다크 테마
export const darkTheme = createTheme({
  ...commonSettings,
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#ce93d8',
      light: '#f3e5f5',
      dark: '#ab47bc',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
  },
  // 전역 z-index 관리 시스템
  zIndex: {
    // 기본 z-index 값들
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
    
    // 커스텀 z-index 값들 (우선순위 순)
    popup: 2000,        // 기본 팝업
    modal: 2100,        // 기본 모달
    dialog: 2200,       // 다이얼로그
    dropdown: 2300,     // 드롭다운 메뉴
    tooltip: 2400,      // 툴팁
    notification: 2500, // 알림
    loading: 2600,      // 로딩 오버레이
    critical: 2700,     // 중요한 모달 (삭제 확인 등)
  },
}); 