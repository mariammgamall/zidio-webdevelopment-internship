import logger from '../utils/logger.js';
import Message from '../models/Message.js';
import Meeting from '../models/Meeting.js';
import { activeMeetingsGauge } from '../utils/metrics.js';

const activeRooms = new Set();

export const handleSocketConnections = (io) => {
  io.on('connection', (socket) => {
    logger.debug(`Socket connection established: ${socket.id}`);

    // Join personal user room for direct notification delivery
    socket.on('join-user-room', (userId) => {
      socket.join(`user_${userId}`);
      logger.debug(`Socket ${socket.id} registered to notification room: user_${userId}`);
    });

    // Join active meeting room
    socket.on('join-meeting', async ({ roomId, userId, name }) => {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.userName = name;
      logger.info(`User ${name} joined meeting room [${roomId}]`);

      let hostId = null;
      let hostName = 'Host';

      try {
        const meeting = await Meeting.findOne({ roomId }).populate('host', 'name');
        if (meeting?.host) {
          hostId = meeting.host._id?.toString() || meeting.host.toString();
          hostName = meeting.host.name || 'Host';
        }

        await Meeting.findOneAndUpdate(
          { roomId },
          { $addToSet: { participants: userId } }
        );
      } catch (err) {
        logger.error(`Error updating meeting participant list for room ${roomId}`, err);
      }

      const socketsInRoom = await io.in(roomId).fetchSockets();
      const existingParticipants = socketsInRoom
        .filter((s) => s.id !== socket.id && s.userId)
        .map((s) => ({
          userId: s.userId,
          name: s.userName,
          socketId: s.id
        }));

      socket.emit('room-state', {
        participants: existingParticipants,
        hostId,
        hostName
      });

      // Notify other participants in the room
      socket.to(roomId).emit('user-joined', {
        userId,
        name,
        socketId: socket.id
      });

      activeRooms.add(roomId);
      activeMeetingsGauge.set(activeRooms.size);
    });

    // WebRTC Signaling relay (offers, answers, ICE candidates)
    socket.on('signal', ({ to, signal }) => {
      io.to(to).emit('signal', {
        from: socket.id,
        userId: socket.userId,
        userName: socket.userName,
        signal
      });
    });

    // In-meeting Chat messages
    socket.on('chat-message', async ({ meetingId, text }) => {
      try {
        if (!socket.userId || !socket.userName) {
          logger.error('Socket chat message received from unauthenticated socket');
          return;
        }

        const msg = await Message.create({
          meetingId,
          sender: socket.userId,
          senderName: socket.userName,
          text
        });

        // Broadcast chat message to everyone in the room
        io.to(socket.roomId).emit('chat-message', msg);
      } catch (error) {
        logger.error('Failed to save or broadcast socket message', error);
      }
    });

    // Typing Indicators
    socket.on('typing', () => {
      if (socket.roomId && socket.userId) {
        socket.to(socket.roomId).emit('typing', {
          userId: socket.userId,
          name: socket.userName
        });
      }
    });

    socket.on('stop-typing', () => {
      if (socket.roomId && socket.userId) {
        socket.to(socket.roomId).emit('stop-typing', {
          userId: socket.userId
        });
      }
    });

    // Shared Collaborative Notes sync
    socket.on('update-notes', ({ notes }) => {
      if (socket.roomId) {
        socket.to(socket.roomId).emit('notes-updated', {
          notes,
          editorName: socket.userName
        });
      }
    });

    // In-meeting task creation broadcast
    socket.on('meeting-task-created', ({ roomId, task }) => {
      if (roomId) {
        socket.to(roomId).emit('task-created', task);
      }
    });

    // End meeting broadcast
    socket.on('end-meeting', ({ roomId }) => {
      if (roomId) {
        socket.to(roomId).emit('meeting-ended');
      }
    });

    // Real-time Kanban board sync
    socket.on('join-board-room', (teamId) => {
      const room = teamId ? `board_${teamId}` : 'board_global';
      socket.join(room);
      socket.boardRoom = room;
    });

    socket.on('board-task-update', ({ teamId, task }) => {
      const room = teamId ? `board_${teamId}` : 'board_global';
      socket.to(room).emit('board-updated', task);
    });

    socket.on('board-task-created', ({ teamId, task }) => {
      const room = teamId ? `board_${teamId}` : 'board_global';
      socket.to(room).emit('board-task-added', task);
    });

    // Disconnect event handler
    socket.on('disconnect', async () => {
      logger.debug(`Socket connection ended: ${socket.id}`);
      if (socket.roomId) {
        socket.to(socket.roomId).emit('user-left', {
          userId: socket.userId,
          name: socket.userName,
          socketId: socket.id
        });

        const remaining = await io.in(socket.roomId).fetchSockets();
        if (remaining.length === 0) {
          activeRooms.delete(socket.roomId);
          activeMeetingsGauge.set(activeRooms.size);
        }
      }
    });
  });
};
