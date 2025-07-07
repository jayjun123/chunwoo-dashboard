import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TodoProvider } from './contexts/TodoContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoadingProvider from './components/common/LoadingProvider';
import PopupProvider from './contexts/PopupContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Provider } from 'react-redux';
import { store } from './store/index';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import RegisterSuccess from './components/RegisterSuccess';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/dashboard/Dashboard';
import Safety from './pages/Safety';
import CustomSchedule from './pages/CustomSchedule';
import ScheduleManagement from './components/schedule/ScheduleManagement';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Discussions from './pages/Discussions';

import Vendors from './pages/Vendors';
import Progress from './pages/Progress';
import Members from './pages/Members';
import Permissions from './pages/Permissions';
import NotFound from './components/NotFound';
import TodoList from './components/TodoList';
import Settings from './pages/Settings';
import Overview from './pages/Overview';
import Cost from './pages/Cost';
import Users from './pages/Users';
import ImportantSite from './pages/ImportantSite';
import NewSites from './pages/NewSites';
import GisungManagement from './pages/GisungManagement';
import WholeList from './pages/WholeList';
import Profile from './components/Profile';
import NewsFavorites from './pages/NewsFavorites';
import PDFTest from './pages/PDFTest';
import DiscussionChat from './components/discussions/DiscussionChat';
import useMediaQuery from '@mui/material/useMediaQuery';
import CustomScheduleMobile from './pages/CustomScheduleMobile';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#4FC3F7',
      light: '#81d4fa',
      dark: '#0288d1',
    },
    background: {
      default: '#181A20',
      paper: '#232634',
    },
    text: {
      primary: '#fff',
      secondary: '#b0b0b0',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
  },
  typography: {
    fontFamily: '"NanumGothic", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
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
});

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  // 로딩 중일 때는 로딩 스피너 표시
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#181A20'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#fff'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid #1976d2',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <div>로그인 상태 확인 중...</div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  // 로딩이 완료되었지만 사용자가 없으면 로그인 페이지로
  if (!currentUser) {
    console.log('ProtectedRoute - 사용자 없음, 로그인 페이지로 리다이렉트');
    return <Navigate to="/login" />;
  }
  
  // 사용자가 있으면 보호된 컴포넌트 렌더링
  console.log('ProtectedRoute - 사용자 확인됨:', currentUser.email);
  return children;
};

const setupGlobalErrorHandling = () => {
  const handleGlobalError = (event) => {
    // Chrome 확장 프로그램 관련 오류 무시
    if (event.error && event.error.message && 
        (event.error.message.includes('message channel closed') ||
         event.error.message.includes('extension port') ||
         event.error.message.includes('runtime.lastError') ||
         event.error.message.includes('back/forward cache') ||
         event.error.message.includes('The page keeping the extension port') ||
         event.error.message.includes('so the message channel is closed') ||
         event.error.message.includes('A listener indicated an asynchronous response'))) {
      event.preventDefault();
      return;
    }
    
    // PopupProvider 컨텍스트 오류 처리
    if (event.error && event.error.message && 
        (event.error.message.includes('usePopup must be used within a PopupProvider') ||
         event.error.message.includes('does not provide an export named \'usePopup\''))) {
      console.warn('PopupProvider 컨텍스트 오류 무시:', event.error.message);
      event.preventDefault();
      return;
    }
    
    // DiscussionChat 컴포넌트 오류 처리
    if (event.error && event.error.message && 
        event.error.message.includes('does not provide an export named \'default\'')) {
      console.warn('컴포넌트 export 오류 무시:', event.error.message);
      event.preventDefault();
      return;
    }
    
    if (event.error && event.error.message && 
        (event.error.message.includes('firestore') ||
         event.error.message.includes('Firestore') ||
         event.error.message.includes('INTERNAL ASSERTION FAILED'))) {
      console.warn('Firestore 오류가 발생했습니다:', event.error);
      event.preventDefault();
      return;
    }
    
    if (event.error && event.error.message && 
        (event.error.message.includes('QUIC_PROTOCOL_ERROR') ||
         event.error.message.includes('ERR_QUIC_PROTOCOL_ERROR'))) {
      console.warn('네트워크 프로토콜 오류가 발생했습니다:', event.error);
      event.preventDefault();
      return;
    }

    console.error('전역 오류 발생:', event.error);
  };

  const handleUnhandledRejection = (event) => {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('message channel closed') ||
         event.reason.message.includes('extension port') ||
         event.reason.message.includes('runtime.lastError') ||
         event.reason.message.includes('back/forward cache') ||
         event.reason.message.includes('The page keeping the extension port') ||
         event.reason.message.includes('so the message channel is closed'))) {
      event.preventDefault();
      return;
    }
    
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('firestore') ||
         event.reason.message.includes('Firestore') ||
         event.reason.message.includes('INTERNAL ASSERTION FAILED'))) {
      console.warn('Firestore Promise rejection이 발생했습니다:', event.reason);
      event.preventDefault();
      return;
    }

    console.error('처리되지 않은 Promise rejection:', event.reason);
  };

  const handlePageShow = (event) => {
    if (event.persisted) {
      console.log('Page restored from back/forward cache');
      window.location.reload();
    }
  };

  const handlePageHide = (event) => {
    if (event.persisted) {
      console.log('Page stored in back/forward cache');
    }
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('runtime.lastError') || 
        message.includes('message channel closed') ||
        message.includes('extension port') ||
        message.includes('back/forward cache') ||
        message.includes('The page keeping the extension port')) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('pagehide', handlePageHide);

  return () => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('pagehide', handlePageHide);
    console.error = originalConsoleError;
  };
};

const setupKeyboardHandling = () => {
  const handleResize = () => {
    const isKeyboardOpen = window.innerHeight < window.outerHeight * 0.8;
    document.body.classList.toggle('keyboard-open', isKeyboardOpen);
  };

  const handleFocusIn = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const handleFocusOut = () => {
    setTimeout(() => {
      const isKeyboardOpen = window.innerHeight < window.outerHeight * 0.8;
      document.body.classList.toggle('keyboard-open', isKeyboardOpen);
    }, 100);
  };

  window.addEventListener('resize', handleResize);
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('focusout', handleFocusOut);

  handleResize();

  return () => {
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('focusout', handleFocusOut);
  };
};

const DiscussionChatWrapper = () => {
  const { roomId } = useParams();
  return (
    <ProtectedRoute>
      <DiscussionChat roomId={roomId} />
    </ProtectedRoute>
  );
};

const App = () => {
  useEffect(() => {
    const cleanupErrorHandling = setupGlobalErrorHandling();
    const cleanupKeyboardHandling = setupKeyboardHandling();

    // 새로고침 시 세션 복원 확인
    const handleBeforeUnload = () => {
      console.log('페이지 새로고침/종료 감지 - 세션 유지 시도');
    };

    const handlePageShow = (event) => {
      if (event.persisted) {
        console.log('페이지가 back/forward cache에서 복원됨');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      cleanupErrorHandling();
      cleanupKeyboardHandling();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <TodoProvider>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <LoadingProvider>
                  <PopupProvider>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/register-success" element={<RegisterSuccess />} />
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
                              <NewSites />
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
                              {isMobile ? <CustomScheduleMobile /> : <ScheduleManagement />}
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
                              <Discussions />
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
                      <Route
                        path="/importantsite"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <ImportantSite />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/gisung"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <GisungManagement />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/whole-list"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <WholeList />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/cost"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Cost />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/user-management"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Users />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Profile />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/news-favorites"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <NewsFavorites />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/news"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <NewsFavorites />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/pdf-test"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <PDFTest />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/chat/:roomId" element={<DiscussionChatWrapper />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <PWAInstallPrompt />
                  </PopupProvider>
                </LoadingProvider>
              </ThemeProvider>
            </TodoProvider>
          </AuthProvider>
        </Router>
      </Provider>
    </ErrorBoundary>
  );
};

export default App; 