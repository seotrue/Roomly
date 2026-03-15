import { useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useWebRTCPractice
//
// 역할: RTCPeerConnection 생성 및 관리 (연습용)
//
// TODO 2: PeerConnection 생성 및 이벤트 리스너 등록
// TODO 3: Offer 생성
// TODO 4: Offer 받기 & Answer 생성
// TODO 5: Answer 받기
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

  // ═════════════════════════════════════════════════════════════════════
  // ✍️ TODO 2-1: PeerConnection 생성
  // ═════════════════════════════════════════════════════════════════════
  const createPeerConnection = () => {
    if (pcRef.current) {
      console.log('⚠️ PeerConnection이 이미 존재합니다');
      return;
    }

    try {
      console.log('🔗 PeerConnection 생성 중...');

      // TODO: RTCPeerConnection 생성
      // 힌트: new RTCPeerConnection({ iceServers: ICE_SERVERS })
      
      const pc = null as any; // 여기를 수정하세요!
      
      if (!pc) {
        throw new Error('PeerConnection을 생성해주세요!');
      }

      pcRef.current = pc;

      // ═════════════════════════════════════════════════════════════════════
      // ✍️ TODO 2-2: 로컬 스트림 트랙 추가
      // ═════════════════════════════════════════════════════════════════════
      // TODO: localStream의 모든 트랙을 PeerConnection에 추가
      // 힌트: localStream?.getTracks().forEach(track => pc.addTrack(track, localStream))
      
      // 여기에 코드를 작성하세요!

      console.log('✅ 로컬 트랙 추가 완료');

      // ═════════════════════════════════════════════════════════════════════
      // ✍️ TODO 2-3: 이벤트 리스너 등록
      // ═════════════════════════════════════════════════════════════════════
      
      // 1) ICE Candidate 이벤트
      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        // TODO: event.candidate가 있으면 로그 출력
        // 힌트: if (event.candidate) { console.log('🗺️ ICE Candidate:', event.candidate.type) }
        
        // 여기에 코드를 작성하세요!
      };

      // 2) 상대방 트랙 수신 이벤트
      pc.ontrack = (event: RTCTrackEvent) => {
        // TODO: 상대방 스트림을 state에 저장
        // 힌트: setRemoteStream(event.streams[0])
        
        // 여기에 코드를 작성하세요!
        
        console.log('📹 상대방 트랙 수신!', event.track.kind);
      };

      // 3) 연결 상태 변화 이벤트
      pc.onconnectionstatechange = () => {
        // TODO: 연결 상태를 state에 저장
        // 힌트: setConnectionState(pc.connectionState)
        
        // 여기에 코드를 작성하세요!
        
        console.log('🔌 연결 상태:', pc.connectionState);
      };

      console.log('✅ PeerConnection 생성 완료');
    } catch (error) {
      console.error('❌ PeerConnection 생성 실패:', error);
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // ✍️ TODO 3: Offer 생성
  // ═════════════════════════════════════════════════════════════════════
  const createOffer = async () => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('❌ PeerConnection이 없습니다. 먼저 생성하세요.');
      return;
    }

    try {
      console.log('📤 Offer 생성 중...');

      // TODO 3-1: Offer 생성
      // 힌트: const offerObj = await pc.createOffer()
      
      const offerObj = null as any; // 여기를 수정하세요!
      
      if (!offerObj) {
        throw new Error('Offer를 생성해주세요!');
      }

      // TODO 3-2: Local Description 설정
      // 힌트: await pc.setLocalDescription(offerObj)
      
      // 여기에 코드를 작성하세요!

      // JSON 문자열로 저장
      setOffer(JSON.stringify(offerObj, null, 2));
      
      console.log('✅ Offer 생성 완료');
      console.log('📋 Offer를 복사해서 상대방에게 전달하세요');
    } catch (error) {
      console.error('❌ Offer 생성 실패:', error);
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // ✍️ TODO 4: Offer 받기 & Answer 생성
  // ═════════════════════════════════════════════════════════════════════
  const receiveOffer = async (offerText: string) => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('❌ PeerConnection이 없습니다. 먼저 생성하세요.');
      return;
    }

    try {
      console.log('📥 Offer 수신 중...');

      // TODO 4-1: Offer 파싱
      // 힌트: const offerObj = JSON.parse(offerText)
      
      const offerObj = null as any; // 여기를 수정하세요!
      
      if (!offerObj) {
        throw new Error('Offer를 파싱해주세요!');
      }

      // TODO 4-2: Remote Description 설정
      // 힌트: await pc.setRemoteDescription(offerObj)
      
      // 여기에 코드를 작성하세요!

      console.log('✅ Offer 수신 완료');
    } catch (error) {
      console.error('❌ Offer 수신 실패:', error);
    }
  };

  const createAnswer = async () => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('❌ PeerConnection이 없습니다.');
      return;
    }

    try {
      console.log('📤 Answer 생성 중...');

      // TODO 4-3: Answer 생성
      // 힌트: const answerObj = await pc.createAnswer()
      
      const answerObj = null as any; // 여기를 수정하세요!
      
      if (!answerObj) {
        throw new Error('Answer를 생성해주세요!');
      }

      // TODO 4-4: Local Description 설정
      // 힌트: await pc.setLocalDescription(answerObj)
      
      // 여기에 코드를 작성하세요!

      // JSON 문자열로 저장
      setAnswer(JSON.stringify(answerObj, null, 2));
      
      console.log('✅ Answer 생성 완료');
      console.log('📋 Answer를 복사해서 상대방에게 전달하세요');
    } catch (error) {
      console.error('❌ Answer 생성 실패:', error);
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // ✍️ TODO 5: Answer 받기
  // ═════════════════════════════════════════════════════════════════════
  const receiveAnswer = async (answerText: string) => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('❌ PeerConnection이 없습니다.');
      return;
    }

    try {
      console.log('📥 Answer 수신 중...');

      // TODO 5-1: Answer 파싱
      // 힌트: const answerObj = JSON.parse(answerText)
      
      const answerObj = null as any; // 여기를 수정하세요!
      
      if (!answerObj) {
        throw new Error('Answer를 파싱해주세요!');
      }

      // TODO 5-2: Remote Description 설정
      // 힌트: await pc.setRemoteDescription(answerObj)
      
      // 여기에 코드를 작성하세요!

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
      console.log('🧹 PeerConnection 정리 완료');
    }
  };

  return {
    remoteStream,
    connectionState,
    offer,
    answer,
    createPeerConnection,
    createOffer,
    receiveOffer,
    createAnswer,
    receiveAnswer,
    cleanup,
  };
};
