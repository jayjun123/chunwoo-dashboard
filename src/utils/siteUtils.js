/**
 * 현장(site) 관련 순수 함수 — NewSites 등에서 사용
 * 데이터·디자인 변경 없이 분리만 함.
 */

export const formatQuantity = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'string' && value.includes('물량')) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  if (num === 0) return '0';
  const roundedForDisplay = Math.round(num * 100) / 100;
  return roundedForDisplay.toLocaleString();
};

export const formatAmount = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num === 0) return '0';
  const roundedNum = Math.round(num);
  return roundedNum.toLocaleString();
};

export const formatPrice = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num === 0) return '0';
  return Math.round(num).toLocaleString();
};

export const parseAmountNumber = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(/,/g, '')
    .replace(/[^0-9.-]/g, '');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
};

export const calculateProgress = (site) => {
  if (!site.startDate || !site.endDate) return null;
  const startDate = new Date(site.startDate);
  const endDate = new Date(site.endDate);
  const today = new Date();
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  const totalDays = endDate.getTime() - startDate.getTime();
  const elapsedDays = today.getTime() - startDate.getTime();
  if (totalDays <= 0) return null;
  const progress = (elapsedDays / totalDays) * 100;
  return Math.max(0, Math.min(100, progress));
};

export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  try {
    const start = startDate && typeof startDate === 'object' && startDate.toDate
      ? startDate.toDate()
      : new Date(startDate);
    const end = endDate && typeof endDate === 'object' && endDate.toDate
      ? endDate.toDate()
      : new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Invalid date in formatDateRange:', { startDate, endDate });
      return '';
    }
    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    };
    return `${formatDate(start)}~${formatDate(end)}`;
  } catch (error) {
    console.error('날짜 포맷팅 오류:', error, '원본 데이터:', { startDate, endDate });
    return '';
  }
};

export const normalizeCompanyName = (value) => (value ?? '').toString();
