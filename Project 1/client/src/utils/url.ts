import { resolveAssetUrl } from '../lib/api';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80';

/**
 * Resolves user avatar URLs to work correctly under both local development
 * and deployed environments (Vercel/Render).
 */
export const getAvatarUrl = (avatar: string | undefined | null): string => {
  if (!avatar) {
    return DEFAULT_AVATAR;
  }

  return resolveAssetUrl(avatar) || DEFAULT_AVATAR;
};
