import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './db.js';
import { seedDatabase } from './seed.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runSeed = async () => {
  try {
    logger.info('Connecting to MongoDB for seeding...');
    await connectDB();
    logger.info('MongoDB connected. Running seed...');
    await seedDatabase();
    logger.info('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  }
};

runSeed();
