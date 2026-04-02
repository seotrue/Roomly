// ─────────────────────────────────────────────
// 자막 (Transcript) 타입 정의
// ─────────────────────────────────────────────

/**
 * 개별 자막 엔트리
 * Web Speech API의 결과를 Socket.io로 공유하는 단위
 */
export type TranscriptEntry = {
  id: string; // crypto.randomUUID()
  speakerId: string; // socketId
  speakerName: string; // userName
  text: string; // 인식된 텍스트
  timestamp: number; // Date.now()
  isFinal: boolean; // interim vs final
  language: string; // 'ko-KR' | 'en-US'
};

/**
 * 회의 요약 결과
 * Claude API가 생성하는 JSON 응답
 */
export type MeetingSummary = {
  summary: string; // 마크다운 형식 요약
  keyPoints: string[]; // 핵심 포인트 목록
  actionItems: string[]; // 액션 아이템 목록
  duration: number; // 회의 시간 (ms)
  participantNames: string[]; // 참가자 이름 목록
  generatedAt: number; // 생성 시각 (Date.now())
};

/**
 * 자막 인식 상태
 * - idle: 비활성
 * - listening: 인식 중
 * - paused: 일시 정지
 * - unsupported: 브라우저 미지원
 */
export type TranscriptionStatus =
  | "idle"
  | "listening"
  | "paused"
  | "unsupported";

/**
 * 요약 생성 상태
 * - idle: 대기
 * - requesting: 요약 생성 중
 * - completed: 완료
 * - error: 실패
 */
export type SummaryStatus = "idle" | "requesting" | "completed" | "error";

/**
 * 지원하는 언어 코드
 */
export type SupportedLanguage = "ko-KR" | "en-US";
