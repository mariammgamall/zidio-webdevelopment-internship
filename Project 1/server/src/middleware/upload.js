import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tempDir = path.join(__dirname, '../../../temp_uploads');
try {
  const parentDir = path.dirname(tempDir);
  fs.accessSync(parentDir, fs.constants.W_OK);
} catch (err) {
  tempDir = path.join(process.cwd(), 'temp_uploads');
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPEG, JPG, PNG, WEBP) are allowed!'));
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter
});

const recordingFilter = (req, file, cb) => {
  const filetypes = /webm|mp4|ogg|video/;
  if (filetypes.test(file.mimetype) || filetypes.test(path.extname(file.originalname).toLowerCase())) {
    return cb(null, true);
  }
  cb(new Error('Only video recording files are allowed'));
};

export const uploadRecording = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: recordingFilter
});

export default upload;
