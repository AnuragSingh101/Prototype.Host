// utils/sshManager.js

const { Client } = require('ssh2');
const EventEmitter = require('events');

class SSHManager extends EventEmitter {
  constructor(credentials) {
    super();
    this.credentials = credentials;
    this.client = new Client();
    this.stream = null;
    this.connected = false;
    this.keepAliveInterval = null;
    this.setupClientEvents();
  }

  setupClientEvents() {
    this.client.on('ready', () => {
      this.connected = true;
      this.client.shell((err, stream) => {
        if (err) return this.emit('error', err);
        this.stream = stream;
        stream.on('close', () => this.cleanupAndClose());
        stream.on('data', (data) => this.emit('data', data));
        stream.stderr.on('data', (data) => this.emit('data', data));
        this.startKeepAlive();
        this.emit('ready');
      });
    });

    this.client.on('error', (err) => {
      this.emit('error', err);
      this.cleanupAndClose();
    });
    this.client.on('end', () => this.cleanupAndClose());
    this.client.on('close', () => this.cleanupAndClose());
  }

  connect() {
    const config = {
      host: this.credentials.host,
      port: this.credentials.port || 22,
      username: this.credentials.username,
      password: this.credentials.password,
      privateKey: this.credentials.privateKey,
      keepaliveInterval: 30000,
      keepaliveCountMax: 3,
      readyTimeout: 20000,
    };
    this.client.connect(config);
  }

  write(data) {
    if (this.stream && this.connected) this.stream.write(data);
  }

  resize(cols, rows) {
    if (this.stream && this.connected) this.stream.setWindow(rows, cols);
  }

  isConnected() {
    return this.connected;
  }

  startKeepAlive() {
    this.keepAliveInterval = setInterval(() => {
      if (this.connected && this.stream) this.stream.write('\0');
    }, 60000);
  }

  stopKeepAlive() {
    clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = null;
  }

  disconnect() {
    this.cleanupAndClose();
    if (this.client) this.client.end();
  }

  cleanupAndClose() {
    this.connected = false;
    this.stopKeepAlive();
    if (this.stream) {
      this.stream.removeAllListeners();
      this.stream = null;
    }
    this.emit('close');
  }

  // Fetch file via SFTP
  fetchFile(remotePath, callback) {
    if (!this.connected) return callback(new Error('SSH not connected'));
    this.client.sftp((err, sftp) => {
      if (err) return callback(err);
      sftp.readFile(remotePath, (err2, data) => {
        sftp.end();
        callback(err2, data);
      });
    });
  }
}

module.exports = SSHManager;
