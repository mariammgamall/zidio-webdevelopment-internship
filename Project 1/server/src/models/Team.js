import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a team name'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

const Team = mongoose.model('Team', teamSchema);
export default Team;
