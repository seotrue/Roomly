import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import next from "next";
import rateLimit from "express-rate-limit";
import {
  handleJoinRoom,
  handleLeaveRoom,
  getRoomInfo,
  getSocketRoomId,
  arePeersInSameRoom,
  handleCreateRoom,
} from "./room/room-service";
import { normalizeRoomId } from "./room/room-utils";
import type { JoinRoomPayload } from "@/types/api";
import { generateMeetingSummary } from "./summary/summary-service";
import type { SummaryRequest } from "@/types/api";

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// CORS 허용 도메인 화이트리스트
// 환경 변수에서 쉼표로 구분된 도메인 목록을 읽어옴
// 미설정 시 개발 환경 기본값 사용
const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS;
  if (origins) {
    return origins.split(",").map((origin) => origin.trim());
  }
  // 기본값: 개발 환경용 localhost
  return ["http://localhost:3000", "http://127.0.0.1:3000"];
};

nextApp.prepare().then(() => {
  const expressApp = express();
  const httpServer = createServer(expressApp);

  const allowedOrigins = getAllowedOrigins();

  // ─────────────────────────────────────────────────────────────────
  // 레이트 리밋 설정 (DoS 공격 방어)
  // ─────────────────────────────────────────────────────────────────

  // API 엔드포인트 레이트 리밋: IP당 15분에 100회
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // IP당 최대 100회 요청
    message: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
    standardHeaders: true, // RateLimit-* 헤더 반환
    legacyHeaders: false, // X-RateLimit-* 헤더 비활성화
  });

  // 방 생성 API는 더 엄격하게: IP당 15분에 10회
  const createRoomLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "방 생성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 요약 생성 API는 비용 보호를 위해 제한: IP당 15분에 5회
  const summaryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "요약 생성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Socket.io 연결 레이트 리밋: IP당 동시 연결 10개 제한
  const connectionLimiter = new Map<string, number>();

  // API 레이트 리밋 적용
  expressApp.use("/api/", apiLimiter);

  // JSON 파싱 미들웨어 (transcript 데이터 수신용)
  expressApp.use(express.json({ limit: "2mb" }));

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // origin이 undefined인 경우: 같은 도메인 요청 (예: Postman, curl)
        // 개발 환경에서는 허용, 프로덕션에서는 차단
        if (!origin) {
          if (dev) {
            callback(null, true);
            return;
          }
          callback(new Error("Origin not allowed"), false);
          return;
        }

        // 화이트리스트에 포함된 도메인만 허용
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`[CORS] Blocked origin: ${origin}`);
          callback(new Error("Origin not allowed by CORS"), false);
        }
      },
      methods: ["GET", "POST"],
      credentials: true, // 쿠키/인증 헤더 허용 (향후 인증 추가 시 필요)
    },
    // ─────────────────────────────────────────────────────────────────
    // 보안: Socket.io 연결 제한 및 타임아웃 설정
    // ─────────────────────────────────────────────────────────────────
    maxHttpBufferSize: 1e6, // 최대 메시지 크기: 1MB (기본값 1MB, offer/answer는 보통 수KB)
    pingTimeout: 20000, // 20초간 응답 없으면 연결 끊음 (DoS 방어)
    pingInterval: 25000, // 25초마다 ping 전송 (연결 유지 확인)
    connectTimeout: 45000, // 연결 수립 타임아웃: 45초
    // 재연결 시도 제한은 클라이언트에서 설정함 (useSocket.ts)
  });

  // ─────────────────────────────────────────
  // REST API
  // ─────────────────────────────────────────

  expressApp.get("/api/rooms/:roomId", (req, res) => {
    const { roomId } = req.params;
    const roomInfo = getRoomInfo(roomId);

    if (!roomInfo.exists) {
      res.status(404).json(roomInfo);
      return;
    }

    res.json(roomInfo);
  });

  // 방 생성 API에는 더 엄격한 레이트 리밋 적용
  expressApp.post("/api/rooms", createRoomLimiter, (_req, res) => {
    try {
      const result = handleCreateRoom();
      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "방을 생성할 수 없습니다." });
    }
  });

  // 요약 생성 API (Gemini API 호출)
  expressApp.post("/api/summary", summaryLimiter, async (req, res) => {
    try {
      const request = req.body as SummaryRequest;

      // 요청 검증
      if (!request.transcript || !Array.isArray(request.transcript)) {
        res.status(400).json({
          success: false,
          errorMessage: "잘못된 요청입니다.",
        });
        return;
      }

      const result = await generateMeetingSummary(request);
      res.json(result);
    } catch (error) {
      console.error("[api/summary] Error:", error);
      res.status(500).json({
        success: false,
        errorMessage: "요약 생성에 실패했습니다.",
      });
    }
  });

  // ─────────────────────────────────────────
  // Socket.io 이벤트
  // ─────────────────────────────────────────

  // Socket.io 연결 레이트 리밋 미들웨어
  io.use((socket, next) => {
    const ip = socket.handshake.address;
    const count = connectionLimiter.get(ip) || 0;

    // IP당 동시 연결 10개 제한
    if (count >= 10) {
      console.warn(`[rate-limit] Socket connection rejected for IP: ${ip}`);
      return next(new Error("동시 연결 수 제한 초과"));
    }

    connectionLimiter.set(ip, count + 1);

    // 연결 종료 시 카운터 감소
    socket.on("disconnect", () => {
      const currentCount = connectionLimiter.get(ip) || 1;
      if (currentCount <= 1) {
        connectionLimiter.delete(ip);
      } else {
        connectionLimiter.set(ip, currentCount - 1);
      }
    });

    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ── join-room ──────────────────────────
    socket.on("join-room", (payload: JoinRoomPayload) => {
      const result = handleJoinRoom(socket.id, payload);

      if (!result.success) {
        socket.emit("join-room-error", result.errorMessage);
        return;
      }

      const normalizedRoomId = normalizeRoomId(payload.roomId);
      socket.join(normalizedRoomId);

      // 나에게: 기존 참가자 목록 전달
      socket.emit("room-joined", result.existingParticipants);

      // 기존 참가자들에게: 새 참가자 알림
      socket
        .to(normalizedRoomId)
        .emit("user-joined", socket.id, payload.userName.trim());
    });

    // ── offer ──────────────────────────────
    socket.on("offer", (targetId: string, offer: RTCSessionDescriptionInit) => {
      if (!arePeersInSameRoom(socket.id, targetId)) {
        console.warn(
          `[signal] offer rejected: ${socket.id} and ${targetId} are not in the same room`,
        );
        return;
      }
      console.log(`[signal] offer: ${socket.id} -> ${targetId}`);
      io.to(targetId).emit("offer", socket.id, offer);
    });

    // ── answer ─────────────────────────────
    socket.on(
      "answer",
      (targetId: string, answer: RTCSessionDescriptionInit) => {
        if (!arePeersInSameRoom(socket.id, targetId)) {
          console.warn(
            `[signal] answer rejected: ${socket.id} and ${targetId} are not in the same room`,
          );
          return;
        }
        console.log(`[signal] answer: ${socket.id} -> ${targetId}`);
        io.to(targetId).emit("answer", socket.id, answer);
      },
    );

    // ── ice-candidate ──────────────────────
    socket.on(
      "ice-candidate",
      (targetId: string, candidate: RTCIceCandidateInit) => {
        if (!arePeersInSameRoom(socket.id, targetId)) {
          console.warn(
            `[signal] ice-candidate rejected: ${socket.id} and ${targetId} are not in the same room`,
          );
          return;
        }
        io.to(targetId).emit("ice-candidate", socket.id, candidate);
      },
    );

    // ── toggle-audio ───────────────────────
    socket.on("toggle-audio", (enabled: boolean) => {
      const roomId = getSocketRoomId(socket.id);
      if (!roomId) return;
      socket
        .to(roomId)
        .emit("media-state-changed", socket.id, { audio: enabled });
    });

    // ── toggle-video ───────────────────────
    socket.on("toggle-video", (enabled: boolean) => {
      const roomId = getSocketRoomId(socket.id);
      if (!roomId) return;
      socket
        .to(roomId)
        .emit("media-state-changed", socket.id, { video: enabled });
    });

    // ── toggle-screen-share ────────────────
    socket.on("toggle-screen-share", (enabled: boolean) => {
      const roomId = getSocketRoomId(socket.id);
      if (!roomId) return;
      socket.to(roomId).emit("screen-share-changed", socket.id, enabled);
    });

    // ── transcript-entry ───────────────────
    // 자막 엔트리를 같은 방 참가자들에게 브로드캐스트
    socket.on("transcript-entry", (entry: unknown) => {
      const roomId = getSocketRoomId(socket.id);
      if (!roomId) return;

      // 보안: entry 크기 검증 (text 길이 500자 제한)
      if (
        entry &&
        typeof entry === "object" &&
        "text" in entry &&
        typeof entry.text === "string" &&
        entry.text.length <= 500
      ) {
        // 발신자 제외한 같은 방 참가자에게 브로드캐스트
        socket.to(roomId).emit("transcript-entry", entry);
      }
    });

    // ── leave-room ─────────────────────────
    socket.on("leave-room", () => {
      leaveAndNotify(socket);
    });

    // ── disconnect ─────────────────────────
    socket.on("disconnect", () => {
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
    io.to(result.roomId).emit("user-left", socket.id);
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
