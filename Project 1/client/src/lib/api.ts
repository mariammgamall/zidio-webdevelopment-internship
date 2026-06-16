const DEFAULT_API_URL = 'http://localhost:5000/api';

export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

/** Base URL for static assets and full-page OAuth redirects. */
export function getApiOrigin(): string {
  const apiUrl = API_URL;

  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return apiUrl.replace(/\/api\/?$/, '');
  }

  // Relative API path (e.g. "/api") — same origin, proxied to backend in dev/docker.
  return '';
}

export function getGoogleOAuthUrl(): string {
  const origin = getApiOrigin();
  return origin ? `${origin}/api/auth/google` : '/api/auth/google';
}
