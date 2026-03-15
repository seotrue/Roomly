import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useMediaPractice
//
// 역할: 카메라/마이크 스트림 획득 및 생명주기 관리 (연습용)
//
// TODO 1: getUserMedia로 미디어 스트림 획득하기
// ─────────────────────────────────────────────────────────────────────────────

export const useMediaPractice = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    // ═════════════════════════════════════════════════════════════════════
    // ✍️ TODO 1-1: getUserMedia로 카메라/마이크 획득
    // ═════════════════════════════════════════════════════════════════════
    const getMedia = async () => {
      try {
        // TODO: navigator.mediaDevices.getUserMedia() 사용
        // 힌트:
        // stream = await navigator.mediaDevices.getUserMedia({
        //   video: true,
        //   audio: true
        // });
        
        stream = null; // 여기를 수정하세요!
        
        if (stream) {
          setLocalStream(stream);
          console.log('✅ 미디어 스트림 획득 성공');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 에러';
        setError(errorMessage);
        console.error('❌ 미디어 획득 실패:', errorMessage);
      }
    };

    getMedia();

    // ═════════════════════════════════════════════════════════════════════
    // ✍️ TODO 1-2: cleanup - 스트림 정리
    // ═════════════════════════════════════════════════════════════════════
    return () => {
      // TODO: 모든 트랙을 정지시키기
      // 힌트: stream?.getTracks().forEach(track => track.stop())
      
      // 여기에 코드를 작성하세요!
      
      console.log('🧹 미디어 스트림 정리 완료');
    };
  }, []);

  return { localStream, error };
};
