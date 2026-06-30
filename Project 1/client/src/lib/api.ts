const DEFAULT_API_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';

export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : '/');

/** Base URL for static assets and full-page OAuth redirects. */
export function getApiOrigin(): string {
  const apiUrl = API_URL;

  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return apiUrl.replace(/\/api\/?$/, '');
  }

  // Relative API path (e.g. "/api") — same origin, proxied to backend in dev/docker/vercel.
  return '';
}

/** Resolve uploaded asset paths (/uploads/...) for proxied and absolute API deployments. */
export function resolveAssetUrl(url: string | undefined | null): string {
  if (!url) return '';

  const apiOrigin = getApiOrigin();

  if (url.startsWith('/')) {
    return apiOrigin ? `${apiOrigin}${url}` : url;
  }

  if (url.includes('localhost:5000')) {
    return url.replace(/^https?:\/\/localhost:5000/, apiOrigin);
  }

  return url;
}

export function getGoogleOAuthUrl(): string {
  const origin = getApiOrigin();
  return origin ? `${origin}/api/auth/google` : '/api/auth/google';
}
