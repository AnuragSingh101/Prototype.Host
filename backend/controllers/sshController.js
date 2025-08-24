const SSHManager = require('../services/sshManager');
const activeSessions = new Map();

function handleConnection(socket) {
  console.log('Client connected:', socket.id);

  socket.on('ssh-connect', (credentials) => {
    const sshManager = new SSHManager(credentials);
    activeSessions.set(socket.id, sshManager);

    sshManager.on('ready', () => socket.emit('ssh-ready'));
    sshManager.on('data', (data) => socket.emit('ssh-data', data.toString()));
    sshManager.on('error', (error) => socket.emit('ssh-error', error.message));
    sshManager.on('close', () => {
      socket.emit('ssh-close');
      activeSessions.delete(socket.id);
    });

    sshManager.connect();
  });

  socket.on('terminal-input', (data) => {
    const sshManager = activeSessions.get(socket.id);
    if (sshManager && sshManager.isConnected()) sshManager.write(data);
  });

  socket.on('terminal-resize', (dimensions) => {
    const sshManager = activeSessions.get(socket.id);
    if (sshManager && sshManager.isConnected()) sshManager.resize(dimensions.cols, dimensions.rows);
  });

  socket.on('execute-command', (command) => {
    const sshManager = activeSessions.get(socket.id);
    if (!sshManager || !sshManager.isConnected()) {
      return socket.emit('command-result', { output: '', errorOutput: 'Not connected', code: 1, signal: null });
    }
    sshManager.exec(command, (err, result) => {
      if (err) return socket.emit('command-result', { output: '', errorOutput: err.message, code: 1, signal: null });
      socket.emit('command-result', result);
    });
  });

  socket.on('sftp-fetch', (remotePath) => {
    const sshManager = activeSessions.get(socket.id);
    if (!sshManager) return socket.emit('sftp-error', 'No SSH session');
    sshManager.fetchFile(remotePath, (err, data) => {
      if (err) return socket.emit('sftp-error', err.message);
      socket.emit('sftp-file', { path: remotePath, content: data.toString('base64') });
    });
  });

  socket.on('disconnect', () => {
    const sshManager = activeSessions.get(socket.id);
    if (sshManager) {
      sshManager.disconnect();
      activeSessions.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });

  socket.on('ssh-disconnect', () => {
    const sshManager = activeSessions.get(socket.id);
    if (sshManager) {
      sshManager.disconnect();
      activeSessions.delete(socket.id);
    }
  });

  return activeSessions;
}

module.exports = { handleConnection, activeSessions };
