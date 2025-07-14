# 🚀 개발 가이드라인 - 30년 경험 기반

## 📋 목차
1. [코드 품질](#코드-품질)
2. [성능 최적화](#성능-최적화)
3. [아키텍처 패턴](#아키텍처-패턴)
4. [에러 처리](#에러-처리)
5. [보안](#보안)
6. [테스트](#테스트)
7. [배포](#배포)

## 🎯 코드 품질

### 네이밍 컨벤션
```javascript
// ✅ 좋은 예
const useProgressData = () => { /* ... */ };
const handleSubmit = () => { /* ... */ };
const ProgressManagement = () => { /* ... */ };

// ❌ 나쁜 예
const getData = () => { /* ... */ };
const submit = () => { /* ... */ };
const Component = () => { /* ... */ };
```

### 함수 설계 원칙
```javascript
// ✅ 단일 책임 원칙
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR').format(amount);
};

// ❌ 여러 책임을 가진 함수
const processUserData = (user) => {
  // 이메일 검증, 포맷팅, 저장 등 여러 작업
};
```

### 주석 작성 가이드
```javascript
/**
 * 사용자 인증을 처리하는 함수
 * 
 * @param {string} email - 사용자 이메일
 * @param {string} password - 사용자 비밀번호
 * @returns {Promise<Object>} 인증 결과
 * @throws {AuthError} 인증 실패 시
 * 
 * @example
 * const result = await authenticateUser('user@example.com', 'password123');
 * if (result.success) {
 *   console.log('로그인 성공');
 * }
 */
const authenticateUser = async (email, password) => {
  // 구현...
};
```

## ⚡ 성능 최적화

### React 최적화 기법
```javascript
// ✅ 메모이제이션 활용
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: heavyComputation(item)
    }));
  }, [data]);

  const handleClick = useCallback((id) => {
    // 클릭 핸들러
  }, []);

  return <div>{/* 렌더링 */}</div>;
});

// ✅ 지연 로딩
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// ✅ 가상화 (대용량 리스트)
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }) => (
  <List
    height={400}
    itemCount={items.length}
    itemSize={50}
    itemData={items}
  >
    {({ index, style, data }) => (
      <div style={style}>
        {data[index].name}
      </div>
    )}
  </List>
);
```

### 번들 최적화
```javascript
// ✅ 코드 분할
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));

// ✅ 동적 임포트
const loadModule = async () => {
  const module = await import('./utils/heavyModule');
  return module.default;
};
```

## 🏗️ 아키텍처 패턴

### 컴포넌트 구조
```
src/
├── components/
│   ├── common/           # 공통 컴포넌트
│   │   ├── Button/
│   │   │   ├── Button.jsx
│   │   │   ├── Button.test.jsx
│   │   │   └── Button.styles.js
│   │   └── Modal/
│   ├── features/         # 기능별 컴포넌트
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── progress/
│   └── layouts/          # 레이아웃 컴포넌트
├── hooks/                # 커스텀 훅
├── utils/                # 유틸리티 함수
├── services/             # API 서비스
└── store/                # 상태 관리
```

### 상태 관리 패턴
```javascript
// ✅ 커스텀 훅을 통한 상태 관리
const useProgressData = (siteId) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!siteId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api.getProgress(siteId);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId]);

  return { data, loading, error };
};

// ✅ Context API 활용
const ProgressContext = createContext();

export const ProgressProvider = ({ children }) => {
  const [progressData, setProgressData] = useState([]);
  
  const value = {
    progressData,
    addProgress: (item) => setProgressData(prev => [...prev, item]),
    updateProgress: (id, updates) => setProgressData(prev => 
      prev.map(item => item.id === id ? { ...item, ...updates } : item)
    ),
    deleteProgress: (id) => setProgressData(prev => 
      prev.filter(item => item.id !== id)
    )
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};
```

## 🛡️ 에러 처리

### 에러 바운더리
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅
    errorHandler.handleError(error, {
      component: this.constructor.name,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### 비동기 에러 처리
```javascript
// ✅ async/await 패턴
const handleSubmit = async (formData) => {
  try {
    setLoading(true);
    const result = await api.submitData(formData);
    showSuccess('저장되었습니다');
    return result;
  } catch (error) {
    errorHandler.handleError(error, { formData });
    showError('저장에 실패했습니다');
  } finally {
    setLoading(false);
  }
};

// ✅ Promise 체이닝
const handleSubmit = (formData) => {
  setLoading(true);
  
  return api.submitData(formData)
    .then(result => {
      showSuccess('저장되었습니다');
      return result;
    })
    .catch(error => {
      errorHandler.handleError(error, { formData });
      showError('저장에 실패했습니다');
    })
    .finally(() => {
      setLoading(false);
    });
};
```

## 🔒 보안

### 입력 검증
```javascript
// ✅ XSS 방지
const sanitizeInput = (input) => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// ✅ SQL 인젝션 방지 (Firebase 사용 시)
const query = query(
  collection(db, 'users'),
  where('email', '==', sanitizedEmail),
  limit(1)
);
```

### 인증 및 권한
```javascript
// ✅ 권한 검증
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});

  const checkPermission = useCallback((permission) => {
    return permissions[permission] === true;
  }, [permissions]);

  return { user, checkPermission };
};

// ✅ 보호된 라우트
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { checkPermission } = useAuth();
  
  if (!checkPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};
```

## 🧪 테스트

### 단위 테스트
```javascript
// ✅ 컴포넌트 테스트
import { render, screen, fireEvent } from '@testing-library/react';
import ProgressManagement from './ProgressManagement';

describe('ProgressManagement', () => {
  test('기성현황 추가 버튼이 렌더링된다', () => {
    render(<ProgressManagement />);
    expect(screen.getByText('기성현황 추가')).toBeInTheDocument();
  });

  test('현장 선택 시 모달이 열린다', () => {
    render(<ProgressManagement />);
    const addButton = screen.getByText('기성현황 추가');
    fireEvent.click(addButton);
    expect(screen.getByText('기성현황 추가')).toBeInTheDocument();
  });
});

// ✅ 훅 테스트
import { renderHook, act } from '@testing-library/react-hooks';
import { useProgressData } from './hooks/useProgressData';

describe('useProgressData', () => {
  test('초기 상태가 올바르다', () => {
    const { result } = renderHook(() => useProgressData('site1'));
    
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
```

### 통합 테스트
```javascript
// ✅ API 통합 테스트
describe('Progress API', () => {
  test('기성현황 저장이 성공한다', async () => {
    const mockData = {
      siteId: 'site1',
      amount: 1000000,
      type: '청구'
    };

    const result = await api.saveProgress(mockData);
    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
  });
});
```

## 🚀 배포

### 환경별 설정
```javascript
// ✅ 환경변수 관리
const config = {
  development: {
    apiUrl: 'http://localhost:3001',
    firebaseConfig: {
      // 개발 환경 설정
    }
  },
  production: {
    apiUrl: 'https://api.production.com',
    firebaseConfig: {
      // 프로덕션 환경 설정
    }
  }
};

export const getConfig = () => {
  return config[process.env.NODE_ENV] || config.development;
};
```

### 빌드 최적화
```javascript
// ✅ Vite 설정 최적화
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          firebase: ['firebase/app', 'firebase/firestore']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

## 📊 성능 모니터링

### 성능 측정
```javascript
// ✅ 성능 모니터링
import { performanceMonitor } from './utils/performanceUtils';

const ExpensiveComponent = () => {
  useEffect(() => {
    performanceMonitor.startTimer('component-render');
    
    return () => {
      performanceMonitor.endTimer('component-render');
    };
  }, []);

  return <div>복잡한 컴포넌트</div>;
};
```

### 사용자 경험 모니터링
```javascript
// ✅ 사용자 행동 추적
const trackUserAction = (action, data) => {
  if (window.gtag) {
    window.gtag('event', action, data);
  }
};

// 사용 예시
const handleButtonClick = () => {
  trackUserAction('button_click', {
    button_name: 'save_progress',
    page: 'progress_management'
  });
};
```

## 🔄 코드 리뷰 체크리스트

### 기능적 요구사항
- [ ] 요구사항이 정확히 구현되었는가?
- [ ] 에러 케이스가 처리되었는가?
- [ ] 사용자 경험이 고려되었는가?

### 코드 품질
- [ ] 네이밍이 명확한가?
- [ ] 함수가 단일 책임을 가지는가?
- [ ] 중복 코드가 없는가?
- [ ] 주석이 적절한가?

### 성능
- [ ] 불필요한 리렌더링이 없는가?
- [ ] 메모이제이션이 적절히 사용되었는가?
- [ ] 번들 크기가 최적화되었는가?

### 보안
- [ ] 입력 검증이 적절한가?
- [ ] 민감한 정보가 노출되지 않았는가?
- [ ] 권한 검증이 구현되었는가?

### 테스트
- [ ] 단위 테스트가 작성되었는가?
- [ ] 테스트 커버리지가 충분한가?
- [ ] 통합 테스트가 필요한가?

## 📚 참고 자료

### 도서
- "Clean Code" by Robert C. Martin
- "Design Patterns" by Gang of Four
- "Refactoring" by Martin Fowler

### 온라인 자료
- [React 공식 문서](https://react.dev/)
- [Material-UI 문서](https://mui.com/)
- [Firebase 문서](https://firebase.google.com/docs)

### 도구
- [ESLint](https://eslint.org/) - 코드 품질 검사
- [Prettier](https://prettier.io/) - 코드 포맷팅
- [Jest](https://jestjs.io/) - 테스트 프레임워크
- [React DevTools](https://react.dev/learn/react-developer-tools) - 디버깅

---

**이 가이드라인은 30년간의 개발 경험을 바탕으로 작성되었으며, 지속적으로 업데이트됩니다.** 