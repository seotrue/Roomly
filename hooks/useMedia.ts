import { useEffect } from 'react';
import { useMediaStore } from '@/store/room/mediaStore';

// ─────────────────────────────────────────────
// useMedia
// 마운트 시 getUserMedia로 카메라/마이크 획득
// 언마운트 시 트랙 정지 (store.resetMedia가 track.stop() 포함)
// ─────────────────────────────────────────────

export const useMedia = () => {
  const { setLocalStream, resetMedia } = useMediaStore.getState();
  const localStream = useMediaStore((state) => state.localStream);

  useEffect(() => {
    let stream: MediaStream;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
      })
      .catch((err) => {
        console.error('[useMedia] getUserMedia failed:', err);
      });

    return () => {
      resetMedia();
    };
  }, []);

  return { localStream };
};
