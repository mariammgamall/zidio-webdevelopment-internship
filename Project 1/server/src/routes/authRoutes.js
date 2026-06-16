import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, getProfile, uploadUserAvatar, logout, updateProfile } from '../controllers/authController.js';
import { googleAuth, googleCallback } from '../config/passport.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Rate limiter for authentication paths
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware to compile express-validator errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  next();
};

router.post(
  '/register',
  authRateLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Please specify a valid email address').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  validate,
  register
);

router.post(
  '/login',
  authRateLimiter,
  [
    body('email').trim().isEmail().withMessage('Please specify a valid email address').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, upload.single('avatar'), uploadUserAvatar);

// OAuth2 Google
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Admin-only: list all users (RBAC demo)
router.get('/users', protect, authorize('Admin'), async (req, res) => {
  const User = (await import('../models/User.js')).default;
  const users = await User.find().select('-password');
  res.json({ success: true, users });
});

export default router;
