import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ─────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────

/**
 * MediaStream의 모든 트랙을 정지시킵니다.
 * track.stop()을 호출해야 카메라/마이크 LED가 꺼지고 하드웨어가 해제됩니다.
 */
function stopStreamTracks(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

// ─────────────────────────────────────────────
// 스트림 + 미디어 제어 관리
// ─────────────────────────────────────────────

type MediaState = {
  // 스트림
  localStream: MediaStream | null; // 내 카메라/마이크 스트림 (getUserMedia 결과)
  remoteStreams: Map<string, MediaStream>; // 상대방 스트림. socketId → MediaStream
  // WebRTC ontrack 이벤트에서 세팅됨

  // 내 미디어 상태 (Controls 버튼 UI에 반영)
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
};

type MediaActions = {
  // getUserMedia() 성공 후 로컬 스트림 저장
  // null을 넣으면 스트림 해제 (퇴장 시)
  setLocalStream: (stream: MediaStream | null) => void;

  // WebRTC pc.ontrack 이벤트에서 상대방 스트림 수신 시 저장
  // VideoTile에서 이 스트림을 video.srcObject에 연결해 영상 표시
  setRemoteStream: (socketId: string, stream: MediaStream) => void;

  // user-left 수신 후 해당 참가자 스트림 제거
  removeRemoteStream: (socketId: string) => void;

  // 마이크 토글 후 UI 상태 동기화
  // 실제 track.enabled 조작은 useMedia 훅에서 담당
  setAudioEnabled: (enabled: boolean) => void;

  // 카메라 토글 후 UI 상태 동기화
  setVideoEnabled: (enabled: boolean) => void;

  // 화면 공유 시작/종료 후 UI 상태 동기화
  setScreenSharing: (sharing: boolean) => void;

  // 방 퇴장 시 전체 스트림을 정리하고 미디어 상태 리셋
  // 단순 초기화가 아니라 스트림 트랙도 직접 stop() 해줘야 메모리 누수 방지
  resetMedia: () => void;
};

const initialState: MediaState = {
  localStream: null,
  remoteStreams: new Map(),
  isAudioEnabled: true, // 입장 시 마이크 기본 ON
  isVideoEnabled: true, // 입장 시 카메라 기본 ON
  isScreenSharing: false,
};

// ─────────────────────────────────────────────
// Store 생성
// ─────────────────────────────────────────────

export const useMediaStore = create<MediaState & MediaActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setLocalStream: (stream) =>
        set(
          (state) => {
            // 기존 스트림이 있으면 트랙 정리 (메모리 누수 방지)
            stopStreamTracks(state.localStream);
            return { localStream: stream };
          },
          false,
          'setLocalStream'
        ),

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
            // 제거 전에 스트림 트랙 정리 (메모리 누수 방지)
            stopStreamTracks(state.remoteStreams.get(socketId));

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

      resetMedia: () =>
        set(
          () => {
            const state = get();

            // localStream 트랙 정리
            stopStreamTracks(state.localStream);

            // 상대방 스트림도 정리
            // (실제로는 pc.close()가 먼저지만 혹시 남아있을 경우를 대비)
            state.remoteStreams.forEach((stream) => stopStreamTracks(stream));

            // 모든 상태를 초기값으로 리셋 (새 Map 인스턴스 생성)
            return {
              localStream: null,
              remoteStreams: new Map(),
              isAudioEnabled: true,
              isVideoEnabled: true,
              isScreenSharing: false,
            };
          },
          false,
          'resetMedia'
        ),
    }),
    { name: 'MediaStore' }
  )
);

// ─────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────

// 내 로컬 스트림 (내 VideoTile에 사용)
export const useLocalStream = () =>
  useMediaStore((state) => state.localStream);

// 특정 참가자의 원격 스트림 (VideoTile의 video.srcObject에 연결)
export const useRemoteStream = (socketId: string) =>
  useMediaStore((state) => state.remoteStreams.get(socketId));

// 내 마이크/카메라/화면공유 상태 (Controls 버튼 아이콘에 사용)
// shallow equality로 불필요한 리렌더 방지
export const useMyMediaState = () =>
  useMediaStore(
    useShallow((state) => ({
      isAudioEnabled: state.isAudioEnabled,
      isVideoEnabled: state.isVideoEnabled,
      isScreenSharing: state.isScreenSharing,
    }))
  );
