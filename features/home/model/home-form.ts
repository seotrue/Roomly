// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type RoomMode = 'create' | 'join';

export type HomeFormValues = {
  userName: string;
  roomId: string;
  mode: RoomMode;
};

export type HomeFormErrors = {
  userName?: string;
  roomId?: string;
  form?: string;  // API 에러 등 폼 전체 레벨 에러
};

// ─────────────────────────────────────────────
// Normalize
// ─────────────────────────────────────────────

/** 이름 앞뒤 공백 제거 */
export function normalizeUserName(raw: string): string {
  return raw.trim();
}

/** 방 ID 소문자 변환 + 앞뒤 공백 제거 */
export function normalizeRoomId(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 방 ID 입력 중 허용 문자(영문 소문자, 숫자)만 통과 */
export function sanitizeRoomIdInput(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─────────────────────────────────────────────
// Validate
// ─────────────────────────────────────────────

export function validateHomeForm(values: HomeFormValues): HomeFormErrors {
  const errors: HomeFormErrors = {};

  if (!normalizeUserName(values.userName)) {
    errors.userName = '이름을 입력해주세요.';
  }

  if (values.mode === 'join' && !normalizeRoomId(values.roomId)) {
    errors.roomId = '방 ID를 입력해주세요.';
  }

  return errors;
}

// ─────────────────────────────────────────────
// URL Builder
// ─────────────────────────────────────────────

export function buildRoomUrl(values: HomeFormValues, roomId: string): string {
  const params = new URLSearchParams({
    name: normalizeUserName(values.userName),
    mode: values.mode,
  });

  return `/room/${roomId}?${params.toString()}`;
}
