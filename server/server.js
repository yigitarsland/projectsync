require('dotenv').config();
const http = require('http');
const app = require('./app');
const { Server: SocketServer } = require('socket.io');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Socket.IO setup
const io = new SocketServer(server, {
  cors: {
    origin: '*', // Update to your frontend URL for security
    methods: ['GET', 'POST']
  }
});

// Export io to use in controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinProject', (projectId) => {
    socket.join(projectId);
    console.log(`Socket ${socket.id} joined project room ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
