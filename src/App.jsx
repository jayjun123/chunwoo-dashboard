import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#181A20',
      paper: '#232634',
    },
    text: {
      primary: '#fff',
    },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#181A20',
          color: '#fff',
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1>천우현장관리</h1>
            <p>Material-UI 테스트 성공!</p>
            <p>테마와 스타일이 정상 작동합니다.</p>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App; 