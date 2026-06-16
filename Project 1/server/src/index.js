import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';

import connectDB from './config/db.js';
import redisClient, { isRedisConnected } from './config/redis.js';
import { seedDatabase } from './config/seed.js';
import User from './models/User.js';

import authRoutes from './routes/authRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

import { initMeetingCleanupJob } from './jobs/meetingCleanup.js';
import { initAiQueue } from './jobs/aiProcessingQueue.js';
import { handleSocketConnections } from './socket/socketHandler.js';
import { setIoInstance } from './services/notificationService.js';
import { metricsMiddleware, metricsHandler } from './utils/metrics.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import './config/passport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize env
// Trigger reload: reverted
dotenv.config();

const app = express();
const server = http.createServer(app);

// 1. Initialize Sentry (if DSN provided)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Performance Monitoring
    tracesSampleRate: 1.0
  });
  logger.info('Sentry tracing initialized');
  // Sentry request handler must be first middleware
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// 2. Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allows client to load local uploaded images
}));

const allowedOrigins = [process.env.CLIENT_ORIGIN || 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Serve static profile pictures and recordings
let uploadsDir = path.join(__dirname, '../../uploads');
try {
  const parentDir = path.dirname(uploadsDir);
  fs.accessSync(parentDir, fs.constants.W_OK);
} catch (err) {
  uploadsDir = path.join(process.cwd(), 'uploads');
}
app.use('/uploads', express.static(uploadsDir));

// 3. Prometheus Metrics Middleware
app.use(metricsMiddleware);

// 4. Expose Observability Endpoints
app.get('/metrics', metricsHandler);

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = isRedisConnected() ? 'connected' : 'disconnected';
  const uptime = Math.floor(process.uptime());
  
  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    database: dbStatus,
    redis: redisStatus,
    uptime: `${uptime}s`,
    timestamp: new Date().toISOString()
  });
});

// 5. Mount REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// Mock route for simple testing
app.get('/', (req, res) => {
  res.json({ message: 'IntellMeet Enterprise API running' });
});

// 6. Connect Database & Start Services
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect MongoDB
  await connectDB();

  // Run database seeding if Mariam is not in the database or has old avatar
  const mariamUser = await User.findOne({ email: 'mariam@intellmeet.app' });
  if (!mariamUser || mariamUser.avatar.includes('unsplash')) {
    logger.info('Mariam Gamal profile needs update. Seeding database...');
    await seedDatabase();
  }

  // Initialize Socket.io Server
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Share Socket.io server context with notification dispatcher
  setIoInstance(io);

  // Bind socket routing handlers
  handleSocketConnections(io);

  // Initialize background jobs
  initMeetingCleanupJob();
  initAiQueue();

  // Sentry error handler must be before standard error handlers
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }

  // General error handling middleware
  app.use(errorHandler);

  server.listen(PORT, () => {
    logger.info(`IntellMeet Server listenting on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

startServer().catch(err => {
  logger.error('Startup failed:', err);
  process.exit(1);
});
