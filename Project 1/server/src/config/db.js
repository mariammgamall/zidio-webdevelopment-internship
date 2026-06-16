import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/intellmeet';
    const conn = await mongoose.connect(connStr);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

export default connectDB;
