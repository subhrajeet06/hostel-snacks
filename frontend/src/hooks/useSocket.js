import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socketInstance = null;
const pendingListeners = new Map();

const socketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '/';
  return apiUrl.replace(/\/api\/?$/, '') || '/';
};

const attachPendingListeners = (socket) => {
  for (const [event, handlers] of pendingListeners.entries()) {
    for (const handler of handlers) socket.on(event, handler);
  }
};

export const subscribeSocketEvent = (event, handler) => {
  if (!pendingListeners.has(event)) pendingListeners.set(event, new Set());
  pendingListeners.get(event).add(handler);

  if (socketInstance) socketInstance.on(event, handler);

  return () => {
    pendingListeners.get(event)?.delete(handler);
    if (socketInstance) socketInstance.off(event, handler);
  };
};

export const useSocket = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!user || !token) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return undefined;
    }

    const socket = io(socketUrl(), {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 5000,
    });

    socketInstance = socket;
    attachPendingListeners(socket);

    return () => {
      socket.disconnect();
      if (socketInstance === socket) socketInstance = null;
    };
  }, [token, user?.id, user?.role]);

  return socketInstance;
};

export const getSocket = () => socketInstance;
