import { useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useWebRTCPractice - 정답
//
// 역할: RTCPeerConnection 생성 및 관리
// ─────────────────────────────────────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
];

type UseWebRTCPracticeParams = {
  localStream: MediaStream | null;
};

export const useWebRTCPractice = ({ localStream }: UseWebRTCPracticeParams) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [offer, setOffer] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');

  // ✅ 정답 2: PeerConnection 생성
  const createPeerConnection = () => {
    if (pcRef.current) {
      console.log('⚠️ PeerConnection이 이미 존재합니다');
      return;
    }

    try {
      console.log('🔗 PeerConnection 생성 중...');

      // ✅ 정답 2-1: RTCPeerConnection 생성
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      
      pcRef.current = pc;

      // ✅ 정답 2-2: 로컬 스트림 트랙 추가
      localStream?.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        console.log(`➕ 트랙 추가: ${track.kind}`);
      });

      console.log('✅ 로컬 트랙 추가 완료');

      // ✅ 정답 2-3: 이벤트 리스너 등록
      
      // 1) ICE Candidate 이벤트
      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          console.log('🗺️ ICE Candidate:', event.candidate.type);
        } else {
          console.log('✅ ICE Candidate 수집 완료');
        }
      };

      // 2) 상대방 트랙 수신 이벤트
      pc.ontrack = (event: RTCTrackEvent) => {
        setRemoteStream(event.streams[0]);
        console.log('📹 상대방 트랙 수신!', event.track.kind);
      };

      // 3) 연결 상태 변화 이벤트
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        console.log('🔌 연결 상태:', pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          console.log('🎉 P2P 연결 완료!');
        }
      };

      console.log('✅ PeerConnection 생성 완료');
    } catch (error) {
      console.error('❌ PeerConnection 생성 실패:', error);
    }
  };

  // ✅ 정답 3: Offer 생성
  const handleCreateOffer = async () => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('❌ PeerConnection이 없습니다. 먼저 생성하세요.');
      return;
    }

    try {
      console.log('📤 Offer 생성 중...');

      // ✅ 정답 3-1: Offer 생성
      const offerObj = await pc.createOffer();

      // ✅ 정답 3-2: Local Description 설정
      await pc.setLocalDescription(offerObj);

      // JSON 문자열로 저장
      setOffer(JSON.stringify(offerObj, null, 2));
      
      console.log('✅ Offer 생성 완료');
      console.log('📋 Offer를 복사해서 상대방에게 전달하세요');
    } catch (error) {
      console.error('❌ Offer 생성 실패:', error);
    }
  };

  // ✅ 정답 4: Offer 받기 & Answer 생성
  const receiveOffer = async (offerText: string) => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('❌ PeerConnection이 없습니다. 먼저 생성하세요.');
      return;
    }

    try {
      console.log('📥 Offer 수신 중...');

      // ✅ 정답 4-1: Offer 파싱
      const offerObj = JSON.parse(offerText);

      // ✅ 정답 4-2: Remote Description 설정
      await pc.setRemoteDescription(offerObj);

      console.log('✅ Offer 수신 완료');
    } catch (error) {
      console.error('❌ Offer 수신 실패:', error);
    }
  };

  const handleCreateAnswer = async () => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('❌ PeerConnection이 없습니다.');
      return;
    }

    try {
      console.log('📤 Answer 생성 중...');

      // ✅ 정답 4-3: Answer 생성
      const answerObj = await pc.createAnswer();

      // ✅ 정답 4-4: Local Description 설정
      await pc.setLocalDescription(answerObj);

      // JSON 문자열로 저장
      setAnswer(JSON.stringify(answerObj, null, 2));
      
      console.log('✅ Answer 생성 완료');
      console.log('📋 Answer를 복사해서 상대방에게 전달하세요');
    } catch (error) {
      console.error('❌ Answer 생성 실패:', error);
    }
  };

  // ✅ 정답 5: Answer 받기
  const receiveAnswer = async (answerText: string) => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('❌ PeerConnection이 없습니다.');
      return;
    }

    try {
      console.log('📥 Answer 수신 중...');

      // ✅ 정답 5-1: Answer 파싱
      const answerObj = JSON.parse(answerText);

      // ✅ 정답 5-2: Remote Description 설정
      await pc.setRemoteDescription(answerObj);

      console.log('✅ Answer 수신 완료');
      console.log('🎉 연결 협상 완료! ICE가 경로를 찾는 중...');
    } catch (error) {
      console.error('❌ Answer 수신 실패:', error);
    }
  };

  // 정리
  const cleanup = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      setRemoteStream(null);
      setConnectionState('new');
      console.log('🧹 PeerConnection 정리 완료');
    }
  };

  return {
    remoteStream,
    connectionState,
    offer,
    answer,
    createPeerConnection,
    handleCreateOffer,
    receiveOffer,
    handleCreateAnswer,
    receiveAnswer,
    cleanup,
  };
};
