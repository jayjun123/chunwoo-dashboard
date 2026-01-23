import axios from 'axios';

const NAS_API_URL = import.meta.env.VITE_NAS_API_URL;

const api = axios.create({
  baseURL: NAS_API_URL,
  timeout: 15000,
});

export const fetchMailSummaries = async () => {
  if (!NAS_API_URL) {
    throw new Error('VITE_NAS_API_URL이 설정되어 있지 않습니다.');
  }

  const response = await api.get('/mail-summaries');
  return response.data?.data ?? response.data;
};
