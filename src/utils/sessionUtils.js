// 사용자 세션 동기화 유틸리티

// 세션 정보 저장
export const saveSessionInfo = (user) => {
  try {
    const sessionInfo = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
    
    // localStorage에 저장 (브라우저별)
    localStorage.setItem('userSession', JSON.stringify(sessionInfo));
    
    // sessionStorage에 저장 (탭 간 공유)
    sessionStorage.setItem('userSession', JSON.stringify(sessionInfo));
    
    console.log('세션 정보 저장 완료:', user.uid);
    return true;
  } catch (error) {
    console.error('세션 정보 저장 실패:', error);
    return false;
  }
};

// 세션 정보 로드
export const loadSessionInfo = () => {
  try {
    // sessionStorage 우선 확인
    const sessionData = sessionStorage.getItem('userSession');
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    
    // localStorage 확인
    const localData = localStorage.getItem('userSession');
    if (localData) {
      return JSON.parse(localData);
    }
    
    return null;
  } catch (error) {
    console.error('세션 정보 로드 실패:', error);
    return null;
  }
};

// 세션 정보 제거
export const clearSessionInfo = () => {
  try {
    localStorage.removeItem('userSession');
    sessionStorage.removeItem('userSession');
    console.log('세션 정보 제거 완료');
    return true;
  } catch (error) {
    console.error('세션 정보 제거 실패:', error);
    return false;
  }
};

// 세션 유효성 검사
export const isSessionValid = (sessionInfo) => {
  if (!sessionInfo) return false;
  
  // 24시간 이내 세션만 유효
  const now = Date.now();
  const sessionTime = sessionInfo.timestamp || 0;
  const validDuration = 24 * 60 * 60 * 1000; // 24시간
  
  return (now - sessionTime) < validDuration;
};

// 디바이스 정보 가져오기
export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    timestamp: Date.now()
  };
};

// 세션 동기화 상태 확인
export const checkSessionSync = (currentUser) => {
  const sessionInfo = loadSessionInfo();
  
  if (!sessionInfo || !currentUser) {
    return { synced: false, reason: '세션 정보 없음' };
  }
  
  if (sessionInfo.uid !== currentUser.uid) {
    return { synced: false, reason: '사용자 ID 불일치' };
  }
  
  if (!isSessionValid(sessionInfo)) {
    return { synced: false, reason: '세션 만료' };
  }
  
  return { synced: true, sessionInfo };
}; 