import { roomStore } from './room-store';
import { normalizeRoomId, isValidRoomId, isValidUserName } from './room-utils';
import type { JoinRoomPayload, JoinRoomResult, RoomParticipant } from './room-types';

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
