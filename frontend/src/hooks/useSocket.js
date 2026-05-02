import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socketInstance = null;

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    if (!socketInstance) {
      const socketUrl = import.meta.env.VITE_API_URL || '/';
      socketInstance = io(socketUrl, { transports: ['websocket'] });
    }
    socketRef.current = socketInstance;

    // Join rooms based on role
    socketInstance.emit('join', { role: user.role, userId: user.id });

    return () => {
      // Don't disconnect globally on unmount; keep alive
    };
  }, [user]);

  return socketRef.current;
};

export const getSocket = () => socketInstance;
