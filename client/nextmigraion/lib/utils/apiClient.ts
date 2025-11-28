import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
  headers: {
    'Cache-Control': 'max-age=3600'
  }
});

export default apiClient;
