import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodo } from '../contexts/TodoContext';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
  IconButton,
  Divider,
  Chip,
  Avatar,
  Stack
} from '@mui/material';
import {
  Construction,
  Schedule,
  Map,
  Security,
  Assessment,
  Group,
  TrendingUp,
  Speed,
  CheckCircle,
  ArrowForward,
  PlayArrow,
  Star,
  Business,
  Engineering,
  Timeline,
  LocationOn,
  Shield,
  Analytics,
  People,
  Description,
  Today,
  Dashboard,
  Visibility,
  Launch,
  AccessTime,
  Event,
  Assignment,
  Warning,
  CheckCircleOutline
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();
  const { todos, loading: todoLoading, toggleTodo } = useTodo();
  const [userRole, setUserRole] = useState(null);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [todayTodos, setTodayTodos] = useState([]);
  const heroRef = useRef(null);

  // 자동 슬라이드 기능
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 사용자 권한 확인
  useEffect(() => {
    const checkUserRole = async () => {
      if (currentUser) {
        try {
          const { getIdTokenResult } = await import('firebase/auth');
          const { auth } = await import('../firebase');
          if (auth.currentUser) {
            const tokenResult = await getIdTokenResult(auth.currentUser);
            setUserRole(tokenResult.claims.role || 'user');
          } else {
            setUserRole('user');
          }
        } catch (error) {
          console.error('사용자 권한 확인 실패:', error);
          setUserRole('user');
        }
      }
    };
    
    checkUserRole();
  }, [currentUser]);

  // 터치 이벤트 최적화
  useEffect(() => {
    // 스마트폰에서 터치 이벤트 최적화 - 기본 동작 허용
    const handleTouchMove = (e) => {
      // 스크롤을 위한 터치 이동 허용
    };

    // 터치 이벤트 리스너 추가 (passive: true로 성능 최적화)
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // 오늘의 일정 데이터 가져오기
  useEffect(() => {
    const fetchTodaySchedules = async () => {
      try {
        // 한국 시간 기준으로 오늘 날짜 계산
        const today = new Date();
    const todayStr = today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Seoul'
    }).replace(/\./g, '-').replace(/\s/g, '').replace(/-$/, ''); // YYYY-MM-DD 형식 (끝의 - 제거)
        
        console.log('📅 랜딩페이지 오늘 날짜 계산:', {
          현재시간: today.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          오늘날짜: todayStr,
          UTC시간: today.toISOString()
        });
        
        // Firebase에서 실제 일정 데이터 가져오기
        const { db } = await import('../firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        // 실제 일정 컬렉션에서 오늘 날짜의 일정 가져오기
        const schedulesRef = collection(db, 'schedules');
        const q = query(schedulesRef);
        const querySnapshot = await getDocs(q);
        
        const schedules = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // 날짜 처리 (다양한 형식 지원) - 한국 시간 기준
          let scheduleDate = null;
          if (data.date) {
            if (data.date.toDate) {
              // Firestore Timestamp인 경우 - 한국 시간으로 변환
              const date = data.date.toDate();
              scheduleDate = date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'Asia/Seoul'
              }).replace(/\./g, '-').replace(/\s/g, '').replace(/-$/, '');
            } else if (data.date instanceof Date) {
              // JavaScript Date인 경우 - 한국 시간으로 변환
              scheduleDate = data.date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'Asia/Seoul'
              }).replace(/\./g, '-').replace(/\s/g, '').replace(/-$/, '');
            } else if (typeof data.date === 'string') {
              // 문자열인 경우
              scheduleDate = data.date;
            }
          }
          
          // 오늘 날짜와 일치하는 일정만 추가
          console.log(`📅 일정 날짜 비교: ${data.title || '제목없음'} - DB날짜: ${scheduleDate}, 오늘날짜: ${todayStr}, 일치: ${scheduleDate === todayStr}, 타입: ${data.type || '없음'}`);
          if (scheduleDate === todayStr) {
            // 실제 현장명 찾기
            let actualTitle = data.title || data.name || data.description || data.task || data.content || data.scheduleName || data.projectName || data.siteName || '일정';
            
            // 만약 제목이 "일정"이면 다른 필드들도 확인
            if (actualTitle === '일정') {
              actualTitle = data.text || data.label || data.value || data.subject || data.work || data.job || '일정';
            }
            
            // 분류 태그 결정 - data.type을 우선으로 하고, 없으면 제목으로 판단
            let category = '[기타]'; // 기본값을 기타로 변경
            
            // data.type이 있으면 우선 사용
            if (data.type) {
              switch (data.type) {
                case '현장':
                case 'site':
                  category = '[현장]';
                  break;
                case '실측':
                case 'survey':
                  category = '[실측]';
                  break;
                case '안전':
                case 'safety':
                  category = '[안전]';
                  break;
                case '회의':
                case 'meeting':
                  category = '[회의]';
                  break;
                case '기성':
                case 'progress':
                  category = '[기성]';
                  break;
                case '견적':
                case 'estimate':
                  category = '[견적]';
                  break;
                case '입찰':
                case 'bid':
                  category = '[입찰]';
                  break;
                case '전자입찰':
                case 'electronic_bid':
                  category = '[전자입찰]';
                  break;
                case '현설':
                case 'site_setup':
                  category = '[현설]';
                  break;
                case '기타':
                case 'other':
                  category = '[기타]';
                  break;
                default:
                  category = `[${data.type}]`; // 기타 타입은 그대로 표시
              }
            } else {
              // data.type이 없으면 제목으로 판단
              if (actualTitle.includes('현장') || actualTitle.includes('공사') || actualTitle.includes('건설') || actualTitle.includes('시설')) {
                category = '[현장]';
              } else if (actualTitle.includes('실측') || actualTitle.includes('측량') || actualTitle.includes('측정')) {
                category = '[실측]';
              } else if (actualTitle.includes('안전') || actualTitle.includes('점검') || actualTitle.includes('교육')) {
                category = '[안전]';
              } else if (actualTitle.includes('회의') || actualTitle.includes('미팅') || actualTitle.includes('검토')) {
                category = '[회의]';
              } else if (actualTitle.includes('기성') || actualTitle.includes('진행') || actualTitle.includes('완료')) {
                category = '[기성]';
              } else if (actualTitle.includes('견적') || actualTitle.includes('계약') || actualTitle.includes('거래처')) {
                category = '[견적]';
              } else if (actualTitle.includes('입찰') || actualTitle.includes('공고')) {
                category = '[입찰]';
              } else if (actualTitle.includes('전자입찰')) {
                category = '[전자입찰]';
              } else if (actualTitle.includes('현설') || actualTitle.includes('현장설치')) {
                category = '[현설]';
              } else {
                category = '[기타]';
              }
            }
            
            console.log(`📅 일정 분류 결정: ${actualTitle} - 원본타입: ${data.type || '없음'}, 결정된분류: ${category}`);
            
            schedules.push({
              id: doc.id,
              title: actualTitle,
              type: data.type || 'general',
              category: category
            });
          }
        });
        
        // 모든 데이터 로그 출력 (디버깅용)
        console.log('전체 일정 데이터:', querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        console.log('오늘 날짜:', todayStr);
        console.log('오늘 일정 필터링 결과:', schedules);
        
        // 디버깅을 위한 로그
        console.log('📅 랜딩페이지 일정 데이터 로드:', {
          오늘날짜: todayStr,
          전체일정개수: querySnapshot.size,
          필터링된일정개수: schedules.length,
          일정목록: schedules
        });
        
        setTodaySchedules(schedules);
      } catch (error) {
        console.error('일정 데이터 로드 실패:', error);
        // Firebase 연결 실패 시 빈 배열로 설정
        setTodaySchedules([]);
      }
    };

    fetchTodaySchedules();
  }, []);

  // 오늘의 할일 데이터 가져오기 (TodoContext에서) - 개선된 버전
  useEffect(() => {
    if (todoLoading || !todos) return;
    
    console.log('🚀 TodoContext에서 할일 데이터 처리 시작 (개선된 버전)');
    console.log('📊 현재 todos 상태:', {
      개수: todos.length,
      로딩상태: todoLoading,
      할일목록: todos.map(t => ({ id: t.id, text: t.text, completed: t.completed, date: t.date }))
    });
    
    try {
      // 한국 시간 기준으로 오늘/어제 날짜 계산
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const todayStr = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Seoul'
      }).replace(/\./g, '-').replace(/\s/g, '').replace(/-$/, ''); // YYYY-MM-DD 형식
      
      const yesterdayStr = yesterday.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Seoul'
      }).replace(/\./g, '-').replace(/\s/g, '').replace(/-$/, ''); // YYYY-MM-DD 형식
      
      console.log('📅 날짜 계산 완료:', {
        오늘날짜: todayStr,
        어제날짜: yesterdayStr,
        전체할일개수: todos.length
      });
      
      const filteredTodos = [];
      let completedCount = 0;
      let todayCount = 0;
      let yesterdayCount = 0;
      
      todos.forEach((todo) => {
        // 날짜 처리 - 간단하게 문자열로 변환
        let todoDate = null;
        if (todo.date) {
          if (todo.date.toDate) {
            // Firestore Timestamp인 경우
            const date = todo.date.toDate();
            todoDate = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
          } else if (todo.date instanceof Date) {
            // JavaScript Date인 경우
            todoDate = todo.date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
          } else if (typeof todo.date === 'string') {
            // 문자열인 경우 - "09월 29일" 형식 처리
            const dateStr = todo.date;
            
            // "09월 29일" 형식인지 확인
            const monthDayMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
            if (monthDayMatch) {
              const month = monthDayMatch[1].padStart(2, '0');
              const day = monthDayMatch[2].padStart(2, '0');
              const currentYear = new Date().getFullYear();
              todoDate = `${currentYear}-${month}-${day}`;
            } else {
              // 다른 형식인 경우 그대로 사용
              todoDate = dateStr;
            }
          }
        }
        
        // 오늘 또는 어제 날짜와 일치하고 완료되지 않은 할일만 추가
        const isTodayOrYesterday = (todoDate === todayStr || todoDate === yesterdayStr);
        const isNotCompleted = !todo.completed;
        
        // 통계 카운트
        if (todo.completed) completedCount++;
        if (todoDate === todayStr) todayCount++;
        if (todoDate === yesterdayStr) yesterdayCount++;
        
        console.log(`📋 할일 체크: ${todo.title || todo.text || '제목없음'}`, {
          DB날짜: todoDate,
          오늘날짜: todayStr,
          어제날짜: yesterdayStr,
          완료상태: todo.completed,
          포함여부: isTodayOrYesterday && isNotCompleted,
          업데이트시간: todo.updatedAt ? (todo.updatedAt.toDate ? todo.updatedAt.toDate() : new Date(todo.updatedAt)) : null
        });
        
        if (isTodayOrYesterday && isNotCompleted) {
          filteredTodos.push({
            id: todo.id,
            title: todo.title || todo.text || '할일',
            completed: todo.completed || false,
            priority: todo.priority || 'medium',
            date: todoDate,
            isOverdue: todoDate === yesterdayStr, // 어제 할일이면 지연으로 표시
            updatedAt: todo.updatedAt,
            createdAt: todo.createdAt
          });
        }
      });
      
      // 지연된 할일을 먼저 정렬 (업데이트 시간도 고려)
      filteredTodos.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        
        // 같은 우선순위면 업데이트 시간으로 정렬 (최신순)
        const aTime = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
        const bTime = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
        return bTime - aTime;
      });
      
      console.log('📋 최종 할일 결과 (개선된 버전):', {
        전체할일개수: todos.length,
        필터링된할일개수: filteredTodos.length,
        완료된할일개수: completedCount,
        오늘할일개수: todayCount,
        어제할일개수: yesterdayCount,
        할일목록: filteredTodos.map(t => ({ 
          id: t.id, 
          title: t.title, 
          completed: t.completed, 
          isOverdue: t.isOverdue,
          date: t.date 
        }))
      });
      
      setTodayTodos(filteredTodos);
    } catch (error) {
      console.error('❌ 할일 데이터 처리 실패:', error);
      setTodayTodos([]);
    }
  }, [todos, todoLoading]); // todos나 todoLoading이 변경될 때마다 실행

  // 메인페이지에서 할일 완료 상태 토글
  const handleTodoToggle = async (todoId, currentCompleted) => {
    console.log('🔄 메인페이지에서 할일 상태 토글:', { 
      todoId, 
      currentCompleted,
      timestamp: new Date().toISOString()
    });
    
    try {
      await toggleTodo(todoId, currentCompleted);
      console.log('✅ 할일 상태 토글 완료');
    } catch (error) {
      console.error('❌ 할일 상태 토글 실패:', error);
      // 사용자에게 피드백 제공
      alert('할일 상태 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 스크롤 애니메이션
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);

  const features = [
    {
      icon: <Construction sx={{ fontSize: 60, color: '#43e97b' }} />,
      title: '현장 관리',
      description: '실시간 현장 현황 모니터링 및 효율적인 현장 관리 시스템',
      color: '#43e97b'
    },
    {
      icon: <Schedule sx={{ fontSize: 60, color: '#3b82f6' }} />,
      title: '일정 관리',
      description: '간트 차트를 통한 직관적인 프로젝트 일정 관리',
      color: '#3b82f6'
    },
    {
      icon: <Map sx={{ fontSize: 60, color: '#f59e0b' }} />,
      title: '지도 기반 현황',
      description: '지도에서 현장 위치 확인 및 거리 측정 기능',
      color: '#f59e0b'
    },
    {
      icon: <Security sx={{ fontSize: 60, color: '#ef4444' }} />,
      title: '안전 관리',
      description: '안전 점검, 사고 관리, 안전 교육 통합 관리',
      color: '#ef4444'
    }
  ];

  const services = [
    {
      icon: <Assessment />,
      title: '기성 관리',
      description: '기성 단계별 진행 상황 추적 및 관리',
      path: '/gisung'
    },
    {
      icon: <Group />,
      title: '거래처 관리',
      description: '협력업체 정보 및 계약 관리',
      path: '/vendors'
    },
    {
      icon: <TrendingUp />,
      title: '진행률 관리',
      description: '프로젝트 진행률 실시간 모니터링',
      path: '/progress'
    },
    {
      icon: <Security />,
      title: '견적 관리',
      description: '견적서 작성 및 분석 시스템',
      path: '/estimates'
    },
    {
      icon: <Speed />,
      title: '일정 관리',
      description: '프로젝트 일정 계획 및 추적',
      path: '/schedule'
    },
    {
      icon: <LocationOn />,
      title: '현장 지도',
      description: '현장 위치 확인 및 거리 측정',
      path: '/mapping'
    }
  ];

  const stats = [
    { number: '69', label: '관리 현장', icon: <Construction /> },
    { number: '27', label: '완료 현장', icon: <CheckCircle /> },
    { number: '26', label: '진행 현장', icon: <Timeline /> },
    { number: '12', label: '예정 현장', icon: <Schedule /> }
  ];

  // 오늘의 일정 데이터 (샘플)
  const todaySchedule = [
    { time: '09:00', title: '문경 향토음식 특성화센터 현장 점검', status: 'upcoming', priority: 'high' },
    { time: '11:30', title: '안전교육 진행', status: 'completed', priority: 'medium' },
    { time: '14:00', title: '기성 검토 회의', status: 'upcoming', priority: 'high' },
    { time: '16:30', title: '거래처 미팅', status: 'upcoming', priority: 'low' }
  ];

  // 주요 기능 바로가기
  const quickAccess = [
    {
      icon: <Dashboard sx={{ fontSize: 40, color: '#43e97b' }} />,
      title: '대시보드',
      description: '전체 현황 한눈에 보기',
      path: '/dashboard',
      preview: '현장 현황, 일정, 진행률 등 종합 정보'
    },
    {
      icon: <Today sx={{ fontSize: 40, color: '#3b82f6' }} />,
      title: '오늘의 일정',
      description: '오늘 해야 할 일들',
      path: '/schedule',
      preview: '현장 점검, 회의, 안전교육 등'
    },
    {
      icon: <Map sx={{ fontSize: 40, color: '#f59e0b' }} />,
      title: '현장 지도',
      description: '현장 위치 및 거리 측정',
      path: '/mapping',
      preview: '69개 현장 위치, 거리측정 기능'
    },
    {
      icon: <Security sx={{ fontSize: 40, color: '#ef4444' }} />,
      title: '안전 관리',
      description: '안전 점검 및 사고 관리',
      path: '/safety',
      preview: '안전 점검, 사고 관리, 교육'
    },
    {
      icon: <Assessment sx={{ fontSize: 40, color: '#8b5cf6' }} />,
      title: '기성 관리',
      description: '기성 단계별 진행 관리',
      path: '/gisung',
      preview: '기성 진행률, 단계별 관리'
    },
    {
      icon: <Group sx={{ fontSize: 40, color: '#06b6d4' }} />,
      title: '거래처 관리',
      description: '협력업체 정보 관리',
      path: '/vendors',
      preview: '거래처 정보, 계약 관리'
    },
    {
      icon: <Business sx={{ fontSize: 40, color: '#f97316' }} />,
      title: '현장 관리',
      description: '현장 정보 및 관리',
      path: '/sites',
      preview: '현장 정보, 현황 관리'
    },
    {
      icon: <Engineering sx={{ fontSize: 40, color: '#6366f1' }} />,
      title: '공사 관리',
      description: '현장 관리 페이지',
      path: '/sites',
      preview: '현장 정보, 현황 관리'
    },
    {
      icon: <Visibility sx={{ fontSize: 40, color: '#ec4899' }} />,
      title: '직원 관리',
      description: '시공팀 페이지',
      path: '/daema-team',
      preview: '직원 정보, 시공팀 관리'
    },
    {
      icon: <Event sx={{ fontSize: 40, color: '#84cc16' }} />,
      title: '전체 일정',
      description: '일정 관리 페이지',
      path: '/gantt',
      preview: '일정 계획, 추적, 관리'
    },
    {
      icon: <Warning sx={{ fontSize: 40, color: '#dc2626' }} />,
      title: '청구 관리',
      description: '청구 페이지',
      path: '/billing',
      preview: '청구서 작성, 관리'
    },
    {
      icon: <Description sx={{ fontSize: 40, color: '#10b981' }} />,
      title: '견적 관리',
      description: '견적서 작성 및 분석',
      path: '/estimates',
      preview: '견적서 작성, 분석, 승인 관리'
    }
  ];

  const handleGetStarted = () => {
    console.log('🚀 handleGetStarted 클릭됨', { 
      currentUser: currentUser ? '로그인됨' : '로그인 안됨',
      timestamp: new Date().toISOString()
    });
    
    try {
      if (currentUser) {
        console.log('✅ 로그인된 사용자, 대시보드로 이동');
        navigate('/dashboard');
      } else {
        console.log('🔐 로그인되지 않은 사용자, 로그인 페이지로 이동');
        navigate('/auth');
      }
    } catch (error) {
      console.error('❌ handleGetStarted 오류:', error);
      // 오류 발생 시에도 기본 동작 수행
      try {
        navigate('/auth');
      } catch (fallbackError) {
        console.error('❌ 폴백 네비게이션도 실패:', fallbackError);
        // 최후의 수단으로 페이지 새로고침
        window.location.href = '/auth';
      }
    }
  };

  const handleLogin = () => {
    console.log('🔑 handleLogin 클릭됨', { 
      timestamp: new Date().toISOString()
    });
    
    try {
      // 로그인 페이지로 이동
      navigate('/auth');
    } catch (error) {
      console.error('❌ handleLogin 오류:', error);
      // 오류 발생 시 폴백 동작
      try {
        window.location.href = '/auth';
      } catch (fallbackError) {
        console.error('❌ 폴백 네비게이션도 실패:', fallbackError);
        // 최후의 수단으로 페이지 새로고침
        window.location.reload();
      }
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      overflow: 'auto',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      color: 'white',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      // 스마트폰에서만 적용
      '@media (max-width: 767px)': {
        height: 'auto',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch'
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(67, 233, 123, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.02) 0%, transparent 50%)',
        pointerEvents: 'none'
      },
      '@keyframes shimmer': {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(100%)' }
      },
      '@keyframes pulse': {
        '0%, 100%': { 
          transform: 'scale(1)',
          filter: 'drop-shadow(0 0 10px rgba(67, 233, 123, 0.2))'
        },
        '50%': { 
          transform: 'scale(1.02)',
          filter: 'drop-shadow(0 0 20px rgba(67, 233, 123, 0.4))'
        }
      },
      '@keyframes cyberShimmer': {
        '0%': { 
          transform: 'translateX(-100%) rotate(45deg)',
          opacity: 0
        },
        '50%': { 
          opacity: 1
        },
        '100%': { 
          transform: 'translateX(100%) rotate(45deg)',
          opacity: 0
        }
      },
      '@keyframes cyberRotate': {
        '0%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
        '100%': { transform: 'translate(-50%, -50%) rotate(360deg)' }
      },
      '@keyframes cyberPulse': {
        '0%, 100%': { 
          transform: 'scale(1)',
          filter: 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.3))',
          textShadow: '0 0 40px rgba(0, 212, 255, 0.6)'
        },
        '50%': { 
          transform: 'scale(1.05)',
          filter: 'drop-shadow(0 0 25px rgba(0, 212, 255, 0.5))',
          textShadow: '0 0 60px rgba(0, 212, 255, 0.8)'
        }
      },
      '@keyframes buildingLights': {
        '0%, 100%': { 
          opacity: 0.3,
          transform: 'translateX(-10%)'
        },
        '50%': { 
          opacity: 0.8,
          transform: 'translateX(10%)'
        }
      }
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(67, 233, 123, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        flexShrink: 0,
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          py: 1
        }
      }}>
        <Container maxWidth={false} sx={{ maxWidth: '1352px' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2,
            gap: '200px',
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              justifyContent: 'center',
              gap: 1,
              py: 1
            }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                gap: 1
              }
            }}>
              <Avatar sx={{ 
                bgcolor: 'transparent', 
                width: 40, 
                height: 40,
                border: '2px solid #43e97b',
                boxShadow: '0 0 20px rgba(67, 233, 123, 0.3)',
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  width: 32,
                  height: 32
                }
              }}>
                <Construction sx={{ 
                  color: '#43e97b',
                  // 스마트폰에서만 적용
                  '@media (max-width: 767px)': {
                    fontSize: 20
                  }
                }} />
              </Avatar>
              <Typography variant="h5" sx={{ 
                fontWeight: 'bold', 
                color: '#43e97b',
                // 스마트폰에서만 적용
                '@media (max-width: 767px)': {
                  fontSize: '1.2rem'
                }
              }}>
                천우건업(주)
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              onClick={(e) => {
                console.log('🔘 헤더 버튼 클릭 이벤트:', {
                  type: e.type,
                  target: e.target.tagName,
                  currentTarget: e.currentTarget.tagName,
                  timestamp: new Date().toISOString(),
                  userAgent: navigator.userAgent
                });
                handleGetStarted();
              }}
              sx={{ 
                bgcolor: 'transparent',
                border: '2px solid #43e97b',
                color: '#43e97b',
                '&:hover': { 
                  bgcolor: 'rgba(67, 233, 123, 0.1)',
                  border: '2px solid #38d975',
                  boxShadow: '0 0 20px rgba(67, 233, 123, 0.3)'
                },
                px: 3,
                fontWeight: 'bold',
                cursor: 'pointer',
                zIndex: 9999,
                position: 'relative',
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                // 스마트폰에서만 적용 - 버튼 숨기기
                '@media (max-width: 767px)': {
                  display: 'none'
                }
              }}
            >
              {currentUser ? '시스템 시작' : '로그인'}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* 메인 콘텐츠 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'auto',
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch'
        }
      }}>
        <Container maxWidth={false} sx={{ 
          maxWidth: '1352px', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          py: 2,
          // 스마트폰에서만 적용
          '@media (max-width: 767px)': {
            py: 1,
            px: 1
          }
        }}>
          <Grid container spacing={0} sx={{ 
            flex: 1, 
            alignItems: 'stretch',
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              flexDirection: 'column'
            }
          }}>
            {/* 왼쪽: 제목과 설명 */}
            <Grid item xs={12} md={4} sx={{ maxWidth: '800px', width: '100%' }}>
              <Fade in timeout={1000}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 'bold', 
                    mb: 2,
                    background: 'linear-gradient(45deg, #43e97b, #3b82f6, #8b5cf6)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 30px rgba(67, 233, 123, 0.3)',
                    filter: 'drop-shadow(0 0 10px rgba(67, 233, 123, 0.2))',
                    // 스마트폰에서만 적용
                    '@media (max-width: 767px)': {
                      fontSize: '1.8rem'
                    }
                  }}>
                    현장관리시스템
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    color: '#e5e7eb',
                    lineHeight: 1.4,
                    fontWeight: '300'
                  }}>
                    현장 관리부터 안전 관리까지<br />
                    모든 것을 하나의 시스템으로
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    mb: 3, 
                    color: '#9ca3af',
                    lineHeight: 1.6
                  }}>
                    천우건업(주)의 종합적인 건설현장관리시스템으로 현장 운영을 효율화하고, 
                    안전을 강화하며, 프로젝트 성공을 보장하세요.
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                    <Button 
                      variant="contained" 
                      size="medium"
                      onClick={(e) => {
                        console.log('🔘 시작하기 버튼 클릭 이벤트:', {
                          type: e.type,
                          target: e.target.tagName,
                          currentTarget: e.currentTarget.tagName,
                          timestamp: new Date().toISOString(),
                          userAgent: navigator.userAgent
                        });
                        handleGetStarted();
                      }}
                      endIcon={<ArrowForward />}
                      sx={{ 
                        bgcolor: 'transparent',
                        border: '2px solid #43e97b',
                        color: '#43e97b',
                        '&:hover': { 
                          bgcolor: 'rgba(67, 233, 123, 0.1)',
                          border: '2px solid #38d975',
                          boxShadow: '0 0 30px rgba(67, 233, 123, 0.4)'
                        },
                        px: 3,
                        py: 1,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          px: 2,
                          py: 0.8,
                          fontSize: '0.9rem'
                        }
                      }}
                    >
                      시작하기
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="medium"
                      startIcon={<Security />}
                      onClick={(e) => {
                        console.log('🔘 로그인 버튼 클릭 이벤트:', {
                          type: e.type,
                          target: e.target.tagName,
                          currentTarget: e.currentTarget.tagName,
                          timestamp: new Date().toISOString(),
                          userAgent: navigator.userAgent
                        });
                        handleLogin();
                      }}
                      sx={{ 
                        borderColor: currentUser ? '#ef4444' : '#3b82f6',
                        color: currentUser ? '#ef4444' : '#3b82f6',
                        '&:hover': { 
                          borderColor: currentUser ? '#dc2626' : '#2563eb',
                          bgcolor: currentUser ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          boxShadow: currentUser ? '0 0 30px rgba(239, 68, 68, 0.6)' : '0 0 30px rgba(59, 130, 246, 0.4)'
                        },
                        px: 3,
                        py: 1,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        ...(currentUser && {
                          border: '2px solid #ef4444',
                          boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
                          textShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                        }),
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          px: 2,
                          py: 0.8,
                          fontSize: '0.9rem'
                        }
                      }}
                    >
                      {currentUser ? '로그인 완료' : '로그인하기'}
                    </Button>
                  </Stack>
                  
                  {/* 2025년도 현장 제목 */}
                  <Box sx={{ mb: 2, textAlign: 'left' }}>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: '#43e97b',
                      textShadow: '0 0 15px rgba(67, 233, 123, 0.4)',
                      letterSpacing: '2px',
                      fontSize: '2rem'
                    }}>
                      2025년도 현장
                    </Typography>
                  </Box>
                  
                  {/* 통계 카드들 */}
                  <Grid container spacing={1} sx={{ 
                    flex: 1,
                    // 스마트폰에서만 적용
                    '@media (max-width: 767px)': {
                      spacing: 0.5
                    }
                  }}>
                    {stats.map((stat, index) => (
                      <Grid item xs={3} key={index} sx={{
                        // 스마트폰에서만 적용
                        '@media (max-width: 767px)': {
                          xs: 3,
                          minWidth: 0
                        }
                      }}>
                        <Paper sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          background: 'rgba(0, 0, 0, 0.6)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(67, 233, 123, 0.1)',
                          borderRadius: 2,
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                          transition: 'all 0.3s ease',
                          minHeight: '120px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(67, 233, 123, 0.2)',
                            border: '1px solid rgba(67, 233, 123, 0.3)'
                          },
                          // 스마트폰에서만 적용
                          '@media (max-width: 767px)': {
                            p: 1,
                            minHeight: '80px',
                            borderRadius: 1
                          }
                        }}>
                          <Box sx={{ 
                            color: '#43e97b', 
                            mb: 1,
                            // 스마트폰에서만 적용
                            '@media (max-width: 767px)': {
                              mb: 0.5
                            }
                          }}>
                            {stat.icon}
                          </Box>
                          <Typography variant="h4" sx={{ 
                            fontWeight: 'bold', 
                            mb: 0.5,
                            color: '#43e97b',
                            textShadow: '0 0 10px rgba(67, 233, 123, 0.3)',
                            // 스마트폰에서만 적용
                            '@media (max-width: 767px)': {
                              fontSize: '1.2rem',
                              mb: 0.25
                            }
                          }}>
                            {currentUser ? stat.number : 0}
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            color: '#e5e7eb',
                            fontWeight: '500',
                            // 스마트폰에서만 적용
                            '@media (max-width: 767px)': {
                              fontSize: '0.7rem'
                            }
                          }}>
                            {stat.label}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Fade>
            </Grid>

            {/* 중앙: 현재 시간 & 통계 */}
            <Grid item xs={12} md={2} sx={{ maxWidth: '500px', width: '100%' }}>
              <Slide direction="up" in timeout={1200}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 현재 날짜/시간 - 사이버펑크 스타일 */}
                  <Paper sx={{ 
                    p: 2, 
                    mb: 1,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 10, 30, 0.98) 100%)',
                    backdropFilter: 'blur(30px)',
                    border: '2px solid transparent',
                    backgroundImage: `
                      linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(10, 10, 30, 0.98)), 
                      linear-gradient(45deg, #00d4ff, #0099cc, #0066ff, #00d4ff)
                    `,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                    borderRadius: 4,
                    boxShadow: `
                      0 20px 40px rgba(0, 0, 0, 0.8), 
                      0 0 30px rgba(0, 212, 255, 0.3),
                      inset 0 0 20px rgba(0, 212, 255, 0.1)
                    `,
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `
                        radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(0, 153, 204, 0.1) 0%, transparent 50%),
                        linear-gradient(45deg, transparent 30%, rgba(0, 212, 255, 0.05) 50%, transparent 70%)
                      `,
                      animation: 'cyberShimmer 4s ease-in-out infinite',
                      pointerEvents: 'none'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '200%',
                      height: '200%',
                      background: `
                        conic-gradient(from 0deg, 
                          transparent 0deg, 
                          rgba(0, 212, 255, 0.1) 90deg, 
                          transparent 180deg, 
                          rgba(0, 153, 204, 0.1) 270deg, 
                          transparent 360deg
                        )
                      `,
                      transform: 'translate(-50%, -50%) rotate(0deg)',
                      animation: 'cyberRotate 8s linear infinite',
                      pointerEvents: 'none',
                      zIndex: 0
                    }
                  }}>
                    <Box sx={{ position: 'relative', zIndex: 2 }}>
                      {/* 고층빌딩 실루엣 배경 */}
                      <Box sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '60%',
                        background: `
                          linear-gradient(to top, 
                            rgba(0, 0, 0, 0.8) 0%, 
                            rgba(0, 0, 0, 0.4) 30%, 
                            transparent 100%
                          )
                        `,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '100%',
                          background: `
                            linear-gradient(90deg, 
                              transparent 0%, 
                              rgba(0, 212, 255, 0.1) 10%, 
                              transparent 20%, 
                              rgba(0, 153, 204, 0.1) 30%, 
                              transparent 40%,
                              rgba(0, 102, 255, 0.1) 50%,
                              transparent 60%,
                              rgba(0, 212, 255, 0.1) 70%,
                              transparent 80%,
                              rgba(0, 153, 204, 0.1) 90%,
                              transparent 100%
                            )
                          `,
                          animation: 'buildingLights 3s ease-in-out infinite'
                        }
                      }} />
                      
                      <Typography variant="h5" sx={{ 
                        fontWeight: 'bold', 
                        background: 'linear-gradient(45deg, #00d4ff, #0099cc, #00d4ff)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 1,
                        textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
                        letterSpacing: '1px',
                        fontSize: '1.5rem',
                        position: 'relative',
                        zIndex: 3
                      }}>
                        {currentTime.toLocaleDateString('ko-KR', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </Typography>
                      
                      <Typography variant="h2" sx={{ 
                        fontWeight: '900', 
                        background: 'linear-gradient(45deg, #00d4ff, #ffffff, #0099cc, #00d4ff)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontFamily: '"Orbitron", "JetBrains Mono", monospace',
                        letterSpacing: '3px',
                        textShadow: '0 0 40px rgba(0, 212, 255, 0.6)',
                        filter: 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.3))',
                        position: 'relative',
                        zIndex: 3,
                        mb: 1,
                        fontSize: '3.5rem',
                        fontStretch: 'condensed',
                        WebkitTextStroke: '1px rgba(0, 212, 255, 0.3)',
                        textStroke: '1px rgba(0, 212, 255, 0.3)'
                      }}>
                        {currentTime.toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit',
                          hour12: false
                        })}
                      </Typography>
                      
                      <Typography variant="caption" sx={{ 
                        color: '#00d4ff',
                        mt: 1,
                        display: 'block',
                        fontSize: '0.8rem',
                        letterSpacing: '2px',
                        textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
                        position: 'relative',
                        zIndex: 3
                      }}>
                        ● IN KOREA ●
                      </Typography>
                    </Box>
                  </Paper>
                  
                  {/* 오늘의 일정 */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                      <Today sx={{ color: '#43e97b', mr: 1, fontSize: 20 }} />
                      <Typography variant="h6" sx={{ 
                        fontWeight: 'bold', 
                        color: '#43e97b',
                        textShadow: '0 0 10px rgba(67, 233, 123, 0.3)',
                        fontSize: '1.4rem'
                      }}>
                        오늘의 일정
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'left' }}>
                      {todaySchedules.length > 0 ? (
                        todaySchedules.map((schedule, index) => {
                          // 분류별 색상 정의
                          const getCategoryColor = (category) => {
                            switch (category) {
                              case '[현장]': return '#43e97b'; // 초록색
                              case '[실측]': return '#3b82f6'; // 파란색
                              case '[안전]': return '#ef4444'; // 빨간색
                              case '[회의]': return '#f59e0b'; // 주황색
                              case '[기성]': return '#8b5cf6'; // 보라색
                              case '[견적]': return '#06b6d4'; // 청록색
                              case '[입찰]': return '#f97316'; // 주황빨강
                              case '[전자입찰]': return '#ec4899'; // 핑크
                              case '[현설]': return '#10b981'; // 에메랄드
                              case '[기타]': return '#6b7280'; // 회색
                              default: return '#43e97b'; // 기본값
                            }
                          };
                          
                          const categoryColor = getCategoryColor(schedule.category);
                          
                          return (
                          <Typography 
                            key={schedule.id || index}
                            variant="body1" 
                            sx={{ 
                              color: '#e5e7eb',
                              mb: 0.5,
                              fontSize: '1.1rem',
                              textShadow: '0 0 5px rgba(67, 233, 123, 0.2)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                              '&:before': {
                                content: '"• "',
                                color: categoryColor,
                                fontWeight: 'bold'
                              }
                            }}
                          >
                            {/* [기타] 분류일 때는 분류 태그를 표시하지 않고 직접 입력한 내용만 표시 */}
                            {schedule.category === '[기타]' ? (
                              <Box component="span" sx={{ 
                                color: categoryColor,
                                fontWeight: 'bold',
                                textShadow: `0 0 8px ${categoryColor}40`
                              }}>
                                {schedule.title}
                              </Box>
                            ) : (
                              <>
                                <Box component="span" sx={{ 
                                  color: categoryColor,
                                  fontWeight: 'bold',
                                  mr: 1,
                                  textShadow: `0 0 8px ${categoryColor}40`
                                }}>
                                  {schedule.category || '[현장]'}
                                </Box>
                                {schedule.title}
                              </>
                            )}
                          </Typography>
                          );
                        })
                      ) : (
                        <Typography variant="body1" sx={{ 
                          color: '#9ca3af',
                          fontStyle: 'italic',
                          fontSize: '1.1rem'
                        }}>
                          오늘 등록된 일정이 없습니다.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Slide>
            </Grid>

            {/* 주요 기능 + 오늘의 할일 통합 */}
            <Grid item xs={12} md={6} sx={{ maxWidth: '1580px', width: '100%' }}>
              <Slide direction="right" in timeout={1400}>
                <Box sx={{ 
                  height: '100%',
                  display: 'flex',
                  gap: 2,
                  marginTop: '-40px',
                  maxWidth: '1600px',
                  width: '100%'
                }}>
                  {/* 주요 기능 */}
                  <Paper sx={{ 
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(67, 233, 123, 0.1)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <Box sx={{ 
                      p: 2, 
                      borderBottom: '1px solid rgba(67, 233, 123, 0.2)',
                      background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Dashboard sx={{ color: '#43e97b', fontSize: 24 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          주요 기능
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ 
                      p: 0.2, 
                      flex: 1, 
                      overflow: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px'
                    }}>
                      {/* 첫 번째 줄 */}
                      <Box sx={{ display: 'flex', gap: '2px', mb: '3px' }}>
                        {quickAccess.slice(0, 6).map((item, index) => (
                          <Box key={index} sx={{ flex: 1 }}>
                          <Paper sx={{ 
                            p: 0.2,
                            height: '65px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(67, 233, 123, 0.1)',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                            marginBottom: index >= 6 ? '2px' : '0px',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(67, 233, 123, 0.2)',
                              border: '1px solid rgba(67, 233, 123, 0.3)',
                              background: 'rgba(67, 233, 123, 0.1)'
                            }
                          }} 
                          onClick={() => {
                            console.log('🎯 기능 카드 클릭:', { 
                              title: item.title, 
                              path: item.path,
                              timestamp: new Date().toISOString()
                            });
                            
                            try {
                              navigate(item.path);
                            } catch (error) {
                              console.error('❌ 기능 카드 네비게이션 오류:', error);
                              // 폴백 동작
                              try {
                                window.location.href = item.path;
                              } catch (fallbackError) {
                                console.error('❌ 폴백 네비게이션도 실패:', fallbackError);
                              }
                            }
                          }}
>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                p: 0.5,
                                borderRadius: 1,
                                background: 'rgba(0, 0, 0, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid rgba(67, 233, 123, 0.1)'
                              }}>
                                {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 'bold', 
                                  color: 'white',
                                  display: 'block',
                                  fontSize: '0.9rem'
                                }}>
                                  {item.title}
                                </Typography>
                              </Box>
                              <Launch sx={{ 
                                fontSize: 12, 
                                color: '#43e97b',
                                opacity: 0.6
                              }} />
                            </Box>
                          </Paper>
                          </Box>
                        ))}
                      </Box>
                      
                      {/* 두 번째 줄 */}
                      <Box sx={{ display: 'flex', gap: '2px' }}>
                        {quickAccess.slice(6, 12).map((item, index) => (
                          <Box key={index + 6} sx={{ flex: 1 }}>
                          <Paper sx={{ 
                            p: 0.2,
                            height: '65px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(67, 233, 123, 0.1)',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(67, 233, 123, 0.2)',
                              border: '1px solid rgba(67, 233, 123, 0.3)',
                              background: 'rgba(67, 233, 123, 0.1)'
                            }
                          }} 
                          onClick={() => {
                            console.log('🎯 기능 카드 클릭:', { 
                              title: item.title, 
                              path: item.path,
                              timestamp: new Date().toISOString()
                            });
                            
                            try {
                              navigate(item.path);
                            } catch (error) {
                              console.error('❌ 기능 카드 네비게이션 오류:', error);
                              // 폴백 동작
                              try {
                                window.location.href = item.path;
                              } catch (fallbackError) {
                                console.error('❌ 폴백 네비게이션도 실패:', fallbackError);
                              }
                            }
                          }}
>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                p: 0.5,
                                borderRadius: 1,
                                background: 'rgba(0, 0, 0, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid rgba(67, 233, 123, 0.1)'
                              }}>
                                {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 'bold', 
                                  color: 'white',
                                  display: 'block',
                                  fontSize: '0.9rem'
                                }}>
                                  {item.title}
                                </Typography>
                              </Box>
                              <Launch sx={{ 
                                fontSize: 12, 
                                color: '#43e97b',
                                opacity: 0.6
                              }} />
                            </Box>
                          </Paper>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Paper>

                  {/* 오늘의 할일 */}
                  <Paper sx={{ 
                    flex: 0.5,
                    height: '100%',
                    minWidth: '400px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(67, 233, 123, 0.1)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: '1px solid rgba(67, 233, 123, 0.2)',
                    background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Assignment sx={{ color: '#43e97b', fontSize: 24 }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        오늘의 할일
                      </Typography>
                    </Box>
                  </Box>
                  
                    <Box sx={{ p: 1, flex: 1, overflow: 'auto' }}>
                      {todayTodos.length > 0 ? (
                        todayTodos.map((todo, index) => (
                          <Box
                            key={todo.id || index}
                            onClick={() => handleTodoToggle(todo.id, todo.completed)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.8,
                              mb: 1,
                              p: 0.7,
                              borderRadius: 1,
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(67, 233, 123, 0.1)',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              touchAction: 'manipulation',
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none',
                              zIndex: 9999,
                              position: 'relative',
                              '&:hover': {
                                background: 'rgba(67, 233, 123, 0.1)',
                                border: '1px solid rgba(67, 233, 123, 0.3)',
                                transform: 'translateY(-1px)'
                              },
                              '&:active': {
                                transform: 'translateY(0px)'
                              }
                            }}
                          >
                            <Box sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              border: '2px solid #43e97b',
                              backgroundColor: todo.completed ? '#43e97b' : 'transparent',
                              flexShrink: 0,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'scale(1.1)'
                              }
                            }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: todo.isOverdue ? '#ef4444' : '#e5e7eb',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  textDecoration: todo.completed ? 'line-through' : 'none',
                                  opacity: todo.completed ? 0.6 : 1,
                                  fontWeight: todo.isOverdue ? 'bold' : 'normal',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {todo.isOverdue ? '[미완료] ' : ''}{todo.title}
                              </Typography>
                            </Box>
                            <Box sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: todo.priority === 'high' ? '#ef4444' : 
                                             todo.priority === 'medium' ? '#f59e0b' : '#43e97b',
                              flexShrink: 0
                            }} />
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ 
                          color: '#9ca3af',
                          fontStyle: 'italic',
                          textAlign: 'center',
                          mt: 2
                        }}>
                          오늘 할 일이 없습니다.
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Slide>
            </Grid>
          </Grid>
        </Container>
      </Box>


      {/* 푸터 */}
      <Box sx={{ 
        py: 2, 
        borderTop: '1px solid rgba(67, 233, 123, 0.1)',
        background: 'rgba(0, 0, 0, 0.8)',
        flexShrink: 0
      }}>
        <Container maxWidth={false} sx={{ maxWidth: '1352px' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar sx={{ 
              bgcolor: 'transparent', 
              width: 24, 
              height: 24,
              border: '1px solid #43e97b'
            }}>
              <Construction sx={{ color: '#43e97b', fontSize: 16 }} />
            </Avatar>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              © 2025 천우건업(주). All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
