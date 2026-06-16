import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwtHelper.js';
import logger from '../utils/logger.js';

const isGoogleOAuthConfigured =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

const DEMO_GOOGLE_EMAIL = 'google.demo@intellmeet.app';

const completeOAuthLogin = (res, user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
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

const handleDemoGoogleAuth = async (res) => {
  const user = await findOrCreateDemoGoogleUser();
  completeOAuthLogin(res, user);
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
      await handleDemoGoogleAuth(res);
    } catch (err) {
      logger.error('Demo Google OAuth failed', err);
      const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
      res.redirect(`${clientOrigin}/?oauth=failed`);
    }
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
};

export const googleCallback = (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    return handleDemoGoogleAuth(res).catch(() => {
      res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/?oauth=failed`);
    });
  }

  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_ORIGIN}/?oauth=failed`);
    }

    completeOAuthLogin(res, user);
  })(req, res, next);
};
