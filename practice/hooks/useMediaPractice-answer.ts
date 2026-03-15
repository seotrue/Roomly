import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useMediaPractice - 정답
//
// 역할: 카메라/마이크 스트림 획득 및 생명주기 관리
// ─────────────────────────────────────────────────────────────────────────────

export const useMediaPractice = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    // ✅ 정답 1-1: getUserMedia로 카메라/마이크 획득
    const getMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        console.log('✅ 미디어 스트림 획득 성공');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 에러';
        setError(errorMessage);
        console.error('❌ 미디어 획득 실패:', errorMessage);
      }
    };

    getMedia();

    // ✅ 정답 1-2: cleanup - 스트림 정리
    return () => {
      stream?.getTracks().forEach(track => track.stop());
      console.log('🧹 미디어 스트림 정리 완료');
    };
  }, []);

  return { localStream, error };
};
