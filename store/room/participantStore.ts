import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Participant } from '@/types/room';

// ─────────────────────────────────────────────
// 참가자 목록 관리
// ─────────────────────────────────────────────

type ParticipantState = {
  // 참가자 목록 (나 제외)
  // Map<socketId, Participant> 구조
  // → socketId를 키로 써야 user-joined/user-left 이벤트에서 O(1) 조회 가능
  participants: Map<string, Participant>;
};

type ParticipantActions = {
  // room-joined 이벤트 payload(기존 참가자 배열)를 Map으로 변환해 저장
  // 배열 → Map 이유: socketId로 O(1) 조회하기 위함
  setParticipants: (participants: Participant[]) => void;

  // user-joined 이벤트 수신 시 호출 — 새 참가자 1명 추가
  addParticipant: (participant: Participant) => void;

  // user-left 이벤트 수신 시 호출 — 퇴장한 참가자 제거
  removeParticipant: (socketId: string) => void;

  // media-state-changed 이벤트 수신 시 호출
  // 상대방의 마이크/카메라 상태가 바뀌면 해당 참가자 정보만 업데이트
  updateParticipantMedia: (
    socketId: string,
    audio: boolean,
    video: boolean
  ) => void;

  // 방 퇴장 시 참가자 목록 초기화
  resetParticipants: () => void;
};

const initialState: ParticipantState = {
  participants: new Map(),
};

// ─────────────────────────────────────────────
// Store 생성
// ─────────────────────────────────────────────

export const useParticipantStore = create<ParticipantState & ParticipantActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setParticipants: (participants) =>
        set(
          {
            // 배열을 Map으로 변환: [p.id, p] 쌍으로 구성
            // p.id === socketId (서버의 RoomParticipant.socketId와 동일)
            participants: new Map(participants.map((p) => [p.id, p])),
          },
          false,
          'setParticipants'
        ),

      addParticipant: (participant) =>
        set(
          (state) => ({
            // Map을 직접 mutate하면 Zustand가 변경을 감지 못함
            // → 반드시 new Map()으로 복사 후 수정
            participants: new Map(state.participants).set(
              participant.id,
              participant
            ),
          }),
          false,
          'addParticipant'
        ),

      removeParticipant: (socketId) =>
        set(
          (state) => {
            const next = new Map(state.participants);
            next.delete(socketId);
            return { participants: next };
          },
          false,
          'removeParticipant'
        ),

      updateParticipantMedia: (socketId, audio, video) =>
        set(
          (state) => {
            const participant = state.participants.get(socketId);
            // 이미 퇴장한 참가자면 아무것도 안 함
            if (!participant) return {};

            const next = new Map(state.participants);
            // 기존 participant 객체를 스프레드로 복사 후 미디어 상태만 덮어씀
            next.set(socketId, {
              ...participant,
              isAudioEnabled: audio,
              isVideoEnabled: video,
            });
            return { participants: next };
          },
          false,
          'updateParticipantMedia'
        ),

      resetParticipants: () =>
        set({ ...initialState }, false, 'resetParticipants'),
    }),
    { name: 'ParticipantStore' }
  )
);

// ─────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────

// 특정 참가자 1명 조회 (VideoTile에서 사용)
export const useParticipant = (socketId: string) =>
  useParticipantStore((state) => state.participants.get(socketId));

// 참가자 전체 배열 (VideoGrid에서 타일 목록 렌더링에 사용)
export const useParticipantList = () =>
  useParticipantStore((state) => Array.from(state.participants.values()));

// 참가자 수
export const useParticipantCount = () =>
  useParticipantStore((state) => state.participants.size);
