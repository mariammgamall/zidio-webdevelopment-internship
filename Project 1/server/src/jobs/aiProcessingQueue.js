import Queue from 'bull';
import { host as redisHost, port as redisPort, password as redisPassword } from '../config/redis.js';
import logger from '../utils/logger.js';

let aiQueue = null;

export const initAiQueue = () => {
  try {
    logger.info(`Initializing Bull AI queue on redis://${redisHost}:${redisPort}`);

    const redisOpts = {
      redis: {
        host: redisHost,
        port: redisPort,
        password: redisPassword
      }
    };

    aiQueue = new Queue('ai-processing', redisOpts);

    // Bind queue event handlers
    aiQueue.on('failed', (job, err) => {
      logger.error(`Bull job ${job.id} failed with error: ${err.message}`, err);
    });

    aiQueue.on('completed', (job, result) => {
      logger.info(`Bull job ${job.id} completed successfully`);
    });

    // Define process loop
    aiQueue.process('processAI', async (job) => {
      const { meetingId } = job.data;
      logger.info(`Background worker processing AI summary for meeting: ${meetingId}`);

      // Dynamically import aiService to avoid circular dependency loops
      const { processMeetingAI } = await import('../services/aiService.js');
      
      const result = await processMeetingAI(meetingId);
      return result;
    });

    logger.info('Bull queue and background worker initialized successfully');
  } catch (error) {
    logger.warn('Failed to initialize Redis Bull Queue. Failover synchronous AI execution enabled.');
    aiQueue = null;
  }
};

export const getAiQueue = () => {
  return aiQueue;
};
