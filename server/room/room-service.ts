import { roomStore } from './room-store';
import { normalizeRoomId, isValidRoomId, isValidUserName, generateRoomId } from './room-utils';
import type { JoinRoomPayload, JoinRoomResult, RoomParticipant, CreateRoomResult } from '@/types/api';

// ─────────────────────────────────────────────────────────────────
// 보안 설정
// ─────────────────────────────────────────────────────────────────

// 방당 최대 참가자 수 제한 (WebRTC Mesh 구조상 50명 이상은 비현실적)
// 각 참가자는 N-1개의 peer connection 유지 → 메모리/CPU 급증
const MAX_PARTICIPANTS_PER_ROOM = 50;

// join-room 정책 처리
// - create 모드: 방이 없으면 생성 후 입장, 있으면 그냥 입장
// - join 모드: 방이 없으면 에러 반환
export function handleJoinRoom(
  socketId: string,
  payload: JoinRoomPayload
): JoinRoomResult {
  const roomId = normalizeRoomId(payload.roomId);
  const userName = payload.userName.trim();

  if (!isValidRoomId(roomId)) {
    return { success: false, errorMessage: '유효하지 않은 방 ID입니다.' };
  }

  if (!isValidUserName(userName)) {
    return { success: false, errorMessage: '유효하지 않은 이름입니다.' };
  }

  const roomExists = roomStore.hasRoom(roomId);

  if (payload.joinMode === 'join' && !roomExists) {
    return { success: false, errorMessage: '존재하지 않는 방입니다.' };
  }

  // 보안: 방 인원 수 제한 (DoS 방어 + 성능 보호)
  if (roomExists && roomStore.getRoomSize(roomId) >= MAX_PARTICIPANTS_PER_ROOM) {
    return { success: false, errorMessage: '방 인원이 가득 찼습니다.' };
  }

  if (!roomExists) {
    roomStore.createRoom(roomId);
    console.log(`[room] created: ${roomId}`);
  }

  // 입장 전 기존 참가자 목록 수집
  const room = roomStore.getRoom(roomId)!;
  const existingParticipants: RoomParticipant[] = Array.from(room).map((id) => ({
    socketId: id,
    userName: roomStore.getUserName(id),
  }));

  // 방에 추가
  roomStore.addSocketToRoom(roomId, socketId);
  roomStore.setUser(socketId, { roomId, userName });

  console.log(`[room] ${userName}(${socketId}) joined: ${roomId}`);

  return { success: true, existingParticipants };
}

// leave-room / disconnect 공통 퇴장 처리
export function handleLeaveRoom(socketId: string): { roomId: string } | null {
  const user = roomStore.getUser(socketId);
  if (!user) return null;

  const { roomId } = user;

  roomStore.removeSocketFromRoom(roomId, socketId);

  if (roomStore.getRoomSize(roomId) === 0) {
    roomStore.deleteRoom(roomId);
    console.log(`[room] deleted empty room: ${roomId}`);
  }

  roomStore.deleteUser(socketId);

  console.log(`[room] ${socketId} left: ${roomId}`);

  return { roomId };
}

// REST API용: 방 존재 여부 + 참가자 수 조회
export function getRoomInfo(roomId: string): { exists: boolean; participantCount: number } {
  const normalized = normalizeRoomId(roomId);
  const exists = roomStore.hasRoom(normalized);
  return {
    exists,
    participantCount: exists ? roomStore.getRoomSize(normalized) : 0,
  };
}

// 소켓이 현재 속한 방 ID 조회 (없으면 null)
export function getSocketRoomId(socketId: string): string | null {
  return roomStore.getUser(socketId)?.roomId ?? null;
}

// 두 소켓이 동일한 방에 속해 있는지 확인
// 시그널링 중계 전 방 멤버십 검증에 사용
export function arePeersInSameRoom(socketIdA: string, socketIdB: string): boolean {
  const roomIdA = roomStore.getUser(socketIdA)?.roomId;
  const roomIdB = roomStore.getUser(socketIdB)?.roomId;
  return roomIdA !== undefined && roomIdA === roomIdB;
}

// REST API용: 고유한 roomId를 생성하고 빈 방을 미리 등록한다
// 충돌 시 최대 5회 재시도하며, 모두 실패하면 에러를 throw한다
export function handleCreateRoom(): CreateRoomResult {
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const roomId = generateRoomId();
    if (!roomStore.hasRoom(roomId)) {
      roomStore.createRoom(roomId);
      console.log(`[room] pre-created: ${roomId}`);
      return { roomId };
    }
  }
  throw new Error('[room] failed to generate unique roomId after max retries');
}
