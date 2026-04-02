// ─────────────────────────────────────────────
// 회의 요약 API 타입 정의
// ─────────────────────────────────────────────

/**
 * 회의 요약 요청
 * 클라이언트가 POST /api/summary로 전송하는 데이터
 */
export type SummaryRequest = {
  transcript: Array<{
    speakerName: string;
    text: string;
    timestamp: number;
  }>;
  language: string; // 'ko-KR' | 'en-US'
  meetingDuration: number; // 회의 시간 (ms)
  participantNames: string[]; // 참가자 이름 목록
};

/**
 * 회의 요약 응답 (성공)
 */
export type SummarySuccessResponse = {
  success: true;
  summary: string; // 전체 요약 (3-5 문장)
  keyPoints: string[]; // 핵심 포인트 목록
  actionItems: string[]; // 액션 아이템 목록
};

/**
 * 회의 요약 응답 (실패)
 */
export type SummaryErrorResponse = {
  success: false;
  errorMessage: string;
};

/**
 * 회의 요약 응답 (통합)
 */
export type SummaryResponse = SummarySuccessResponse | SummaryErrorResponse;
