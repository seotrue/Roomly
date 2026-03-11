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
