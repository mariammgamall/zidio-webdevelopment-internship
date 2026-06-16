import logger from '../utils/logger.js';

let ioInstance = null;

export const setIoInstance = (io) => {
  ioInstance = io;
};

export const getIoInstance = () => ioInstance;

// @desc    Dispatch real-time notification to user's private socket room
export const sendRealtimeNotification = (userId, notification) => {
  try {
    if (!ioInstance) {
      logger.debug(`Socket.io server not initialized yet. Saved notification in DB for user: ${userId}`);
      return;
    }

    const roomName = `user_${userId}`;
    logger.info(`Emitting real-time notification to room "${roomName}": ${notification.message}`);
    
    ioInstance.to(roomName).emit('notification', {
      success: true,
      notification: {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        read: notification.read,
        metadata: notification.metadata,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    logger.error(`Error sending real-time notification to user ${userId}`, error);
  }
};
