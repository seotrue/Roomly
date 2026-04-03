// ─────────────────────────────────────────────
// 자막 관련 타입 정의 (연습용)
// ─────────────────────────────────────────────

export type TranscriptEntry = {
  id: string; // crypto.randomUUID()
  speakerId: string; // socketId
  speakerName: string; // userName
  text: string; // 인식된 텍스트
  timestamp: number; // Date.now()
  isFinal: boolean; // interim vs final
  language: string; // 'ko-KR' | 'en-US'
};

export type SupportedLanguage = "ko-KR" | "en-US";
