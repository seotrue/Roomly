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

    console.log("⚙️ 음성 인식 설정 완료");

    // 3. 결과 처리
    recognition.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript.trim();

      if (result.isFinal) {
        console.log("✅ 확정:", transcript);

        // Store에 저장!
        const entry: TranscriptEntry = {
          id: crypto.randomUUID(),
          speakerId,
          speakerName,
          text: transcript,
          timestamp: Date.now(),
          isFinal: true,
          language,
        };

        useTranscriptStorePractice.getState().addEntry(entry);
      } else {
        console.log("⏳ 임시:", transcript);
      }
    };

    recognition.onstart = () => {
      console.log("🎙️ 음성 인식 시작!");
    };

    recognition.onerror = (event: any) => {
      console.error("❌ 에러:", event.error);
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
      console.log("🛑 음성 인식 중지");
    };
  }, [enabled, language, speakerId, speakerName]);
};
