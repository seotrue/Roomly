import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ─────────────────────────────────────────────
// 연결 상태 + 방 기본 정보 관리
// ─────────────────────────────────────────────

// 소켓 연결 상태
// idle: 초기값 (연결 전)
// connecting: join-room emit 직후 ~ room-joined 수신 전
// connected: room-joined 수신 완료
// error: join-room-error 수신 or getUserMedia 실패
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type ConnectionState = {
  // 내 정보 — room-joined 수신 후 세팅
  roomId: string | null;
  mySocketId: string | null; // Socket.io가 자동 부여하는 고유 연결 ID
  myUserName: string | null;

  // 연결 상태 + 에러
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
};

type ConnectionActions = {
  // room-joined 이벤트 수신 후 호출
  // socketId는 socket.id 값 (서버가 자동 부여)
  setRoomInfo: (roomId: string, socketId: string, userName: string) => void;

  // 소켓 연결 단계 추적용
  setConnectionStatus: (status: ConnectionStatus) => void;

  // join-room-error 등 에러 메시지 표시용
  setErrorMessage: (message: string | null) => void;

  // 방 퇴장 시 연결 정보 초기화
  resetConnection: () => void;
};

const initialState: ConnectionState = {
  roomId: null,
  mySocketId: null,
  myUserName: null,
  connectionStatus: 'idle',
  errorMessage: null,
};

// ─────────────────────────────────────────────
// Store 생성
// ─────────────────────────────────────────────

export const useConnectionStore = create<ConnectionState & ConnectionActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setRoomInfo: (roomId, socketId, userName) =>
        set(
          { roomId, mySocketId: socketId, myUserName: userName },
          false,
          'setRoomInfo'
        ),

      setConnectionStatus: (status) =>
        set({ connectionStatus: status }, false, 'setConnectionStatus'),

      setErrorMessage: (message) =>
        set({ errorMessage: message }, false, 'setErrorMessage'),

      resetConnection: () => set({ ...initialState }, false, 'resetConnection'),
    }),
    { name: 'ConnectionStore' }
  )
);

// ─────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────

// 방 정보 조회 (shallow equality로 불필요한 리렌더 방지)
export const useRoomInfo = () =>
  useConnectionStore(
    useShallow((state) => ({
      roomId: state.roomId,
      mySocketId: state.mySocketId,
      myUserName: state.myUserName,
    }))
  );

// 소켓 연결 상태 (로딩/에러 UI에 사용)
export const useConnectionStatus = () =>
  useConnectionStore((state) => state.connectionStatus);

// 에러 메시지
export const useErrorMessage = () =>
  useConnectionStore((state) => state.errorMessage);
