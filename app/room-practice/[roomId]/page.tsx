"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranscriptionPractice } from "@/hooks/useTranscription-practice";
import { useTranscriptEntries } from "@/store/room/transcriptStore-practice";

export default function RoomPracticePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const userName = searchParams.get("name") || "익명";

  // ========================================
  // ✅ Step 1-4: 완료된 코드
  // ========================================

  // Step 1: 자막 활성화 상태
  const [isTranscriptEnabled, setIsTranscriptEnabled] = useState(false);
  const [isTranscriptPanelOpen, setIsTranscriptPanelOpen] = useState(false);

  // Step 4: Store에서 entries 가져오기
  const entries = useTranscriptEntries();

  // Step 3: useTranscription Hook 호출
  useTranscriptionPractice({
    enabled: isTranscriptEnabled,
    language: "ko-KR",
    speakerId: "practice-user-id",
    speakerName: userName,
  });

  // Step 1: 자막 토글 함수
  const toggleTranscript = () => {
    setIsTranscriptEnabled((prev) => {
      const nextEnabled = !prev;
      // 자막 켜면 패널도 자동으로 열기
      if (nextEnabled) {
        setIsTranscriptPanelOpen(true);
      }
      return nextEnabled;
    });
  };

  return (
    <div className="room-container">
      <main className="room-main">
        <div className="video-grid">
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h1>연습용 방: {roomId}</h1>
            <p>이름: {userName}</p>
          </div>
        </div>

        {/* Step 5: 여기에 자막 패널 작성 */}

      </main>

      {/* 하단 컨트롤 바 */}
      <footer className="controls">
        <div className="controls__left">
          <span className="controls__room-id">방 ID: {roomId}</span>
        </div>

        <div className="controls__center">
          {/* 자막 토글 버튼 */}
          <button
            type="button"
            className={`controls__btn ${isTranscriptEnabled ? "controls__btn--active" : ""}`}
            onClick={toggleTranscript}
          >
            <CaptionIcon />
          </button>

          {/* 나가기 버튼 */}
          <button
            type="button"
            className="controls__btn controls__btn--danger"
            onClick={() => router.push("/")}
          >
            <HangUpIcon />
          </button>
        </div>

        <div className="controls__right">
          <span>연습 모드</span>
        </div>
      </footer>
    </div>
  );
}

// 아이콘 컴포넌트들
function CaptionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2" />
      <path d="M7 15h4M13 15h4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HangUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 9c-3.87 0-7 1.79-7 4v3H3v-3c0-3.87 4.92-7 9-7s9 3.13 9 7v3h-2v-3c0-2.21-3.13-4-7-4z" />
    </svg>
  );
}
