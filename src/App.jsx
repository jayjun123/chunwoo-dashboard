import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';
import { configureIME } from './utils/imeHandler.jsx';
import { initKeyboardManager } from './utils/pwaKeyboardUtils';
import { initMobileOptimization, initViewportHeight } from './utils/mobileOptimization';
import { initializeWindow } from './utils/windowManager';
import { globalCleanupManager, enhancedPerformanceMonitor } from './utils/performanceUtils';
import { initializeMobileInputOptimization } from './utils/mobileInputOptimization';
import { fixAriaHiddenIssues } from './utils/materialUploadUtils';
import { fixNestedScrollContainers } from './utils/dndScrollFix';
import { applyIPadTouchOptimization, enhanceApplePencilTouch, ensureInputFocus, shouldApplyAggressiveTouchOptimization } from './utils/touchOptimization';
import { initTouchOptimization } from './utils/touchUtils';
import './utils/migrateUtils';
import './styles/IME.css';
import { AuthProvider } from './contexts/AuthContext';
import { TodoProvider } from './contexts/TodoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Provider } from 'react-redux';
import { store } from './store/index';
import Layout from './components/Layout';
import SwipeableContainer from './components/common/SwipeableContainer';
import Login from './components/Login';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './contexts/AuthContext';
import LoadingProvider from './components/common/LoadingProvider';
import PopupProvider from './contexts/PopupContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import SplashScreen from './components/common/SplashScreen';
import FloatingTodoList from './components/FloatingTodoList';
import ProtectedRoute from './components/common/ProtectedRoute';

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
import { URL_ALIASES, expandUrl } from './utils/urlShortener';
import errorHandler from './utils/errorHandler';
import { lazyWithRetry } from './utils/lazyWithRetry';

// 성능 최적화: 추가 페이지들을 lazy loading으로 변경
const TemplateUpload = lazyWithRetry(() => import('./pages/TemplateUpload'));
const CompanyDistribution = lazyWithRetry(() => import('./pages/CompanyDistribution'));
const SettlementManagement = lazyWithRetry(() => import('./pages/SettlementManagement'));
const SettlementDetail = lazyWithRetry(() => import('./pages/SettlementDetail'));
const Mapping = lazyWithRetry(() => import('./pages/Mapping'));
const ProjectDSH = lazyWithRetry(() => import('./pages/ProjectDSH'));

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

// 전역 함수 노출 (개발 환경에서만, 마이그레이션/디버깅용)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.syncSiteNamesDirect = syncSiteNamesDirect;
  window.addSequenceToCostsDirect = addSequenceToCostsDirect;
}
const Safety = lazyWithRetry(() => import('./pages/Safety'));
const SafetyInspections = lazyWithRetry(() => import('./components/safety/SafetyInspections'));
const SafetyIncidents = lazyWithRetry(() => import('./components/safety/SafetyIncidents'));
const SafetyTraining = lazyWithRetry(() => import('./components/safety/SafetyTraining'));
const SafetyReports = lazyWithRetry(() => import('./components/safety/SafetyReports'));
// 성능 최적화: 페이지 컴포넌트들을 lazy loading으로 변경
const ConstructionTeam = lazyWithRetry(() => import('./pages/DaemaTeam'));
const TeamSettlement = lazyWithRetry(() => import('./pages/TeamSettlement'));
const Discussions = lazyWithRetry(() => import('./pages/Discussions'));
const Vendors = lazyWithRetry(() => import('./pages/Vendors'));
const VendorManagement = lazyWithRetry(() => import('./pages/VendorManagement'));
const Progress = lazyWithRetry(() => import('./pages/Progress'));
const Inventory = lazyWithRetry(() => import('./pages/Inventory'));
const Members = lazyWithRetry(() => import('./pages/Members'));
const Permissions = lazyWithRetry(() => import('./pages/Permissions'));
const TodoList = lazyWithRetry(() => import('./components/TodoList'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Cost = lazyWithRetry(() => import('./pages/Cost'));
const Users = lazyWithRetry(() => import('./pages/Users'));
const ImportantSite = lazyWithRetry(() => import('./pages/ImportantSite'));
const NewSites = lazyWithRetry(() => import('./pages/NewSites'));
const GisungStatusPage = lazyWithRetry(() => import('./components/GisungStatusPage'));
const SiteDetail = lazyWithRetry(() => import('./components/sites/SiteDetail'));

const WholeList = lazyWithRetry(() => import('./pages/WholeList'));
const Profile = lazyWithRetry(() => import('./components/Profile'));
const NewsFavorites = lazyWithRetry(() => import('./pages/NewsFavorites'));
const PDFTest = lazyWithRetry(() => import('./pages/PDFTest'));
const NotFound = lazyWithRetry(() => import('./components/NotFound'));
const Register = lazyWithRetry(() => import('./components/Register'));
const RegisterSuccess = lazyWithRetry(() => import('./components/RegisterSuccess'));
const ForgotPassword = lazyWithRetry(() => import('./components/ForgotPassword'));
const CustomSchedule = lazyWithRetry(() => import('./pages/CustomSchedule'));
const QuantityCheck = lazyWithRetry(() => import('./pages/QuantityCheck'));
const ScheduleManagement = lazyWithRetry(() => import('./components/schedule/ScheduleManagement'));
const NotepadApp = lazyWithRetry(() => import('./components/NotepadApp'));
const GanttChartPage = lazyWithRetry(() => import('./pages/GanttChart'));
const Estimates = lazyWithRetry(() => import('./pages/Estimates'));
const Claims = lazyWithRetry(() => import('./pages/Claims'));
const Confidential = lazyWithRetry(() => import('./pages/Confidential'));
const UserManual = lazyWithRetry(() => import('./pages/UserManual'));
const WorkflowDiagramPage = lazyWithRetry(() => import('./pages/WorkflowDiagramPage'));
const EstimateAnalysis = lazyWithRetry(() => import('./pages/EstimateAnalysis'));
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const NotificationCrawler = lazyWithRetry(() => import('./components/NotificationCrawler'));
const HyunjangSch = lazyWithRetry(() => import('./pages/HyunjangSch'));
const AISummary = lazyWithRetry(() => import('./pages/AISummary'));
const MailDashboard = lazyWithRetry(() => import('./pages/MailDashboard'));

const App = React.memo(() => {
  // 아이디어패드 상태
  const [ideaPadOpen, setIdeaPadOpen] = useState(false);
  const [ideaPadSiteId, setIdeaPadSiteId] = useState(null);
  const [ideaPadSiteName, setIdeaPadSiteName] = useState('');
  const [ideaPadDrawingId, setIdeaPadDrawingId] = useState(null);
  
  // 플로팅 TodoList 상태
  const [showFloatingTodo, setShowFloatingTodo] = useState(() => {
    const saved = localStorage.getItem('todoList_pinned');
    return saved === 'true';
  });
  
  // 페이지 로드 시 고정 상태 확인
  useEffect(() => {
    const saved = localStorage.getItem('todoList_pinned');
    if (saved === 'true') {
      setShowFloatingTodo(true);
    }
  }, []);
  
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
  
  // 플로팅 TodoList 열기
  const handleOpenFloatingTodo = () => {
    setShowFloatingTodo(true);
  };
  
  // 플로팅 TodoList 닫기
  const handleCloseFloatingTodo = () => {
    setShowFloatingTodo(false);
    localStorage.setItem('todoList_pinned', 'false');
  };
  
  // 전역 함수로 노출 (BottomBar에서 사용)
  useEffect(() => {
    window.openFloatingTodo = handleOpenFloatingTodo;
    window.setFloatingTodoPinned = (pinned) => {
      if (pinned) {
        setShowFloatingTodo(true);
      }
    };
    return () => {
      delete window.openFloatingTodo;
      delete window.setFloatingTodoPinned;
    };
  }, []);

  // 전역 cleanup 매니저 및 성능 모니터링 초기화
  useEffect(() => {
    try {
      // 성능 모니터링 시작
      enhancedPerformanceMonitor.startMemoryMonitoring();
      
      // 임시: 현장명 동기화 함수를 전역으로 추가 (개발 환경에서만)
      if (import.meta.env.DEV) {
        window.syncSiteNames = syncSiteNames;
        window.syncSiteNamesDirect = syncSiteNamesDirect;
      }
      
      // 페이지 언로드 시 cleanup 실행
      const handleBeforeUnload = () => {
        globalCleanupManager.cleanup();
        enhancedPerformanceMonitor.stopMemoryMonitoring();
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (import.meta.env.DEV) {
          delete window.syncSiteNames;
          delete window.syncSiteNamesDirect;
        }
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
      if (window.location.pathname.includes('/estimates')) {
        console.log('Skip mobile optimization on estimates page');
        return;
      }
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

  // 입력 필드 포커스 강제 활성화 (모든 디바이스)
  useEffect(() => {
    try {
      if (window.location.pathname.includes('/estimates')) {
        console.log('Skip input focus optimization on estimates page');
        return;
      }
      // 즉시 실행
      ensureInputFocus();
      console.log('Input focus optimization initialized');
    } catch (error) {
      console.error('Input focus optimization error:', error);
    }
  }, []);

  // 아이패드 터치 최적화 초기화
  useEffect(() => {
    try {
      if (window.location.pathname.includes('/estimates')) {
        console.log('Skip iPad touch optimization on estimates page');
        return;
      }
      // 아이패드 터치 최적화 적용
      applyIPadTouchOptimization();
      console.log('iPad touch optimization initialized');
    } catch (error) {
      console.error('iPad touch optimization error:', error);
      // 오류가 발생해도 앱은 계속 실행
    }
  }, []);

  // 터치 이벤트 최적화 (태블릿·터치 주 입력 기기만 — 하이브리드 노트북 제외)
  useEffect(() => {
    try {
      if (window.location.pathname.includes('/estimates')) {
        console.log('Skip touch optimization on estimates page');
        return;
      }
      if (!shouldApplyAggressiveTouchOptimization()) {
        return;
      }
      initTouchOptimization();
      console.log('Touch optimization initialized');
    } catch (error) {
      console.error('Touch optimization error:', error);
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

  // aria-hidden 접근성 보정 (#root는 제외 — materialUploadUtils 참고)
  useEffect(() => {
    try {
      fixAriaHiddenIssues();
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
                zIndex: {
                  mobileStepper: 2147480000,
                  fab: 2147480100,
                  speedDial: 2147480200,
                  appBar: 2147480300,
                  drawer: 2147480400,
                  modal: 2147483000,
                  snackbar: 2147483100,
                  tooltip: 2147483200,
                },
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
                  MuiModal: {
                    styleOverrides: {
                      root: {
                        zIndex: 2147483000,
                      },
                    },
                  },
                  MuiDialog: {
                    styleOverrides: {
                      root: {
                        zIndex: 2147483000,
                      },
                    },
                  },
                  MuiPopover: {
                    styleOverrides: {
                      root: {
                        zIndex: 2147483000,
                      },
                    },
                  },
                  MuiPopper: {
                    styleOverrides: {
                      root: {
                        zIndex: 2147483200,
                      },
                    },
                  },
                  MuiTooltip: {
                    styleOverrides: {
                      popper: {
                        zIndex: 2147483200,
                      },
                    },
                  },
                  MuiSnackbar: {
                    styleOverrides: {
                      root: {
                        zIndex: 2147483100,
                      },
                    },
                  },
                  MuiBackdrop: {
                    styleOverrides: {
                      root: {
                        zIndex: 2147482999,
                      },
                    },
                  },
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
                    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
                      <Route path="/home" element={<Navigate to="/landing" replace />} />
                      <Route path="/mobile" element={<Navigate to="/mobile-render" replace />} />
                      
                      {/* 기존 라우트들 */}
                      <Route path="/landing" element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <LandingPage />
                        </Suspense>
                      } />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <Register />
                        </Suspense>
                      } />
                      <Route path="/register-success" element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <RegisterSuccess />
                        </Suspense>
                      } />
                      <Route path="/forgot-password" element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <ForgotPassword />
                        </Suspense>
                      } />
                      <Route path="/auth" element={<Login />} />
                      <Route
                        path="/"
                        element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <LandingPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <ScheduleManagement onOpenIdeaPad={handleOpenIdeaPad} />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/sites"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <NewSites />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/company-distribution"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <CompanyDistribution />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/quantity-check"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <QuantityCheck />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/sites/:siteName"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <SiteDetail />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/hyunjangsch/:siteId"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <HyunjangSch />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/hyunjangsch/group/:groupId"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <HyunjangSch />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Safety />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/materials"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <div>자재관리 페이지 (데스크톱용)</div>
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety-inspections"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <SafetyInspections />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety-accidents"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <SafetyIncidents />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety-education"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <SafetyTraining />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/safety-costs"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <SafetyReports />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/schedule"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <ScheduleManagement onOpenIdeaPad={handleOpenIdeaPad} />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/gantt"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <GanttChartPage />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/confidential"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Confidential />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/daema-team"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <ConstructionTeam />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/team-settlement"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <TeamSettlement />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/discussions"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Discussions />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendors"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Vendors />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/vendor-management"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <VendorManagement />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/progress"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Progress />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/inventory/*"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Inventory />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/members"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Members />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/permissions"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Permissions />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/todo-list"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <TodoListWrapper onFloatingMode={handleOpenFloatingTodo} />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/todo/all"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <TodoList />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Settings />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        } 
                      />
                      <Route
                        path="/importantsite"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <ImportantSite />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/gisung"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <GisungStatusPage onOpenIdeaPad={handleOpenIdeaPad} />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/whole-list"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <WholeList />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/cost"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Cost />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/estimates"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Estimates />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/mapping"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Mapping />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/claims"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Claims onOpenIdeaPad={handleOpenIdeaPad} />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/ai-summary"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <AISummary />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      {import.meta.env.DEV && (
                        <Route
                          path="/mail-dashboard"
                          element={
                            <Suspense fallback={<LoadingSpinner />}>
                              <MailDashboard />
                            </Suspense>
                          }
                        />
                      )}
                      <Route
                        path="/settlement"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <SettlementManagement />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settlement/:siteId"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <SettlementDetail />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Users />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Profile />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/news-favorites"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <NewsFavorites />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/pdf-test"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <PDFTest />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/template-upload"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <TemplateUpload />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/manual"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <UserManual />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/workflow-diagram"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <WorkflowDiagramPage />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/estimate-analysis"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <EstimateAnalysis />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notification-crawler"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <NotificationCrawler />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/project-dsh"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <ProjectDSH />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/project-dsh/:siteId"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <ProjectDSH />
                              </Suspense>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      <Route path="*" element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <NotFound />
                        </Suspense>
                      } />
                    </Routes>
                    </Box>
                    </Box>
                  </Router>
                </PopupProvider>
              </LoadingProvider>
              
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
              
              {/* 플로팅 TodoList */}
              {showFloatingTodo && (
                <FloatingTodoList
                  onClose={handleCloseFloatingTodo}
                />
              )}
            </MuiThemeProvider>
          </ThemeProvider>
        </TodoProvider>
      </AuthProvider>
    </Provider>
    </ErrorBoundary>
    </>
  );
});

// TodoList Wrapper 컴포넌트
const TodoListWrapper = ({ onFloatingMode }) => {
  const TodoList = lazyWithRetry(() => import('./components/TodoList'));
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TodoList onFloatingMode={onFloatingMode} />
    </Suspense>
  );
};

export default App; 