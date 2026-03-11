import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Participant } from '@/types/room';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type RoomState = {
  // 내 정보
  roomId: string | null;
  mySocketId: string | null;
  myUserName: string | null;

  // 참가자 (나 제외, socketId → Participant)
  participants: Map<string, Participant>;

  // 스트림
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>; // socketId → MediaStream

  // 내 미디어 상태
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  // 연결 상태
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
};

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────

type RoomActions = {
  /** 방 입장 성공 시 내 정보 세팅 */
  setRoomInfo: (roomId: string, socketId: string, userName: string) => void;

  /** room-joined 이벤트로 받은 기존 참가자 목록으로 초기화 */
  setParticipants: (participants: Participant[]) => void;

  /** user-joined: 새 참가자 추가 */
  addParticipant: (participant: Participant) => void;

  /** user-left: 참가자 제거 */
  removeParticipant: (socketId: string) => void;

  /** media-state-changed: 참가자 미디어 상태 업데이트 */
  updateParticipantMedia: (
    socketId: string,
    audio: boolean,
    video: boolean
  ) => void;

  /** 로컬 스트림 세팅 (카메라/마이크 획득 후) */
  setLocalStream: (stream: MediaStream | null) => void;

  /** 원격 스트림 세팅 (ontrack 이벤트) */
  setRemoteStream: (socketId: string, stream: MediaStream) => void;

  /** 원격 스트림 제거 (참가자 퇴장) */
  removeRemoteStream: (socketId: string) => void;

  /** 내 마이크 상태 토글 */
  setAudioEnabled: (enabled: boolean) => void;

  /** 내 카메라 상태 토글 */
  setVideoEnabled: (enabled: boolean) => void;

  /** 화면 공유 상태 토글 */
  setScreenSharing: (sharing: boolean) => void;

  /** 연결 상태 업데이트 */
  setConnectionStatus: (status: ConnectionStatus) => void;

  /** 에러 메시지 세팅 */
  setErrorMessage: (message: string | null) => void;

  /** 방 퇴장 시 전체 상태 초기화 */
  resetRoom: () => void;
};

// ─────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────

const initialState: RoomState = {
  roomId: null,
  mySocketId: null,
  myUserName: null,
  participants: new Map(),
  localStream: null,
  remoteStreams: new Map(),
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  connectionStatus: 'idle',
  errorMessage: null,
};

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useRoomStore = create<RoomState & RoomActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setRoomInfo: (roomId, socketId, userName) =>
        set(
          { roomId, mySocketId: socketId, myUserName: userName },
          false,
          'setRoomInfo'
        ),

      setParticipants: (participants) =>
        set(
          {
            participants: new Map(participants.map((p) => [p.id, p])),
          },
          false,
          'setParticipants'
        ),

      addParticipant: (participant) =>
        set(
          (state) => ({
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
            if (!participant) return {};

            const next = new Map(state.participants);
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

      setLocalStream: (stream) =>
        set({ localStream: stream }, false, 'setLocalStream'),

      setRemoteStream: (socketId, stream) =>
        set(
          (state) => ({
            remoteStreams: new Map(state.remoteStreams).set(socketId, stream),
          }),
          false,
          'setRemoteStream'
        ),

      removeRemoteStream: (socketId) =>
        set(
          (state) => {
            const next = new Map(state.remoteStreams);
            next.delete(socketId);
            return { remoteStreams: next };
          },
          false,
          'removeRemoteStream'
        ),

      setAudioEnabled: (enabled) =>
        set({ isAudioEnabled: enabled }, false, 'setAudioEnabled'),

      setVideoEnabled: (enabled) =>
        set({ isVideoEnabled: enabled }, false, 'setVideoEnabled'),

      setScreenSharing: (sharing) =>
        set({ isScreenSharing: sharing }, false, 'setScreenSharing'),

      setConnectionStatus: (status) =>
        set({ connectionStatus: status }, false, 'setConnectionStatus'),

      setErrorMessage: (message) =>
        set({ errorMessage: message }, false, 'setErrorMessage'),

      resetRoom: () =>
        set(
          (state) => {
            // 스트림 트랙 정리 (메모리 누수 방지)
            state.localStream?.getTracks().forEach((t) => t.stop());
            state.remoteStreams.forEach((stream) =>
              stream.getTracks().forEach((t) => t.stop())
            );
            return { ...initialState };
          },
          false,
          'resetRoom'
        ),
    }),
    { name: 'RoomStore' }
  )
);

// ─────────────────────────────────────────────
// Selectors (성능 최적화: 필요한 값만 구독)
// ─────────────────────────────────────────────

export const useParticipant = (socketId: string) =>
  useRoomStore((state) => state.participants.get(socketId));

export const useParticipantList = () =>
  useRoomStore((state) => Array.from(state.participants.values()));

export const useRemoteStream = (socketId: string) =>
  useRoomStore((state) => state.remoteStreams.get(socketId));

export const useLocalStream = () =>
  useRoomStore((state) => state.localStream);

export const useMyMediaState = () =>
  useRoomStore((state) => ({
    isAudioEnabled: state.isAudioEnabled,
    isVideoEnabled: state.isVideoEnabled,
    isScreenSharing: state.isScreenSharing,
  }));

export const useConnectionStatus = () =>
  useRoomStore((state) => state.connectionStatus);
