import { getApiOrigin } from '../lib/api';

/**
 * Resolves user avatar URLs to work correctly under both local development
 * and deployed environments (Vercel/Render).
 */
export const getAvatarUrl = (avatar: string | undefined | null): string => {
  if (!avatar) {
    return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80';
  }
  const apiOrigin = getApiOrigin() || 'http://localhost:5000';
  if (avatar.startsWith('/')) {
    return `${apiOrigin}${avatar}`;
  }
  if (avatar.includes('localhost:5000')) {
    return avatar.replace(/^https?:\/\/localhost:5000/, apiOrigin);
  }
  return avatar;
};
