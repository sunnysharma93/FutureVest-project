import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? '';

export function createSocket(path = '/ws') {
  return io(WS_URL || window.location.origin, {
    path: path.startsWith('/') ? path : `/${path}`,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
}
