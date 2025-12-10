import axios from 'axios';

// In development, MSW intercepts requests, so we don't need a real base URL
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '' : 'http://localhost:3001');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (data) => api.post('/api/auth/register', data),
};

// Status endpoints
export const statusAPI = {
  getCluster: () => api.get('/api/status/cluster'),
};

// Packet endpoints
export const packetAPI = {
  list: (params) => api.get('/api/packets', { params }),
  get: (pktId) => api.get(`/api/packets/${pktId}`),
  retry: (pktId) => api.post('/api/packets/retry', { pkt_id: pktId }),
};

// Query/Chat endpoints
export const queryAPI = {
  query: (data) => api.post('/api/query', data),
};

// Capsule endpoints
export const capsuleAPI = {
  list: () => api.get('/api/capsules'),
  get: (capsuleId) => api.get(`/api/capsules/${capsuleId}`),
};

export default api;


