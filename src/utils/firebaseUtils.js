/**
 * Firebase 관련 유틸리티 함수들
 */

/**
 * Firebase에 저장하기 전에 undefined 값을 제거하는 함수
 * @param {Object} obj - 정리할 객체
 * @returns {Object} - undefined 값이 제거된 객체
 */
export const cleanFirebaseData = (obj) => {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object') return obj;
  
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null) {
        const cleanedValue = cleanFirebaseData(value);
        // 빈 객체가 아닌 경우만 포함
        if (Object.keys(cleanedValue).length > 0) {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });
  return cleaned;
};

/**
 * 권한 데이터를 Firebase에 저장하기 전에 정리하는 함수
 * @param {Object} permissions - 권한 객체
 * @returns {Object} - 정리된 권한 객체
 */
export const cleanPermissionsData = (permissions) => {
  return cleanFirebaseData(permissions);
};
