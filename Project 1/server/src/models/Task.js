import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a task title'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo'
  },
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  deadline: {
    type: Date
  }
}, {
  timestamps: true
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
