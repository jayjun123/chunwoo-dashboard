/**
 * 마스터 권한 관련 유틸리티 함수들
 * 환경변수와 하드코딩된 값들을 통합 관리
 */

// 마스터 이메일 목록 (환경변수 우선, 하드코딩된 값들 백업)
const getMasterEmails = () => {
  const envMasterEmail = import.meta.env.VITE_MASTER_EMAIL;
  const hardcodedEmails = ['fire8803@naver.com'];
  
  const emails = [];
  if (envMasterEmail) {
    emails.push(envMasterEmail);
  }
  // 하드코딩된 이메일들도 추가 (환경변수가 없을 때 백업용)
  emails.push(...hardcodedEmails);
  
  // 중복 제거
  return [...new Set(emails)];
};

// 마스터 UID 목록 (하드코딩된 UID들)
const getMasterUids = () => {
  return ['HpF5IrlTscYbWPsUhtdzV05sjbF2'];
};

/**
 * 사용자가 마스터 권한을 가지고 있는지 확인
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 마스터 권한 여부
 */
export const isMasterUser = (user) => {
  if (!user) return false;
  
  const email = user.email?.toLowerCase() || '';
  const uid = user.uid || '';
  const role = user.role || '';
  const grade = user.grade || '';
  const displayName = user.displayName || '';
  
  // 1. 역할이나 등급으로 확인
  if (role === 'master' || grade === '마스터') {
    return true;
  }
  
  // 2. 이메일로 확인
  const masterEmails = getMasterEmails();
  if (masterEmails.some(masterEmail => email === masterEmail.toLowerCase())) {
    return true;
  }
  
  // 3. UID로 확인
  const masterUids = getMasterUids();
  if (masterUids.includes(uid)) {
    return true;
  }
  
  // 4. 이메일이나 이름에 'master' 포함 확인
  if (email.includes('master') || displayName.includes('마스터')) {
    return true;
  }
  
  return false;
};

/**
 * 사용자가 관리자 권한을 가지고 있는지 확인
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 관리자 권한 여부
 */
export const isAdminUser = (user) => {
  if (!user) return false;
  
  const role = user.role || '';
  const grade = user.grade || '';
  const email = user.email?.toLowerCase() || '';
  const displayName = user.displayName || '';
  
  // 마스터는 관리자 권한도 포함
  if (isMasterUser(user)) {
    return true;
  }
  
  // 관리자 역할이나 등급 확인
  if (role === 'admin' || grade === '관리자') {
    return true;
  }
  
  // 이메일이나 이름에 'admin' 포함 확인
  if (email.includes('admin') || displayName.includes('관리자')) {
    return true;
  }
  
  return false;
};

/**
 * 마스터 이메일 목록 반환 (디버깅용)
 * @returns {Array} 마스터 이메일 목록
 */
export const getMasterEmailList = () => {
  return getMasterEmails();
};

/**
 * 마스터 UID 목록 반환 (디버깅용)
 * @returns {Array} 마스터 UID 목록
 */
export const getMasterUidList = () => {
  return getMasterUids();
};

/**
 * 현재 환경변수 상태 확인 (디버깅용)
 * @returns {Object} 환경변수 상태
 */
export const getMasterConfig = () => {
  return {
    envMasterEmail: import.meta.env.VITE_MASTER_EMAIL,
    hardcodedEmails: ['fire8803@naver.com'],
    masterEmails: getMasterEmails(),
    masterUids: getMasterUids(),
    isEnvConfigured: !!import.meta.env.VITE_MASTER_EMAIL
  };
};

// 디버깅용 로그 출력
if (import.meta.env.DEV) {
  console.log('🔧 Master Utils 초기화:', getMasterConfig());
}
