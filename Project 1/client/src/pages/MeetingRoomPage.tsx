import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  getLocalUserMedia,
  destroyPeerConnections,
  startScreenShare,
  stopScreenShare,
  getScreenVideoTrack,
  createOfferToPeer,
  handleIncomingSignal,
  closePeer
} from '../lib/webrtc';
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Send, MessageSquare,
  Clipboard, Sparkles, Circle, Square, Plus, CheckSquare
} from 'lucide-react';

const RemoteVideo: React.FC<{ stream: MediaStream | null; name: string }> = ({ stream, name }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  if (stream) {
    return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover rounded-2xl" />;
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
      <div className="w-16 h-16 rounded-full bg-indigo-950/50 flex items-center justify-center text-xl font-bold border border-indigo-500/25">
        {name.charAt(0)}
      </div>
      <span className="text-xs text-slate-400 font-medium">{name}</span>
    </div>
  );
};

const MeetingRoomPage: React.FC = () => {
  const { user, accessToken } = useAuthStore();
  const {
    roomId, activeMeetingId, hostId, hostName, isMuted, isVideoOff, isScreenSharing,
    participants, activeSpeakerId, toggleMute, toggleVideo, setScreenSharing,
    localStream, setLocalStream, addParticipant, removeParticipant, updateParticipantMedia,
    setActiveSpeaker, resetMeeting, setActiveMeetingId, setHostInfo
  } = useMeetingStore();

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [notes, setNotes] = useState('');
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [meetingTasks, setMeetingTasks] = useState<any[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socket = getSocket();

  const onRemoteStream = useCallback((socketId: string) => (stream: MediaStream) => {
    updateParticipantMedia(socketId, { stream });
  }, [updateParticipantMedia]);

  const connectToPeer = useCallback((socketId: string, stream: MediaStream) => {
    createOfferToPeer(socketId, stream, onRemoteStream(socketId));
  }, [onRemoteStream]);

  // Initialize local media, sockets, WebRTC, and speech recognition
  useEffect(() => {
    if (!roomId || !user) return;

    const setupCall = async () => {
      try {
        const response = await fetch(`${API_URL}/meetings/${roomId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          alert('Meeting room not found or access unauthorized.');
          resetMeeting();
          return;
        }
        const data = await response.json();
        if (!data.success || !data.meeting) {
          alert('Failed to load meeting room details.');
          resetMeeting();
          return;
        }
        if (data.meeting.status === 'ended') {
          alert('This meeting has already ended.');
          resetMeeting();
          return;
        }
        setActiveMeetingId(data.meeting._id);
        const meetingHostId = data.meeting.host?._id || data.meeting.host;
        const meetingHostName = data.meeting.host?.name || 'Host';
        if (meetingHostId) {
          setHostInfo(meetingHostId.toString(), meetingHostName);
          setActiveSpeaker(meetingHostId.toString());
        }
        if (data.meeting.tasks?.length) {
          setMeetingTasks(data.meeting.tasks);
        }
      } catch {
        alert('An error occurred while connecting to the meeting room.');
        resetMeeting();
        return;
      }

      const stream = await getLocalUserMedia(true, true);
      streamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Web Speech API for live transcription
      const SpeechRecognitionAPI = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
        || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const last = event.results[event.results.length - 1];
          if (last.isFinal) {
            const text = last[0].transcript.trim();
            if (text) {
              setTranscripts((prev) => [
                ...prev,
                { speakerName: user.name, speakerId: user.id, text, timestamp: new Date() }
              ]);
            }
          }
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      socket.emit('join-meeting', { roomId, userId: user.id, name: user.name });
    };

    setupCall();

    socket.on('room-state', ({ participants: existingParticipants, hostId: roomHostId, hostName: roomHostName }) => {
      if (roomHostId) {
        setHostInfo(roomHostId, roomHostName || 'Host');
        setActiveSpeaker(roomHostId);
      }
      const stream = streamRef.current;
      existingParticipants.forEach((p: { userId: string; name: string; socketId: string }) => {
        addParticipant({ userId: p.userId, name: p.name, stream: null, socketId: p.socketId, isAudioMuted: false, isVideoMuted: false, isScreenSharing: false });
        if (stream) connectToPeer(p.socketId, stream);
      });
    });

    socket.on('user-joined', ({ userId, name, socketId }) => {
      addParticipant({ userId, name, stream: null, socketId, isAudioMuted: false, isVideoMuted: false, isScreenSharing: false });
      const stream = streamRef.current;
      if (stream) connectToPeer(socketId, stream);
    });

    socket.on('signal', async ({ from, signal }) => {
      const stream = streamRef.current;
      if (stream) {
        await handleIncomingSignal(from, signal, stream, onRemoteStream(from));
      }
    });

    socket.on('chat-message', (msg: any) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('typing', ({ name }) => setTypingUser(name));
    socket.on('stop-typing', () => setTypingUser(null));
    socket.on('notes-updated', ({ notes: n }) => setNotes(n));

    socket.on('task-created', (task: any) => {
      setMeetingTasks((prev) => [...prev, task]);
    });

    socket.on('meeting-ended', () => {
      alert('This meeting has been ended by the host.');
      resetMeeting();
    });

    socket.on('user-left', ({ socketId }) => {
      closePeer(socketId);
      removeParticipant(socketId);
    });

    return () => {
      recognitionRef.current?.stop();
      socket.off('room-state');
      socket.off('user-joined');
      socket.off('signal');
      socket.off('chat-message');
      socket.off('typing');
      socket.off('stop-typing');
      socket.off('notes-updated');
      socket.off('task-created');
      socket.off('meeting-ended');
      socket.off('user-left');
      destroyPeerConnections();
    };
  }, [roomId]);

  useEffect(() => {
    if (!localStream || !localVideoRef.current) return;
    if (isVideoOff && !isScreenSharing) return;
    localVideoRef.current.srcObject = localStream;
    localVideoRef.current.play().catch(() => {});
  }, [localStream, isVideoOff, isScreenSharing]);

  const isHost = user?.id === hostId || (user as any)?._id === hostId;

  const handleScreenShare = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Screen sharing is not supported on this device or browser.");
      return;
    }
    if (!localStream) return;
    try {
      if (isScreenSharing) {
        setLocalStream(await stopScreenShare(localStream));
        setScreenSharing(false);
      } else {
        const updated = await startScreenShare(localStream);
        setLocalStream(updated);
        setScreenSharing(true);
        const screenTrack = getScreenVideoTrack();
        if (screenTrack) {
          screenTrack.onended = async () => {
            const restored = await stopScreenShare(updated);
            setLocalStream(restored);
            setScreenSharing(false);
          };
        }
      }
    } catch {
      setScreenSharing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!localStream || !activeMeetingId) return;
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(localStream, { mimeType: 'video/webm;codecs=vp9' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('recording', blob, `meeting-${activeMeetingId}.webm`);
      try {
        await fetch(`${API_URL}/meetings/${activeMeetingId}/recording`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData
        });
      } catch (err) {
        console.error('Recording upload failed:', err);
      }
    };
    recorder.start(5000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !activeMeetingId) return;
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ title: taskTitle.trim(), status: 'todo', meetingId: activeMeetingId, assignees: [user?.id] })
      });
      const data = await res.json();
      if (data.success) {
        socket.emit('meeting-task-created', { roomId, task: data.task });
        setMeetingTasks((prev) => [...prev, data.task]);
        setTaskTitle('');
        setShowTaskForm(false);
      }
    } catch (err) {
      console.error('Task creation failed:', err);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeMeetingId) return;
    socket.emit('chat-message', { meetingId: activeMeetingId, text: chatInput.trim() });
    socket.emit('stop-typing');
    setChatInput('');
  };

  const handleInputChange = (val: string) => {
    setChatInput(val);
    socket.emit(val.trim() ? 'typing' : 'stop-typing');
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    socket.emit('update-notes', { notes: e.target.value });
  };

  const handleEndCall = async () => {
    if (!isHost) { resetMeeting(); return; }
    if (!activeMeetingId) { resetMeeting(); return; }

    if (isRecording) mediaRecorderRef.current?.stop();

    try {
      if (transcripts.length > 0) {
        await fetch(`${API_URL}/meetings/${activeMeetingId}/transcripts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ transcripts })
        });
      }
    } catch { /* proceed */ }

    try {
      const response = await fetch(`${API_URL}/meetings/${activeMeetingId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.ok) {
        socket.emit('end-meeting', { roomId });
      }
    } catch (error) {
      console.error('Failed to end call API', error);
    } finally {
      resetMeeting();
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-73px)] overflow-hidden select-none bg-slate-950 text-left">
      <div className="flex-1 flex flex-col p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Session Room workspace</h2>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wide">ID: {roomId}</span>
            {hostName && (
              <p className="text-xs text-slate-400 mt-1">
                Hosted by <span className="text-indigo-400 font-medium">{hostName}</span>
              </p>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded-full animate-pulse">
            ● {participants.length + 1} participants
          </span>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center overflow-y-auto">
          <div className={`relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border ${
            activeSpeakerId === user?.id ? 'active-speaker-ring' : 'border-slate-800'
          }`}>
            {isVideoOff && !isScreenSharing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold border border-slate-700">
                  {user?.name.charAt(0)}
                </div>
                <span className="text-xs text-slate-400 font-medium">You (Camera Muted)</span>
              </div>
            ) : (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-2xl" />
            )}
            <div className="absolute bottom-4 left-4 text-xs font-semibold px-3 py-1 bg-slate-950/80 backdrop-blur rounded-lg border border-slate-800">
              You {isMuted && '(Muted)'} {isHost && <span className="text-amber-400">• Host</span>}
            </div>
          </div>

          {participants.length === 0 ? (
            <div className="aspect-video bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed flex flex-col items-center justify-center space-y-2 text-slate-500 p-6">
              <span className="text-2xl animate-spin">⚡</span>
              <p className="text-xs">Waiting for participants to connect...</p>
            </div>
          ) : (
            participants.map((p) => (
              <div key={p.socketId} className={`relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border ${
                activeSpeakerId === p.userId ? 'active-speaker-ring' : 'border-slate-800'
              }`}>
                <RemoteVideo stream={p.stream} name={p.name} />
                <div className="absolute bottom-4 left-4 text-xs font-semibold px-3 py-1 bg-slate-950/80 backdrop-blur rounded-lg border border-slate-800">
                  {p.name} {hostId === p.userId && <span className="text-amber-400">• Host</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-center items-center gap-3 bg-slate-900/60 p-4 border border-slate-850 rounded-2xl glass flex-wrap">
          <button onClick={toggleMute} className={`p-3.5 rounded-xl transition ${isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/45' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button onClick={toggleVideo} className={`p-3.5 rounded-xl transition ${isVideoOff ? 'bg-rose-500/20 text-rose-400 border border-rose-500/45' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          <button onClick={handleScreenShare} className={`hidden md:block p-3.5 rounded-xl transition ${isScreenSharing ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/45' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
            <ScreenShare size={20} />
          </button>
          <button onClick={handleToggleRecording} className={`p-3.5 rounded-xl transition ${isRecording ? 'bg-rose-600 text-white border border-rose-500' : 'bg-slate-800 text-slate-300 border border-slate-700'}`} title="Record meeting">
            {isRecording ? <Square size={20} /> : <Circle size={20} />}
          </button>
          <button onClick={() => setShowTaskForm(!showTaskForm)} className="p-3.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700" title="Create task">
            <Plus size={20} />
          </button>
          <div className="w-px h-8 bg-slate-800 mx-1" />
          <button onClick={handleEndCall} className="p-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition flex items-center gap-2 font-semibold text-sm border border-rose-500/35">
            <PhoneOff size={20} /> {isHost ? 'End Meeting' : 'Leave Meeting'}
          </button>
        </div>

        {showTaskForm && (
          <form onSubmit={handleCreateTask} className="flex gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <input
              type="text"
              placeholder="New task title..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
            />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg">Add Task</button>
          </form>
        )}

        {meetingTasks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {meetingTasks.map((t: any) => (
              <span key={t._id} className="text-[10px] px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full flex items-center gap-1">
                <CheckSquare size={10} /> {t.title}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-[400px] lg:h-full bg-slate-900/30">
        <div className="flex-1 flex flex-col border-b border-slate-800 p-4 min-h-[150px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <Clipboard size={14} className="text-indigo-400" /> Shared Meeting Notes
          </h3>
          <textarea value={notes} onChange={handleNotesChange} placeholder="Type notes collaboratively..."
            className="flex-1 w-full bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 focus:outline-none focus:border-cyan-500/50 text-xs resize-none" />
        </div>

        <div className="h-44 border-b border-slate-800 p-4 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <Sparkles size={14} className="text-cyan-400 animate-pulse" /> Live AI Transcription
          </h3>
          <div className="flex-1 bg-slate-950/50 border border-slate-800/85 rounded-xl p-3 overflow-y-auto space-y-2 text-[10px]">
            {transcripts.length === 0 ? (
              <div className="text-slate-600 italic text-center py-6">Speech recognition active — speak to transcribe.</div>
            ) : transcripts.map((t, idx) => (
              <div key={idx}>
                <span className="font-semibold text-cyan-400">{t.speakerName}:</span>{' '}
                <span className="text-slate-300">{t.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-64 flex flex-col p-4 bg-slate-950/20">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <MessageSquare size={14} /> In-Meeting Chat
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 text-xs">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400">{msg.senderName}</span>
                <p className="text-slate-200 mt-0.5">{msg.text}</p>
              </div>
            ))}
            {typingUser && <div className="text-[10px] text-slate-500 italic animate-pulse">{typingUser} is typing...</div>}
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input type="text" placeholder="Send message..." value={chatInput} onChange={(e) => handleInputChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none" />
            <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl"><Send size={14} /></button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoomPage;
