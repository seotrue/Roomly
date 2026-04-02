import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranscriptStore } from "@/store/room/transcriptStore";
import type { TranscriptEntry, SupportedLanguage } from "@/types/transcript";

// ─────────────────────────────────────────────────────────────────────────────
// useTranscription
//
// 역할: Web Speech API로 로컬 마이크 음성 인식 + Socket.io로 자막 브로드캐스트
//
// 이 훅이 담당하는 것:
//   - 브라우저 SpeechRecognition 지원 확인
//   - 음성 인식 시작/중지
//   - interim (임시) vs final (확정) 결과 구분 처리
//   - Chrome 60초 제한 대응 (자동 재시작)
//   - 확정 자막을 Socket.io로 브로드캐스트
//
// 브라우저 호환성:
//   - Chrome/Edge: 완전 지원 (webkit prefix)
//   - Safari: 부분 지원 (iOS 14.5+)
//   - Firefox: 미지원
//
// Stale Closure 방지:
//   - onTranscriptEntry 콜백을 ref에 저장하고 useLayoutEffect로 갱신
// ─────────────────────────────────────────────────────────────────────────────

// Web Speech API 타입 확장 (TypeScript에서 webkit prefix 인식 안 함)
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

type UseTranscriptionParams = {
  enabled: boolean; // 자막 기능 활성화 여부
  language: SupportedLanguage; // 인식 언어
  speakerId: string; // 내 socketId
  speakerName: string; // 내 userName
  // 확정 자막 발생 시 호출 → Socket.io로 브로드캐스트
  onTranscriptEntry: (entry: TranscriptEntry) => void;
};

export const useTranscription = ({
  enabled,
  language,
  speakerId,
  speakerName,
  onTranscriptEntry,
}: UseTranscriptionParams) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const enabledRef = useRef(enabled); // 자동 재시작 제어용

  // Stale Closure 방지: 콜백 ref
  const onTranscriptEntryRef = useRef(onTranscriptEntry);

  useLayoutEffect(() => {
    onTranscriptEntryRef.current = onTranscriptEntry;
  });

  useEffect(() => {
    // 현재 enabled 상태를 ref에 동기화 (recognition.onend에서 참조)
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    // ── 브라우저 지원 확인 ────────────────────────────────────────────────
    const getSpeechRecognition = (): typeof SpeechRecognition | null => {
      if (typeof window === "undefined") return null;
      return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    };

    const SpeechRecognitionAPI = getSpeechRecognition();

    if (!SpeechRecognitionAPI) {
      // 브라우저 미지원 → 상태만 업데이트하고 종료
      useTranscriptStore.getState().setTranscriptionStatus("unsupported");
      return;
    }

    if (!enabled) {
      // 자막 비활성화 → idle 상태로 변경 후 종료
      useTranscriptStore.getState().setTranscriptionStatus("idle");
      return;
    }

    // ── SpeechRecognition 생성 및 설정 ────────────────────────────────────
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = true; // 연속 인식 (음성 끊김에도 계속 인식)
    recognition.interimResults = true; // 임시 결과 수신 (실시간 자막용)
    recognition.lang = language; // 인식 언어
    recognition.maxAlternatives = 1; // 성능 최적화 (1개 후보만)

    // ── 인식 결과 처리 ─────────────────────────────────────────────────────
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // event.results는 인식 시작부터 누적된 결과 배열
      // event.resultIndex는 이번에 새로 추가된 결과의 시작 인덱스
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript.trim();

      if (!transcript) return; // 빈 텍스트 무시

      const entry: TranscriptEntry = {
        id: crypto.randomUUID(),
        speakerId,
        speakerName,
        text: transcript,
        timestamp: Date.now(),
        isFinal: result.isFinal,
        language,
      };

      if (result.isFinal) {
        // 확정 자막 → store에 추가 + Socket.io 브로드캐스트
        useTranscriptStore.getState().addEntry(entry);
        onTranscriptEntryRef.current(entry);

        // interim entry 초기화 (다음 발화 준비)
        useTranscriptStore.getState().setInterimEntry(null);
      } else {
        // 임시 자막 → UI에서 흐리게 표시용
        useTranscriptStore.getState().setInterimEntry(entry);
      }
    };

    // ── 인식 시작 ──────────────────────────────────────────────────────────
    recognition.onstart = () => {
      useTranscriptStore.getState().setTranscriptionStatus("listening");
    };

    // ── 인식 종료 (자동 재시작) ────────────────────────────────────────────
    // Chrome은 보안상 60초 후 자동 종료됨 → 재시작으로 연속 인식 유지
    recognition.onend = () => {
      if (enabledRef.current) {
        // enabled 상태이면 재시작
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            // 이미 실행 중이면 무시 (중복 시작 방지)
            console.warn("Speech recognition restart failed:", error);
          }
        }, 200); // 짧은 딜레이로 안정성 확보
      } else {
        // 비활성화되었으면 idle 상태로
        useTranscriptStore.getState().setTranscriptionStatus("idle");
      }
    };

    // ── 에러 처리 ──────────────────────────────────────────────────────────
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);

      // no-speech, audio-capture 등은 일시적 에러로 간주 → 재시작
      // not-allowed, service-not-allowed는 권한 문제 → 사용자에게 알림 필요
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        useTranscriptStore.getState().setTranscriptionStatus("idle");
        alert(
          "마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.",
        );
      }
    };

    // ── 인식 시작 ──────────────────────────────────────────────────────────
    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      useTranscriptStore.getState().setTranscriptionStatus("idle");
    }

    // ── cleanup: 컴포넌트 언마운트 또는 언어 변경 시 인식 중지 ──────────
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      useTranscriptStore.getState().setInterimEntry(null);
    };
  }, [enabled, language, speakerId, speakerName]);

  return {
    // 필요 시 직접 제어용 (일시 정지 등 추가 기능 구현 시)
    recognition: recognitionRef.current,
  };
};
