import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_change_in_production';

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};
