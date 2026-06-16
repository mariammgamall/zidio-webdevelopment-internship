import Meeting from '../models/Meeting.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { sendRealtimeNotification } from './notificationService.js';
import logger from '../utils/logger.js';

const callOpenAI = async (messages) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3
    })
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
};

const callHuggingFace = async (transcriptText) => {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${process.env.HF_SUMMARY_MODEL || 'facebook/bart-large-cnn'}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: transcriptText.substring(0, 1024),
        parameters: { max_length: 200, min_length: 30 }
      })
    }
  );
  if (!response.ok) throw new Error(`HuggingFace API error: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data[0]?.summary_text || '' : data.summary_text || '';
};

const parseActionItems = (aiResponse, meeting) => {
  const actionItems = [];
  const lines = aiResponse.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    const match = line.match(/^[-*]?\s*(.+?)(?:\s*[-–—]\s*(.+))?$/);
    if (!match) continue;
    const title = match[1].replace(/^(action item|task):\s*/i, '').trim();
    const assigneeHint = (match[2] || '').toLowerCase();

    let assigneeId = meeting.host;
    let guessedOwnerName = 'Host';

    for (const p of meeting.participants) {
      if (assigneeHint.includes(p.name.toLowerCase())) {
        assigneeId = p._id;
        guessedOwnerName = p.name;
        break;
      }
    }

    if (title.length > 5) {
      actionItems.push({
        title: title.startsWith('Action Item') ? title : `Action Item: ${title}`,
        description: `AI-extracted from meeting "${meeting.title}"`,
        assigneeId,
        guessedOwnerName
      });
    }
  }
  return actionItems;
};

const localFallbackSummary = (meeting) => {
  const transcriptsCount = meeting.transcripts.length;
  if (transcriptsCount === 0) {
    return {
      summary: `AI Summary: meeting "${meeting.title}" completed. No dialogue recorded.`,
      actionItems: []
    };
  }

  const allText = meeting.transcripts.map((t) => t.text).join(' ');
  const agendaKeywords = [];
  if (allText.toLowerCase().includes('react')) agendaKeywords.push('React architecture');
  if (allText.toLowerCase().includes('webrtc')) agendaKeywords.push('WebRTC signaling');
  if (allText.toLowerCase().includes('security')) agendaKeywords.push('security parameters');
  if (allText.toLowerCase().includes('deploy')) agendaKeywords.push('deployment strategy');

  let summary = `The team discussed ${agendaKeywords.length > 0 ? agendaKeywords.join(', ') : 'project timelines and deliverables'}. `;
  summary += 'Key alignment was reached on priorities and next steps.';

  const actionItems = [];
  meeting.transcripts.forEach((line) => {
    const text = line.text.toLowerCase();
    if (text.includes('will ') || text.includes('need to ') || text.includes('should ')) {
      actionItems.push({
        title: `Action Item: ${line.text.substring(0, 80)}`,
        description: `Auto-generated from transcript spoken by ${line.speakerName}`,
        assigneeId: line.speakerId || meeting.host,
        guessedOwnerName: line.speakerName
      });
    }
  });

  return { summary, actionItems };
};

// @desc    Asynchronously process transcripts, generate summaries, and assign action items
export const processMeetingAI = async (meetingId) => {
  try {
    const meeting = await Meeting.findById(meetingId).populate('participants');
    if (!meeting) {
      logger.error(`AI Processor: Meeting ${meetingId} not found`);
      return { success: false, error: 'Meeting not found' };
    }

    logger.info(`AI Processor: Compiling summary for meeting "${meeting.title}"`);

    let summary = '';
    let actionItems = [];
    const transcriptText = meeting.transcripts.map((t) => `${t.speakerName}: ${t.text}`).join('\n');

    if (process.env.OPENAI_API_KEY && transcriptText) {
      try {
        const aiResponse = await callOpenAI([
          {
            role: 'system',
            content: 'You are an enterprise meeting assistant. Summarize the meeting concisely in 2-3 sentences. Then list action items, one per line, prefixed with "- " and include assignee name when mentioned.'
          },
          { role: 'user', content: `Meeting: "${meeting.title}"\n\nTranscript:\n${transcriptText}` }
        ]);

        const parts = aiResponse.split(/\n(?=-\s)/);
        summary = parts[0].trim();
        actionItems = parseActionItems(parts.slice(1).join('\n') || aiResponse, meeting);
      } catch (err) {
        logger.warn('OpenAI processing failed, trying fallback', err);
        const fallback = localFallbackSummary(meeting);
        summary = fallback.summary;
        actionItems = fallback.actionItems;
      }
    } else if (process.env.HF_API_KEY && transcriptText) {
      try {
        summary = await callHuggingFace(transcriptText);
        const fallback = localFallbackSummary(meeting);
        actionItems = fallback.actionItems;
      } catch (err) {
        logger.warn('HuggingFace processing failed, using local fallback', err);
        const fallback = localFallbackSummary(meeting);
        summary = fallback.summary;
        actionItems = fallback.actionItems;
      }
    } else {
      const fallback = localFallbackSummary(meeting);
      summary = fallback.summary;
      actionItems = fallback.actionItems;
    }

    if (actionItems.length === 0 && meeting.participants.length > 0) {
      actionItems.push({
        title: `Action Item: Post-meeting review for ${meeting.title}`,
        description: 'Verify meeting notes and finalize next step assignments.',
        assigneeId: meeting.host,
        guessedOwnerName: 'Host'
      });
    }

    const savedTaskIds = [];
    for (const item of actionItems) {
      const task = await Task.create({
        title: item.title,
        description: item.description,
        status: 'todo',
        assignees: [item.assigneeId],
        meetingId: meeting._id,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      });
      savedTaskIds.push(task._id);

      const notification = await Notification.create({
        userId: item.assigneeId,
        type: 'action_item_assigned',
        message: `AI assigned you an action item from meeting "${meeting.title}": "${item.title}"`,
        metadata: { taskId: task._id, meetingId: meeting._id }
      });
      sendRealtimeNotification(item.assigneeId, notification);
    }

    meeting.summary = summary;
    meeting.tasks = savedTaskIds;
    await meeting.save();

    for (const participant of meeting.participants) {
      const notification = await Notification.create({
        userId: participant._id,
        type: 'meeting_summary_ready',
        message: `AI Summary and Action items are now ready for "${meeting.title}"`,
        metadata: { meetingId: meeting._id }
      });
      sendRealtimeNotification(participant._id, notification);
    }

    logger.info(`AI Processor: Finished meeting ${meeting._id}. Created ${savedTaskIds.length} action items.`);
    return { success: true, summary, taskCount: savedTaskIds.length };
  } catch (error) {
    logger.error('Error during AI meeting processing', error);
    return { success: false, error: error.message };
  }
};
