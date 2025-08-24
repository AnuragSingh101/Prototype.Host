import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';
import './Terminal.css';

const TerminalComponent = ({ sshCredentials, onDisconnect }) => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const socket = useRef(null);
  const fitAddon = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!terminalRef.current) return;

    if (!terminal.current) {
      // Initialize terminal
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selection: '#ffffff40',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        },
        scrollback: 10000,
        tabStopWidth: 4
      });

      fitAddon.current = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.current.loadAddon(fitAddon.current);
      terminal.current.loadAddon(webLinksAddon);

      terminal.current.open(terminalRef.current);
      fitAddon.current.fit();
    }

    const handleResize = () => {
      if (fitAddon.current && terminal.current) {
        fitAddon.current.fit();
        if (socket.current && connected) {
          socket.current.emit('terminal-resize', {
            cols: terminal.current.cols,
            rows: terminal.current.rows,
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    if (sshCredentials) {
      connectToSSH();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (socket.current) {
        socket.current.disconnect();
      }
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
    // sshCredentials change triggers reconnection
  }, [sshCredentials]);

  const connectToSSH = () => {
    setConnecting(true);
    setError('');

    socket.current = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.current.on('connect', () => {
      console.log('Socket connected');
      terminal.current.writeln('\r\n\x1b[32mConnecting to SSH server...\x1b[0m\r\n');
      socket.current.emit('ssh-connect', sshCredentials);
    });

    socket.current.on('ssh-ready', () => {
      console.log('SSH connection established');
      setConnected(true);
      setConnecting(false);
      terminal.current.writeln('\r\n\x1b[32mSSH connection established!\x1b[0m\r\n');

      terminal.current.onData((data) => {
        if (socket.current && connected) {
          socket.current.emit('terminal-input', data);
        }
      });

      socket.current.emit('terminal-resize', {
        cols: terminal.current.cols,
        rows: terminal.current.rows,
      });
    });

    socket.current.on('ssh-data', (data) => {
      if (terminal.current) {
        terminal.current.write(data);
      }
    });

    socket.current.on('ssh-error', (errorMsg) => {
      console.error('SSH Error:', errorMsg);
      setError(errorMsg);
      setConnecting(false);
      setConnected(false);
      terminal.current.writeln(`\r\n\x1b[31mSSH Error: ${errorMsg}\x1b[0m\r\n`);
    });

    socket.current.on('ssh-close', () => {
      console.log('SSH connection closed');
      setConnected(false);
      setConnecting(false);
      terminal.current.writeln('\r\n\x1b[33mSSH connection closed\x1b[0m\r\n');
    });

    socket.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      setConnecting(false);
      terminal.current.writeln('\r\n\x1b[31mConnection lost\x1b[0m\r\n');
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server');
      setConnecting(false);
      terminal.current.writeln('\r\n\x1b[31mFailed to connect to server\x1b[0m\r\n');
    });
  };

  const handleDisconnect = () => {
    if (socket.current) {
      socket.current.emit('ssh-disconnect');
      socket.current.disconnect();
    }
    setConnected(false);
    setConnecting(false);
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const handleReconnect = () => {
    if (socket.current) {
      socket.current.disconnect();
    }
    connectToSSH();
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-info">
          <span
            className={`status-indicator ${
              connected ? 'connected' : connecting ? 'connecting' : 'disconnected'
            }`}
          ></span>
          <span className="connection-info">
            {connecting
              ? 'Connecting...'
              : connected
              ? `Connected to ${sshCredentials.host}`
              : 'Disconnected'}
          </span>
        </div>
        <div className="terminal-controls">
          {connected && (
            <button onClick={handleReconnect} className="btn-reconnect">
              Reconnect
            </button>
          )}
          <button onClick={handleDisconnect} className="btn-disconnect">
            Disconnect
          </button>
        </div>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      <div ref={terminalRef} className="terminal-content" />
    </div>
  );
};

export default TerminalComponent;
