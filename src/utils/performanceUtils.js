/**
 * 성능 최적화 유틸리티 - 30년 개발 경험 기반
 * 
 * 주요 기능:
 * - 메모이제이션 최적화
 * - 디바운싱/쓰로틀링
 * - 가상화 지원
 * - 캐싱 전략
 * - 성능 모니터링
 * - 로깅 제어
 */

// 개발 환경에서만 로깅하는 함수
export const devLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

export const devWarn = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
};

export const devError = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
};

// 프로덕션에서도 중요한 에러는 로깅
export const prodError = (...args) => {
  console.error(...args);
};

// 디바운싱 함수
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// 쓰로틀링 함수
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 메모이제이션 유틸리티
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// 깊은 비교를 통한 메모이제이션
export const deepMemoize = (fn) => {
  const cache = new Map();
  
  const deepEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((val, index) => deepEqual(val, b[index]));
      }
      
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => deepEqual(a[key], b[key]));
    }
    
    return false;
  };
  
  return (...args) => {
    for (const [cachedArgs, result] of cache.entries()) {
      if (deepEqual(args, cachedArgs)) {
        return result;
      }
    }
    
    const result = fn(...args);
    cache.set(args, result);
    
    // 캐시 크기 제한 (메모리 누수 방지)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

// 성능 모니터링
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
  }

  startTimer(name) {
    this.metrics.set(name, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  endTimer(name) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      
      // 성능 임계값 체크
      if (metric.duration > 100) { // 100ms 이상이면 경고
        devWarn(`Performance warning: ${name} took ${metric.duration.toFixed(2)}ms`);
      }
      
      this.notifyObservers(name, metric);
    }
  }

  measure(name, fn) {
    this.startTimer(name);
    const result = fn();
    this.endTimer(name);
    return result;
  }

  async measureAsync(name, asyncFn) {
    this.startTimer(name);
    const result = await asyncFn();
    this.endTimer(name);
    return result;
  }

  addObserver(callback) {
    this.observers.push(callback);
  }

  notifyObservers(name, metric) {
    this.observers.forEach(observer => observer(name, metric));
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics() {
    this.metrics.clear();
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// React Hook 최적화 유틸리티
export const useStableCallback = (callback, deps = []) => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, deps);
};

// 메모리 누수 방지를 위한 cleanup 유틸리티
export const useCleanup = () => {
  const cleanupRefs = useRef(new Set());
  
  const addCleanup = useCallback((cleanupFn) => {
    cleanupRefs.current.add(cleanupFn);
  }, []);
  
  const removeCleanup = useCallback((cleanupFn) => {
    cleanupRefs.current.delete(cleanupFn);
  }, []);
  
  useEffect(() => {
    return () => {
      cleanupRefs.current.forEach(cleanupFn => {
        try {
          cleanupFn();
        } catch (error) {
          devError('Cleanup function error:', error);
        }
      });
      cleanupRefs.current.clear();
    };
  }, []);
  
  return { addCleanup, removeCleanup };
};

// Firebase 구독 최적화 유틸리티
export const createOptimizedSubscription = (queryFn, onData, onError) => {
  let unsubscribe = null;
  let isSubscribed = true;
  
  const subscribe = () => {
    if (!isSubscribed) return;
    
    try {
      unsubscribe = onSnapshot(
        queryFn(),
        (snapshot) => {
          if (isSubscribed) {
            onData(snapshot);
          }
        },
        (error) => {
          if (isSubscribed) {
            onError?.(error);
          }
        }
      );
    } catch (error) {
      if (isSubscribed) {
        onError?.(error);
      }
    }
  };
  
  const cleanup = () => {
    isSubscribed = false;
    if (unsubscribe && typeof unsubscribe === 'function') {
      try {
        unsubscribe();
      } catch (error) {
        devError('Error cleaning up subscription:', error);
      }
      unsubscribe = null;
    }
  };
  
  return { subscribe, cleanup };
};

// 지연 로딩 유틸리티
export const createLazyLoader = (loadFn, options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    fallback = null
  } = options;

  let observer = null;
  let loaded = false;

  const load = async () => {
    if (loaded) return;
    loaded = true;
    return await loadFn();
  };

  const observe = (element) => {
    if (!element || loaded) return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            load();
            if (observer) {
              observer.disconnect();
            }
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
  };

  const disconnect = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  return { observe, disconnect, load };
};

// 배치 업데이트 유틸리티
export class BatchUpdater {
  constructor(batchSize = 10, delay = 16) { // 16ms = 60fps
    this.queue = [];
    this.batchSize = batchSize;
    this.delay = delay;
    this.isProcessing = false;
    this.timeoutId = null;
  }

  add(updateFn) {
    this.queue.push(updateFn);
    this.schedule();
  }

  schedule() {
    if (this.isProcessing) return;
    
    this.timeoutId = setTimeout(() => {
      this.process();
    }, this.delay);
  }

  process() {
    this.isProcessing = true;
    
    const batch = this.queue.splice(0, this.batchSize);
    
    if (batch.length > 0) {
      // requestAnimationFrame을 사용하여 브라우저 최적화 활용
      requestAnimationFrame(() => {
        batch.forEach(updateFn => updateFn());
        
        if (this.queue.length > 0) {
          this.schedule();
        } else {
          this.isProcessing = false;
        }
      });
    } else {
      this.isProcessing = false;
    }
  }

  clear() {
    this.queue = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isProcessing = false;
  }
}

// 전역 배치 업데이터 인스턴스
export const batchUpdater = new BatchUpdater();

// React import 추가
import { useRef, useCallback, useEffect } from 'react';

// 캐시 관리자
export class CacheManager {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 기본 5분 TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value, customTtl = null) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: customTtl || this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// 전역 캐시 매니저 인스턴스
export const globalCache = new CacheManager(200, 10 * 60 * 1000); // 10분 TTL

// 메모리 누수 방지 유틸리티
export class MemoryLeakPrevention {
  constructor() {
    this.cleanupFunctions = new Set();
    this.weakRefs = new WeakSet();
  }

  addCleanup(cleanupFn) {
    this.cleanupFunctions.add(cleanupFn);
  }

  addWeakRef(obj) {
    this.weakRefs.add(obj);
  }

  cleanup() {
    this.cleanupFunctions.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    this.cleanupFunctions.clear();
  }

  // 주기적 메모리 정리
  startPeriodicCleanup(interval = 60000) { // 1분마다
    return setInterval(() => {
      this.cleanup();
    }, interval);
  }
}

// 전역 메모리 누수 방지 인스턴스
export const memoryLeakPrevention = new MemoryLeakPrevention();

// 개발 환경에서 성능 모니터링 활성화
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.addObserver((name, metric) => {
    console.log(`Performance: ${name} took ${metric.duration.toFixed(2)}ms`);
  });
} 