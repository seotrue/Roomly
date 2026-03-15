/**
 * signaling-server.ts
 *
 * Render 배포용 독립 시그널링 서버.
 * Next.js 없이 Express REST API + Socket.io 시그널링만 담당.
 * Vercel에서 서빙되는 Next.js 프론트엔드와 분리 운영됨.
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import {
  handleJoinRoom,
  handleLeaveRoom,
  getRoomInfo,
  getSocketRoomId,
  arePeersInSameRoom,
  handleCreateRoom,
} from './room/room-service';
import { normalizeRoomId } from './room/room-utils';
import type { JoinRoomPayload } from './room/room-types';

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';

const expressApp = express();
const httpServer = createServer(expressApp);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// ─────────────────────────────────────────
// Health check
// ─────────────────────────────────────────

expressApp.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─────────────────────────────────────────
// REST API
// ─────────────────────────────────────────

expressApp.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const roomInfo = getRoomInfo(roomId);

  if (!roomInfo.exists) {
    res.status(404).json(roomInfo);
    return;
  }

  res.json(roomInfo);
});

expressApp.post('/api/rooms', (_req, res) => {
  try {
    const result = handleCreateRoom();
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '방을 생성할 수 없습니다.' });
  }
});

// ─────────────────────────────────────────
// Socket.io 이벤트
// ─────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on('join-room', (payload: JoinRoomPayload) => {
    const result = handleJoinRoom(socket.id, payload);

    if (!result.success) {
      socket.emit('join-room-error', result.errorMessage);
      return;
    }

    const normalizedRoomId = normalizeRoomId(payload.roomId);
    socket.join(normalizedRoomId);

    socket.emit('room-joined', result.existingParticipants);
    socket.to(normalizedRoomId).emit('user-joined', socket.id, payload.userName.trim());
  });

  socket.on('offer', (targetId: string, offer: RTCSessionDescriptionInit) => {
    if (!arePeersInSameRoom(socket.id, targetId)) return;
    io.to(targetId).emit('offer', socket.id, offer);
  });

  socket.on('answer', (targetId: string, answer: RTCSessionDescriptionInit) => {
    if (!arePeersInSameRoom(socket.id, targetId)) return;
    io.to(targetId).emit('answer', socket.id, answer);
  });

  socket.on('ice-candidate', (targetId: string, candidate: RTCIceCandidateInit) => {
    if (!arePeersInSameRoom(socket.id, targetId)) return;
    io.to(targetId).emit('ice-candidate', socket.id, candidate);
  });

  socket.on('toggle-audio', (enabled: boolean) => {
    const roomId = getSocketRoomId(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('media-state-changed', socket.id, { audio: enabled });
  });

  socket.on('toggle-video', (enabled: boolean) => {
    const roomId = getSocketRoomId(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('media-state-changed', socket.id, { video: enabled });
  });

  socket.on('leave-room', () => {
    leaveAndNotify(socket);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
    leaveAndNotify(socket);
  });
});

function leaveAndNotify(socket: Socket): void {
  const result = handleLeaveRoom(socket.id);
  if (!result) return;

  socket.leave(result.roomId);
  io.to(result.roomId).emit('user-left', socket.id);
}

// ─────────────────────────────────────────
// 서버 시작
// ─────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`> Signaling server running on port ${PORT}`);
  console.log(`> Accepting connections from: ${CLIENT_ORIGIN}`);
});
