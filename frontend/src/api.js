import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  // Generous: the LLM client now backs off and retries on rate limits.
  timeout: 180000,
  headers: { 'Content-Type': 'application/json' },
});

export function errMsg(e) {
  if (!e) return 'Request failed';
  if (e.response?.data?.error?.message) return e.response.data.error.message;
  if (e.message) return e.message;
  return 'Request failed';
}
