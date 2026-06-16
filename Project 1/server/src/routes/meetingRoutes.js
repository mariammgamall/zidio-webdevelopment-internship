import express from 'express';
import { createMeeting, getMeetings, getMeeting, endMeeting, saveMeetingTranscripts, uploadMeetingRecording, exportMeeting } from '../controllers/meetingController.js';
import { protect } from '../middleware/auth.js';
import { uploadRecording } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createMeeting)
  .get(getMeetings);

router.route('/:idOrRoomId')
  .get(getMeeting);

router.route('/:id/transcripts')
  .post(saveMeetingTranscripts);

router.route('/:id/recording')
  .post(uploadRecording.single('recording'), uploadMeetingRecording);

router.route('/:id/export')
  .get(exportMeeting);

router.route('/:id/end')
  .post(endMeeting);

export default router;
