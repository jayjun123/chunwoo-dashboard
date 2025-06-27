import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoadingProvider from './components/common/LoadingProvider';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/dashboard/Dashboard';
import Sites from './pages/Sites';
import Safety from './pages/Safety';
import Schedule from './pages/Schedule';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import DiscussionMain from './components/discussions/DiscussionMain';
import Vendors from './pages/Vendors';
import Progress from './pages/Progress';
import Members from './pages/Members';
import Permissions from './pages/Permissions';
import NotFound from './components/NotFound';
import { initializeDatabase } from './scripts/initDb';
import TodoList from './components/TodoList';
import Settings from './components/Settings';
import Overview from './pages/Overview';
import Cost from './pages/Cost';
import Users from './pages/Users';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#4FC3F7',
    },
    background: {
      default: '#181A20',
      paper: '#232634',
    },
    text: {
      primary: '#fff',
      secondary: '#b0b0b0',
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  // useEffect(() => {
  //   // 데이터베이스 초기화
  //   initializeDatabase();
  // }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LoadingProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
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
              <Route
                path="/sites"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Sites />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/safety"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Safety />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedule"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Schedule />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Documents />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Reports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/discussions"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DiscussionMain />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendors"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Vendors />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Progress />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/members"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Members />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/permissions"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Permissions />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/todo-list"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TodoList />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/todo/all"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TodoList />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/overview"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Overview />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/cost/*" element={<Cost />} />
              <Route path="/user-management" element={<Users />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LoadingProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 