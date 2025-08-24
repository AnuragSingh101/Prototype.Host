const socketIo = require('socket.io');
const { handleConnection, activeSessions } = require('../controllers/sshController');

let ioInstance;

function initialize(server, corsOptions) {
  ioInstance = socketIo(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
  });
  ioInstance.on('connection', (socket) => {
    handleConnection(socket);
  });
  return ioInstance;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}

module.exports = { initialize, getIO, activeSessions };
