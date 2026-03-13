'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useMedia } from '@/hooks/useMedia';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSocket } from '@/hooks/useSocket';
import { useParticipantStore } from '@/store/room/participantStore';
import { useConnectionStore } from '@/store/room/connectionStore';
import { useMediaStore } from '@/store/room/mediaStore';
import '@/styles/room.scss';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const userName = searchParams.get('name') ?? '익명';
  const joinMode = (searchParams.get('mode') ?? 'join') as 'create' | 'join';

  // ── 미디어 스트림 획득 ──────────────────────
  const { localStream } = useMedia();

  // ── WebRTC (sendOffer 등은 useSocket 초기화 후 주입) ─
  const {
    handleRoomJoined,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanupPeer,
    cleanupAllPeers,
  } = useWebRTC({
    localStream,
    // sendOffer/sendAnswer/sendIceCandidate는 useSocket에서 반환된 함수로 교체 필요.
    // 순환 참조를 피하기 위해 socket ref를 직접 넘기는 대신,
    // useSocket이 반환한 함수를 바인딩 후 사용한다.
    sendOffer: (targetId, offer) => sendOffer(targetId, offer),
    sendAnswer: (targetId, answer) => sendAnswer(targetId, answer),
    sendIceCandidate: (targetId, candidate) => sendIceCandidate(targetId, candidate),
  });

  // ── 소켓 연결 + 시그널링 이벤트 바인딩 ─────
  const { sendOffer, sendAnswer, sendIceCandidate } = useSocket({
    roomId,
    userName,
    joinMode,
    onRoomJoined: handleRoomJoined,
    onUserLeft: (socketId) => cleanupPeer(socketId),
    onOffer: handleOffer,
    onAnswer: handleAnswer,
    onIceCandidate: handleIceCandidate,
  });

  // ── store 구독 (렌더링용) ───────────────────
  const participants = useParticipantStore((state) =>
    Array.from(state.participants.values()),
  );
  const connectionStatus = useConnectionStore((state) => state.connectionStatus);
  const { isAudioEnabled, isVideoEnabled } = useMediaStore((state) => ({
    isAudioEnabled: state.isAudioEnabled,
    isVideoEnabled: state.isVideoEnabled,
  }));

  // ── 컨트롤 핸들러 ───────────────────────────
  const toggleAudio = () => {
    const { localStream: stream, isAudioEnabled: enabled, setAudioEnabled } =
      useMediaStore.getState();
    stream?.getAudioTracks().forEach((t) => {
      t.enabled = !enabled;
    });
    setAudioEnabled(!enabled);
  };

  const toggleVideo = () => {
    const { localStream: stream, isVideoEnabled: enabled, setVideoEnabled } =
      useMediaStore.getState();
    stream?.getVideoTracks().forEach((t) => {
      t.enabled = !enabled;
    });
    setVideoEnabled(!enabled);
  };

  const handleLeave = () => {
    cleanupAllPeers();
    router.push('/');
  };

  const participantCount = participants.length + 1; // 나 포함

  return (
    <div className="room-container">
      {connectionStatus === 'connecting' && (
        <div className="room-connecting">연결 중...</div>
      )}
      {connectionStatus === 'error' && (
        <div className="room-error">연결에 실패했습니다.</div>
      )}

      {/* 비디오 그리드 */}
      <main className="room-main">
        <div className={`video-grid video-grid--${participantCount}`}>
          {/* 내 비디오 */}
          <div className="video-tile video-tile--local">
            {localStream ? (
              <LocalVideo stream={localStream} />
            ) : (
              <div className="video-tile__placeholder">
                <span className="video-tile__avatar">{userName[0].toUpperCase()}</span>
              </div>
            )}
            <div className="video-tile__info">
              <span className="video-tile__name">{userName} (나)</span>
            </div>
          </div>

          {/* 참가자 비디오 */}
          {participants.map((p) => (
            <RemoteVideo key={p.id} socketId={p.id} name={p.name} />
          ))}
        </div>
      </main>

      {/* 컨트롤 바 */}
      <footer className="controls">
        <div className="controls__left">
          <span className="controls__room-id">방 ID: {roomId}</span>
        </div>

        <div className="controls__center">
          <button
            type="button"
            className={`controls__btn ${isAudioEnabled ? 'controls__btn--active' : ''}`}
            aria-label={isAudioEnabled ? '마이크 끄기' : '마이크 켜기'}
            onClick={toggleAudio}
          >
            <MicIcon />
          </button>

          <button
            type="button"
            className={`controls__btn ${isVideoEnabled ? 'controls__btn--active' : ''}`}
            aria-label={isVideoEnabled ? '카메라 끄기' : '카메라 켜기'}
            onClick={toggleVideo}
          >
            <CameraIcon />
          </button>

          <button type="button" className="controls__btn" aria-label="화면 공유">
            <ScreenShareIcon />
          </button>

          <button
            type="button"
            className="controls__btn controls__btn--danger"
            aria-label="나가기"
            onClick={handleLeave}
          >
            <HangUpIcon />
          </button>
        </div>

        <div className="controls__right">
          <span className="controls__participant-count">{participantCount}명 참여 중</span>
        </div>
      </footer>
    </div>
  );
}

// ── 로컬 비디오 ───────────────────────────────

function LocalVideo({ stream }: { stream: MediaStream }) {
  return (
    <video
      className="video-tile__video"
      autoPlay
      muted
      playsInline
      ref={(el) => {
        if (el) el.srcObject = stream;
      }}
    />
  );
}

// ── 원격 비디오 ───────────────────────────────

function RemoteVideo({ socketId, name }: { socketId: string; name: string }) {
  const remoteStream = useMediaStore((state) => state.remoteStreams.get(socketId));

  return (
    <div className="video-tile">
      {remoteStream ? (
        <video
          className="video-tile__video"
          autoPlay
          playsInline
          ref={(el) => {
            if (el) el.srcObject = remoteStream;
          }}
        />
      ) : (
        <div className="video-tile__placeholder">
          <span className="video-tile__avatar">{name[0].toUpperCase()}</span>
        </div>
      )}
      <div className="video-tile__info">
        <span className="video-tile__name">{name}</span>
      </div>
    </div>
  );
}

// ── 아이콘 (인라인 SVG) ───────────────────────

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 8a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11h2z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6zm8 2l-4 4h3v4h2v-4h3l-4-4z" />
    </svg>
  );
}

function HangUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08A.99.99 0 0 1 0 12.37c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.66c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
    </svg>
  );
}
