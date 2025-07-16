import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { configureIME } from './utils/imeHandler.jsx';
import { initKeyboardManager } from './utils/pwaKeyboardUtils';
import { initMobileOptimization, useViewportHeight } from './utils/mobileOptimization';
import './styles/IME.css';
import { AuthProvider } from './contexts/AuthContext';
import { TodoProvider } from './contexts/TodoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Provider } from 'react-redux';
import { store } from './store/index';
import Layout from './components/Layout';
import MobileLayout from './components/common/MobileLayout';
import Login from './components/Login';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './contexts/AuthContext';
import LoadingProvider from './components/common/LoadingProvider';
import PopupProvider from './contexts/PopupContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import SplashScreen from './components/common/SplashScreen';
import Safety from './pages/Safety';
import SafetyInspections from './components/safety/SafetyInspections';
import SafetyIncidents from './components/safety/SafetyIncidents';
import SafetyTraining from './components/safety/SafetyTraining';
import SafetyReports from './components/safety/SafetyReports';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Discussions from './pages/Discussions';
import Vendors from './pages/Vendors';
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
import DiscussionChat from './components/discussions/DiscussionChat';
import NotFound from './components/NotFound';
import Register from './components/Register';
import RegisterSuccess from './components/RegisterSuccess';
import ForgotPassword from './components/ForgotPassword';
import CustomSchedule from './pages/CustomSchedule';
import CustomScheduleMobile from './pages/CustomScheduleMobile';
import ScheduleManagement from './components/schedule/ScheduleManagement';
import GanttChartPage from './pages/GanttChart';

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

  // 모바일 최적화 초기화
  useEffect(() => {
    const deviceInfo = initMobileOptimization();
    console.log('Device Info:', deviceInfo);
  }, []);

  // 뷰포트 높이 최적화
  useViewportHeight();

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
                                <Safety />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Safety />
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