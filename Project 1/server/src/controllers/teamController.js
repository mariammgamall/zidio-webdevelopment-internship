import Team from '../models/Team.js';
import User from '../models/User.js';

// @desc    Create a team workspace
// @route   POST /api/teams
// @access  Private
export const createTeam = async (req, res, next) => {
  try {
    const { name, description, members } = req.body;

    const teamExists = await Team.findOne({ name });
    if (teamExists) {
      return res.status(400).json({
        success: false,
        message: 'A team workspace with this name already exists'
      });
    }

    const teamMembers = [req.user.id];
    if (members && Array.isArray(members)) {
      for (const email of members) {
        const user = await User.findOne({ email });
        if (user && !teamMembers.includes(user._id)) {
          teamMembers.push(user._id);
        }
      }
    }

    const team = await Team.create({
      name,
      description: description || '',
      members: teamMembers
    });

    res.status(201).json({
      success: true,
      team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user teams
// @route   GET /api/teams
// @access  Private
export const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({ members: req.user.id })
      .populate('members', 'name email avatar role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      teams
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Invite member to team
// @route   POST /api/teams/:id/invite
// @access  Private
export const inviteMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team workspace not found'
      });
    }

    // Check if user is a member of team
    if (!team.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace members can invite others'
      });
    }

    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return res.status(404).json({
        success: false,
        message: `No user found with email ${email}`
      });
    }

    if (team.members.includes(userToInvite._id)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this workspace'
      });
    }

    team.members.push(userToInvite._id);
    await team.save();

    res.json({
      success: true,
      message: `User ${userToInvite.name} successfully added to team`
    });
  } catch (error) {
    next(error);
  }
};
