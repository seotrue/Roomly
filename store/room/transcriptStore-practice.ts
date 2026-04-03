import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { TranscriptEntry } from "@/types/transcript-practice";

// ─────────────────────────────────────────────
// 자막 Store (연습용)
// ─────────────────────────────────────────────

type TranscriptState = {
  entries: TranscriptEntry[];  // 전체 자막 목록
};

type TranscriptActions = {
  addEntry: (entry: TranscriptEntry) => void;  // 자막 추가
  resetTranscript: () => void;  // 초기화 (방 나갈 때)
};

export const useTranscriptStorePractice = create<TranscriptState & TranscriptActions>()(
  devtools(
    (set) => ({
      // 초기 상태
      entries: [],

      // 자막 추가
      addEntry: (entry) =>
        set(
          (state) => ({
            entries: [...state.entries, entry]
          }),
          false,
          "addEntry"
        ),

      // 초기화
      resetTranscript: () =>
        set(
          { entries: [] },
          false,
          "resetTranscript"
        ),
    }),
    { name: "TranscriptStorePractice" }
  )
);

// ─────────────────────────────────────────────
// Selector (UI에서 사용)
// ─────────────────────────────────────────────

export const useTranscriptEntries = () =>
  useTranscriptStorePractice((state) => state.entries);
