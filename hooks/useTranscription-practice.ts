import { useEffect, useRef } from "react";
import { useTranscriptStorePractice } from "@/store/room/transcriptStore-practice";
import type { TranscriptEntry } from "@/types/transcript-practice";

// ─────────────────────────────────────────────
// useTranscription (연습용)
// ─────────────────────────────────────────────

type UseTranscriptionParams = {
  enabled: boolean;
  language: string;
  speakerId: string;
  speakerName: string;
};

export const useTranscriptionPractice = ({
  enabled,
  language,
  speakerId,
  speakerName,
}: UseTranscriptionParams) => {
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !speakerId || !speakerName) return;

    // 1. 브라우저 지원 확인
    const SpeechRecognitionAPI =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.error("❌ 브라우저가 음성 인식을 지원하지 않습니다.");
      return;
    }

    // 2. 초기화
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // 3. 결과 처리
    recognition.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript.trim();
      // Store에 저장!
      const entry: TranscriptEntry = {
        id: crypto.randomUUID(),
        speakerId,
        speakerName,
        text: transcript,
        timestamp: Date.now(),
        isFinal: result.isFinal, // 말이 끝남
        language,
      };

      if (result.isFinal) {
        // 말이 끝남
        useTranscriptStorePractice.getState().addEntry(entry);
        useTranscriptStorePractice.getState().setInterimEntry(null);
      } else {
        // 말하는 중
        useTranscriptStorePractice.getState().setInterimEntry(entry);
      }
    };

    recognition.onstart = () => {
      console.log("음성 인식 시작!");
    };

    recognition.onerror = (event: any) => {
      console.error(" 에러:", event.error);
    };

    // 4. 시작
    recognition.start();
    recognitionRef.current = recognition;

    // 5. Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [enabled, language, speakerId, speakerName]);
};
