// ─────────────────────────────────────────────
// 방 관련 스토어 통합 export
// ─────────────────────────────────────────────

// 연결 상태 + 방 기본 정보
export {
  useConnectionStore,
  useRoomInfo,
  useConnectionStatus,
  useErrorMessage,
  type ConnectionStatus,
} from './connectionStore';

// 참가자 관리
export {
  useParticipantStore,
  useParticipant,
  useParticipantList,
  useParticipantCount,
} from './participantStore';

// 스트림 + 미디어 제어
export {
  useMediaStore,
  useLocalStream,
  useRemoteStream,
  useMyMediaState,
} from './mediaStore';

// ─────────────────────────────────────────────
// Internal imports for helper functions
// ─────────────────────────────────────────────

import { useConnectionStore } from './connectionStore';
import { useParticipantStore } from './participantStore';
import { useMediaStore } from './mediaStore';

// ─────────────────────────────────────────────
// 전체 리셋 헬퍼
// ─────────────────────────────────────────────

/**
 * 방 퇴장 시 모든 스토어를 초기화하는 헬퍼 함수
 * 
 * 사용 예시:
 * ```ts
 * const handleLeaveRoom = () => {
 *   resetAllRoomStores();
 *   router.push('/');
 * };
 * ```
 */
export const resetAllRoomStores = () => {
  useConnectionStore.getState().resetConnection();
  useParticipantStore.getState().resetParticipants();
  useMediaStore.getState().resetMedia();
};
