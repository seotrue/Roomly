import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { TranscriptEntry } from "@/types/transcript-practice";

type TranscriptState = {
  entries: TranscriptEntry[]; // 전체 자막 목록
  interimEntry: TranscriptEntry | null;
};

type TranscriptActions = {
  addEntry: (entry: TranscriptEntry) => void; // 자막 추가
  resetTranscript: () => void; // 초기화 (방 나갈 때)
  setInterimEntry: (entry: TranscriptEntry | null) => void;
};

const initialState: TranscriptState = {
  entries: [],
  interimEntry: null,
};

export const useTranscriptStorePractice = create<
  TranscriptState & TranscriptActions
>()(
  devtools(
    (set) => ({
      // 초기 상태
      ...initialState,

      // 자막 추가
      addEntry: (entry) =>
        set(
          (state) => ({
            entries: [...state.entries, entry],
          }),
          false,
          "addEntry"
        ),

      setInterimEntry: (entry) =>
        set({ interimEntry: entry }, false, "setInterimEntry"),

      // 초기화
      resetTranscript: () => set({ entries: [] }, false, "resetTranscript"),
    }),
    { name: "TranscriptStorePractice" }
  )
);

export const useTranscriptEntries = () =>
  useTranscriptStorePractice((state) => state.entries);

export const useInterimEntry = () =>
  useTranscriptStorePractice((state) => state.interimEntry);
