import User from '../models/User.js';
import { verifyAccessToken } from '../utils/jwtHelper.js';
import logger from '../utils/logger.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource, token missing'
    });
  }

  try {
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid or expired token'
      });
    }

    // Fetch user from DB and attach to req
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this id'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication middleware error', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, session validation failed'
    });
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'none'}' is not authorized to access this route`
      });
    }
    next();
  };
};
