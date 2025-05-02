// Frontend authentication utilities for Extractinator

const API_URL = import.meta.env.VITE_API_URL || '/api';
const SESSION_KEY = 'extractinator_jwt';
const SESSION_TIMEOUT_MINUTES = 30;

export function saveToken(token: string) {
  sessionStorage.setItem(SESSION_KEY, token);
  sessionStorage.setItem('lastActive', Date.now().toString());
}

export function getToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function clearToken() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('lastActive');
}

export function isSessionExpired(): boolean {
  const last = sessionStorage.getItem('lastActive');
  if (!last) return true;
  const diff = Date.now() - parseInt(last, 10);
  return diff > SESSION_TIMEOUT_MINUTES * 60 * 1000;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  const data = await res.json();
  saveToken(data.token);
}

export function logout() {
  clearToken();
}
