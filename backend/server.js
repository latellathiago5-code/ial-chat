require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const aiRoutes = require('./routes/ai');
const themeRoutes = require('./routes/theme');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/../frontend'));
app.use('/uploads', express.static(__dirname + '/uploads'));

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error MongoDB:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/theme', themeRoutes);

// WebSocket
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    activeUsers.set(socket.id, chatId);
  });

  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('user-typing', data);
  });

  socket.on('new-message', (data) => {
    io.to(data.chatId).emit('message-received', data);
  });

  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
