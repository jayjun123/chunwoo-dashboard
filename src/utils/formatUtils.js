// 숫자 포맷팅 유틸리티 함수들

/**
 * 숫자를 천단위 쉼표가 포함된 문자열로 변환
 * @param {number|string} value - 포맷팅할 숫자
 * @param {boolean} addWon - '원' 단위 추가 여부
 * @returns {string} 포맷팅된 문자열
 */
export const formatNumber = (value, addWon = false) => {
  if (value === null || value === undefined || value === '') {
    return addWon ? '0원' : '0';
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(num)) {
    return addWon ? '0원' : '0';
  }
  
  const formatted = num.toLocaleString('ko-KR');
  return addWon ? `${formatted}원` : formatted;
};

/**
 * 계약금액 포맷팅 (원 단위 포함)
 * @param {number|string} value - 계약금액
 * @returns {string} 포맷팅된 계약금액
 */
export const formatContractAmount = (value) => {
  return formatNumber(value, true);
};

/**
 * 기성금액 포맷팅 (원 단위 포함)
 * @param {number|string} value - 기성금액
 * @returns {string} 포맷팅된 기성금액
 */
export const formatGisungAmount = (value) => {
  return formatNumber(value, true);
};

/**
 * 선급금 포맷팅 (원 단위 포함)
 * @param {number|string} value - 선급금
 * @returns {string} 포맷팅된 선급금
 */
export const formatAdvanceAmount = (value) => {
  return formatNumber(value, true);
};

/**
 * 잔액 포맷팅 (원 단위 포함)
 * @param {number|string} value - 잔액
 * @returns {string} 포맷팅된 잔액
 */
export const formatBalanceAmount = (value) => {
  return formatNumber(value, true);
};

/**
 * 퍼센트 포맷팅
 * @param {number|string} value - 퍼센트 값
 * @returns {string} 포맷팅된 퍼센트
 */
export const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') {
    return '0%';
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(num)) {
    return '0%';
  }
  
  return `${Math.round(num)}%`;
}; 