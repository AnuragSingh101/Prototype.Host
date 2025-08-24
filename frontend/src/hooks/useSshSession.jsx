import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SshSessionContext = createContext();

export const useSshSession = () => {
  const context = useContext(SshSessionContext);
  if (!context) {
    throw new Error('useSshSession must be used within SshSessionProvider');
  }
  return context;
};

export const SshSessionProvider = ({ credentials, children }) => {
  const socket = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (credentials) {
      connectToSSH();
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
      setConnected(false);
      setConnecting(false);
      setSessionReady(false);
    };
  }, [credentials]);

  const connectToSSH = () => {
    setConnecting(true);
    setError('');

    socket.current = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.current.on('connect', () => {
      console.log('Socket connected');
      socket.current.emit('ssh-connect', credentials);
    });

    socket.current.on('ssh-ready', () => {
      console.log('SSH session established');
      setConnected(true);
      setConnecting(false);
      setSessionReady(true);
    });

    socket.current.on('ssh-error', (errorMsg) => {
      console.error('SSH Error:', errorMsg);
      setError(errorMsg);
      setConnecting(false);
      setConnected(false);
      setSessionReady(false);
    });

    socket.current.on('ssh-close', () => {
      console.log('SSH session closed');
      setConnected(false);
      setConnecting(false);
      setSessionReady(false);
    });

    socket.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      setConnecting(false);
      setSessionReady(false);
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server');
      setConnecting(false);
    });
  };

  const disconnect = () => {
    if (socket.current) {
      socket.current.emit('ssh-disconnect');
      socket.current.disconnect();
      socket.current = null;
    }
    setConnected(false);
    setConnecting(false);
    setSessionReady(false);
  };

  const executeCommand = (command, callback) => {
    if (socket.current && sessionReady) {
      socket.current.emit('execute-command', command);
      socket.current.once('command-result', callback);
    } else {
      // Optionally handle commands when session not ready
      console.warn('SSH session not ready. Cannot execute command:', command);
    }
  };

  const subscribeToTerminal = (onData) => {
    if (socket.current) {
      socket.current.on('ssh-data', onData);
      return () => socket.current.off('ssh-data', onData);
    }
    return () => {};
  };

  const sendTerminalInput = (data) => {
    if (socket.current && sessionReady) {
      socket.current.emit('terminal-input', data);
    }
  };

  const resizeTerminal = (cols, rows) => {
    if (socket.current && sessionReady) {
      socket.current.emit('terminal-resize', { cols, rows });
    }
  };

  const value = {
    socket: socket.current,
    credentials,
    connected,
    connecting,
    error,
    sessionReady,
    disconnect,
    executeCommand,
    subscribeToTerminal,
    sendTerminalInput,
    resizeTerminal,
  };

  return <SshSessionContext.Provider value={value}>{children}</SshSessionContext.Provider>;
};
