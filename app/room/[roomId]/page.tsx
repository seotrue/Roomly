'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useMedia } from '@/hooks/useMedia';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSocket } from '@/hooks/useSocket';
import { useParticipantList } from '@/store/room/participantStore';
import { useConnectionStore } from '@/store/room/connectionStore';
import { useMediaStore, useMyMediaState } from '@/store/room/mediaStore';
import '@/styles/room.scss';

// ─────────────────────────────────────────────────────────────────────────────
// RoomPage
//
// 역할: 방 페이지의 최상위 컴포넌트. 훅 조립 + 비디오 그리드 + 컨트롤 바 렌더링.
//
// 훅 의존성 구조:
//   useMedia  →  localStream
//                   ↓
//   useWebRTC ←  localStream, sendConnectionProposal/sendConnectionResponse/sendNetworkPath (useSocket에서 주입)
//                   ↓ initiateConnectionsWithExistingPeers, acceptProposalAndRespond, finalizeConnection, addNetworkPath
//   useSocket ←  위 핸들러들 + roomId/userName/joinMode
//                   ↓ sendConnectionProposal, sendConnectionResponse, sendNetworkPath
//
// 순환 참조 해결:
//   useWebRTC이 send 함수들을 필요로 하고, useSocket이 핸들러들을 필요로 함.
//   page.tsx에서 두 훅을 선언하고 클로저 래퍼로 연결하여 순환 참조 없이 조립.
// ─────────────────────────────────────────────────────────────────────────────

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL에서 방 정보 추출 — 마운트 후 변경되지 않는 고정값
  const roomId = params.roomId as string;
  const userName = searchParams.get('name') ?? '익명';
  const joinMode = (searchParams.get('mode') ?? 'join') as 'create' | 'join';

  // ── 1단계: 미디어 스트림 획득 ──────────────────────────────────────────
  // 마운트 즉시 카메라/마이크 권한 요청.
  // localStream이 null이면 내 비디오 자리에 아바타 플레이스홀더 표시.
  const { localStream } = useMedia();

  // ── 2단계: WebRTC 연결 관리 준비 ───────────────────────────────────────
  // send 함수들은 아직 선언 전이지만,
  // 실제 호출 시점(소켓 이벤트 수신 후)에는 이미 useSocket이 초기화되어 있음.
  // 클로저 래퍼로 나중에 참조되도록 처리.
  const {
    initiateConnectionsWithExistingPeers,
    acceptProposalAndRespond,
    finalizeConnection,
    addNetworkPath,
    cleanupPeer,
    cleanupAllPeers,
  } = useWebRTC({
    localStream,
    sendOffer: (targetId, offer) => sendConnectionProposal(targetId, offer),
    sendAnswer: (targetId, answer) => sendConnectionResponse(targetId, answer),
    sendIceCandidate: (targetId, candidate) => sendNetworkPath(targetId, candidate),
  });

  // ── 3단계: 소켓 연결 + 시그널링 이벤트 바인딩 ─────────────────────────
  // useWebRTC에서 반환된 핸들러들을 onXxx 콜백으로 주입.
  // 소켓이 connect 되면 자동으로 join-room을 emit.
  const { sendConnectionProposal, sendConnectionResponse, sendNetworkPath } = useSocket({
    roomId,
    userName,
    joinMode,
    onRoomJoined: initiateConnectionsWithExistingPeers,  // room-joined → 기존 참가자에게 연결 시작
    onUserLeft: (socketId) => cleanupPeer(socketId),     // user-left → peer 연결 종료
    onOffer: acceptProposalAndRespond,                   // offer 수신 → 제안 수락 및 응답
    onAnswer: finalizeConnection,                        // answer 수신 → 연결 완료
    onIceCandidate: addNetworkPath,                      // ice-candidate 수신 → 네트워크 경로 추가
  });

  // ── store 구독 (렌더링용 상태) ──────────────────────────────────────────
  // 참가자 목록: useParticipantList 셀렉터 사용
  // Array.from()을 직접 셀렉터에 쓰면 매 렌더마다 새 배열 참조 → 무한루프 발생
  // participantStore에 미리 정의된 셀렉터는 내부에서 안정적으로 처리됨
  const participants = useParticipantList();
  // 연결 상태: 'connecting' | 'connected' | 'error' | 'idle'
  const connectionStatus = useConnectionStore((state) => state.connectionStatus);
  // 마이크/카메라 ON/OFF 상태 (버튼 활성화 스타일 적용용)
  // useMyMediaState: mediaStore에 미리 정의된 useShallow 셀렉터 — 객체 반환 시 무한루프 방지
  const { isAudioEnabled, isVideoEnabled } = useMyMediaState();

  // ── 컨트롤 핸들러 ───────────────────────────────────────────────────────

  // 마이크 토글: track.enabled 직접 제어 (track.stop()이 아님 — 재활성화 가능)
  // track.stop()은 하드웨어를 완전히 해제하므로 다시 켜려면 getUserMedia 재호출 필요.
  const toggleAudio = () => {
    const { localStream: stream, isAudioEnabled: enabled, setAudioEnabled } =
      useMediaStore.getState();
    stream?.getAudioTracks().forEach((t) => {
      t.enabled = !enabled; // false면 무음 전송, true면 정상 전송
    });
    setAudioEnabled(!enabled); // store 업데이트 → 버튼 UI 반영
  };

  // 카메라 토글: 마이크 토글과 동일한 패턴
  const toggleVideo = () => {
    const { localStream: stream, isVideoEnabled: enabled, setVideoEnabled } =
      useMediaStore.getState();
    stream?.getVideoTracks().forEach((t) => {
      t.enabled = !enabled;
    });
    setVideoEnabled(!enabled);
  };

  // 나가기: 모든 peer 연결 종료 후 홈으로 이동
  // useMedia의 cleanup(resetMedia)은 컴포넌트 언마운트 시 자동 실행됨
  const handleLeave = () => {
    cleanupAllPeers(); // 모든 RTCPeerConnection.close()
    router.push('/');
  };

  // 비디오 그리드 레이아웃 클래스: 참가자 수에 따라 다른 CSS 적용
  const participantCount = participants.length + 1; // 나 포함한 전체 수

  return (
    <div className="room-container">
      {/* 연결 중 오버레이 */}
      {connectionStatus === 'connecting' && (
        <div className="room-connecting">연결 중...</div>
      )}
      {/* 연결 실패 오버레이 */}
      {connectionStatus === 'error' && (
        <div className="room-error">연결에 실패했습니다.</div>
      )}

      {/* 비디오 그리드: 참가자 수에 따라 video-grid--1, --2, --3 ... 클래스 적용 */}
      <main className="room-main">
        <div className={`video-grid video-grid--${participantCount}`}>
          {/* 내 비디오 타일 */}
          <div className="video-tile video-tile--local">
            {localStream ? (
              // getUserMedia 성공 → 실제 비디오 표시
              <LocalVideo stream={localStream} />
            ) : (
              // 권한 요청 중 or 실패 → 이니셜 아바타 표시
              <div className="video-tile__placeholder">
                <span className="video-tile__avatar">{userName[0].toUpperCase()}</span>
              </div>
            )}
            <div className="video-tile__info">
              <span className="video-tile__name">{userName} (나)</span>
            </div>
          </div>

          {/* 원격 참가자 비디오 타일: store의 participants Map 기반으로 렌더링 */}
          {participants.map((p) => (
            <RemoteVideo key={p.id} socketId={p.id} name={p.name} />
          ))}
        </div>
      </main>

      {/* 하단 컨트롤 바 */}
      <footer className="controls">
        {/* 좌측: 방 ID 표시 */}
        <div className="controls__left">
          <span className="controls__room-id">방 ID: {roomId}</span>
        </div>

        {/* 중앙: 미디어 컨트롤 버튼들 */}
        <div className="controls__center">
          {/* 마이크 토글: active 클래스로 ON/OFF 스타일 구분 */}
          <button
            type="button"
            className={`controls__btn ${isAudioEnabled ? 'controls__btn--active' : ''}`}
            aria-label={isAudioEnabled ? '마이크 끄기' : '마이크 켜기'}
            onClick={toggleAudio}
          >
            <MicIcon />
          </button>

          {/* 카메라 토글 */}
          <button
            type="button"
            className={`controls__btn ${isVideoEnabled ? 'controls__btn--active' : ''}`}
            aria-label={isVideoEnabled ? '카메라 끄기' : '카메라 켜기'}
            onClick={toggleVideo}
          >
            <CameraIcon />
          </button>

          {/* 화면 공유 (5단계에서 구현 예정) */}
          <button type="button" className="controls__btn" aria-label="화면 공유">
            <ScreenShareIcon />
          </button>

          {/* 나가기: 모든 peer 정리 + 홈 이동 */}
          <button
            type="button"
            className="controls__btn controls__btn--danger"
            aria-label="나가기"
            onClick={handleLeave}
          >
            <HangUpIcon />
          </button>
        </div>

        {/* 우측: 참가자 수 표시 */}
        <div className="controls__right">
          <span className="controls__participant-count">{participantCount}명 참여 중</span>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalVideo
//
// 내 카메라 스트림을 표시하는 video 엘리먼트.
// muted: 내 목소리가 내 스피커로 나오지 않도록 (하울링 방지)
// autoPlay: 스트림 연결 즉시 재생
// playsInline: iOS Safari에서 전체화면 없이 인라인 재생
// ─────────────────────────────────────────────────────────────────────────────

function LocalVideo({ stream }: { stream: MediaStream }) {
  return (
    <video
      className="video-tile__video"
      autoPlay
      muted
      playsInline
      ref={(el) => {
        // React ref 콜백: DOM 노드가 마운트될 때 srcObject를 직접 설정.
        // srcObject는 JSX attribute로 설정 불가 → ref 콜백으로 처리.
        if (el) el.srcObject = stream;
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RemoteVideo
//
// 원격 참가자의 스트림을 표시하는 비디오 타일.
// mediaStore에서 해당 socketId의 remoteStream을 구독.
// stream이 없으면 (WebRTC 연결 전) 이니셜 아바타 플레이스홀더 표시.
// ─────────────────────────────────────────────────────────────────────────────

function RemoteVideo({ socketId, name }: { socketId: string; name: string }) {
  // pc.ontrack 이벤트로 스트림이 수신되면 store에 저장되고 여기서 구독됨
  const remoteStream = useMediaStore((state) => state.remoteStreams.get(socketId));

  return (
    <div className="video-tile">
      {remoteStream ? (
        // WebRTC 연결 완료 → 실제 원격 스트림 표시
        <video
          className="video-tile__video"
          autoPlay
          playsInline
          ref={(el) => {
            if (el) el.srcObject = remoteStream;
          }}
        />
      ) : (
        // WebRTC 연결 대기 중 → 이니셜 아바타
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

// ── 아이콘 (인라인 SVG) ───────────────────────────────────────────────────────

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
