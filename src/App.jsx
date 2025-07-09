import React, { useEffect, useState } from 'react';
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
// import PWAInstallPrompt from './components/common/PWAInstallPrompt.jsx';
import OfflineSupport from './components/common/OfflineSupport';
// import BackButtonHandler from './components/common/BackButtonHandler';
// import StatusBarManager from './components/common/StatusBarManager';
// import KeyboardManager from './components/common/KeyboardManager';
// import GlobalErrorHandler from './components/common/GlobalErrorHandler';
import SplashScreen from './components/common/SplashScreen';
import { setupIMEHandler } from './utils/imeHandler';
import { setupStrictBackButtonHandler } from './utils/backButtonHandler';

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
  const [showSplash, setShowSplash] = useState(true);
  const [splashTimeout, setSplashTimeout] = useState(null);
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    const cleanupKeyboardHandling = setupKeyboardHandling();
    const cleanupIMEHandler = setupIMEHandler();
    const cleanupBackButtonHandler = setupStrictBackButtonHandler();

    // 스플래시 스크린 강제 타임아웃 (Netlify 대응)
    const isNetlify = window.location.hostname.includes('netlify.app') || 
                     window.location.hostname.includes('netlify.com');
    
    const timeout = setTimeout(() => {
      console.log('스플래시 스크린 강제 종료 (타임아웃)', { isNetlify });
      setShowSplash(false);
    }, isNetlify ? 3000 : 5000); // Netlify에서는 3초, 일반적으로는 5초
    setSplashTimeout(timeout);

    // PWA 전체화면 모드 강제
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      
      // iPad PWA 전체화면 강제
      if (window.innerWidth >= 768) {
        document.body.style.position = 'fixed';
        document.body.style.top = '0';
        document.body.style.left = '0';
        document.body.style.width = '100vw';
        document.body.style.height = '100vh';
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        
        const rootElement = document.getElementById('root');
        if (rootElement) {
          rootElement.style.width = '100vw';
          rootElement.style.height = '100vh';
          rootElement.style.overflow = 'auto';
          rootElement.style.webkitOverflowScrolling = 'touch';
          rootElement.style.position = 'relative';
        }
        
        // Safari에서 전체화면 강제
        if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
          document.documentElement.style.position = 'fixed';
          document.documentElement.style.top = '0';
          document.documentElement.style.left = '0';
          document.documentElement.style.width = '100vw';
          document.documentElement.style.height = '100vh';
          document.documentElement.style.overflow = 'hidden';
        }
      }
      
      const handleResize = () => {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      };
      
      window.addEventListener('resize', handleResize);
    }

    // 새로고침 시 세션 복원 확인
    const handleBeforeUnload = () => {
      console.log('페이지 새로고침/종료 감지 - 세션 유지 시도');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cleanupKeyboardHandling();
      cleanupIMEHandler();
      cleanupBackButtonHandler();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (splashTimeout) {
        clearTimeout(splashTimeout);
      }
    };
  }, []);

  const handleSplashComplete = () => {
    console.log('스플래시 완료 콜백 실행');
    setShowSplash(false);
    // 타임아웃 클리어
    if (splashTimeout) {
      clearTimeout(splashTimeout);
      setSplashTimeout(null);
    }
  };

  console.log('App 렌더링 - showSplash:', showSplash);

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
                    {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
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
                    <OfflineSupport />
                    {/* <BackButtonHandler /> */}
                    {/* <StatusBarManager /> */}
                    {/* <KeyboardManager /> */}
                    {/* <PWAInstallPrompt /> */}
                    {/* <GlobalErrorHandler /> */}
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