import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
