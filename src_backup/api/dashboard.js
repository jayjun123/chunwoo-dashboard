import axios from 'axios';

// Vite 환경변수 사용
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10초 타임아웃
});

// 응답 인터셉터 추가
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 인증 에러 처리
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getDashboardStats = async (user) => {
  if (!user) throw new Error('로그인이 필요합니다.');
  try {
    const token = await user.getIdToken();
    const response = await api.get('/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('대시보드 통계 로드 실패:', error);
    throw new Error(error.response?.data?.message || '대시보드 통계를 불러오는데 실패했습니다.');
  }
};

export const getDashboardCharts = async ({ period = 'week', metric = 'all' }, user) => {
  if (!user) throw new Error('로그인이 필요합니다.');
  try {
    const token = await user.getIdToken();
    const response = await api.get('/dashboard/charts', {
      params: { period, metric },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('대시보드 차트 로드 실패:', error);
    throw new Error(error.response?.data?.message || '대시보드 차트 데이터를 불러오는데 실패했습니다.');
  }
}; 