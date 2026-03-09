'use client';

import { useParams, useSearchParams } from 'next/navigation';
import '@/styles/room.scss';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const roomId = params.roomId as string;
  const userName = searchParams.get('name') ?? '익명';

  return (
    <div className="room-container">
      {/* 비디오 그리드 영역 */}
      <main className="room-main">
        <div className="video-grid video-grid--1">
          {/* 내 비디오 (임시) */}
          <div className="video-tile">
            <div className="video-tile__placeholder">
              <span className="video-tile__avatar">{userName[0].toUpperCase()}</span>
            </div>
            <div className="video-tile__info">
              <span className="video-tile__name">{userName} (나)</span>
            </div>
          </div>
        </div>
      </main>

      {/* 컨트롤 바 */}
      <footer className="controls">
        <div className="controls__left">
          <span className="controls__room-id">방 ID: {roomId}</span>
        </div>

        <div className="controls__center">
          {/* 마이크 */}
          <button type="button" className="controls__btn controls__btn--active" aria-label="마이크 끄기">
            <MicIcon />
          </button>

          {/* 카메라 */}
          <button type="button" className="controls__btn controls__btn--active" aria-label="카메라 끄기">
            <CameraIcon />
          </button>

          {/* 화면 공유 */}
          <button type="button" className="controls__btn" aria-label="화면 공유">
            <ScreenShareIcon />
          </button>

          {/* 나가기 */}
          <button type="button" className="controls__btn controls__btn--danger" aria-label="나가기">
            <HangUpIcon />
          </button>
        </div>

        <div className="controls__right">
          <span className="controls__participant-count">1명 참여 중</span>
        </div>
      </footer>
    </div>
  );
}

// ── 아이콘 (인라인 SVG) ───────────────────

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
