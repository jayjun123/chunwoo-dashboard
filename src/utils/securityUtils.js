import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// 보안 로그 타입 정의
export const SECURITY_LOG_TYPES = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  DDOS_ATTEMPT: 'ddos_attempt',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  ACCOUNT_LOCKED: 'account_locked',
  IP_BLOCKED: 'ip_blocked'
};

// 보안 로그 심각도 레벨
export const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// IP 주소 가져오기 (클라이언트 사이드에서는 제한적)
export const getClientIP = async () => {
  try {
    // 외부 IP 확인 서비스 사용
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('IP 주소를 가져올 수 없습니다:', error);
    return 'unknown';
  }
};

// 사용자 에이전트 정보 가져오기
export const getUserAgent = () => {
  return navigator.userAgent || 'unknown';
};

// 브라우저 정보 파싱
export const getBrowserInfo = () => {
  const userAgent = getUserAgent();
  const browserInfo = {
    userAgent,
    platform: navigator.platform || 'unknown',
    language: navigator.language || 'unknown',
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  };
  
  // 브라우저 타입 감지
  if (userAgent.includes('Chrome')) {
    browserInfo.browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browserInfo.browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    browserInfo.browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browserInfo.browser = 'Edge';
  } else {
    browserInfo.browser = 'Unknown';
  }
  
  return browserInfo;
};

// 보안 로그 생성
export const createSecurityLog = async (logData) => {
  try {
    const {
      type,
      userId = null,
      email = null,
      ipAddress = null,
      userAgent = null,
      details = {},
      level = SECURITY_LEVELS.LOW,
      metadata = {}
    } = logData;

    // IP 주소가 없으면 가져오기
    const clientIP = ipAddress || await getClientIP();
    
    // 브라우저 정보가 없으면 가져오기
    const browserInfo = userAgent ? { userAgent } : getBrowserInfo();

    const securityLog = {
      type,
      userId,
      email,
      ipAddress: clientIP,
      userAgent: browserInfo.userAgent,
      browser: browserInfo.browser,
      platform: browserInfo.platform,
      language: browserInfo.language,
      details,
      level,
      metadata,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'security_logs'), securityLog);
    console.log('보안 로그 생성됨:', docRef.id, securityLog);
    
    return docRef.id;
  } catch (error) {
    console.error('보안 로그 생성 실패:', error);
    throw error;
  }
};

// 로그인 성공 로그
export const logLoginSuccess = async (userId, email, additionalDetails = {}) => {
  return await createSecurityLog({
    type: SECURITY_LOG_TYPES.LOGIN_SUCCESS,
    userId,
    email,
    details: {
      message: '로그인 성공',
      ...additionalDetails
    },
    level: SECURITY_LEVELS.LOW
  });
};

// 로그인 실패 로그
export const logLoginFailed = async (email, reason, additionalDetails = {}) => {
  return await createSecurityLog({
    type: SECURITY_LOG_TYPES.LOGIN_FAILED,
    email,
    details: {
      message: '로그인 실패',
      reason,
      ...additionalDetails
    },
    level: SECURITY_LEVELS.MEDIUM
  });
};

// 로그아웃 로그
export const logLogout = async (userId, email, additionalDetails = {}) => {
  return await createSecurityLog({
    type: SECURITY_LOG_TYPES.LOGOUT,
    userId,
    email,
    details: {
      message: '로그아웃',
      ...additionalDetails
    },
    level: SECURITY_LEVELS.LOW
  });
};

// 회원가입 로그
export const logRegister = async (userId, email, additionalDetails = {}) => {
  return await createSecurityLog({
    type: SECURITY_LOG_TYPES.REGISTER,
    userId,
    email,
    details: {
      message: '회원가입',
      ...additionalDetails
    },
    level: SECURITY_LEVELS.LOW
  });
};

// 의심스러운 활동 로그
export const logSuspiciousActivity = async (userId, email, activity, additionalDetails = {}) => {
  return await createSecurityLog({
    type: SECURITY_LOG_TYPES.SUSPICIOUS_ACTIVITY,
    userId,
    email,
    details: {
      message: '의심스러운 활동 감지',
      activity,
      ...additionalDetails
    },
    level: SECURITY_LEVELS.HIGH
  });
};

// DDoS 공격 시도 로그
export const logDDoSAttempt = async (ipAddress, requestCount, additionalDetails = {}) => {
  return await createSecurityLog({
    type: SECURITY_LOG_TYPES.DDOS_ATTEMPT,
    ipAddress,
    details: {
      message: 'DDoS 공격 시도 감지',
      requestCount,
      ...additionalDetails
    },
    level: SECURITY_LEVELS.CRITICAL
  });
};

// 무단 접근 시도 로그
export const logUnauthorizedAccess = async (userId, email, resource, additionalDetails = {}) => {
  return await createSecurityLog({
    type: SECURITY_LOG_TYPES.UNAUTHORIZED_ACCESS,
    userId,
    email,
    details: {
      message: '무단 접근 시도',
      resource,
      ...additionalDetails
    },
    level: SECURITY_LEVELS.HIGH
  });
};

// 보안 로그 조회
export const getSecurityLogs = async (filters = {}) => {
  try {
    const {
      type = null,
      userId = null,
      email = null,
      ipAddress = null,
      level = null,
      startDate = null,
      endDate = null,
      limitCount = 100
    } = filters;

    let q = query(
      collection(db, 'security_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    // 필터 적용
    if (type) {
      q = query(q, where('type', '==', type));
    }
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    if (email) {
      q = query(q, where('email', '==', email));
    }
    if (ipAddress) {
      q = query(q, where('ipAddress', '==', ipAddress));
    }
    if (level) {
      q = query(q, where('level', '==', level));
    }

    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 날짜 필터링 (클라이언트 사이드)
    let filteredLogs = logs;
    if (startDate || endDate) {
      filteredLogs = logs.filter(log => {
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.createdAt);
        if (startDate && logDate < new Date(startDate)) return false;
        if (endDate && logDate > new Date(endDate)) return false;
        return true;
      });
    }

    return filteredLogs;
  } catch (error) {
    console.error('보안 로그 조회 실패:', error);
    throw error;
  }
};

// IP별 로그인 시도 횟수 조회
export const getLoginAttemptsByIP = async (ipAddress, timeWindow = 24) => {
  try {
    const now = new Date();
    const timeWindowMs = timeWindow * 60 * 60 * 1000; // 시간을 밀리초로 변환
    const startTime = new Date(now.getTime() - timeWindowMs);

    const q = query(
      collection(db, 'security_logs'),
      where('ipAddress', '==', ipAddress),
      where('type', 'in', [SECURITY_LOG_TYPES.LOGIN_SUCCESS, SECURITY_LOG_TYPES.LOGIN_FAILED]),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 시간 윈도우 내의 로그만 필터링
    const recentLogs = logs.filter(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.createdAt);
      return logDate >= startTime;
    });

    return {
      totalAttempts: recentLogs.length,
      successfulLogins: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.LOGIN_SUCCESS).length,
      failedLogins: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.LOGIN_FAILED).length,
      logs: recentLogs
    };
  } catch (error) {
    console.error('IP별 로그인 시도 조회 실패:', error);
    throw error;
  }
};

// 사용자별 로그인 시도 횟수 조회
export const getLoginAttemptsByUser = async (email, timeWindow = 24) => {
  try {
    const now = new Date();
    const timeWindowMs = timeWindow * 60 * 60 * 1000;
    const startTime = new Date(now.getTime() - timeWindowMs);

    const q = query(
      collection(db, 'security_logs'),
      where('email', '==', email),
      where('type', 'in', [SECURITY_LOG_TYPES.LOGIN_SUCCESS, SECURITY_LOG_TYPES.LOGIN_FAILED]),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const recentLogs = logs.filter(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.createdAt);
      return logDate >= startTime;
    });

    return {
      totalAttempts: recentLogs.length,
      successfulLogins: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.LOGIN_SUCCESS).length,
      failedLogins: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.LOGIN_FAILED).length,
      logs: recentLogs
    };
  } catch (error) {
    console.error('사용자별 로그인 시도 조회 실패:', error);
    throw error;
  }
};

// 보안 통계 조회
export const getSecurityStats = async (timeWindow = 24) => {
  try {
    const now = new Date();
    const timeWindowMs = timeWindow * 60 * 60 * 1000;
    const startTime = new Date(now.getTime() - timeWindowMs);

    const q = query(
      collection(db, 'security_logs'),
      orderBy('timestamp', 'desc'),
      limit(1000) // 최근 1000개 로그만 조회
    );

    const snapshot = await getDocs(q);
    const allLogs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 시간 윈도우 내의 로그만 필터링
    const recentLogs = allLogs.filter(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.createdAt);
      return logDate >= startTime;
    });

    // 통계 계산
    const stats = {
      totalLogs: recentLogs.length,
      loginSuccess: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.LOGIN_SUCCESS).length,
      loginFailed: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.LOGIN_FAILED).length,
      suspiciousActivity: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.SUSPICIOUS_ACTIVITY).length,
      ddosAttempts: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.DDOS_ATTEMPT).length,
      unauthorizedAccess: recentLogs.filter(log => log.type === SECURITY_LOG_TYPES.UNAUTHORIZED_ACCESS).length,
      uniqueIPs: [...new Set(recentLogs.map(log => log.ipAddress))].length,
      uniqueUsers: [...new Set(recentLogs.map(log => log.email).filter(Boolean))].length,
      criticalLevel: recentLogs.filter(log => log.level === SECURITY_LEVELS.CRITICAL).length,
      highLevel: recentLogs.filter(log => log.level === SECURITY_LEVELS.HIGH).length,
      mediumLevel: recentLogs.filter(log => log.level === SECURITY_LEVELS.MEDIUM).length,
      lowLevel: recentLogs.filter(log => log.level === SECURITY_LEVELS.LOW).length
    };

    return stats;
  } catch (error) {
    console.error('보안 통계 조회 실패:', error);
    throw error;
  }
};

// 의심스러운 활동 감지
export const detectSuspiciousActivity = async (userId, email, activity) => {
  try {
    const clientIP = await getClientIP();
    
    // IP별 로그인 시도 횟수 확인
    const ipAttempts = await getLoginAttemptsByIP(clientIP, 1); // 1시간 내
    if (ipAttempts.failedLogins > 10) {
      await logDDoSAttempt(clientIP, ipAttempts.failedLogins, {
        userId,
        email,
        activity
      });
      return { suspicious: true, reason: 'DDoS 공격 시도 감지', level: 'critical' };
    }

    // 사용자별 로그인 시도 횟수 확인
    if (email) {
      const userAttempts = await getLoginAttemptsByUser(email, 1); // 1시간 내
      if (userAttempts.failedLogins > 5) {
        await logSuspiciousActivity(userId, email, activity, {
          reason: '과도한 로그인 실패',
          failedAttempts: userAttempts.failedLogins
        });
        return { suspicious: true, reason: '과도한 로그인 실패', level: 'high' };
      }
    }

    return { suspicious: false };
  } catch (error) {
    console.error('의심스러운 활동 감지 실패:', error);
    return { suspicious: false };
  }
};

