const { Client } = require('ssh2');
const EventEmitter = require('events');
const path = require('path');

class SSHManager extends EventEmitter {
  constructor(credentials) {
    super();
    this.credentials = credentials;
    this.client = new Client();
    this.stream = null;
    this.connected = false;
    this.keepAliveInterval = null;
    this.sftp = null;

    this.setupClientEvents();
  }

  setupClientEvents() {
    this.client.on('ready', () => {
      console.log('SSH Client :: ready');
      this.connected = true;

      this.client.shell((err, stream) => {
        if (err) {
          this.emit('error', err);
          return;
        }
        this.stream = stream;

        stream.on('close', () => {
          console.log('SSH Stream :: close');
          this.connected = false;
          this.cleanup();
          this.emit('close');
        });

        stream.on('data', (data) => {
          this.emit('data', data);
        });

        stream.stderr.on('data', (data) => {
          this.emit('data', data);
        });

        this.emit('ready');
      });
    });

    this.client.on('error', (err) => {
      console.error('SSH Client :: error:', err);
      this.connected = false;
      this.cleanup();
      this.emit('error', err);
    });

    this.client.on('end', () => {
      console.log('SSH Client :: end');
      this.connected = false;
      this.cleanup();
      this.emit('close');
    });

    this.client.on('close', () => {
      console.log('SSH Client :: close');
      this.connected = false;
      this.cleanup();
      this.emit('close');
    });
  }

  connect() {
    const config = {
      host: this.credentials.host,
      port: this.credentials.port || 22,
      username: this.credentials.username,
      password: this.credentials.password,
      keepaliveInterval: 30000,
      keepaliveCountMax: 3,
      readyTimeout: 20000,
      algorithms: {
        ciphers: ['aes128-gcm', 'aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
        hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
        kex: [
          'diffie-hellman-group-exchange-sha256',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
        ],
        serverHostKey: [
          'rsa-sha2-512',
          'rsa-sha2-256',
          'ssh-rsa',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
        ],
      },
    };

    if (this.credentials.privateKey) {
      config.privateKey = this.credentials.privateKey;
      delete config.password;
    }

    console.log(`Connecting to SSH: ${config.username}@${config.host}:${config.port}`);
    this.client.connect(config);
  }

  write(data) {
    if (this.stream && this.connected) {
      this.stream.write(data);
    }
  }

  resize(cols, rows) {
    if (this.stream && this.connected) {
      this.stream.setWindow(rows, cols, 0, 0);
    }
  }

  isConnected() {
    return this.connected;
  }

  disconnect() {
    console.log('Disconnecting SSH session...');
    this.connected = false;
    this.cleanup();
    if (this.client) {
      this.client.end();
    }
  }

  cleanup() {
    if (this.stream) {
      this.stream.removeAllListeners();
      this.stream = null;
    }

    if (this.sftp) {
      try {
        this.sftp.end && this.sftp.end();
      } catch {}
      this.sftp = null;
    }
  }

  exec(command, callback) {
    if (!this.connected) {
      if (typeof callback === 'function') {
        return callback(new Error('SSH not connected'));
      }
      return;
    }

    this.client.exec(command, (err, stream) => {
      if (err) {
        if (typeof callback === 'function') {
          return callback(err);
        }
        return;
      }

      let output = '';
      let errorOutput = '';

      stream.on('close', (code, signal) => {
        if (typeof callback === 'function') {
          callback(null, { output, errorOutput, code, signal });
        }
      });

      stream.on('data', (data) => {
        output += data.toString();
      });

      stream.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
    });
  }

  execPromise(command) {
    return new Promise((resolve, reject) => {
      this.exec(command, (err, result) => {
        if (err) return reject(err);
        if (result.code !== 0) {
          return reject(new Error(result.errorOutput || `Command failed: ${command}`));
        }
        resolve(result);
      });
    });
  }

  async getSFTP() {
    if (this.sftp) return this.sftp;
    this.sftp = await new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => (err ? reject(err) : resolve(sftp)));
    });
    return this.sftp;
  }

  normalizePath(p) {
    if (!p || typeof p !== 'string') throw new Error('Invalid path');
    const norm = path.posix.normalize(p);
    if (!norm.startsWith('/')) {
      return '/' + norm;
    }
    return norm;
  }

  modeToPermString(mode) {
    const rwx = ['USR', 'GRP', 'OTH'].map((_, i) => {
      return [
        (mode & (0o400 >> (i * 3))) ? 'r' : '-',
        (mode & (0o200 >> (i * 3))) ? 'w' : '-',
        (mode & (0o100 >> (i * 3))) ? 'x' : '-',
      ].join('');
    }).join('');
    return rwx;
  }

  async stat(p) {
    const sftp = await this.getSFTP();
    const target = this.normalizePath(p);
    const attrs = await new Promise((resolve, reject) => {
      sftp.lstat(target, (err, st) => (err ? reject(err) : resolve(st)));
    });
    return {
      path: target,
      size: attrs.size,
      modified: new Date(attrs.mtime * 1000).toISOString(),
      mode: attrs.mode,
      permissions: this.modeToPermString(attrs.mode),
      isDirectory: attrs.isDirectory(),
      isFile: attrs.isFile(),
      isSymbolicLink: attrs.isSymbolicLink(),
    };
  }

  async listDirectory(dirPath) {
    const sftp = await this.getSFTP();
    const dir = this.normalizePath(dirPath);
    const entries = await new Promise((resolve, reject) => {
      sftp.readdir(dir, (err, list) => (err ? reject(err) : resolve(list)));
    });

    const filtered = entries.filter(e => e.filename !== '.' && e.filename !== '..');
    const stats = await Promise.all(filtered.map(async (e) => {
      const full = path.posix.join(dir, e.filename);
      try {
        const s = await this.stat(full);
        return {
          name: e.filename,
          path: full,
          size: s.size,
          modified: s.modified,
          permissions: s.permissions,
          owner: e.longname?.split(/\s+/)[2] || '',
          isDirectory: s.isDirectory,
          isLink: s.isSymbolicLink,
          isFile: s.isFile,
          type: s.isDirectory ? 'directory' : (s.isSymbolicLink ? 'symlink' : 'file'),
        };
      } catch {
        return {
          name: e.filename,
          path: full,
          size: 0,
          modified: null,
          permissions: '---------',
          owner: '',
          isDirectory: false,
          isLink: false,
          isFile: true,
          type: 'file',
        };
      }
    }));

    return stats;
  }

  async rename(from, to) {
    const sftp = await this.getSFTP();
    const src = this.normalizePath(from);
    const dst = this.normalizePath(to);
    await new Promise((resolve, reject) => {
      sftp.rename(src, dst, (err) => (err ? reject(err) : resolve()));
    });
  }

  async mkdir(p) {
    const sftp = await this.getSFTP();
    const target = this.normalizePath(p);
    await new Promise((resolve, reject) => {
      sftp.mkdir(target, (err) => (err ? reject(err) : resolve()));
    });
  }

  async chmod(p, modeStr) {
    const sftp = await this.getSFTP();
    const target = this.normalizePath(p);
    const mode = parseInt(modeStr, 8);
    if (Number.isNaN(mode)) throw new Error('Invalid chmod mode');
    await new Promise((resolve, reject) => {
      sftp.chmod(target, mode, (err) => (err ? reject(err) : resolve()));
    });
  }

  async deleteMany(targets) {
    const safe = targets.map(t => `"${this.normalizePath(t)}"`).join(' ');
    return this.execPromise(`rm -rf ${safe}`);
  }

  async moveMany(sources, destDir) {
    const dest = this.normalizePath(destDir);
    const srcs = sources.map(s => `"${this.normalizePath(s)}"`).join(' ');
    return this.execPromise(`mv ${srcs} "${dest}"`);
  }

  async copyMany(sources, destDir) {
    const dest = this.normalizePath(destDir);
    const srcs = sources.map(s => `"${this.normalizePath(s)}"`).join(' ');
    return this.execPromise(`cp -r ${srcs} "${dest}"`);
  }

  async compress(cwd, archiveName, items) {
  const safeCwd = this.normalizePath(cwd);
  const safeArchive = path.posix.join(safeCwd, archiveName);

  // Use only the base name of each item to ensure paths are correct relative to cwd
  const safeItems = items
    .map(n => `"${path.posix.basename(n).replace(/(["\s'$`\\])/g, '\\$1')}"`)
    .join(' ');

  const cmd = `tar -czf "${safeArchive}" -C "${safeCwd}" ${safeItems}`;
  return this.execPromise(cmd);
}



 async extract(cwd, archives) {
  const safeCwd = this.normalizePath(cwd);

  const cmds = archives.map(a => {
    const safe = this.normalizePath(a);
    const baseName = path.posix.basename(safe).replace(/\.(tar\.gz|tgz|zip|tar)$/, '');
    const targetDir = path.posix.join(safeCwd, baseName);

    return `mkdir -p "${targetDir}" && tar -xzf "${safe}" -C "${targetDir}"`;
  });

  const cmd = cmds.join(' && ');
  return this.execPromise(cmd);
}

  fetchFile(remotePath, callback) {
    this.client.sftp((err, sftp) => {
      if (err) return callback(err);
      const chunks = [];
      const stream = sftp.createReadStream(remotePath);
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => callback(null, Buffer.concat(chunks)));
      stream.on('error', err2 => callback(err2));
    });
  }

  async writeFile(remotePath, contentBuffer) {
    const sftp = await this.getSFTP();
    const target = this.normalizePath(remotePath);

    return new Promise((resolve, reject) => {
      const writeStream = sftp.createWriteStream(target);
      writeStream.on('close', () => resolve());
      writeStream.on('error', reject);
      writeStream.end(contentBuffer);
    });
  }

}

module.exports = SSHManager;
