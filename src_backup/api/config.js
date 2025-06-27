const API_BASE_URL = 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
  },
  SITES: {
    LIST: `${API_BASE_URL}/sites`,
    DETAIL: (id) => `${API_BASE_URL}/sites/${id}`,
  },
  DISCUSSIONS: {
    LIST: `${API_BASE_URL}/discussions`,
    DETAIL: (id) => `${API_BASE_URL}/discussions/${id}`,
  },
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/notifications`,
  },
  USERS: {
    LIST: `${API_BASE_URL}/users`,
    DETAIL: (id) => `${API_BASE_URL}/users/${id}`,
  },
  SCHEDULE: {
    LIST: `${API_BASE_URL}/schedule`,
    DETAIL: (id) => `${API_BASE_URL}/schedule/${id}`,
  },
  SAFETY: {
    LIST: `${API_BASE_URL}/safety`,
    DETAIL: (id) => `${API_BASE_URL}/safety/${id}`,
  },
  MATERIALS: {
    LIST: `${API_BASE_URL}/materials`,
    DETAIL: (id) => `${API_BASE_URL}/materials/${id}`,
  },
  REPORTS: {
    LIST: `${API_BASE_URL}/reports`,
    GENERATE: `${API_BASE_URL}/reports/generate`,
  },
}; 