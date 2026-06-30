import { resolveAssetUrl } from '../lib/api';

export const getAvatarUrl = (avatar: string | undefined | null, name?: string | null): string => {
  if (!avatar) {
    const defaultBg = '#6366f1'; // indigo-500
    let initials = 'U';
    
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) {
        initials = parts[0].slice(0, 2).toUpperCase();
      } else {
        initials = (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
    }
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${defaultBg}"/>
      <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="40" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials}</text>
    </svg>`;
    
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  return resolveAssetUrl(avatar);
};
