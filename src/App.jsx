import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { configureIME } from './utils/imeHandler.jsx';
import { initKeyboardManager } from './utils/pwaKeyboardUtils';
import './styles/IME.css';
import { AuthProvider } from './contexts/AuthContext';
import { TodoProvider } from './contexts/TodoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Provider } from 'react-redux';
import { store } from './store/index';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './contexts/AuthContext';
import LoadingProvider from './components/common/LoadingProvider';
import PopupProvider from './contexts/PopupContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import SplashScreen from './components/common/SplashScreen';
import Safety from './pages/Safety';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Discussions from './pages/Discussions';
import Vendors from './pages/Vendors';
import Progress from './pages/Progress';
import Members from './pages/Members';
import Permissions from './pages/Permissions';
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
import NotFound from './components/NotFound';
import Register from './components/Register';
import RegisterSuccess from './components/RegisterSuccess';
import ForgotPassword from './components/ForgotPassword';
import CustomSchedule from './pages/CustomSchedule';
import CustomScheduleMobile from './pages/CustomScheduleMobile';
import ScheduleManagement from './components/schedule/ScheduleManagement';
import useMediaQuery from '@mui/material/useMediaQuery';

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
  
  if (!currentUser) {
    return <Login />;
  }
  
  return children;
};

const DiscussionChatWrapper = () => {
  const { roomId } = useParams();
  return <DiscussionChat roomId={roomId} />;
};

const App = () => {
  const isMobile = useMediaQuery('(max-width:600px)');

  // IME 및 키보드 매니저 초기화
  useEffect(() => {
    configureIME({
      enableLogging: process.env.NODE_ENV === 'development',
      enableViewportAdjustment: true,
      enableCursorFix: true,
      keyboardDetectionThreshold: 150
    });
    
    // PWA 환경에서 키보드 매니저 초기화
    initKeyboardManager();
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthProvider>
          <TodoProvider>
            <ThemeProvider>
              <LoadingProvider>
                <PopupProvider>
                  <Router>
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
                        path="/users"
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
                      <Route path="/chat/:roomId" element={<DiscussionChatWrapper />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Router>
                </PopupProvider>
              </LoadingProvider>
            </ThemeProvider>
          </TodoProvider>
        </AuthProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App; 