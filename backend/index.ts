import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const PORT = process.env.PORT || 3001;

const app = express();

// Optional health route
app.get('/', (_req, res) => res.send('Video signaling server is running'));

// Create HTTP server
const httpServer = createServer(app);

// Socket.IO server
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
    transports: ['websocket'],
});

io.on('connection', (socket: Socket) => {
    console.log(`🟢 Client connected: ${socket.id}`);

    socket.on('join-room', (roomId: string) => {
        console.log(`🏠 ${socket.id} joined room ${roomId}`);
        socket.join(roomId);
        socket.to(roomId).emit('peer-joined', socket.id);
    });

    socket.on('offer', ({ roomId, offer }) => {
        console.log(`📨 Offer from ${socket.id} in room ${roomId}`);
        socket.to(roomId).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', ({ roomId, answer }) => {
        console.log(`📨 Answer from ${socket.id} in room ${roomId}`);
        socket.to(roomId).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
        socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('disconnect', (reason) => {
        console.log(`🔴 Client disconnected: ${socket.id} (${reason})`);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
