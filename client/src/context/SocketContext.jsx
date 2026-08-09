import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext(null);

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

export const SocketProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [token, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
