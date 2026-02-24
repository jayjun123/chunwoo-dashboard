/**
 * PWA 전용 API 클라이언트 (읽기 전용)
 * Netlify: /api/* → pwa-api 함수로 리다이렉트됨
 * 예: 오늘 일정, OO현장 소장, OO현장 기성 잔액
 */

import axios from 'axios';

const PWA_API_PREFIX = '/api';

const api = axios.create({
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const get = (path, params) =>
  api.get(`${PWA_API_PREFIX}${path}`, { params }).then((r) => r.data);

/** 서버 상태 확인 */
export const getHealth = () => get('/health');

/** 앱 공개 설정 및 엔드포인트 안내 */
export const getConfig = () => get('/config');

/** 오늘 일정 (일정관리에서 오늘 날짜에 해당하는 일정) */
export const getScheduleToday = () =>
  get('/schedule/today').then((res) => res?.data ?? []);

/**
 * 현장명으로 검색 (소장, 계약금액, 주소, 창호업체, 준공일, 시공팀, 기성잔액 등)
 * @param {string} siteName - 현장명 (부분 일치)
 * @returns {Promise<{ data: Array<{ name, manager, contractAmount, address, windowCompany, endDate, team, balance, ... }> }>}
 */
export const getSitesByName = (siteName) =>
  get('/sites', { name: siteName });

/**
 * OO현장 소장 누구야 → 소장명만 조회
 * @param {string} siteName - 현장명
 * @returns {Promise<{ data: Array<{ name, manager }> }>}
 */
export const getSiteManager = (siteName) =>
  get('/sites', { name: siteName, field: 'manager' });

/**
 * OO현장 기성금 얼마 남았어 → 잔액만 조회
 * @param {string} siteName - 현장명
 * @returns {Promise<{ data: Array<{ name, balance, balanceFormatted, contractAmount, advance, paidGisung }> }>}
 */
export const getSiteBalance = (siteName) =>
  get('/sites', { name: siteName, field: 'balance' });

export default {
  getHealth,
  getConfig,
  getScheduleToday,
  getSitesByName,
  getSiteManager,
  getSiteBalance,
};
