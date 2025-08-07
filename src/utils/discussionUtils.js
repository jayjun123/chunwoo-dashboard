/**
 * 토론방 사용자 식별 유틸리티
 * 모바일과 PC에서 동일한 사용자로 인식되도록 하는 공통 함수들
 */

import { getAuth } from 'firebase/auth';

/**
 * 현재 사용자의 고유 식별자 생성
 * 모바일과 PC에서 동일한 사용자로 인식되도록 함
 */
export const getCurrentUserIdentifier = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    return null;
  }
  
  // Firebase UID를 기본 식별자로 사용
  return currentUser.uid;
};

/**
 * 사용자 표시 이름 생성
 * 모바일과 PC에서 동일한 이름이 표시되도록 함
 */
export const getUserDisplayName = (currentUser) => {
  if (!currentUser) {
    return '익명 사용자';
  }
  
  // 1. displayName이 있으면 우선 사용
  if (currentUser.displayName && currentUser.displayName.trim() !== '') {
    return currentUser.displayName.trim();
  }
  
  // 2. 이메일이 있으면 @ 앞부분을 사용
  if (currentUser.email) {
    const emailName = currentUser.email.split('@')[0];
    // 이메일 이름을 더 읽기 쉽게 변환 (예: john.doe -> John Doe)
    return emailName
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  
  // 3. 기본값
  return '현재 사용자';
};

/**
 * 사용자 정보 로깅 (디버깅용)
 */
export const logUserInfo = (currentUser, context = '') => {
  console.log(`🔍 사용자 정보 ${context}:`, {
    uid: currentUser?.uid,
    email: currentUser?.email,
    displayName: currentUser?.displayName,
    displayNameGenerated: getUserDisplayName(currentUser),
    timestamp: new Date().toISOString()
  });
};

/**
 * 디바이스 정보 가져오기
 */
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isPWA,
    userAgent: userAgent.substring(0, 100) // 보안을 위해 일부만
  };
}; 