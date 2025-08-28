const SSHManager = require('../services/sshManager');

const activeSessions = new Map();

// --- helpers ---
const ok = (payload) => ({ ok: true, ...payload });
const err = (message, code = 1) => ({ ok: false, error: { message, code } });

function handleConnection(socket) {
  console.log('Client connected:', socket.id);

  socket.on('ssh-connect', (credentials) => {
    try {
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
    } catch (e) {
      socket.emit('ssh-error', e.message);
    }
  });

  socket.on('terminal-input', (data) => {
    const ssh = activeSessions.get(socket.id);
    if (ssh && ssh.isConnected()) ssh.write(data);
  });

  socket.on('terminal-resize', ({ cols, rows }) => {
    const ssh = activeSessions.get(socket.id);
    if (ssh && ssh.isConnected()) ssh.resize(cols, rows);
  });

  socket.on('execute-command', (command) => {
    const ssh = activeSessions.get(socket.id);
    if (!ssh || !ssh.isConnected()) {
      return socket.emit('command-result', { output: '', errorOutput: 'Not connected', code: 1, signal: null });
    }
    ssh.exec(command, (err, result) => {
      if (err) return socket.emit('command-result', { output: '', errorOutput: err.message, code: 1, signal: null });
      socket.emit('command-result', result);
    });
  });

  socket.on('sftp-fetch', (remotePath) => {
    const ssh = activeSessions.get(socket.id);
    if (!ssh) return socket.emit('sftp-error', 'No SSH session');
    ssh.fetchFile(remotePath, (err, data) => {
      if (err) return socket.emit('sftp-error', err.message);
      socket.emit('sftp-file', { path: remotePath, content: data.toString('base64') });
    });
  });

  socket.on('list-directory', async ({ path }) => {
    const ssh = activeSessions.get(socket.id);
    if (!ssh || !ssh.isConnected()) {
      return socket.emit('directory-data', err('Not connected'));
    }
    try {
      const items = await ssh.listDirectory(path);
      socket.emit('directory-data', ok({ path, items }));
    } catch (e) {
      socket.emit('directory-data', err(e.message));
    }
  });

  socket.on('file-action', async ({ action, payload }) => {
  const ssh = activeSessions.get(socket.id);
  if (!ssh || !ssh.isConnected()) {
    return socket.emit('file-action-result', err('Not connected'));
  }

  try {
    switch (action) {
      case 'rename': {
        const { from, to } = payload;
        await ssh.rename(from, to);
        return socket.emit('file-action-result', ok({
          action,
          cwd: to.replace(/\/[^/]+$/, "") || "/"
        }));
      }

      case 'delete': {
        const { targets, cwd } = payload;
        await ssh.deleteMany(targets);
        return socket.emit('file-action-result', ok({ action, cwd }));
      }

      case 'create-file': {
  const { path } = payload;
  await ssh.writeFile(path, "");
  return socket.emit('file-action-result', ok({
    action,
    cwd: path.replace(/\/[^/]+$/, "") || "/",
    created: path
  }));
}

case 'create-folder': {
  const { path } = payload;
  await ssh.mkdir(path);
  return socket.emit('file-action-result', ok({
    action,
    cwd: path.replace(/\/[^/]+$/, "") || "/",
    created: path
  }));
}

      case 'move': {
        const { sources, destDir } = payload;
        await ssh.moveMany(sources, destDir);
        return socket.emit('file-action-result', ok({ action, cwd: destDir }));
      }

      case 'copy': {
        const { sources, destDir } = payload;
        await ssh.copyMany(sources, destDir);
        return socket.emit('file-action-result', ok({ action, cwd: destDir }));
      }

      case 'compress': {
        const { cwd, archiveName, items } = payload;
        if (!items || !items.length) throw new Error("No items to compress");
        await ssh.compress(cwd, archiveName, items);
        return socket.emit('file-action-result', ok({ action, cwd }));
      }

      case 'extract': {
        const { cwd, archives } = payload;
        if (!archives || !archives.length) throw new Error("No archives to extract");
        await ssh.extract(cwd, archives);
        return socket.emit('file-action-result', ok({ action, cwd }));
      }

      case 'chmod': {
        const { path, mode } = payload;
        await ssh.chmod(path, mode);
        return socket.emit('file-action-result', ok({
          action,
          cwd: path.replace(/\/[^/]+$/, "") || "/"
        }));
      }

      case 'stat': {
        const { path } = payload;
        const info = await ssh.stat(path);
        return socket.emit('file-action-result', ok({ action, info }));
      }

      default:
        return socket.emit('file-action-result', err(`Unknown action: ${action}`));
    }
  } catch (e) {
    console.error("File action error:", e);
    return socket.emit('file-action-result', err(e.message || 'Unknown error'));
  }
});



  socket.on('sftp-upload', async ({ path, contentBase64 }) => {
    const ssh = activeSessions.get(socket.id);
    if (!ssh || !ssh.isConnected()) return socket.emit('sftp-error', 'Not connected');

    try {
      const buffer = Buffer.from(contentBase64, 'base64');
      await ssh.writeFile(path, buffer);
      socket.emit('sftp-upload-result', { ok: true, path });
    } catch (e) {
      socket.emit('sftp-error', { ok: false, message: e.message });
    }
  });

  socket.on('disconnect', () => {
    const ssh = activeSessions.get(socket.id);
    if (ssh) {
      ssh.disconnect();
      activeSessions.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });

  socket.on('ssh-disconnect', () => {
    const ssh = activeSessions.get(socket.id);
    if (ssh) {
      ssh.disconnect();
      activeSessions.delete(socket.id);
    }
  });

  return activeSessions;
}

module.exports = { handleConnection, activeSessions };
