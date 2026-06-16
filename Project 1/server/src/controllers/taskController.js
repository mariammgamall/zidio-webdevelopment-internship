import Task from '../models/Task.js';
import Meeting from '../models/Meeting.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';
import { sendRealtimeNotification, getIoInstance } from '../services/notificationService.js';
import logger from '../utils/logger.js';

const emitBoardEvent = (event, teamId, payload) => {
  const io = getIoInstance();
  if (io) {
    const room = teamId ? `board_${teamId}` : 'board_global';
    io.to(room).emit(event, payload);
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res, next) => {
  try {
    const { title, description, status, assignees, meetingId, teamId, deadline } = req.body;

    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      assignees: assignees || [],
      meetingId: meetingId || null,
      teamId: teamId || null,
      deadline: deadline || null
    });

    // If meetingId exists, add task reference to meeting
    if (meetingId) {
      await Meeting.findByIdAndUpdate(meetingId, {
        $push: { tasks: task._id }
      });
    }

    // Trigger notification for each assignee
    if (assignees && assignees.length > 0) {
      for (const userId of assignees) {
        if (userId.toString() !== req.user.id) {
          const notification = await Notification.create({
            userId,
            type: 'action_item_assigned',
            message: `You have been assigned a new task: "${title}"`,
            metadata: { taskId: task._id, meetingId: meetingId || null, senderId: req.user.id }
          });
          sendRealtimeNotification(userId, notification);
        }
      }
    }

    res.status(201).json({
      success: true,
      task
    });

    emitBoardEvent('board-task-added', teamId || null, task);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res, next) => {
  try {
    const { teamId, meetingId } = req.query;
    const filter = {};

    if (teamId) {
      const team = await Team.findOne({ _id: teamId, members: req.user.id });
      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a member of this team.'
        });
      }
      filter.teamId = teamId;
    } else if (!meetingId) {
      const teams = await Team.find({ members: req.user.id });
      const teamIds = teams.map(t => t._id);
      filter.$or = [
        { teamId: { $in: teamIds } },
        { assignees: req.user.id }
      ];
    }

    if (meetingId) filter.meetingId = meetingId;

    const tasks = await Task.find(filter)
      .populate('assignees', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get board tasks (grouped by status)
// @route   GET /api/tasks/board
// @access  Private
export const getBoardTasks = async (req, res, next) => {
  try {
    const { teamId } = req.query;
    const filter = {};

    if (teamId) {
      const team = await Team.findOne({ _id: teamId, members: req.user.id });
      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a member of this team.'
        });
      }
      filter.teamId = teamId;
    } else {
      const teams = await Team.find({ members: req.user.id });
      const teamIds = teams.map(t => t._id);
      filter.$or = [
        { teamId: { $in: teamIds } },
        { assignees: req.user.id }
      ];
    }

    const tasks = await Task.find(filter).populate('assignees', 'name email avatar');

    // Group by status
    const board = {
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      done: tasks.filter((t) => t.status === 'done')
    };

    res.json({
      success: true,
      board
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, assignees, deadline } = req.body;

    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const originalStatus = task.status;

    task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, status, assignees, deadline },
      { new: true }
    ).populate('assignees', 'name email avatar');

    // If status changed, notify assignees (except the person updating it)
    if (status && originalStatus !== status && task.assignees) {
      for (const user of task.assignees) {
        if (user._id.toString() !== req.user.id) {
          const notification = await Notification.create({
            userId: user._id,
            type: 'task_status_changed',
            message: `Task status updated: "${task.title}" is now "${status}"`,
            metadata: { taskId: task._id, senderId: req.user.id }
          });
          sendRealtimeNotification(user._id, notification);
        }
      }
    }

    res.json({
      success: true,
      task
    });

    emitBoardEvent('board-updated', task.teamId || null, task);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Remove from meeting task array if referencing a meeting
    if (task.meetingId) {
      await Meeting.findByIdAndUpdate(task.meetingId, {
        $pull: { tasks: task._id }
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
