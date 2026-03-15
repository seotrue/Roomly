// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type RoomExistsResponse = {
  exists: boolean;
};

type CreateRoomResponse = {
  roomId: string;
};

export type RoomCheckResult =
  | { exists: true }
  | { exists: false; errorMessage: string };

export type CreateRoomResult =
  | { success: true; roomId: string }
  | { success: false; errorMessage: string };

// ─────────────────────────────────────────────
// Runtime Guards
// ─────────────────────────────────────────────

function isRoomExistsResponse(value: unknown): value is RoomExistsResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'exists' in value &&
    typeof (value as Record<string, unknown>).exists === 'boolean'
  );
}

function isCreateRoomResponse(value: unknown): value is CreateRoomResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'roomId' in value &&
    typeof (value as Record<string, unknown>).roomId === 'string'
  );
}

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

// 로컬: NEXT_PUBLIC_API_URL 미설정 → '' → '/api/rooms' (로컬 Express 처리)
// 프로덕션: NEXT_PUBLIC_API_URL = Render URL → 'https://...onrender.com/api/rooms'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function createRoom(): Promise<CreateRoomResult> {
  try {
    const response = await fetch(`${API_BASE}/api/rooms`, { method: 'POST' });
    const data: unknown = await response.json();

    if (!isCreateRoomResponse(data)) {
      return { success: false, errorMessage: '서버 응답이 올바르지 않습니다.' };
    }

    return { success: true, roomId: data.roomId };
  } catch {
    return { success: false, errorMessage: '서버 연결에 실패했습니다.' };
  }
}

export async function checkRoomExists(roomId: string): Promise<RoomCheckResult> {
  try {
    const response = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}`);
    const data: unknown = await response.json();

    if (!isRoomExistsResponse(data)) {
      return { exists: false, errorMessage: '서버 응답이 올바르지 않습니다.' };
    }

    if (!data.exists) {
      return { exists: false, errorMessage: '존재하지 않는 방입니다.' };
    }

    return { exists: true };
  } catch {
    return { exists: false, errorMessage: '서버 연결에 실패했습니다.' };
  }
}
