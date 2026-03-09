import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// 방 참가자 관리
// roomId -> Set<socketId>
const rooms = new Map<string, Set<string>>();

// 참가자 이름 관리
// socketId -> { roomId, userName }
type UserInfo = { roomId: string; userName: string };
const users = new Map<string, UserInfo>();

app.prepare().then(() => {
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

  // GET /api/rooms/:roomId — 방 존재 여부 확인
  expressApp.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);

    if (!room) {
      res.status(404).json({ exists: false, participantCount: 0 });
      return;
    }

    res.json({ exists: true, participantCount: room.size });
  });

  // ─────────────────────────────────────────
  // Socket.io 이벤트
  // ─────────────────────────────────────────

  io.on('connection', (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ── join-room ──────────────────────────
    // 클라이언트가 방에 입장할 때
    socket.on('join-room', (roomId: string, userName: string) => {
      // 방이 없으면 생성
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }

      const room = rooms.get(roomId)!;

      // 기존 참가자 목록 (입장 전)
      const existingUsers = Array.from(room).map((id) => ({
        socketId: id,
        userName: users.get(id)?.userName ?? '',
      }));

      // 방 입장
      room.add(socket.id);
      socket.join(roomId);
      users.set(socket.id, { roomId, userName });

      console.log(`[socket] ${userName}(${socket.id}) joined room: ${roomId}`);

      // 나에게: 기존 참가자 목록 전달
      socket.emit('room-joined', existingUsers);

      // 기존 참가자들에게: 새 참가자 알림
      socket.to(roomId).emit('user-joined', socket.id, userName);
    });

    // ── offer ──────────────────────────────
    // Offer를 특정 피어에게 전달
    socket.on(
      'offer',
      (targetId: string, offer: RTCSessionDescriptionInit) => {
        console.log(`[signal] offer: ${socket.id} -> ${targetId}`);
        io.to(targetId).emit('offer', socket.id, offer);
      }
    );

    // ── answer ─────────────────────────────
    // Answer를 특정 피어에게 전달
    socket.on(
      'answer',
      (targetId: string, answer: RTCSessionDescriptionInit) => {
        console.log(`[signal] answer: ${socket.id} -> ${targetId}`);
        io.to(targetId).emit('answer', socket.id, answer);
      }
    );

    // ── ice-candidate ──────────────────────
    // ICE Candidate를 특정 피어에게 전달
    socket.on(
      'ice-candidate',
      (targetId: string, candidate: RTCIceCandidateInit) => {
        io.to(targetId).emit('ice-candidate', socket.id, candidate);
      }
    );

    // ── toggle-audio ───────────────────────
    // 마이크 상태 변경을 같은 방 사람들에게 브로드캐스트
    socket.on('toggle-audio', (enabled: boolean) => {
      const user = users.get(socket.id);
      if (!user) return;
      socket.to(user.roomId).emit('media-state-changed', socket.id, {
        audio: enabled,
      });
    });

    // ── toggle-video ───────────────────────
    // 카메라 상태 변경을 같은 방 사람들에게 브로드캐스트
    socket.on('toggle-video', (enabled: boolean) => {
      const user = users.get(socket.id);
      if (!user) return;
      socket.to(user.roomId).emit('media-state-changed', socket.id, {
        video: enabled,
      });
    });

    // ── leave-room ─────────────────────────
    // 명시적 퇴장
    socket.on('leave-room', () => {
      handleLeave(socket);
    });

    // ── disconnect ─────────────────────────
    // 브라우저 닫기 등 비정상 종료
    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      handleLeave(socket);
    });
  });

  // ─────────────────────────────────────────
  // 퇴장 처리 공통 함수
  // ─────────────────────────────────────────
  function handleLeave(socket: Socket) {
    const user = users.get(socket.id);
    if (!user) return;

    const { roomId } = user;
    const room = rooms.get(roomId);

    if (room) {
      room.delete(socket.id);
      // 방이 비었으면 삭제
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`[room] deleted empty room: ${roomId}`);
      }
    }

    users.delete(socket.id);
    socket.leave(roomId);

    // 같은 방 사람들에게 퇴장 알림
    io.to(roomId).emit('user-left', socket.id);
    console.log(`[socket] ${socket.id} left room: ${roomId}`);
  }

  // ─────────────────────────────────────────
  // Next.js 요청 처리
  // ─────────────────────────────────────────
  expressApp.all('/{*path}', (req, res) => {
    handle(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(`> Server running on http://localhost:${PORT}`);
  });
});
