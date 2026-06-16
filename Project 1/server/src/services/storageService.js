import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  logger.info('Cloudinary initialized successfully');
} else {
  logger.warn('Cloudinary not configured. Defaulting to local disk storage fallback');
}

const persistFile = async (file, subfolder) => {
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `intellmeet/${subfolder}`,
        resource_type: subfolder === 'recordings' ? 'video' : 'image'
      });
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      return result.secure_url;
    } catch (error) {
      logger.error(`Cloudinary upload failed for ${subfolder}, falling back to local`, error);
    }
  }

  let baseUploadsDir = path.join(__dirname, '../../../uploads');
  try {
    const parentDir = path.dirname(baseUploadsDir);
    fs.accessSync(parentDir, fs.constants.W_OK);
  } catch (err) {
    baseUploadsDir = path.join(process.cwd(), 'uploads');
  }

  const uploadsDir = path.join(baseUploadsDir, subfolder);
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const ext = path.extname(file.originalname) || (subfolder === 'recordings' ? '.webm' : '.jpg');
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const destination = path.join(uploadsDir, filename);
  fs.copyFileSync(file.path, destination);
  try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  return `/uploads/${subfolder}/${filename}`;
};

export const uploadAvatar = async (file) => {
  if (!file) return '';
  try {
    return await persistFile(file, 'avatars');
  } catch (error) {
    logger.error('Avatar upload failed', error);
    return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80';
  }
};

export const uploadRecording = async (file) => {
  if (!file) return '';
  return persistFile(file, 'recordings');
};
