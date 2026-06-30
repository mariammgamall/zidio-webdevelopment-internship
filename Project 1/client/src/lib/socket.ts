import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';

// Hugging Face Spaces do not provide a persistent Socket.IO server.
// When running against the HF space domain, disable socket usage and
// provide no-op implementations so the client still works.
// Note: Production deployment uses Hugging Face for the backend.
const IS_HF_SPACE = SOCKET_URL.includes('hf.space') || SOCKET_URL.includes('huggingface.co');

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (IS_HF_SPACE) {
    // return a stub with the minimal API used by the app
    const stub: any = {
      connected: false,
      connect: () => {},
      disconnect: () => {},
      emit: () => {},
      on: () => {},
      off: () => {}
    };
    return stub as Socket;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true
    });
  }
  return socket;
};

export const connectSocket = (userId: string) => {
  if (IS_HF_SPACE) return;
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit('join-user-room', userId);
  }
};

export const disconnectSocket = () => {
  if (IS_HF_SPACE) return;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
