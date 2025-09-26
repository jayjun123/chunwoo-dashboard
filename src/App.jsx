import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { configureIME } from './utils/imeHandler.jsx';
import { initKeyboardManager } from './utils/pwaKeyboardUtils';
import { initMobileOptimization, initViewportHeight } from './utils/mobileOptimization';
import { initializeWindow } from './utils/windowManager';
import { globalCleanupManager, enhancedPerformanceMonitor } from './utils/performanceUtils';
import { initializeMobileInputOptimization } from './utils/mobileInputOptimization';
import { fixAriaHiddenIssues } from './utils/materialUploadUtils';
import { fixNestedScrollContainers } from './utils/dndScrollFix';
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

// 성능 최적화: 로딩 컴포넌트
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #43e97b',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <div style={{ color: '#666', fontSize: '14px' }}>로딩 중...</div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);
import TemplateUpload from './pages/TemplateUpload';
import CompanyDistribution from './pages/CompanyDistribution';
import SettlementManagement from './pages/SettlementManagement';
import SettlementDetail from './pages/SettlementDetail';
import Mapping from './pages/Mapping';
import { URL_ALIASES, expandUrl } from './utils/urlShortener';
import errorHandler from './utils/errorHandler';

// 임시: 현장명 동기화 함수
import { syncSiteNames } from './scripts/syncSiteNames';

// 임시: 지출 차수 추가 함수
const addSequenceToCostsDirect = async () => {
  try {
    const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    console.log('지출 데이터 차수 추가 시작...');
    
    // 모든 지출 데이터 조회
    const costsSnapshot = await getDocs(collection(db, 'costs'));
    const costs = costsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('총 지출 데이터:', costs.length, '개');
    
    // 현장명과 항목별로 그룹화
    const groupedCosts = {};
    costs.forEach(cost => {
      const key = `${cost.site}_${cost.itemType}`;
      if (!groupedCosts[key]) {
        groupedCosts[key] = [];
      }
      groupedCosts[key].push(cost);
    });
    
    // 각 그룹별로 날짜 순 정렬 후 차수 계산
    const updatePromises = [];
    
    Object.keys(groupedCosts).forEach(key => {
      const [siteName, itemType] = key.split('_');
      const groupCosts = groupedCosts[key];
      
      // 날짜 순으로 정렬
      const sortedCosts = groupCosts.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateA - dateB;
      });
      
      // 각 항목에 차수 추가
      sortedCosts.forEach((cost, index) => {
        if (!cost.sequence) {
          const sequence = `${index + 1}차`;
          updatePromises.push(
            updateDoc(doc(db, 'costs', cost.id), {
              sequence: sequence,
              updatedAt: new Date()
            })
          );
          console.log(`${siteName} - ${itemType} - ${cost.date}: ${sequence}`);
        }
      });
    });
    
    // 일괄 업데이트 실행
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`${updatePromises.length}개의 지출 데이터에 차수 추가 완료`);
    } else {
      console.log('차수가 이미 설정된 데이터만 존재합니다.');
    }
    
    console.log('지출 데이터 차수 추가 완료!');
    
  } catch (error) {
    console.error('지출 데이터 차수 추가 실패:', error);
  }
};

// 임시: 현장명 동기화 함수 (직접 구현)
const syncSiteNamesDirect = async () => {
  try {
    const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    console.log('현장명 동기화 시작...');
    
    // 1. 모든 현장 데이터 조회
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('현장 데이터:', sites.map(site => ({ id: site.id, name: site.name })));
    
    // 2. 모든 기성 데이터 조회
    const gisungSnapshot = await getDocs(collection(db, 'gisung'));
    const gisungData = gisungSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('기성 데이터:', gisungData.map(gisung => ({ id: gisung.id, name: gisung.name, siteId: gisung.siteId })));
    
    // 3. 현장명과 기성 데이터 매칭 및 업데이트
    const updatePromises = [];
    
    for (const gisung of gisungData) {
      // siteId로 현장 찾기
      const matchingSite = sites.find(site => site.id === gisung.siteId);
      
      if (matchingSite && gisung.name !== matchingSite.name) {
        console.log(`기성 데이터 업데이트: ${gisung.name} → ${matchingSite.name}`);
        
        updatePromises.push(
          updateDoc(doc(db, 'gisung', gisung.id), {
            name: matchingSite.name,
            updatedAt: new Date()
          })
        );
      }
    }
    
    // 4. 일괄 업데이트 실행
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`${updatePromises.length}개의 기성 데이터 업데이트 완료`);
    } else {
      console.log('업데이트할 데이터가 없습니다.');
    }
    
    console.log('현장명 동기화 완료!');
    
  } catch (error) {
    console.error('현장명 동기화 실패:', error);
  }
};

// 전역 함수 노출
if (typeof window !== 'undefined') {
  window.syncSiteNamesDirect = syncSiteNamesDirect;
  window.addSequenceToCostsDirect = addSequenceToCostsDirect;
}
const Safety = React.lazy(() => import('./pages/Safety'));
const SafetyInspections = React.lazy(() => import('./components/safety/SafetyInspections'));
const SafetyIncidents = React.lazy(() => import('./components/safety/SafetyIncidents'));
const SafetyTraining = React.lazy(() => import('./components/safety/SafetyTraining'));
const SafetyReports = React.lazy(() => import('./components/safety/SafetyReports'));
// 성능 최적화: 페이지 컴포넌트들을 lazy loading으로 변경
const ConstructionTeam = React.lazy(() => import('./pages/DaemaTeam'));
const Discussions = React.lazy(() => import('./pages/Discussions'));
const Vendors = React.lazy(() => import('./pages/Vendors'));
const VendorManagement = React.lazy(() => import('./pages/VendorManagement'));
const Progress = React.lazy(() => import('./pages/Progress'));
const Members = React.lazy(() => import('./pages/Members'));
const Permissions = React.lazy(() => import('./pages/Permissions'));
const TodoList = React.lazy(() => import('./components/TodoList'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Cost = React.lazy(() => import('./pages/Cost'));
const Users = React.lazy(() => import('./pages/Users'));
const ImportantSite = React.lazy(() => import('./pages/ImportantSite'));
const NewSites = React.lazy(() => import('./pages/NewSites'));
const GisungStatusPage = React.lazy(() => import('./components/GisungStatusPage'));
const SiteDetail = React.lazy(() => import('./components/sites/SiteDetail'));

const WholeList = React.lazy(() => import('./pages/WholeList'));
const Profile = React.lazy(() => import('./components/Profile'));
const NewsFavorites = React.lazy(() => import('./pages/NewsFavorites'));
const PDFTest = React.lazy(() => import('./pages/PDFTest'));
const NotFound = React.lazy(() => import('./components/NotFound'));
const Register = React.lazy(() => import('./components/Register'));
const RegisterSuccess = React.lazy(() => import('./components/RegisterSuccess'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const CustomSchedule = React.lazy(() => import('./pages/CustomSchedule'));
const CustomScheduleMobile = React.lazy(() => import('./pages/CustomScheduleMobile'));
const QuantityCheck = React.lazy(() => import('./pages/QuantityCheck'));
const ScheduleManagement = React.lazy(() => import('./components/schedule/ScheduleManagement'));
const NotepadApp = React.lazy(() => import('./components/NotepadApp'));
const GanttChartPage = React.lazy(() => import('./pages/GanttChart'));
const Estimates = React.lazy(() => import('./pages/Estimates'));
const Claims = React.lazy(() => import('./pages/Claims'));
const EstimatesMobile = React.lazy(() => import('./pages/EstimatesMobile'));
const ClaimsMobile = React.lazy(() => import('./pages/ClaimsMobile'));
const Confidential = React.lazy(() => import('./pages/Confidential'));
const UserManual = React.lazy(() => import('./pages/UserManual'));
const EstimateAnalysis = React.lazy(() => import('./pages/EstimateAnalysis'));
import useMediaQuery from '@mui/material/useMediaQuery';
import { CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  
  console.log('🛡️ ProtectedRoute 렌더링:', { currentUser, loading, showSplash });
  
  if (loading || showSplash) {
    console.log('⏳ ProtectedRoute - 로딩 중 또는 스플래시 표시 중');
    return (
      <SplashScreen 
        onComplete={() => {
          console.log('✅ 스플래시 화면 완료');
          setShowSplash(false);
        }} 
      />
    );
  }
  
  // 로그인하지 않은 경우 로그인 화면 표시
  if (!currentUser) {
    console.log('🚫 ProtectedRoute - 로그인 필요, 로그인 페이지로 이동');
    return <Navigate to="/auth" replace />;
  }
  
  console.log('✅ ProtectedRoute - 로그인 완료, 메인 페이지로 이동');
  return children;
};

const App = React.memo(() => {
  const isMobile = useMediaQuery('(max-width:600px)');
  
  // 아이디어패드 상태
  const [ideaPadOpen, setIdeaPadOpen] = useState(false);
  const [ideaPadSiteId, setIdeaPadSiteId] = useState(null);
  const [ideaPadSiteName, setIdeaPadSiteName] = useState('');
  const [ideaPadDrawingId, setIdeaPadDrawingId] = useState(null);
  
  // 아이디어패드 열기 함수
  const handleOpenIdeaPad = (siteId, siteName, drawingId = null) => {
    console.log('🔍 아이디어패드 열기:', { siteId, siteName, drawingId });
    setIdeaPadSiteId(siteId);
    setIdeaPadSiteName(siteName);
    setIdeaPadDrawingId(drawingId);
    setIdeaPadOpen(true);
  };
  
  // 아이디어패드 닫기 함수
  const handleCloseIdeaPad = () => {
    setIdeaPadOpen(false);
    setIdeaPadSiteId(null);
    setIdeaPadSiteName('');
    setIdeaPadDrawingId(null);
  };

  // 전역 cleanup 매니저 및 성능 모니터링 초기화
  useEffect(() => {
    try {
      // 성능 모니터링 시작
      enhancedPerformanceMonitor.startMemoryMonitoring();
      
      // 임시: 현장명 동기화 함수를 전역으로 추가
      window.syncSiteNames = syncSiteNames;
      window.syncSiteNamesDirect = syncSiteNamesDirect;
      
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
      
      // 모바일 입력 최적화 초기화
      const cleanupMobileInput = initializeMobileInputOptimization();
      
      return cleanupMobileInput;
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

  // aria-hidden 접근성 문제 해결
  useEffect(() => {
    try {
      // 앱 시작 시 aria-hidden 문제 해결
      fixAriaHiddenIssues();
      
      // 주기적으로 aria-hidden 문제 해결 (5초마다)
      const interval = setInterval(() => {
        fixAriaHiddenIssues();
      }, 5000);
      
      return () => {
        clearInterval(interval);
      };
    } catch (error) {
      console.error('aria-hidden 문제 해결 초기화 오류:', error);
    }
  }, []);

  // react-beautiful-dnd 중첩 스크롤 컨테이너 문제 해결
  useEffect(() => {
    try {
      // 앱 시작 시 중첩 스크롤 컨테이너 문제 해결
      fixNestedScrollContainers();
      
      // 주기적으로 중첩 스크롤 컨테이너 문제 해결 (10초마다)
      const interval = setInterval(() => {
        fixNestedScrollContainers();
      }, 10000);
      
      return () => {
        clearInterval(interval);
      };
    } catch (error) {
      console.error('중첩 스크롤 컨테이너 문제 해결 초기화 오류:', error);
    }
  }, []);

  return (
    <>
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
                      {/* URL 단축 라우트들 */}
                      <Route path="/d" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/s" element={<Navigate to="/schedule" replace />} />
                      <Route path="/g" element={<Navigate to="/gantt" replace />} />
                      <Route path="/st" element={<Navigate to="/sites" replace />} />
                      <Route path="/is" element={<Navigate to="/importantsite" replace />} />
                      <Route path="/sf" element={<Navigate to="/safety" replace />} />
                      <Route path="/dc" element={<Navigate to="/discussions" replace />} />
                      <Route path="/v" element={<Navigate to="/vendors" replace />} />
                      <Route path="/vm" element={<Navigate to="/vendor-management" replace />} />
                      <Route path="/p" element={<Navigate to="/progress" replace />} />
                      <Route path="/c" element={<Navigate to="/cost" replace />} />
                      <Route path="/dt" element={<Navigate to="/daema-team" replace />} />
                      <Route path="/cf" element={<Navigate to="/confidential" replace />} />
                      <Route path="/m" element={<Navigate to="/members" replace />} />
                      <Route path="/pm" element={<Navigate to="/permissions" replace />} />
                      <Route path="/u" element={<Navigate to="/users" replace />} />
                      <Route path="/t" element={<Navigate to="/todo-list" replace />} />
                      <Route path="/ta" element={<Navigate to="/todo/all" replace />} />
                      <Route path="/gs" element={<Navigate to="/gisung" replace />} />
                              <Route path="/wl" element={<Navigate to="/whole-list" replace />} />
        <Route path="/nf" element={<Navigate to="/news-favorites" replace />} />
        <Route path="/pt" element={<Navigate to="/pdf-test" replace />} />
        <Route path="/tu" element={<Navigate to="/template-upload" replace />} />
        <Route path="/pr" element={<Navigate to="/profile" replace />} />
        <Route path="/cl" element={<Navigate to="/claims" replace />} />
                      <Route path="/es" element={<Navigate to="/estimates" replace />} />
                      <Route path="/map" element={<Navigate to="/mapping" replace />} />
        <Route path="/set" element={<Navigate to="/settings" replace />} />
                      <Route path="/cd" element={<Navigate to="/company-distribution" replace />} />
                      
                      {/* 기존 라우트들 */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/register-success" element={<RegisterSuccess />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/auth" element={<Login />} />
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
                                <ScheduleManagement onOpenIdeaPad={handleOpenIdeaPad} />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <CustomScheduleMobile />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <ScheduleManagement onOpenIdeaPad={handleOpenIdeaPad} />
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
                        path="/company-distribution"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <CompanyDistribution />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <CompanyDistribution />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/quantity-check"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <QuantityCheck />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <QuantityCheck />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/sites/:siteName"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <SiteDetail />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <SiteDetail />
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
                                <Suspense fallback={<LoadingSpinner />}>
                                  <Safety />
                                </Suspense>
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Suspense fallback={<LoadingSpinner />}>
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
                                <ScheduleManagement onOpenIdeaPad={handleOpenIdeaPad} />
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
                        path="/confidential"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Confidential />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Confidential />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/daema-team"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <ConstructionTeam />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <ConstructionTeam />
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
                                <GisungStatusPage onOpenIdeaPad={handleOpenIdeaPad} />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <GisungStatusPage onOpenIdeaPad={handleOpenIdeaPad} />
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
                                <EstimatesMobile />
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
                        path="/mapping"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <Mapping />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Mapping />
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
                                <ClaimsMobile onOpenIdeaPad={handleOpenIdeaPad} />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <Claims onOpenIdeaPad={handleOpenIdeaPad} />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settlement"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <SettlementManagement />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <SettlementManagement />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settlement/:siteId"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <SettlementDetail />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <SettlementDetail />
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
                      <Route
                        path="/template-upload"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <TemplateUpload />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <TemplateUpload />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/manual"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <UserManual />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <UserManual />
                              </Layout>
                            )}
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/estimate-analysis"
                        element={
                          <ProtectedRoute>
                            {isMobile ? (
                              <MobileLayout>
                                <EstimateAnalysis />
                              </MobileLayout>
                            ) : (
                              <Layout>
                                <EstimateAnalysis />
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
    
    {/* 아이디어패드 */}
    <Suspense fallback={<div>Loading...</div>}>
      <NotepadApp 
        open={ideaPadOpen}
        onClose={handleCloseIdeaPad}
        siteId={ideaPadSiteId}
        siteName={ideaPadSiteName}
        drawingId={ideaPadDrawingId}
      />
    </Suspense>
    </>
  );
});

export default App; 