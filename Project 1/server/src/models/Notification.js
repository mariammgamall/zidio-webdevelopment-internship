import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'meeting_invite',
      'action_item_assigned',
      'mention',
      'meeting_summary_ready',
      'task_status_changed'
    ],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting'
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
