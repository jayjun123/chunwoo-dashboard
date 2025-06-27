import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TodoProvider } from './contexts/TodoContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoadingProvider from './components/common/LoadingProvider';
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
import DiscussionMain from './components/discussions/DiscussionMain';
import Discussions from './pages/Discussions';
import Vendors from './pages/Vendors';
import Progress from './pages/Progress';
import Members from './pages/Members';
import Permissions from './pages/Permissions';
import NotFound from './components/NotFound';
import { initializeDatabase } from './scripts/initDb';
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
// import AdminCheck from './pages/AdminCheck'; // AdminCheck 임포트 주석 처리

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
           event.error.message.includes('runtime.lastError'))) {
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

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
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
                  {/*
                  <Route
                    path="/admin-check"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <AdminCheck />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  */}
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
              </LoadingProvider>
            </ThemeProvider>
          </TodoProvider>
        </AuthProvider>
      </Router>
    </Provider>
  );
};

export default App; 