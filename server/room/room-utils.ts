import { randomUUID } from 'crypto';

// roomId를 소문자 + trim으로 정규화
export function normalizeRoomId(roomId: string): string {
  return roomId.trim().toLowerCase();
}

// UUID 기반 roomId 생성 (보안 강화)
// 형식: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
// 브루트포스 공격 불가능 (2^122 경우의 수)
export function generateRoomId(): string {
  return randomUUID();
}

// roomId 유효성 검사
// UUID 형식 또는 기존 8자리 영문+숫자 모두 허용 (하위 호환성)
export function isValidRoomId(roomId: string): boolean {
  // UUID 형식: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  // 기존 8자리 형식 (하위 호환성)
  const legacyPattern = /^[a-z0-9]{1,40}$/;

  return uuidPattern.test(roomId) || legacyPattern.test(roomId);
}

// userName 유효성 검사 (공백 제거 후 1자 이상, 20자 이하)
// 보안: HTML 특수문자, 제어문자 차단으로 XSS 방어
export function isValidUserName(userName: string): boolean {
  const trimmed = userName.trim();

  // 길이 검증
  if (trimmed.length < 1 || trimmed.length > 20) {
    return false;
  }

  // XSS 방어: HTML 특수문자 차단
  // <script>, <img>, <iframe> 등의 태그 삽입 불가
  const dangerousChars = /[<>'"&]/;
  if (dangerousChars.test(trimmed)) {
    return false;
  }

  // 제어문자 차단 (줄바꿈, 탭 등)
  // \x00-\x1F: 제어문자, \x7F: DEL
  const controlChars = /[\x00-\x1F\x7F]/;
  if (controlChars.test(trimmed)) {
    return false;
  }

  return true;
}
