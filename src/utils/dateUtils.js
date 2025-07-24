// 한국 시간 기준 날짜 처리 유틸리티

/**
 * 한국 시간 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns {string} YYYY-MM-DD 형식의 오늘 날짜
 */
export const getKoreanDate = () => {
  const now = new Date();
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return koreanTime.toISOString().split('T')[0];
};

/**
 * 주어진 날짜를 한국 시간 기준으로 YYYY-MM-DD 형식으로 변환
 * @param {Date|string} date - 변환할 날짜
 * @returns {string} YYYY-MM-DD 형식의 날짜
 */
export const getKoreanDateFromDate = (date) => {
  const targetDate = new Date(date);
  const koreanTime = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return koreanTime.toISOString().split('T')[0];
};

/**
 * 날짜 비교 함수 (다양한 형식 지원)
 * @param {string|Date} date1 - 첫 번째 날짜
 * @param {string|Date} date2 - 두 번째 날짜
 * @returns {boolean} 같은 날짜인지 여부
 */
export const isSameDate = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // 유효한 날짜인지 확인
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  } catch (error) {
    console.error('날짜 비교 오류:', error);
    return false;
  }
};

/**
 * 날짜 정규화 함수 (YYYY-MM-DD 형식으로 통일)
 * @param {string|Date} dateStr - 정규화할 날짜
 * @returns {string} YYYY-MM-DD 형식의 날짜
 */
export const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // 유효하지 않은 날짜는 원본 반환
    return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 정규화
  } catch (error) {
    console.error('날짜 정규화 오류:', error);
    return dateStr; // 오류 시 원본 반환
  }
};

/**
 * 한국 시간 기준으로 현재 시간을 ISO 문자열로 반환
 * @returns {string} ISO 형식의 한국 시간
 */
export const getKoreanISOString = () => {
  const now = new Date();
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return koreanTime.toISOString();
}; 