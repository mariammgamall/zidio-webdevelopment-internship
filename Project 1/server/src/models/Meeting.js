import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema({
  speakerName: {
    type: String,
    required: true
  },
  speakerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const meetingSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Please add a meeting title'],
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended'],
    default: 'scheduled'
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  summary: {
    type: String,
    default: ''
  },
  transcripts: [transcriptSchema],
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  recordingUrl: {
    type: String,
    default: ''
  },
  scheduledAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
