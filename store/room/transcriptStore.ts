import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type {
  TranscriptEntry,
  MeetingSummary,
  TranscriptionStatus,
  SummaryStatus,
  SupportedLanguage,
} from "@/types/transcript";

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

/**
 * 메모리 보호를 위한 최대 자막 엔트리 수
 * 5000개 = 약 1시간 회의 분량 (평균 3초마다 1개 발화 가정)
 */
const MAX_ENTRIES = 5000;

// ─────────────────────────────────────────────
// 자막 + 요약 관리
// ─────────────────────────────────────────────

type TranscriptState = {
  // 확정된 자막 목록 (시간순)
  entries: TranscriptEntry[];

  // 현재 인식 중인 임시 자막 (interim result)
  // final result가 오면 entries에 추가되고 이 값은 null로 리셋
  interimEntry: TranscriptEntry | null;

  // 자막 인식 상태
  transcriptionStatus: TranscriptionStatus;

  // 현재 인식 언어
  language: SupportedLanguage;

  // 요약 관련
  summary: MeetingSummary | null;
  summaryStatus: SummaryStatus;
  summaryError: string | null;
};

type TranscriptActions = {
  /**
   * 확정 자막 추가 (final result)
   * MAX_ENTRIES 초과 시 오래된 항목부터 제거
   */
  addEntry: (entry: TranscriptEntry) => void;

  /**
   * 임시 자막 업데이트 (interim result)
   * UI에서 흐리게 표시용
   */
  setInterimEntry: (entry: TranscriptEntry | null) => void;

  /**
   * 자막 인식 상태 변경
   */
  setTranscriptionStatus: (status: TranscriptionStatus) => void;

  /**
   * 인식 언어 변경
   */
  setLanguage: (language: SupportedLanguage) => void;

  /**
   * 요약 설정
   */
  setSummary: (summary: MeetingSummary) => void;

  /**
   * 요약 상태 변경
   */
  setSummaryStatus: (status: SummaryStatus) => void;

  /**
   * 요약 에러 설정
   */
  setSummaryError: (error: string | null) => void;

  /**
   * 전체 자막 데이터 리셋 (방 퇴장 시)
   */
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  entries: [],
  interimEntry: null,
  transcriptionStatus: "idle",
  language: "ko-KR",
  summary: null,
  summaryStatus: "idle",
  summaryError: null,
};

// ─────────────────────────────────────────────
// Store 생성
// ─────────────────────────────────────────────

export const useTranscriptStore = create<TranscriptState & TranscriptActions>()(
  devtools(
    (set) => ({
      ...initialState,

      addEntry: (entry) =>
        set(
          (state) => {
            const newEntries = [...state.entries, entry];

            // 메모리 보호: MAX_ENTRIES 초과 시 앞부분 제거
            if (newEntries.length > MAX_ENTRIES) {
              const overflow = newEntries.length - MAX_ENTRIES;
              newEntries.splice(0, overflow);
            }

            return { entries: newEntries };
          },
          false,
          "addEntry",
        ),

      setInterimEntry: (entry) =>
        set({ interimEntry: entry }, false, "setInterimEntry"),

      setTranscriptionStatus: (status) =>
        set(
          { transcriptionStatus: status },
          false,
          "setTranscriptionStatus",
        ),

      setLanguage: (language) => set({ language }, false, "setLanguage"),

      setSummary: (summary) => set({ summary }, false, "setSummary"),

      setSummaryStatus: (status) =>
        set({ summaryStatus: status }, false, "setSummaryStatus"),

      setSummaryError: (error) =>
        set({ summaryError: error }, false, "setSummaryError"),

      resetTranscript: () =>
        set(
          {
            entries: [],
            interimEntry: null,
            transcriptionStatus: "idle",
            summary: null,
            summaryStatus: "idle",
            summaryError: null,
            // language는 유지 (사용자 선호 보존)
          },
          false,
          "resetTranscript",
        ),
    }),
    { name: "TranscriptStore" },
  ),
);

// ─────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────

/**
 * 전체 자막 엔트리 목록 (시간순)
 */
export const useTranscriptEntries = () =>
  useTranscriptStore((state) => state.entries);

/**
 * 현재 인식 중인 임시 자막
 */
export const useInterimEntry = () =>
  useTranscriptStore((state) => state.interimEntry);

/**
 * 자막 인식 상태 + 언어
 */
export const useTranscriptionState = () =>
  useTranscriptStore(
    useShallow((state) => ({
      status: state.transcriptionStatus,
      language: state.language,
    })),
  );

/**
 * 요약 관련 상태 (모달 표시용)
 */
export const useSummaryState = () =>
  useTranscriptStore(
    useShallow((state) => ({
      summary: state.summary,
      status: state.summaryStatus,
      error: state.summaryError,
    })),
  );
