import cron from 'node-cron';
import Meeting from '../models/Meeting.js';
import logger from '../utils/logger.js';

// Setup scheduled job: Runs every hour
export const initMeetingCleanupJob = () => {
  logger.info('Initializing background meeting cleanup job scheduler (cron: every hour)');

  cron.schedule('0 * * * *', async () => {
    await performCleanup();
  });
};

export const performCleanup = async () => {
  try {
    logger.info('Running background database cleanup...');

    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours limit

    // 1. Force-close stale meetings
    const staleMeetings = await Meeting.find({
      status: 'active',
      createdAt: { $lt: fourHoursAgo }
    });

    if (staleMeetings.length > 0) {
      logger.info(`Found ${staleMeetings.length} stale active meetings. Marking as ended...`);
      for (const meeting of staleMeetings) {
        meeting.status = 'ended';
        meeting.endedAt = now;
        await meeting.save();
        logger.info(`Stale meeting ${meeting.roomId} closed successfully`);
      }
    } else {
      logger.debug('No stale meetings found to clean up');
    }

    // 2. Archive transcripts older than 90 days (Simulate archive to keep collections small)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    // In production we can move these to a separate collection, for now we log it.
    const oldMeetingsCount = await Meeting.countDocuments({
      createdAt: { $lt: ninetyDaysAgo }
    });
    
    if (oldMeetingsCount > 0) {
      logger.info(`Identified ${oldMeetingsCount} meeting sessions older than 90 days for indexing optimization`);
    }

  } catch (error) {
    logger.error('Error during meeting cleanup cron processing', error);
  }
};
