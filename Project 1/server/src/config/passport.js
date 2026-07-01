import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwtHelper.js';
import logger from '../utils/logger.js';

const isGoogleOAuthConfigured =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

const DEMO_GOOGLE_EMAIL = 'google.demo@intellmeet.app';

const getClientOrigin = (req) => {
  const referer = req?.headers?.referer;
  if (referer) {
    try {
      const url = new URL(referer);
      const isLocal = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(url.hostname);
      if (isLocal) {
        return url.origin;
      }
    } catch (e) {
      // ignore
    }
  }
  return process.env.CLIENT_ORIGIN || 'http://localhost:5173';
};

const completeOAuthLogin = (req, res, user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  const clientOrigin = getClientOrigin(req);
  res.redirect(
    `${clientOrigin}/?oauth=success&token=${accessToken}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&id=${user._id}&role=${user.role}&avatar=${encodeURIComponent(user.avatar || '')}`
  );
};

const findOrCreateDemoGoogleUser = async () => {
  let user = await User.findOne({ email: DEMO_GOOGLE_EMAIL });
  if (!user) {
    user = await User.create({
      name: 'Google Demo User',
      email: DEMO_GOOGLE_EMAIL,
      password: `oauth_demo_${Date.now()}`,
      role: 'Member',
      avatar: 'https://www.gstatic.com/images/branding/product/2x/avatar_circle_blue_512dp.png'
    });
    logger.info('Created demo Google OAuth user for local development');
  }
  return user;
};

const handleDemoGoogleAuth = async (req, res) => {
  const user = await findOrCreateDemoGoogleUser();
  completeOAuthLogin(req, res, user);
};

if (isGoogleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ email: profile.emails[0].value });
          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email: profile.emails[0].value,
              password: `oauth_${profile.id}_${Date.now()}`,
              role: 'Member',
              avatar: profile.photos?.[0]?.value || ''
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  logger.info('Google OAuth2 strategy initialized');
} else {
  logger.warn('Google OAuth2 credentials missing — using demo Google sign-in for local development');
}

export const googleAuth = async (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    try {
      await handleDemoGoogleAuth(req, res);
    } catch (err) {
      logger.error('Demo Google OAuth failed', err);
      const clientOrigin = getClientOrigin(req);
      res.redirect(`${clientOrigin}/?oauth=failed`);
    }
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
};

export const googleCallback = (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    return handleDemoGoogleAuth(req, res).catch(() => {
      const clientOrigin = getClientOrigin(req);
      res.redirect(`${clientOrigin}/?oauth=failed`);
    });
  }

  passport.authenticate('google', { session: false }, (err, user) => {
    const clientOrigin = getClientOrigin(req);
    if (err || !user) {
      return res.redirect(`${clientOrigin}/?oauth=failed`);
    }

    completeOAuthLogin(req, res, user);
  })(req, res, next);
};
