const API_BASE =
  import.meta.env.VITE_MINI_HUB_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const buildHeaders = (token, extraHeaders = {}) => {
  const headers = new Headers(extraHeaders);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

const request = async (path, { method = 'GET', token, body, headers } = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: buildHeaders(token, headers),
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

export const registerUser = (username, password) =>
  request('/auth/register', {
    method: 'POST',
    body: { username, password },
  });

export const loginUser = (username, password) =>
  request('/auth/login', {
    method: 'POST',
    body: { username, password },
  });

export const fetchProfile = (token) =>
  request('/auth/profile', {
    method: 'GET',
    token,
  });

export const fetchRecentPackets = (token, limit = 10) =>
  request(`/packets/recent?limit=${limit}`, {
    method: 'GET',
    token,
  });

export const sendPacket = (token, packet, clientTimeline = []) =>
  request('/query', {
    method: 'POST',
    token,
    body: { packet, client_timeline: clientTimeline },
  });

