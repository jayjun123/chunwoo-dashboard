/**
 * 마스터 권한 관련 유틸리티 함수들
 * 환경변수와 하드코딩된 값들을 통합 관리
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { permissionsAPI } from '../api/database';

// 마스터 이메일 목록 (환경변수만 사용, 하드코딩 제거)
// .env 예: VITE_MASTER_EMAIL=admin@example.com 또는 여러 명일 경우 VITE_MASTER_EMAILS=email1@a.com,email2@b.com
const getMasterEmails = () => {
  const envSingle = import.meta.env.VITE_MASTER_EMAIL;
  const envMultiple = import.meta.env.VITE_MASTER_EMAILS;
  const emails = [];
  if (envSingle) {
    emails.push(...String(envSingle).split(',').map((e) => e.trim()).filter(Boolean));
  }
  if (envMultiple) {
    emails.push(...String(envMultiple).split(',').map((e) => e.trim()).filter(Boolean));
  }
  return [...new Set(emails)];
};

// 마스터 UID 목록 (환경변수만 사용, 하드코딩 제거)
// .env 예: VITE_MASTER_UIDS=uid1,uid2
const getMasterUids = () => {
  const envUids = import.meta.env.VITE_MASTER_UIDS;
  if (!envUids) return [];
  return String(envUids).split(',').map((u) => u.trim()).filter(Boolean);
};

// 메모이제이션 캐시 (성능 최적화)
const permissionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 캐시 키 생성
const getCacheKey = (user, type) => {
  if (!user) return null;
  return `${type}_${user.uid}_${user.role}_${user.grade}`;
};

// 캐시에서 값 가져오기
const getCachedPermission = (key) => {
  if (!key) return null;
  const cached = permissionCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }
  permissionCache.delete(key);
  return null;
};

// 캐시에 값 저장
const setCachedPermission = (key, value) => {
  if (!key) return;
  permissionCache.set(key, {
    value,
    timestamp: Date.now()
  });
};

// 디버그 모드 확인 (환경변수로 제어)
const isDebugMode = () => {
  return import.meta.env.VITE_DEBUG_PERMISSIONS === 'true';
};

// 캐시 무효화 함수 (사용자 정보 변경 시 호출)
export const clearPermissionCache = (userId = null) => {
  if (userId) {
    // 특정 사용자의 캐시만 삭제
    const keysToDelete = [];
    for (const key of permissionCache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => permissionCache.delete(key));
  } else {
    // 전체 캐시 삭제
    permissionCache.clear();
  }
};

/**
 * 사용자가 마스터 권한을 가지고 있는지 확인
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 마스터 권한 여부
 */
export const isMasterUser = async (user) => {
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
  
  // 5. Firestore에서 권한 정보 확인
  try {
    const permissions = await getUserPermissionsFromDB(user.uid);
    if (permissions) {
      // 모든 권한이 있는 경우 마스터로 간주
      if (permissions.scheduleManagement && 
          permissions.scheduleManagement.read && 
          permissions.scheduleManagement.write && 
          permissions.scheduleManagement.delete) {
        return true;
      }
    }
  } catch (error) {
    console.error('마스터 권한 확인 중 오류:', error);
  }
  
  return false;
};

/**
 * Firestore에서 사용자 권한 정보를 가져오는 함수
 * @param {string} userId - 사용자 ID
 * @returns {Object|null} 권한 정보 또는 null
 */
const getUserPermissionsFromDB = async (userId) => {
  try {
    const permissions = await permissionsAPI.getUserPermissions(userId);
    return permissions;
  } catch (error) {
    console.error('사용자 권한 조회 실패:', error);
    return null;
  }
};

/**
 * 사용자가 관리자 권한을 가지고 있는지 확인
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 관리자 권한 여부
 */
export const isAdminUser = async (user) => {
  if (!user) return false;
  
  const role = user.role || '';
  const grade = user.grade || '';
  const email = user.email?.toLowerCase() || '';
  const displayName = user.displayName || '';
  
  // 마스터는 관리자 권한도 포함
  if (await isMasterUser(user)) {
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
  
  // Firestore에서 권한 정보 확인
  try {
    const permissions = await getUserPermissionsFromDB(user.uid);
    if (permissions) {
      // scheduleManagement 권한이 있는지 확인
      if (permissions.scheduleManagement && 
          (permissions.scheduleManagement.write || permissions.scheduleManagement.delete)) {
        return true;
      }
    }
  } catch (error) {
    console.error('권한 확인 중 오류:', error);
  }
  
  return false;
};

/**
 * 동기 버전의 관리자 권한 확인 (기존 코드 호환성)
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 관리자 권한 여부
 */
export const isAdminUserSync = (user) => {
  if (!user) {
    if (isDebugMode()) {
      console.log('🔍 isAdminUserSync: 사용자 정보 없음');
    }
    return false;
  }
  
  // 캐시 확인
  const cacheKey = getCacheKey(user, 'admin');
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  const role = user.role || '';
  const grade = user.grade || '';
  const email = user.email?.toLowerCase() || '';
  const displayName = user.displayName || '';
  
  if (isDebugMode()) {
    console.log('🔍 isAdminUserSync 체크:', {
      email,
      role,
      grade,
      displayName,
      uid: user.uid
    });
  }
  
  // 마스터는 관리자 권한도 포함
  if (isMasterUserSync(user)) {
    if (isDebugMode()) {
      console.log('✅ 마스터 권한으로 관리자 권한 부여');
    }
    setCachedPermission(cacheKey, true);
    return true;
  }
  
  // 관리자 역할이나 등급 확인
  if (role === 'admin' || grade === '관리자') {
    if (isDebugMode()) {
      console.log('✅ 역할/등급으로 관리자 권한 부여:', { role, grade });
    }
    setCachedPermission(cacheKey, true);
    return true;
  }
  
  // 이메일이나 이름에 'admin' 포함 확인
  if (email.includes('admin') || displayName.includes('관리자')) {
    if (isDebugMode()) {
      console.log('✅ 이메일/이름으로 관리자 권한 부여:', { email, displayName });
    }
    setCachedPermission(cacheKey, true);
    return true;
  }
  
  if (isDebugMode()) {
    console.log('❌ 관리자 권한 없음');
  }
  setCachedPermission(cacheKey, false);
  return false;
};

/**
 * 동기 버전의 마스터 권한 확인 (기존 코드 호환성)
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 마스터 권한 여부
 */
export const isMasterUserSync = (user) => {
  if (!user) {
    if (isDebugMode()) {
      console.log('🔍 isMasterUserSync: 사용자 정보 없음');
    }
    return false;
  }
  
  // 캐시 확인
  const cacheKey = getCacheKey(user, 'master');
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  const email = user.email?.toLowerCase() || '';
  const uid = user.uid || '';
  const role = user.role || '';
  const grade = user.grade || '';
  const displayName = user.displayName || '';
  
  if (isDebugMode()) {
    console.log('🔍 isMasterUserSync 체크:', {
      email,
      uid,
      role,
      grade,
      displayName
    });
  }
  
  // 1. 역할이나 등급으로 확인
  if (role === 'master' || grade === '마스터') {
    if (isDebugMode()) {
      console.log('✅ 역할/등급으로 마스터 권한 부여:', { role, grade });
    }
    setCachedPermission(cacheKey, true);
    return true;
  }
  
  // 2. 이메일로 확인
  const masterEmails = getMasterEmails();
  if (isDebugMode()) {
    console.log('🔍 마스터 이메일 목록:', masterEmails);
  }
  if (masterEmails.some(masterEmail => email === masterEmail.toLowerCase())) {
    if (isDebugMode()) {
      console.log('✅ 이메일로 마스터 권한 부여:', email);
    }
    setCachedPermission(cacheKey, true);
    return true;
  }
  
  // 3. UID로 확인
  const masterUids = getMasterUids();
  if (isDebugMode()) {
    console.log('🔍 마스터 UID 목록:', masterUids);
  }
  if (masterUids.includes(uid)) {
    if (isDebugMode()) {
      console.log('✅ UID로 마스터 권한 부여:', uid);
    }
    setCachedPermission(cacheKey, true);
    return true;
  }
  
  // 4. 이메일이나 이름에 'master' 포함 확인
  if (email.includes('master') || displayName.includes('마스터')) {
    if (isDebugMode()) {
      console.log('✅ 이메일/이름으로 마스터 권한 부여:', { email, displayName });
    }
    setCachedPermission(cacheKey, true);
    return true;
  }
  
  if (isDebugMode()) {
    console.log('❌ 마스터 권한 없음');
  }
  setCachedPermission(cacheKey, false);
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
    hardcodedEmails: ['fire8803@naver.com', 'parkmg0688@naver.com'],
    masterEmails: getMasterEmails(),
    masterUids: getMasterUids(),
    isEnvConfigured: !!import.meta.env.VITE_MASTER_EMAIL
  };
};

// 디버깅용 로그 출력
if (import.meta.env.DEV) {
  console.log('🔧 Master Utils 초기화:', getMasterConfig());
}

// 디버깅용 상세 로그 함수
export const debugMasterUser = (user) => {
  console.log('🔍 Master User 디버깅:');
  console.log('- 사용자 객체:', user);
  console.log('- 이메일:', user?.email);
  console.log('- UID:', user?.uid);
  console.log('- 역할:', user?.role);
  console.log('- 등급:', user?.grade);
  console.log('- 표시명:', user?.displayName);
  console.log('- 마스터 이메일 목록:', getMasterEmails());
  console.log('- 마스터 UID 목록:', getMasterUids());
  console.log('- 마스터 권한 여부:', isMasterUser(user));
  console.log('- 환경변수 마스터 이메일:', import.meta.env.VITE_MASTER_EMAIL);
  console.log('- 전체 환경변수:', import.meta.env);
};
