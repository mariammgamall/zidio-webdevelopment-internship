import Meeting from '../models/Meeting.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import logger from '../utils/logger.js';

// Helper to generate heatmap defaults (7 days x 24 hours)
const generateHeatmapDefaults = () => {
  const map = [];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  days.forEach((day, dayIndex) => {
    for (let hour = 0; hour < 24; hour += 2) { // 2-hour slots for chart readability
      map.push({
        day,
        dayIndex,
        hour: `${hour}:00`,
        count: 0
      });
    }
  });
  return map;
};

// @desc    Get team and personal analytics metrics
// @route   GET /api/analytics
// @access  Private
export const getAnalytics = async (req, res, next) => {
  try {
    const { teamId } = req.query;

    // 1. Meeting Frequencies (Daily, Weekly, Monthly)
    const meetings = await Meeting.find({
      $or: [{ host: req.user.id }, { participants: req.user.id }]
    });

    const frequency = {
      daily: 0,
      weekly: 0,
      monthly: 0
    };

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    meetings.forEach((m) => {
      const diff = now.getTime() - new Date(m.scheduledAt).getTime();
      if (diff <= oneDay) frequency.daily += 1;
      if (diff <= oneWeek) frequency.weekly += 1;
      if (diff <= oneMonth) frequency.monthly += 1;
    });

    // 2. Average duration per team
    // For demo purposes, we aggregate ended meetings durations
    let totalDurationMinutes = 0;
    let endedCount = 0;
    meetings.forEach((m) => {
      if (m.status === 'ended' && m.endedAt) {
        const dur = (new Date(m.endedAt).getTime() - new Date(m.scheduledAt).getTime()) / (60 * 1000);
        if (dur > 0) {
          totalDurationMinutes += dur;
          endedCount += 1;
        }
      }
    });
    const avgDuration = endedCount > 0 ? Math.round(totalDurationMinutes / endedCount) : 0; // default 0m

    // 3. Engagement Rate
    // (ratio of active speakers in transcript to total participants)
    let totalSpeakers = 0;
    let totalParticipantsCount = 0;
    meetings.forEach((m) => {
      if (m.status === 'ended') {
        const uniqueSpeakers = new Set(m.transcripts.map((t) => t.speakerName));
        totalSpeakers += uniqueSpeakers.size;
        totalParticipantsCount += Math.max(m.participants.length, uniqueSpeakers.size, 1);
      }
    });
    const engagementRate = totalParticipantsCount > 0 
      ? Math.round((totalSpeakers / totalParticipantsCount) * 100) 
      : 0; // default 0% for display

    // 4. Action Item Completion Rate
    // (Tasks marked done vs total tasks)
    const filter = {};
    if (teamId) filter.teamId = teamId;
    else {
      // Find teams user belongs to
      const teams = await Team.find({ members: req.user.id });
      filter.teamId = { $in: teams.map(t => t._id) };
    }

    const tasks = await Task.find(filter);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0; // default 0%

    // 5. Active Hours Heatmap
    const heatmap = generateHeatmapDefaults();
    meetings.forEach((m) => {
      const date = new Date(m.scheduledAt);
      const dayIndex = date.getDay();
      const hour = date.getHours();
      
      const slot = heatmap.find(h => h.dayIndex === dayIndex && Math.abs(parseInt(h.hour) - hour) <= 1);
      if (slot) slot.count += 1;
    });

    res.json({
      success: true,
      metrics: {
        frequency,
        avgDuration,
        engagementRate,
        completionRate,
        taskOverview: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          todo: tasks.filter(t => t.status === 'todo').length
        },
        heatmap
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export team metrics as CSV file
// @route   GET /api/analytics/export
// @access  Private
export const exportCSV = async (req, res, next) => {
  try {
    const meetings = await Meeting.find({
      $or: [{ host: req.user.id }, { participants: req.user.id }]
    }).populate('host', 'name email');

    // Compile into CSV string
    let csv = 'Room ID,Title,Status,Host Name,Host Email,Scheduled At,Ended At,Participants Count,Transcripts Count,Tasks Count\n';
    
    meetings.forEach((m) => {
      const scheduled = m.scheduledAt ? new Date(m.scheduledAt).toISOString() : '';
      const ended = m.endedAt ? new Date(m.endedAt).toISOString() : '';
      
      // Escape title and host name for CSV safety
      const title = `"${m.title.replace(/"/g, '""')}"`;
      const hostName = `"${(m.host?.name || 'Unknown').replace(/"/g, '""')}"`;
      
      csv += `${m.roomId},${title},${m.status},${hostName},${m.host?.email || ''},${scheduled},${ended},${m.participants.length},${m.transcripts.length},${m.tasks.length}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=intellmeet_analytics_export.csv');
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
