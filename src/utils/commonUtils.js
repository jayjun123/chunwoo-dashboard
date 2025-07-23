/**
 * 공통 유틸리티 함수들 - 코드 중복 제거
 * 
 * 주요 기능:
 * - 데이터 처리 공통 함수
 * - UI 공통 함수
 * - 검증 공통 함수
 * - 포맷팅 공통 함수
 */

import { globalCleanupManager } from './performanceUtils';

// 데이터 처리 공통 함수들
export const dataUtils = {
  // 배열 중복 제거
  removeDuplicates: (array, key = 'id') => {
    const seen = new Set();
    return array.filter(item => {
      const value = typeof key === 'function' ? key(item) : item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  },

  // 배열 그룹화
  groupBy: (array, key) => {
    return array.reduce((groups, item) => {
      const group = typeof key === 'function' ? key(item) : item[key];
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {});
  },

  // 배열 정렬
  sortBy: (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
      const aVal = typeof key === 'function' ? key(a) : a[key];
      const bVal = typeof key === 'function' ? key(b) : b[key];
      
      if (typeof aVal === 'string') {
        return order === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
  },

  // 배열 필터링
  filterBy: (array, filters) => {
    return array.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          return true;
        }
        
        const itemValue = item[key];
        if (typeof value === 'string') {
          return itemValue?.toLowerCase().includes(value.toLowerCase());
        }
        
        return itemValue === value;
      });
    });
  },

  // 페이지네이션
  paginate: (array, page, pageSize) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return {
      data: array.slice(startIndex, endIndex),
      total: array.length,
      page,
      pageSize,
      totalPages: Math.ceil(array.length / pageSize)
    };
  }
};

// UI 공통 함수들
export const uiUtils = {
  // 스크롤 위치 저장/복원
  saveScrollPosition: (key) => {
    const position = window.pageYOffset;
    sessionStorage.setItem(`scroll_${key}`, position.toString());
  },

  restoreScrollPosition: (key) => {
    const position = sessionStorage.getItem(`scroll_${key}`);
    if (position) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(position));
      }, 100);
    }
  },

  // 스크롤을 맨 위로
  scrollToTop: (behavior = 'smooth') => {
    window.scrollTo({ top: 0, behavior });
  },

  // 요소가 화면에 보이는지 확인
  isElementInViewport: (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // 요소를 화면 중앙으로 스크롤
  scrollToElement: (element, offset = 0) => {
    if (!element) return;
    const elementTop = element.offsetTop - offset;
    window.scrollTo({ top: elementTop, behavior: 'smooth' });
  },

  // 클립보드에 복사
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      return false;
    }
  },

  // 파일 다운로드
  downloadFile: (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// 검증 공통 함수들
export const validationUtils = {
  // 이메일 검증
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 전화번호 검증
  isValidPhone: (phone) => {
    const phoneRegex = /^[0-9-+\s()]+$/;
    return phoneRegex.test(phone) && phone.replace(/[^0-9]/g, '').length >= 10;
  },

  // 비밀번호 강도 검증
  validatePassword: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
      score: [password.length >= minLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
        .filter(Boolean).length,
      details: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  },

  // 숫자 검증
  isValidNumber: (value) => {
    return !isNaN(value) && isFinite(value);
  },

  // 날짜 검증
  isValidDate: (date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  },

  // 필수 필드 검증
  isRequired: (value) => {
    return value !== null && value !== undefined && value !== '';
  }
};

// 포맷팅 공통 함수들
export const formatUtils = {
  // 숫자 포맷팅 (천 단위 구분)
  formatNumber: (number, locale = 'ko-KR') => {
    if (number === null || number === undefined) return '0';
    return new Intl.NumberFormat(locale).format(number);
  },

  // 통화 포맷팅
  formatCurrency: (amount, currency = 'KRW', locale = 'ko-KR') => {
    if (amount === null || amount === undefined) return '₩0';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  },

  // 날짜 포맷팅
  formatDate: (date, options = {}) => {
    if (!date) return '';
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    return new Intl.DateTimeFormat('ko-KR', defaultOptions).format(new Date(date));
  },

  // 시간 포맷팅
  formatTime: (date, options = {}) => {
    if (!date) return '';
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    return new Intl.DateTimeFormat('ko-KR', defaultOptions).format(new Date(date));
  },

  // 파일 크기 포맷팅
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 텍스트 길이 제한
  truncateText: (text, maxLength, suffix = '...') => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
  }
};

// Firebase 공통 함수들
export const firebaseUtils = {
  // 안전한 구독 생성
  createSafeSubscription: (queryFn, onData, onError) => {
    let unsubscribe = null;
    let isSubscribed = true;

    const subscribe = () => {
      if (!isSubscribed) return;

      try {
        unsubscribe = queryFn((data) => {
          if (isSubscribed) {
            onData(data);
          }
        }, (error) => {
          if (isSubscribed) {
            onError?.(error);
          }
        });
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
          console.error('구독 해제 오류:', error);
        }
        unsubscribe = null;
      }
    };

    // 전역 cleanup 매니저에 등록
    globalCleanupManager.registerSubscription(cleanup);

    subscribe();
    return cleanup;
  },

  // 배치 작업
  batchOperation: async (operations) => {
    const batch = [];
    for (const operation of operations) {
      try {
        const result = await operation();
        batch.push({ success: true, result });
      } catch (error) {
        batch.push({ success: false, error });
      }
    }
    return batch;
  },

  // 에러 메시지 변환
  getErrorMessage: (error) => {
    if (!error) return '알 수 없는 오류가 발생했습니다.';
    
    if (error.code) {
      const errorMessages = {
        'auth/user-not-found': '사용자를 찾을 수 없습니다.',
        'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password': '비밀번호가 너무 약합니다.',
        'auth/invalid-email': '유효하지 않은 이메일입니다.',
        'permission-denied': '권한이 없습니다.',
        'not-found': '데이터를 찾을 수 없습니다.',
        'already-exists': '이미 존재하는 데이터입니다.',
        'invalid-argument': '잘못된 입력입니다.',
        'unavailable': '서비스를 사용할 수 없습니다.',
        'deadline-exceeded': '요청 시간이 초과되었습니다.'
      };
      
      return errorMessages[error.code] || error.message || '알 수 없는 오류가 발생했습니다.';
    }
    
    return error.message || '알 수 없는 오류가 발생했습니다.';
  }
};

// 디바운스 유틸리티
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 쓰로틀 유틸리티
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 로컬 스토리지 유틸리티
export const storageUtils = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('로컬 스토리지 저장 실패:', error);
      return false;
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('로컬 스토리지 읽기 실패:', error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('로컬 스토리지 삭제 실패:', error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('로컬 스토리지 초기화 실패:', error);
      return false;
    }
  }
}; 