import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Meeting from '../models/Meeting.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables if not already loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Meeting.deleteMany({});
    await Task.deleteMany({});
    await Team.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    logger.info('Cleared existing collections');

    // Create users
    // Password will be hashed automatically by User model save pre-hook
    const demoUser = new User({
      name: 'Mariam Gamal',
      email: 'mariam@intellmeet.app',
      password: 'Mariam@1234',
      role: 'Admin',
      avatar: 'http://localhost:5000/uploads/mariam_avatar.jpg',
      isActive: true
    });
    await demoUser.save();

    const colleague = new User({
      name: 'Sarah Chen (Lead Eng)',
      email: 'sarah.chen@intellmeet.app',
      password: 'Colleague@1234',
      role: 'Member',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
      isActive: true
    });
    await colleague.save();

    logger.info('Created users: demo@intellmeet.app and sarah.chen@intellmeet.app');

    // Create Team
    const team = new Team({
      name: 'Web Development v2.0',
      description: 'Zidio Development core web development domain workspace',
      members: [demoUser._id, colleague._id]
    });
    await team.save();
    logger.info('Created team workspace');

    // Create 3 past meetings
    const dateToday = new Date();
    
    // Meeting 1: Roadmap discussion (10 days ago)
    const meeting1 = new Meeting({
      roomId: 'meeting-101',
      title: 'Project Kickoff: IntellMeet v2.0 Roadmap',
      status: 'ended',
      host: demoUser._id,
      participants: [demoUser._id, colleague._id],
      summary: 'Reviewed design concepts for React 19 architecture, Tailwind CSS v4 setup, and Socket.io signaling layout. Established a hard target for sub-200ms streaming latency and mapped the core analytics endpoints.',
      recordingUrl: 'https://res.cloudinary.com/demo/video/upload/v1617134015/sample_video.mp4',
      scheduledAt: new Date(dateToday.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      endedAt: new Date(dateToday.getTime() - 10 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 45m later
      transcripts: [
        { speakerName: demoUser.name, speakerId: demoUser._id, text: 'Hello everyone, welcome to the kickoff for IntellMeet version 2.0. Today we are aligning our roadmap.', timestamp: new Date(dateToday.getTime() - 10 * 24 * 60 * 60 * 1000) },
        { speakerName: colleague.name, speakerId: colleague._id, text: 'Hi! I am excited about shifting to React 19. The direct server actions and assets loader improvements will simplify our real-time rendering layers.', timestamp: new Date(dateToday.getTime() - 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000) },
        { speakerName: demoUser.name, speakerId: demoUser._id, text: 'Absolutely. We also need to keep latency under 200ms. I will configure the standard WebRTC signaling paths via Socket.io.', timestamp: new Date(dateToday.getTime() - 10 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000) }
      ]
    });
    await meeting1.save();

    // Meeting 2: Sockets & WebRTC sync (5 days ago)
    const meeting2 = new Meeting({
      roomId: 'meeting-102',
      title: 'Weekly Sync: WebRTC Latency & Sockets',
      status: 'ended',
      host: colleague._id,
      participants: [demoUser._id, colleague._id],
      summary: 'Evaluated mesh peer connection limits. Addressed Socket.io clustering fallback strategies using Redis adapter. Created plan to support 50+ participants via video active-speaker switching.',
      recordingUrl: 'https://res.cloudinary.com/demo/video/upload/v1617134015/sample_video.mp4',
      scheduledAt: new Date(dateToday.getTime() - 5 * 24 * 60 * 60 * 1000),
      endedAt: new Date(dateToday.getTime() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      transcripts: [
        { speakerName: colleague.name, speakerId: colleague._id, text: 'We ran socket scale testing. The clustering adapter behaves well with Redis.', timestamp: new Date(dateToday.getTime() - 5 * 24 * 60 * 60 * 1000) },
        { speakerName: demoUser.name, speakerId: demoUser._id, text: 'Excellent. Make sure we build in a safe fallback in the connection configuration in case Redis is down in local test builds.', timestamp: new Date(dateToday.getTime() - 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000) }
      ]
    });
    await meeting2.save();

    // Meeting 3: Security & Observability (2 days ago)
    const meeting3 = new Meeting({
      roomId: 'meeting-103',
      title: 'Security Review & OWASP Audit Check',
      status: 'ended',
      host: demoUser._id,
      participants: [demoUser._id, colleague._id],
      summary: 'Configured secure Express headers using helmet.js, setup request validation using express-validator, and finalized CORS white-listing. Integrated Sentry error monitoring on client/server.',
      recordingUrl: '',
      scheduledAt: new Date(dateToday.getTime() - 2 * 24 * 60 * 60 * 1000),
      endedAt: new Date(dateToday.getTime() - 2 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000),
      transcripts: [
        { speakerName: demoUser.name, speakerId: demoUser._id, text: 'Let us make sure no API secrets are committed. We are tracking everything in .env.', timestamp: new Date(dateToday.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { speakerName: colleague.name, speakerId: colleague._id, text: 'Yes, and Sentry reports are capture-tested. Rate limiting is active on `/api/auth/` routes.', timestamp: new Date(dateToday.getTime() - 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000) }
      ]
    });
    await meeting3.save();

    logger.info('Created 3 sample past meetings');

    // Create chat messages for meeting 1
    await Message.create([
      { meetingId: meeting1._id, sender: demoUser._id, senderName: demoUser.name, text: 'Welcome team!' },
      { meetingId: meeting1._id, sender: colleague._id, senderName: colleague.name, text: 'Ready to write code!' }
    ]);
    // Chat messages for meeting 2
    await Message.create([
      { meetingId: meeting2._id, sender: colleague._id, senderName: colleague.name, text: 'Connecting signaling...' },
      { meetingId: meeting2._id, sender: demoUser._id, senderName: demoUser.name, text: 'Tested locally, sub-100ms latency observed!' }
    ]);

    logger.info('Seeded in-meeting chat logs');

    // Create Tasks (Kanban board)
    const tasks = [
      {
        title: 'Configure Prometheus metrics exporter',
        description: 'Set up prom-client to track connection rates and HTTP timings on /metrics route.',
        status: 'done',
        assignees: [demoUser._id],
        teamId: team._id,
        meetingId: meeting1._id,
        deadline: new Date(dateToday.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Integrate Sentry SDK frontend & backend',
        description: 'Verify error captures on unhandled rejections and client-side exceptions.',
        status: 'in_progress',
        assignees: [colleague._id],
        teamId: team._id,
        meetingId: meeting3._id,
        deadline: new Date(dateToday.getTime() + 1 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Set up JMeter load tests configuration',
        description: 'Prepare JMeter test plans to simulate meeting traffic and concurrent requests up to 5,000 active users.',
        status: 'todo',
        assignees: [demoUser._id, colleague._id],
        teamId: team._id,
        meetingId: meeting2._id,
        deadline: new Date(dateToday.getTime() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Run OWASP ZAP API vulnerability scans',
        description: 'Inspect endpoints for NoSQL injection vectors and missing authentication checks.',
        status: 'todo',
        assignees: [demoUser._id],
        teamId: team._id,
        meetingId: meeting3._id,
        deadline: new Date(dateToday.getTime() + 10 * 24 * 60 * 60 * 1000)
      }
    ];

    const seededTasks = await Task.insertMany(tasks);
    
    // Update meeting tasks refs
    meeting1.tasks.push(seededTasks[0]._id);
    await meeting1.save();
    meeting2.tasks.push(seededTasks[2]._id);
    await meeting2.save();
    meeting3.tasks.push(seededTasks[1]._id, seededTasks[3]._id);
    await meeting3.save();

    logger.info('Created Kanban board and task assignments');

    // Create notifications
    await Notification.create([
      {
        userId: demoUser._id,
        type: 'meeting_invite',
        message: 'Sarah Chen invited you to the "Weekly Sync: WebRTC Latency & Sockets" call.',
        read: true,
        metadata: { meetingId: meeting2._id, senderId: colleague._id }
      },
      {
        userId: demoUser._id,
        type: 'action_item_assigned',
        message: 'New action item assigned: "Set up JMeter load tests configuration".',
        read: false,
        metadata: { meetingId: meeting2._id, taskId: seededTasks[2]._id }
      },
      {
        userId: demoUser._id,
        type: 'meeting_summary_ready',
        message: 'AI summary is now ready for "Security Review & OWASP Audit Check".',
        read: false,
        metadata: { meetingId: meeting3._id }
      }
    ]);
    logger.info('Created sample notifications');

    logger.info('Seeding finished successfully');
  } catch (error) {
    logger.error('Error during seeding', error);
    throw error;
  }
};
