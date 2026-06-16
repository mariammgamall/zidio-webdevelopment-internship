import Meeting from '../models/Meeting.js';
import { getAiQueue } from '../jobs/aiProcessingQueue.js';
import { uploadRecording } from '../services/storageService.js';
import logger from '../utils/logger.js';

// @desc    Create a meeting
// @route   POST /api/meetings
// @access  Private
export const createMeeting = async (req, res, next) => {
  try {
    const { title, scheduledAt } = req.body;

    // Generate random 9 character room ID (like abc-def-ghi)
    const charList = 'abcdefghijklmnopqrstuvwxyz';
    const randPart = () => Array.from({ length: 3 }, () => charList[Math.floor(Math.random() * charList.length)]).join('');
    const roomId = `${randPart()}-${randPart()}-${randPart()}`;

    const meeting = await Meeting.create({
      roomId,
      title: title || 'Instant Meeting',
      host: req.user.id,
      participants: [req.user.id],
      scheduledAt: scheduledAt || new Date(),
      status: scheduledAt ? 'scheduled' : 'active'
    });

    res.status(201).json({
      success: true,
      meeting
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all meetings of user
// @route   GET /api/meetings
// @access  Private
export const getMeetings = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = {
      $or: [
        { host: req.user.id },
        { participants: req.user.id }
      ]
    };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$and = [{ $or: [{ title: regex }, { roomId: regex }, { summary: regex }] }];
    }

    const meetings = await Meeting.find(filter)
      .populate('host', 'name email avatar')
      .populate('tasks')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      meetings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single meeting by roomId or ObjectId
// @route   GET /api/meetings/:idOrRoomId
// @access  Private
export const getMeeting = async (req, res, next) => {
  try {
    const param = req.params.idOrRoomId;
    let meeting;

    // Check if it is a valid ObjectId
    if (param.match(/^[0-9a-fA-F]{24}$/)) {
      meeting = await Meeting.findById(param)
        .populate('host', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('tasks');
    } else {
      meeting = await Meeting.findOne({ roomId: param })
        .populate('host', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('tasks');
    }

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End a meeting & queue AI processing
// @route   POST /api/meetings/:id/end
// @access  Private
export const endMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if host
    if (meeting.host.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the meeting host can end the meeting'
      });
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    await meeting.save();

    logger.info(`Meeting ${meeting._id} marked as ended. Triggering AI transcription worker queue`);

    // Queue the AI job
    const aiQueue = getAiQueue();
    if (aiQueue) {
      await aiQueue.add('processAI', { meetingId: meeting._id }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });
      logger.info(`Successfully added AI job for meeting ${meeting._id} to Bull Queue`);
    } else {
      logger.warn(`Redis AI processing queue not active. Processing synchronously...`);
      // Failover sync logic for environments without Redis
      import('../services/aiService.js').then(async (aiServiceModule) => {
        try {
          await aiServiceModule.processMeetingAI(meeting._id);
        } catch (syncError) {
          logger.error(`Synchronous fallback AI processing failed for ${meeting._id}`, syncError);
        }
      });
    }

    res.json({
      success: true,
      message: 'Meeting ended and queued for AI intelligence processing',
      meeting
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save transcripts for a meeting
// @route   POST /api/meetings/:id/transcripts
// @access  Private
export const saveMeetingTranscripts = async (req, res, next) => {
  try {
    const { transcripts } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    meeting.transcripts = transcripts;
    await meeting.save();

    res.json({
      success: true,
      message: 'Transcripts saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload meeting recording
// @route   POST /api/meetings/:id/recording
// @access  Private
export const uploadMeetingRecording = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Recording file is required' });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const recordingUrl = await uploadRecording(req.file);
    meeting.recordingUrl = recordingUrl;
    await meeting.save();

    res.json({ success: true, recordingUrl });
  } catch (error) {
    next(error);
  }
};

// @desc    Export meeting details as CSV
// @route   GET /api/meetings/:id/export
// @access  Private
export const exportMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email')
      .populate('tasks');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const rows = [
      ['Field', 'Value'],
      ['Title', meeting.title],
      ['Room ID', meeting.roomId],
      ['Status', meeting.status],
      ['Host', meeting.host?.name || ''],
      ['Summary', (meeting.summary || '').replace(/"/g, '""')],
      ['Recording URL', meeting.recordingUrl || ''],
      [''],
      ['Transcripts'],
      ['Speaker', 'Text', 'Timestamp']
    ];

    meeting.transcripts.forEach((t) => {
      rows.push([t.speakerName, t.text.replace(/"/g, '""'), new Date(t.timestamp).toISOString()]);
    });

    rows.push([''], ['Action Items'], ['Title', 'Status']);
    (meeting.tasks || []).forEach((task) => {
      rows.push([task.title, task.status]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${cell || ''}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="meeting-${meeting.roomId}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
