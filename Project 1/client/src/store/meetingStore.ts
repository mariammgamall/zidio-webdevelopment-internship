import { create } from 'zustand';

interface ParticipantStream {
  userId: string;
  name: string;
  stream: MediaStream | null;
  socketId: string;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
}

interface MeetingState {
  roomId: string | null;
  activeMeetingId: string | null;
  hostId: string | null;
  hostName: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  participants: ParticipantStream[];
  activeSpeakerId: string | null;
  setRoomId: (roomId: string | null) => void;
  setActiveMeetingId: (id: string | null) => void;
  setHostInfo: (hostId: string | null, hostName: string | null) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  setScreenSharing: (isScreenSharing: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addParticipant: (p: ParticipantStream) => void;
  removeParticipant: (socketId: string) => void;
  updateParticipantMedia: (socketId: string, updates: Partial<ParticipantStream>) => void;
  setActiveSpeaker: (userId: string | null) => void;
  resetMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  roomId: null,
  activeMeetingId: null,
  hostId: null,
  hostName: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  localStream: null,
  participants: [],
  activeSpeakerId: null,

  setRoomId: (roomId) => set({ roomId }),
  setActiveMeetingId: (activeMeetingId) => set({ activeMeetingId }),
  setHostInfo: (hostId, hostName) => set({ hostId, hostName }),
  
  toggleMute: () => set((state) => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    return { isMuted: !state.isMuted };
  }),

  toggleVideo: () => set((state) => {
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    return { isVideoOff: !state.isVideoOff };
  }),

  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),

  setLocalStream: (localStream) => set({ localStream }),

  addParticipant: (p) => set((state) => {
    const exists = state.participants.some(existing => existing.socketId === p.socketId);
    if (exists) return {};
    return { participants: [...state.participants, p] };
  }),

  removeParticipant: (socketId) => set((state) => ({
    participants: state.participants.filter(p => p.socketId !== socketId)
  })),

  updateParticipantMedia: (socketId, updates) => set((state) => ({
    participants: state.participants.map(p => p.socketId === socketId ? { ...p, ...updates } : p)
  })),

  setActiveSpeaker: (activeSpeakerId) => set({ activeSpeakerId }),

  resetMeeting: () => set((state) => {
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    return {
      roomId: null,
      activeMeetingId: null,
      hostId: null,
      hostName: null,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      localStream: null,
      participants: [],
      activeSpeakerId: null
    };
  })
}));
