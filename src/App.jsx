import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TodoProvider } from './contexts/TodoContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoadingProvider from './components/common/LoadingProvider';
import PopupProvider from './contexts/PopupContext';
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

const App = () => {
  // useEffect(() => {
  //   // 데이터베이스 초기화
  //   initializeDatabase();
  // }, []);

  // 전역 에러 핸들러 추가
  useEffect(() => {
    const handleGlobalError = (event) => {
      // 브라우저 확장 프로그램 오류는 무시
      if (event.error && event.error.message && 
          (event.error.message.includes('message channel closed') ||
           event.error.message.includes('extension port') ||
           event.error.message.includes('runtime.lastError') ||
           event.error.message.includes('back/forward cache') ||
           event.error.message.includes('The page keeping the extension port') ||
           event.error.message.includes('so the message channel is closed'))) {
        event.preventDefault();
        return;
      }
      
      // Firestore 관련 오류 처리
      if (event.error && event.error.message && 
          (event.error.message.includes('firestore') ||
           event.error.message.includes('Firestore') ||
           event.error.message.includes('INTERNAL ASSERTION FAILED'))) {
        console.warn('Firestore 오류가 발생했습니다:', event.error);
        event.preventDefault();
        return;
      }
      
      // 네트워크 오류 처리
      if (event.error && event.error.message && 
          (event.error.message.includes('QUIC_PROTOCOL_ERROR') ||
           event.error.message.includes('ERR_QUIC_PROTOCOL_ERROR'))) {
        console.warn('네트워크 프로토콜 오류가 발생했습니다:', event.error);
        event.preventDefault();
        return;
      }
    };

    const handleUnhandledRejection = (event) => {
      // 브라우저 확장 프로그램 Promise rejection 처리
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
      
      // Firestore 관련 Promise rejection 처리
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('firestore') ||
           event.reason.message.includes('Firestore') ||
           event.reason.message.includes('INTERNAL ASSERTION FAILED'))) {
        console.warn('Firestore Promise rejection이 발생했습니다:', event.reason);
        event.preventDefault();
        return;
      }
    };

    // 백/포워드 캐시 관련 이벤트 핸들러
    const handlePageShow = (event) => {
      if (event.persisted) {
        console.log('Page restored from back/forward cache');
        // 페이지가 백/포워드 캐시에서 복원된 경우 필요한 초기화 작업 수행
        window.location.reload();
      }
    };

    const handlePageHide = (event) => {
      if (event.persisted) {
        console.log('Page stored in back/forward cache');
      }
    };

    // 브라우저 확장 프로그램 오류 필터링
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('runtime.lastError') || 
          message.includes('message channel closed') ||
          message.includes('extension port') ||
          message.includes('back/forward cache') ||
          message.includes('The page keeping the extension port')) {
        return; // 확장 프로그램 오류는 무시
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
      console.error = originalConsoleError; // 원래 console.error 복원
    };
  }, []);

  // 키보드 반응형 처리
  useEffect(() => {
    const handleResize = () => {
      const isKeyboardOpen = window.innerHeight < window.outerHeight * 0.8;
      document.body.classList.toggle('keyboard-open', isKeyboardOpen);
    };

    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        // 모바일에서 입력 필드 포커스 시 스크롤 조정
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleFocusOut = () => {
      // 포커스 아웃 시 키보드 닫힘 처리
      setTimeout(() => {
        const isKeyboardOpen = window.innerHeight < window.outerHeight * 0.8;
        document.body.classList.toggle('keyboard-open', isKeyboardOpen);
      }, 100);
    };

    // 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // 초기 상태 확인
    handleResize();

    // 클린업
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return (
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
                            <CustomSchedule />
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
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PopupProvider>
              </LoadingProvider>
            </ThemeProvider>
          </TodoProvider>
        </AuthProvider>
      </Router>
    </Provider>
  );
};

export default App; 