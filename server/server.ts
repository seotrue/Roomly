import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import next from 'next';
import { handleJoinRoom, handleLeaveRoom, getRoomInfo, getSocketRoomId, arePeersInSameRoom, handleCreateRoom } from './room/room-service';
import { normalizeRoomId } from './room/room-utils';
import type { JoinRoomPayload } from './room/room-types';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

nextApp.prepare().then(() => {
  const expressApp = express();
  const httpServer = createServer(expressApp);

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
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

    // ── join-room ──────────────────────────
    socket.on('join-room', (payload: JoinRoomPayload) => {
      const result = handleJoinRoom(socket.id, payload);

      if (!result.success) {
        socket.emit('join-room-error', result.errorMessage);
        return;
      }

      const normalizedRoomId = normalizeRoomId(payload.roomId);
      socket.join(normalizedRoomId);

      // 나에게: 기존 참가자 목록 전달
      socket.emit('room-joined', result.existingParticipants);

      // 기존 참가자들에게: 새 참가자 알림
      socket.to(normalizedRoomId).emit('user-joined', socket.id, payload.userName.trim());
    });

    // ── offer ──────────────────────────────
    socket.on('offer', (targetId: string, offer: RTCSessionDescriptionInit) => {
      if (!arePeersInSameRoom(socket.id, targetId)) {
        console.warn(`[signal] offer rejected: ${socket.id} and ${targetId} are not in the same room`);
        return;
      }
      console.log(`[signal] offer: ${socket.id} -> ${targetId}`);
      io.to(targetId).emit('offer', socket.id, offer);
    });

    // ── answer ─────────────────────────────
    socket.on('answer', (targetId: string, answer: RTCSessionDescriptionInit) => {
      if (!arePeersInSameRoom(socket.id, targetId)) {
        console.warn(`[signal] answer rejected: ${socket.id} and ${targetId} are not in the same room`);
        return;
      }
      console.log(`[signal] answer: ${socket.id} -> ${targetId}`);
      io.to(targetId).emit('answer', socket.id, answer);
    });

    // ── ice-candidate ──────────────────────
    socket.on('ice-candidate', (targetId: string, candidate: RTCIceCandidateInit) => {
      if (!arePeersInSameRoom(socket.id, targetId)) {
        console.warn(`[signal] ice-candidate rejected: ${socket.id} and ${targetId} are not in the same room`);
        return;
      }
      io.to(targetId).emit('ice-candidate', socket.id, candidate);
    });

    // ── toggle-audio ───────────────────────
    socket.on('toggle-audio', (enabled: boolean) => {
      const roomId = getSocketRoomId(socket.id);
      if (!roomId) return;
      socket.to(roomId).emit('media-state-changed', socket.id, { audio: enabled });
    });

    // ── toggle-video ───────────────────────
    socket.on('toggle-video', (enabled: boolean) => {
      const roomId = getSocketRoomId(socket.id);
      if (!roomId) return;
      socket.to(roomId).emit('media-state-changed', socket.id, { video: enabled });
    });

    // ── leave-room ─────────────────────────
    socket.on('leave-room', () => {
      leaveAndNotify(socket);
    });

    // ── disconnect ─────────────────────────
    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      leaveAndNotify(socket);
    });
  });

  // ─────────────────────────────────────────
  // 헬퍼
  // ─────────────────────────────────────────

  function leaveAndNotify(socket: Socket): void {
    // handleLeaveRoom은 내부에서 user 존재 여부를 먼저 확인한다.
    // leave-room emit 직후 disconnect가 발생하면 이 함수가 두 번 호출되는데,
    // 두 번째 호출 시 user가 이미 삭제되어 null이 반환되므로 중복 처리가 방지된다.
    const result = handleLeaveRoom(socket.id);
    if (!result) return;

    socket.leave(result.roomId);
    io.to(result.roomId).emit('user-left', socket.id);
  }

  // ─────────────────────────────────────────
  // Next.js 요청 처리
  // ─────────────────────────────────────────

  expressApp.use((req, res) => {
    return handle(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(`> Server running on http://localhost:${PORT}`);
  });
});
