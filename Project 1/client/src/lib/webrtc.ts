import { getSocket } from './socket';

interface PeerConnectionMap {
  [socketId: string]: RTCPeerConnection;
}

let localStream: MediaStream | null = null;
let cameraVideoTrack: MediaStreamTrack | null = null;
let screenVideoTrack: MediaStreamTrack | null = null;
const peers: PeerConnectionMap = {};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export const getLocalUserMedia = async (video = true, audio = true): Promise<MediaStream> => {
  if (localStream) return localStream;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: 640, height: 480 } : false,
      audio
    });
    return localStream;
  } catch (error) {
    console.warn('Webcam/Mic access denied. Generating simulation fallback media track.', error);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    let frame = 0;
    const renderLoop = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(320 + Math.sin(frame / 20) * 100, 240 + Math.cos(frame / 20) * 50, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '24px Outfit, sans-serif';
      ctx.fillText('Simulated Feed (Active Camera Mode)', 150, 40);
      frame++;
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const canvasStream = (canvas as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream }).captureStream?.(30) as MediaStream;

    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
    } catch {
      console.warn('Audio Context simulation failed, audio track omitted');
    }

    localStream = canvasStream;
    return localStream;
  }
};

const getOrCreatePeer = (
  targetSocketId: string,
  localMediaStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void
): RTCPeerConnection => {
  if (peers[targetSocketId]) return peers[targetSocketId];

  const socket = getSocket();
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peers[targetSocketId] = pc;

  localMediaStream.getTracks().forEach((track) => {
    pc.addTrack(track, localMediaStream);
  });

  pc.ontrack = (event) => {
    if (event.streams?.[0]) onRemoteStream(event.streams[0]);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', {
        to: targetSocketId,
        signal: { type: 'candidate', candidate: event.candidate }
      });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      closePeer(targetSocketId);
    }
  };

  return pc;
};

export const createOfferToPeer = async (
  targetSocketId: string,
  localMediaStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void
) => {
  const pc = getOrCreatePeer(targetSocketId, localMediaStream, onRemoteStream);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  getSocket().emit('signal', {
    to: targetSocketId,
    signal: { type: 'offer', sdp: offer }
  });
};

export const handleIncomingSignal = async (
  fromSocketId: string,
  signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit },
  localMediaStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void
) => {
  const pc = getOrCreatePeer(fromSocketId, localMediaStream, onRemoteStream);

  if (signal.type === 'offer' && signal.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    getSocket().emit('signal', {
      to: fromSocketId,
      signal: { type: 'answer', sdp: answer }
    });
  } else if (signal.type === 'answer' && signal.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
  } else if (signal.type === 'candidate' && signal.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } catch (err) {
      console.warn('ICE candidate error:', err);
    }
  }
};

export const replaceTracksForAllPeers = (newStream: MediaStream) => {
  Object.values(peers).forEach((pc) => {
    newStream.getTracks().forEach((track) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track);
      } else {
        pc.addTrack(track, newStream);
      }
    });
  });
};

export const closePeer = (socketId: string) => {
  if (peers[socketId]) {
    peers[socketId].close();
    delete peers[socketId];
  }
};

export const destroyPeerConnections = () => {
  Object.keys(peers).forEach(closePeer);
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  cameraVideoTrack = null;
  screenVideoTrack = null;
};

export const startScreenShare = async (currentStream: MediaStream): Promise<MediaStream> => {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  const newScreenTrack = displayStream.getVideoTracks()[0];
  const currentVideoTrack = currentStream.getVideoTracks()[0];

  if (currentVideoTrack) {
    cameraVideoTrack = currentVideoTrack;
    currentVideoTrack.enabled = false;
    currentStream.removeTrack(currentVideoTrack);
  }

  currentStream.addTrack(newScreenTrack);
  screenVideoTrack = newScreenTrack;
  localStream = currentStream;
  replaceTracksForAllPeers(currentStream);

  return currentStream;
};

export const stopScreenShare = async (currentStream: MediaStream): Promise<MediaStream> => {
  if (screenVideoTrack) {
    currentStream.removeTrack(screenVideoTrack);
    screenVideoTrack.stop();
    screenVideoTrack = null;
  }

  if (cameraVideoTrack) {
    cameraVideoTrack.enabled = true;
    currentStream.addTrack(cameraVideoTrack);
    cameraVideoTrack = null;
  } else if (currentStream.getVideoTracks().length === 0) {
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });
    currentStream.addTrack(cameraStream.getVideoTracks()[0]);
  }

  localStream = currentStream;
  replaceTracksForAllPeers(currentStream);
  return currentStream;
};

export const getScreenVideoTrack = () => screenVideoTrack;
