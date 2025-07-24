import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { configureIME } from './utils/imeHandler.jsx';
import { initKeyboardManager } from './utils/pwaKeyboardUtils';
import { initMobileOptimization, initViewportHeight } from './utils/mobileOptimization';
import { initializeWindow } from './utils/windowManager';
import { globalCleanupManager, enhancedPerformanceMonitor } from './utils/performanceUtils';
import './utils/migrateUtils';
import './styles/IME.css';
import { AuthProvider } from './contexts/AuthContext';
import { TodoProvider } from './contexts/TodoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Provider } from 'react-redux';
import { store } from './store/index';
import Layout from './components/Layout';
import MobileLayout from './components/common/MobileLayout';
import SwipeableContainer from './components/common/SwipeableContainer';
import Login from './components/Login';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './contexts/AuthContext';
import LoadingProvider from './components/common/LoadingProvider';
import PopupProvider from './contexts/PopupContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import SplashScreen from './components/common/SplashScreen';
const Safety = React.lazy(() => import('./pages/Safety'));
const SafetyInspections = React.lazy(() => import('./components/safety/SafetyInspections'));
const SafetyIncidents = React.lazy(() => import('./components/safety/SafetyIncidents'));
const SafetyTraining = React.lazy(() => import('./components/safety/SafetyTraining'));
const SafetyReports = React.lazy(() => import('./components/safety/SafetyReports'));
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Discussions from './pages/Discussions';
import Vendors from './pages/Vendors';
import VendorManagement from './pages/VendorManagement';
import Progress from './pages/Progress';
import Members from './pages/Members';
import Permissions from './pages/Permissions';
import TodoList from './components/TodoList';
import Settings from './pages/Settings';
import Cost from './pages/Cost';
import Users from './pages/Users';
import ImportantSite from './pages/ImportantSite';
import NewSites from './pages/NewSites';
import GisungManagement from './pages/GisungManagement';
import WholeList from './pages/WholeList';
import Profile from './components/Profile';
import NewsFavorites from './pages/NewsFavorites';
import PDFTest from './pages/PDFTest';
import NotFound from './components/NotFound';
import Register from './components/Register';
import RegisterSuccess from './components/RegisterSuccess';
import ForgotPassword from './components/ForgotPassword';
import CustomSchedule from './pages/CustomSchedule';
import CustomScheduleMobile from './pages/CustomScheduleMobile';
import ScheduleManagement from './components/schedule/ScheduleManagement';
const GanttChartPage = React.lazy(() => import('./pages/GanttChart'));
const Estimates = React.lazy(() => import('./pages/Estimates'));
const Claims = React.lazy(() => import('./pages/Claims'));
import useMediaQuery from '@mui/material/useMediaQuery';
import { CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  
  if (loading || showSplash) {
    return (
      <SplashScreen 
        onComplete={() => setShowSplash(false)} 
      />
    );
  }
  
  // 개발 환경에서는 로그인 우회
  if (!currentUser && import.meta.env.PROD) {
    return <Login />;
  }
  
  return children;
};

const App = React.memo(() => {
  const isMobile = useMediaQuery('(max-width:600px)');

  // 전역 cleanup 매니저 및 성능 모니터링 초기화
  useEffect(() => {
    try {
      // 성능 모니터링 시작
      enhancedPerformanceMonitor.startMemoryMonitoring();
      
      // 페이지 언로드 시 cleanup 실행
      const handleBeforeUnload = () => {
        globalCleanupManager.cleanup();
        enhancedPerformanceMonitor.stopMemoryMonitoring();
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        globalCleanupManager.cleanup();
        enhancedPerformanceMonitor.stopMemoryMonitoring();
      };
    } catch (error) {
      console.error('전역 cleanup 매니저 초기화 오류:', error);
    }
  }, []);

  // 모바일 최적화 초기화
  useEffect(() => {
    try {
      const deviceInfo = initMobileOptimization();
      console.log('Device Info:', deviceInfo);
    } catch (error) {
      console.error('Mobile optimization error:', error);
      // 오류가 발생해도 앱은 계속 실행
    }
  }, []);

  // 윈도우 위치 및 크기 관리 초기화 (PWA 모드에서만)
  useEffect(() => {
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      try {
        const cleanup = initializeWindow();
        console.log('윈도우 관리자 초기화 완료');
        
        // 컴포넌트 언마운트 시 클린업
        return cleanup;
      } catch (error) {
        console.error('윈도우 관리자 초기화 오류:', error);
        // 오류가 발생해도 앱은 계속 실행
      }
    }
  }, []);

  // 브라우저 확장프로그램 오류 필터링
  useEffect(() => {
    try {
      // 원래 console.error 함수 저장
      const originalError = console.error;
      
      // console.error 재정의
      console.error = (...args) => {
        const message = args.join(' ');
        
        // 확장프로그램 관련 오류는 무시
        if (message.includes('runtime.lastError') || 
            message.includes('extension port') || 
            message.includes('message channel is closed')) {
          return; // 오류 로그 출력하지 않음
        }
        
        // 다른 오류는 정상적으로 출력
        originalError.apply(console, args);
      };
      
      // 컴포넌트 언마운트 시 원래 함수로 복원
      return () => {
        console.error = originalError;
      };
    } catch (error) {
      console.warn('콘솔 오류 필터링 설정 실패:', error);
    }
  }, []);

  // 뷰포트 높이 최적화
  useEffect(() => {
    try {
      const cleanup = initViewportHeight();
      return cleanup; // 클린업 함수 반환
    } catch (error) {
      console.error('Viewport height error:', error);
    }
  }, []);

  // IME 및 키보드 매니저 초기화
  useEffect(() => {
    try {
      configureIME({
        enableLogging: import.meta.env.DEV,
        enableViewportAdjustment: true,
        enableCursorFix: true,
        keyboardDetectionThreshold: 150
      });
      
      // PWA 환경에서 키보드 매니저 초기화
      initKeyboardManager();
    } catch (error) {
      console.error('IME/Keyboard initialization error:', error);
      // 오류가 발생해도 앱은 계속 실행
    }
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthProvider>
          <TodoProvider>
            <ThemeProvider>
              <MuiThemeProvider theme={createTheme({
                palette: {
                  mode: 'dark',
                  primary: {
                    main: '#3b82f6',
                  },
                  secondary: {
                    main: '#f59e0b',
                  },
                  background: {
                    default: '#181c24',
                    paper: '#232837',
                  },
                  text: {
                    primary: '#ffffff',
                    secondary: '#b3b8c5',
                  },
                  divider: '#2d3344',
                },
                components: {
                  MuiCssBaseline: {
                    styleOverrides: {
                      body: {
                        backgroundColor: '#181c24',
                        color: '#ffffff',
                      },
                    },
                  },
                },
              })}>
                <CssBaseline />
                <LoadingProvider>
                  <PopupProvider>
                    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/register-success" element={<RegisterSuccess />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <CustomScheduleMobile />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <ScheduleManagement />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/sites"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <NewSites />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <NewSites />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Suspense fallback={<div>로딩 중...</div>}>
                                  <Safety />
                                </Suspense>
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Suspense fallback={<div>로딩 중...</div>}>
                                  <Safety />
                                </Suspense>
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety-inspections"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <SafetyInspections />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <SafetyInspections />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety-accidents"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <SafetyIncidents />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <SafetyIncidents />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety-education"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <SafetyTraining />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <SafetyTraining />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety-costs"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <SafetyReports />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <SafetyReports />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/schedule"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <CustomScheduleMobile />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <ScheduleManagement />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/gantt"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <GanttChartPage />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <GanttChartPage />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/documents"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Documents />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Documents />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/reports"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Reports />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Reports />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/discussions"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Discussions />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Discussions />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendors"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Vendors />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Vendors />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendor-management"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <VendorManagement />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/progress"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Progress />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Progress />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/members"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Members />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Members />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/permissions"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Permissions />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Permissions />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/todo-list"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <TodoList />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <TodoList />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/todo/all"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <TodoList />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <TodoList />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Settings />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Settings />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        } 
                      />
                      <Route
                        path="/importantsite"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <ImportantSite />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <ImportantSite />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/gisung"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <GisungManagement />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <GisungManagement />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/whole-list"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <WholeList />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <WholeList />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/cost"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Cost />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Cost />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/estimates"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Estimates />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Estimates />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/claims"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Claims />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Claims />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Users />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Users />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Profile />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Profile />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/news-favorites"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <NewsFavorites />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <NewsFavorites />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/pdf-test"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <PDFTest />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <PDFTest />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Router>
                </PopupProvider>
              </LoadingProvider>
            </MuiThemeProvider>
          </ThemeProvider>
        </TodoProvider>
      </AuthProvider>
    </Provider>
    </ErrorBoundary>
  );
});

export default App; 