// ─────────────────────────────────────────────────────────────────────────────
// API 공유 타입 (클라이언트 ↔ 서버)
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// Room API
// ══════════════════════════════════════════════════════════════════════════════

// 방 입장 모드
export type JoinMode = 'create' | 'join';

// 방 참가자 정보 (소켓 레벨)
export type UserInfo = {
  roomId: string;
  userName: string;
};

// 방에 존재하는 참가자 목록 항목 (room-joined 이벤트 payload)
export type RoomParticipant = {
  socketId: string;
  userName: string;
};

// join-room 이벤트 payload
export type JoinRoomPayload = {
  roomId: string;
  userName: string;
  joinMode: JoinMode;
};

// join-room 성공 결과
export type JoinRoomResult =
  | { success: true; existingParticipants: RoomParticipant[] }
  | { success: false; errorMessage: string };

// POST /api/rooms 응답 결과
export type CreateRoomResult = {
  roomId: string;
};

// ══════════════════════════════════════════════════════════════════════════════
// Summary API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 회의 요약 요청
 * 클라이언트가 POST /api/summary로 전송하는 데이터
 */
export type SummaryRequest = {
  transcript: Array<{
    speakerName: string;
    text: string;
    timestamp: number;
  }>;
  language: string; // 'ko-KR' | 'en-US'
  meetingDuration: number; // 회의 시간 (ms)
  participantNames: string[]; // 참가자 이름 목록
};

/**
 * 회의 요약 응답 (성공)
 */
export type SummarySuccessResponse = {
  success: true;
  summary: string; // 전체 요약 (3-5 문장)
  keyPoints: string[]; // 핵심 포인트 목록
  actionItems: string[]; // 액션 아이템 목록
};

/**
 * 회의 요약 응답 (실패)
 */
export type SummaryErrorResponse = {
  success: false;
  errorMessage: string;
};

/**
 * 회의 요약 응답 (통합)
 */
export type SummaryResponse = SummarySuccessResponse | SummaryErrorResponse;
