const http = require('http');
const app = require('./app');
const { initialize, activeSessions } = require('./routes/socketRouter');

const server = http.createServer(app);

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
};

initialize(server, corsOptions);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, disconnecting active SSH sessions...');
  activeSessions.forEach(sshManager => sshManager.disconnect());
  activeSessions.clear();

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
