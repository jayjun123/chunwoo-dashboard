import axios from 'axios';

// 프로덕션: Netlify Function 사용, 개발: 직접 NAS API 호출
const isProduction = import.meta.env.PROD;
const NAS_API_URL = import.meta.env.VITE_NAS_API_URL;

export const fetchMailSummaries = async () => {
  try {
    const cacheBust = Date.now();
    let response;
    
    if (isProduction) {
      // 프로덕션 환경: Netlify Function 프록시 사용 (Mixed Content 회피)
      response = await axios.get(`/.netlify/functions/mail-summaries?ts=${cacheBust}`, {
        timeout: 15000,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
    } else {
      // 개발 환경: 직접 NAS API 호출
      if (!NAS_API_URL) {
        throw new Error('VITE_NAS_API_URL이 설정되어 있지 않습니다.');
      }
      response = await axios.get(`${NAS_API_URL}/mail-summaries?ts=${cacheBust}`, {
        timeout: 15000,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
    }

    return response.data?.data ?? response.data;
  } catch (error) {
    console.error('메일 요약 API 호출 실패:', error);
    throw error;
  }
};
