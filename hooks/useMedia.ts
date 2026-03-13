import { useEffect } from 'react';
import { useMediaStore } from '@/store/room/mediaStore';

// ─────────────────────────────────────────────────────────────────────────────
// useMedia
//
// 역할: 카메라/마이크 스트림 획득 및 생명주기 관리
//
// 흐름:
//   마운트 → getUserMedia() → mediaStore.setLocalStream(stream)
//   언마운트 → mediaStore.resetMedia() (내부에서 track.stop() 호출)
//
// 주의:
//   track.stop()을 호출해야 카메라 LED가 꺼지고 하드웨어가 해제됨.
//   단순히 stream 변수를 버리는 것만으로는 해제되지 않음.
//   mediaStore.resetMedia()가 이 처리를 담당하므로 별도 stop() 불필요.
// ─────────────────────────────────────────────────────────────────────────────

export const useMedia = () => {
  // localStream은 렌더링에 필요하므로 구독 (store에서 변경되면 리렌더 발생)
  const localStream = useMediaStore((state) => state.localStream);

  useEffect(() => {
    // store 액션을 useEffect 안에서 getState()로 접근
    // → hook 레벨에서 구독하면 deps 배열에 추가해야 하고,
    //   Zustand 액션은 참조가 안정적이지만 lint가 경고를 띄움
    const { setLocalStream, resetMedia } = useMediaStore.getState();

    // 카메라(video) + 마이크(audio) 동시 요청
    // 브라우저가 권한 팝업을 띄움 → 사용자가 허용해야 stream 반환
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
      })
      .catch((err) => {
        // 사용자가 권한 거부하거나 카메라/마이크 없는 경우
        // 에러 처리는 향후 connectionStore.setErrorMessage로 연동 예정
        console.error('[useMedia] getUserMedia failed:', err);
      });

    return () => {
      // 컴포넌트 언마운트(방 퇴장) 시 트랙 정지 + store 초기화
      // resetMedia() 내부에서 track.stop()까지 처리함
      resetMedia();
    };
  }, []); // 마운트/언마운트 1회만 실행

  return { localStream };
};
