/**
 * 성능 최적화 훅 - 디자인/레이아웃 변경 없이 성능만 개선
 * 
 * 기존 UI는 그대로 유지하면서 내부 로직만 최적화
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { debounce, throttle } from './performanceUtils';

// 스크롤 최적화 훅
export const useOptimizedScroll = (callback, delay = 16) => {
  const throttledCallback = useMemo(
    () => throttle(callback, delay),
    [callback, delay]
  );

  const handleScroll = useCallback((event) => {
    throttledCallback(event);
  }, [throttledCallback]);

  return handleScroll;
};

// 리사이즈 최적화 훅
export const useOptimizedResize = (callback, delay = 100) => {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  );

  const handleResize = useCallback((event) => {
    debouncedCallback(event);
  }, [debouncedCallback]);

  return handleResize;
};

// 입력 최적화 훅 (기존 디자인 유지)
export const useOptimizedInput = (initialValue = '', delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const [optimizedValue, setOptimizedValue] = useState(initialValue);

  const debouncedSetOptimized = useMemo(
    () => debounce(setOptimizedValue, delay),
    [delay]
  );

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    debouncedSetOptimized(newValue);
  }, [debouncedSetOptimized]);

  return {
    value,
    optimizedValue,
    handleChange,
    setValue
  };
};

// 무한 스크롤 최적화 훅 (기존 테이블 구조 유지)
export const useInfiniteScroll = (items, pageSize = 20) => {
  const [visibleItems, setVisibleItems] = useState(pageSize);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(() => {
    if (visibleItems < items.length && !isLoading) {
      setIsLoading(true);
      // 다음 프레임에서 로드 (UI 블로킹 방지)
      requestAnimationFrame(() => {
        setVisibleItems(prev => Math.min(prev + pageSize, items.length));
        setIsLoading(false);
      });
    }
  }, [visibleItems, items.length, isLoading, pageSize]);

  const visibleData = useMemo(() => {
    return items.slice(0, visibleItems);
  }, [items, visibleItems]);

  return {
    visibleData,
    hasMore: visibleItems < items.length,
    loadMore,
    isLoading
  };
};

// 드래그 앤 드롭 최적화 훅 (기존 UI 유지)
export const useOptimizedDragDrop = (items, onReorder) => {
  const dragStartIndex = useRef(null);
  const dragEndIndex = useRef(null);

  const handleDragStart = useCallback((index) => {
    dragStartIndex.current = index;
  }, []);

  const handleDragEnd = useCallback((index) => {
    dragEndIndex.current = index;
    
    if (dragStartIndex.current !== null && dragEndIndex.current !== null) {
      const startIndex = dragStartIndex.current;
      const endIndex = dragEndIndex.current;
      
      if (startIndex !== endIndex) {
        const newItems = Array.from(items);
        const [removed] = newItems.splice(startIndex, 1);
        newItems.splice(endIndex, 0, removed);
        onReorder(newItems);
      }
    }
    
    dragStartIndex.current = null;
    dragEndIndex.current = null;
  }, [items, onReorder]);

  return {
    handleDragStart,
    handleDragEnd
  };
};

// 폼 최적화 훅 (기존 폼 디자인 유지)
export const useOptimizedForm = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 실시간 유효성 검사 (디바운싱 적용)
  const validateField = useMemo(
    () => debounce((name, value, validators) => {
      const fieldValidators = validators[name] || [];
      const fieldErrors = [];

      fieldValidators.forEach(validator => {
        const error = validator(value, values);
        if (error) fieldErrors.push(error);
      });

      setErrors(prev => ({
        ...prev,
        [name]: fieldErrors.length > 0 ? fieldErrors[0] : null
      }));
    }, 300),
    [values]
  );

  const handleChange = useCallback((name, value, validators = {}) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
    validateField(name, value, validators);
  }, [validateField]);

  // 전체 폼 유효성 검사
  useEffect(() => {
    const hasErrors = Object.values(errors).some(error => error !== null);
    const hasValues = Object.values(values).some(value => 
      value !== undefined && value !== null && value !== ''
    );
    setIsValid(!hasErrors && hasValues);
  }, [errors, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsDirty(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isValid,
    isDirty,
    handleChange,
    reset,
    setValues
  };
};

// 검색 최적화 훅
export const useOptimizedSearch = (searchFunction, delay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useMemo(
    () => debounce(async (term) => {
      if (!term.trim()) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const searchResults = await searchFunction(term);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay),
    [searchFunction, delay]
  );

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    debouncedSearch(term);
  }, [debouncedSearch]);

  return {
    searchTerm,
    results,
    loading,
    handleSearch
  };
};

// 차트 데이터 최적화 훅 (기존 차트 디자인 유지)
export const useOptimizedChartData = (rawData, options = {}) => {
  const {
    groupBy = 'category',
    valueField = 'amount',
    maxItems = 10,
    sortBy = 'value'
  } = options;

  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // 데이터 그룹화
    const grouped = rawData.reduce((acc, item) => {
      const key = item[groupBy] || '기타';
      if (!acc[key]) {
        acc[key] = { name: key, value: 0, count: 0 };
      }
      acc[key].value += Number(item[valueField] || 0);
      acc[key].count += 1;
      return acc;
    }, {});

    // 배열로 변환 및 정렬
    let result = Object.values(grouped);
    
    if (sortBy === 'value') {
      result.sort((a, b) => b.value - a.value);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 최대 아이템 수 제한
    if (maxItems && result.length > maxItems) {
      const topItems = result.slice(0, maxItems - 1);
      const others = result.slice(maxItems - 1);
      const othersSum = others.reduce((sum, item) => sum + item.value, 0);
      
      result = [
        ...topItems,
        { name: '기타', value: othersSum, count: others.length }
      ];
    }

    return result;
  }, [rawData, groupBy, valueField, maxItems, sortBy]);

  return processedData;
};

// 로컬 스토리지 최적화 훅 (기존 UI 유지)
export const useOptimizedStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// 네트워크 상태 최적화 훅 (기존 UI 유지)
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        setConnectionType(navigator.connection.effectiveType || 'unknown');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange);
      setConnectionType(navigator.connection.effectiveType || 'unknown');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return { isOnline, connectionType };
};

// 메모리 누수 방지 훅
export const useMemoryLeakPrevention = () => {
  const mountedRef = useRef(true);
  const cleanupRefs = useRef(new Set());

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      // 모든 cleanup 함수 실행
      cleanupRefs.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      });
      cleanupRefs.current.clear();
    };
  }, []);

  const addCleanup = useCallback((cleanupFn) => {
    cleanupRefs.current.add(cleanupFn);
  }, []);

  const isMounted = useCallback(() => mountedRef.current, []);

  return { addCleanup, isMounted };
};

// Firebase 구독 최적화 훅
export const useOptimizedFirebaseSubscription = (queryFn, onData, onError) => {
  const { addCleanup, isMounted } = useMemoryLeakPrevention();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isMounted()) return;

    setLoading(true);
    setError(null);

    let unsubscribe = null;
    
    try {
      const q = queryFn();
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted()) return;
          
          const result = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setData(result);
          setLoading(false);
          onData?.(result);
        },
        (error) => {
          if (!isMounted()) return;
          
          setError(error);
          setLoading(false);
          onError?.(error);
        }
      );
    } catch (err) {
      if (!isMounted()) return;
      
      setError(err);
      setLoading(false);
      onError?.(err);
    }

    // cleanup 함수 등록
    if (unsubscribe) {
      addCleanup(() => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error cleaning up Firebase subscription:', error);
        }
      });
    }

  }, [queryFn, onData, onError, addCleanup, isMounted]);

  return { data, loading, error };
};

// 배치 상태 업데이트 훅
export const useBatchStateUpdate = (initialState = {}) => {
  const [state, setState] = useState(initialState);
  const batchRef = useRef(new Map());
  const timeoutRef = useRef(null);

  const batchUpdate = useCallback((updates, delay = 16) => {
    // 기존 배치에 업데이트 추가
    updates.forEach(([key, value]) => {
      batchRef.current.set(key, value);
    });

    // 기존 타임아웃 클리어
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 새로운 타임아웃 설정
    timeoutRef.current = setTimeout(() => {
      if (batchRef.current.size > 0) {
        setState(prevState => {
          const newState = { ...prevState };
          batchRef.current.forEach((value, key) => {
            newState[key] = value;
          });
          return newState;
        });
        batchRef.current.clear();
      }
    }, delay);
  }, []);

  const immediateUpdate = useCallback((updates) => {
    setState(prevState => {
      const newState = { ...prevState };
      updates.forEach(([key, value]) => {
        newState[key] = value;
      });
      return newState;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { state, batchUpdate, immediateUpdate };
};

// 가상화 지원 훅
export const useVirtualization = (items, itemHeight, containerHeight, overscan = 5) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      offsetY: startIndex * itemHeight
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  const getItemStyle = useCallback((index) => {
    return {
      position: 'absolute',
      top: `${(visibleRange.startIndex + index) * itemHeight}px`,
      height: `${itemHeight}px`,
      width: '100%'
    };
  }, [visibleRange.startIndex, itemHeight]);

  return {
    visibleItems,
    visibleRange,
    handleScroll,
    getItemStyle,
    totalHeight: items.length * itemHeight
  };
};

// 메모리 최적화 훅 (기존 UI 유지)
export const useMemoryOptimization = () => {
  const cleanupRefs = useRef(new Set());

  const addCleanup = useCallback((cleanupFn) => {
    cleanupRefs.current.add(cleanupFn);
  }, []);

  const removeCleanup = useCallback((cleanupFn) => {
    cleanupRefs.current.delete(cleanupFn);
  }, []);

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 모든 정리 함수 실행
      cleanupRefs.current.forEach(cleanupFn => {
        try {
          cleanupFn();
        } catch (error) {
          console.error('Cleanup function error:', error);
        }
      });
      cleanupRefs.current.clear();
    };
  }, []);

  return { addCleanup, removeCleanup };
};

// 성능 모니터링 훅
export const usePerformanceMonitor = (componentName) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} 렌더링 #${renderCountRef.current} (${timeSinceLastRender.toFixed(2)}ms)`);
    }
    
    lastRenderTimeRef.current = currentTime;
  });

  const getRenderStats = useCallback(() => ({
    renderCount: renderCountRef.current,
    timeSinceLastRender: performance.now() - lastRenderTimeRef.current
  }), []);

  return { getRenderStats };
};

// 지연 로딩 훅
export const useLazyLoad = (loadFn, options = {}) => {
  const { threshold = 0.1, rootMargin = '50px' } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);

  const load = useCallback(async () => {
    if (isLoaded) return;
    
    try {
      const result = await loadFn();
      setData(result);
      setIsLoaded(true);
    } catch (err) {
      setError(err);
    }
  }, [loadFn, isLoaded]);

  const observe = useCallback((element) => {
    if (!element || isLoaded) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            load();
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(element);
  }, [load, isLoaded]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { data, error, isLoaded, observe, load };
};

// 캐시 최적화 훅
export const useCache = (key, fetcher, options = {}) => {
  const { ttl = 5 * 60 * 1000, maxSize = 100 } = options;
  const cacheRef = useRef(new Map());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCachedData = useCallback((cacheKey) => {
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > ttl) {
      cacheRef.current.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }, [ttl]);

  const setCachedData = useCallback((cacheKey, data) => {
    // 캐시 크기 제한
    if (cacheRef.current.size >= maxSize) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }, [maxSize]);

  const fetchData = useCallback(async (cacheKey) => {
    setLoading(true);
    setError(null);
    
    try {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return cached;
      }
      
      const result = await fetcher();
      setCachedData(cacheKey, result);
      setData(result);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [fetcher, getCachedData, setCachedData]);

  useEffect(() => {
    if (key) {
      fetchData(key);
    }
  }, [key, fetchData]);

  return { data, loading, error, refetch: () => fetchData(key) };
}; 