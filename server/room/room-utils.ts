// roomId를 소문자 + trim으로 정규화
export function normalizeRoomId(roomId: string): string {
  return roomId.trim().toLowerCase();
}

// 영문 소문자 + 숫자 8자리 roomId 생성
export function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// roomId 유효성 검사 (영문+숫자, 1~40자)
export function isValidRoomId(roomId: string): boolean {
  return /^[a-z0-9]{1,40}$/.test(roomId);
}

// userName 유효성 검사 (공백 제거 후 1자 이상, 20자 이하)
export function isValidUserName(userName: string): boolean {
  const trimmed = userName.trim();
  return trimmed.length >= 1 && trimmed.length <= 20;
}
