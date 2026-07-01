const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.startsWith('172.')
);

const DEFAULT_API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';
const DEFAULT_SOCKET_URL = isLocalhost ? 'http://localhost:5000' : '/';

// When running in production (deployed), we MUST use relative paths to route through the Vercel rewrite proxy.
// This avoids CORS preflight credentials issues with Hugging Face Spaces.
export const API_URL = isLocalhost
  ? (import.meta.env.VITE_API_URL || DEFAULT_API_URL)
  : '/api';

export const SOCKET_URL = isLocalhost
  ? (import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL)
  : '/';

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
