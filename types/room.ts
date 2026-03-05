// 참가자 정보
export type Participant = {
  id: string;
  name: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
};

// 방 정보
export type Room = {
  id: string;
  name: string;
  createdAt: Date;
  participants: Participant[];
};

// 미디어 설정
export type MediaSettings = {
  audio: boolean;
  video: boolean;
};

// WebRTC 시그널링 메시지 타입
export type SignalingMessage =
  | {
      type: 'offer';
      from: string;
      to: string;
      offer: RTCSessionDescriptionInit;
    }
  | {
      type: 'answer';
      from: string;
      to: string;
      answer: RTCSessionDescriptionInit;
    }
  | {
      type: 'ice-candidate';
      from: string;
      to: string;
      candidate: RTCIceCandidateInit;
    }
  | {
      type: 'user-joined';
      userId: string;
      userName: string;
    }
  | {
      type: 'user-left';
      userId: string;
    }
  | {
      type: 'media-state-changed';
      userId: string;
      audio: boolean;
      video: boolean;
    };

// Socket.io 이벤트 타입
export type SocketEvents = {
  // Client -> Server
  'join-room': (roomId: string, userName: string) => void;
  'leave-room': (roomId: string) => void;
  'signal': (message: SignalingMessage) => void;
  'toggle-audio': (roomId: string, enabled: boolean) => void;
  'toggle-video': (roomId: string, enabled: boolean) => void;
  'start-screen-share': (roomId: string) => void;
  'stop-screen-share': (roomId: string) => void;

  // Server -> Client
  'room-joined': (participants: Participant[]) => void;
  'user-joined': (userId: string, userName: string) => void;
  'user-left': (userId: string) => void;
  'signal-received': (message: SignalingMessage) => void;
  'media-state-changed': (userId: string, audio: boolean, video: boolean) => void;
  'error': (message: string) => void;
};

// Peer Connection 상태
export type PeerConnectionState = {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
};
