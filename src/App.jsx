import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { TodoProvider } from './contexts/TodoContext';
import { Provider } from 'react-redux';
import { store } from './store/index';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './contexts/AuthContext';

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

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#181A20',
        color: '#fff'
      }}>
        <div>로딩 중...</div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Login />;
  }
  
  return children;
};

const App = () => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <TodoProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </ThemeProvider>
        </TodoProvider>
      </AuthProvider>
    </Provider>
  );
};

export default App; 