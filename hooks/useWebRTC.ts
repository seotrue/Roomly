import { useRef } from 'react';
import { useMediaStore } from '@/store/room/mediaStore';
import type { RoomParticipant } from '@/server/room/room-types';

// ─────────────────────────────────────────────
// ICE 서버 설정 (STUN + TURN)
// ─────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  // TURN은 환경변수로 관리 (프로덕션 시 추가)
  // { urls: process.env.NEXT_PUBLIC_TURN_URL, ... }
];

// ─────────────────────────────────────────────
// useWebRTC
// P2P Mesh 방식으로 참가자 전원과 RTCPeerConnection 관리
// ─────────────────────────────────────────────

type UseWebRTCParams = {
  localStream: MediaStream | null;
  // useSocket에서 주입 — 시그널링 메시지 전송
  sendOffer: (targetId: string, offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (targetId: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (targetId: string, candidate: RTCIceCandidateInit) => void;
};

export const useWebRTC = ({
  localStream,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
}: UseWebRTCParams) => {
  // socketId → RTCPeerConnection (useState 아닌 useRef — 리렌더 불필요)
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());

  // ─────────────────────────────────────────────
  // PeerConnection 생성 공통 로직
  // ─────────────────────────────────────────────

  const createPeerConnection = (targetId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // 내 로컬 스트림 트랙을 peer에 추가 (상대방이 영상/음성 받을 수 있도록)
    localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // ICE candidate 수집 → 소켓으로 상대방에게 전달
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendIceCandidate(targetId, event.candidate.toJSON());
      }
    };

    // 상대방 스트림 수신 → mediaStore에 저장 → VideoTile에서 렌더링
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      useMediaStore.getState().setRemoteStream(targetId, remoteStream);
    };

    // 연결 종료 시 스트림 정리
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupPeer(targetId);
      }
    };

    peers.current.set(targetId, pc);
    return pc;
  };

  // ─────────────────────────────────────────────
  // room-joined: 기존 참가자들에게 offer 전송 (내가 새로 들어온 사람)
  // ─────────────────────────────────────────────

  const handleRoomJoined = async (existingParticipants: RoomParticipant[]) => {
    for (const participant of existingParticipants) {
      const pc = createPeerConnection(participant.socketId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(participant.socketId, offer);
    }
  };

  // ─────────────────────────────────────────────
  // offer 수신 → answer 전송 (상대방이 나에게 연결 요청)
  // ─────────────────────────────────────────────

  const handleOffer = async (
    fromId: string,
    offer: RTCSessionDescriptionInit
  ) => {
    const pc = createPeerConnection(fromId);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendAnswer(fromId, answer);
  };

  // ─────────────────────────────────────────────
  // answer 수신 → remote description 설정
  // ─────────────────────────────────────────────

  const handleAnswer = async (
    fromId: string,
    answer: RTCSessionDescriptionInit
  ) => {
    const pc = peers.current.get(fromId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  // ─────────────────────────────────────────────
  // ICE candidate 수신 → peer에 추가
  // ─────────────────────────────────────────────

  const handleIceCandidate = async (
    fromId: string,
    candidate: RTCIceCandidateInit
  ) => {
    const pc = peers.current.get(fromId);
    if (!pc) return;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  // ─────────────────────────────────────────────
  // peer 연결 종료 + 리소스 정리
  // ─────────────────────────────────────────────

  const cleanupPeer = (socketId: string) => {
    const pc = peers.current.get(socketId);
    if (!pc) return;

    pc.close();
    peers.current.delete(socketId);
    useMediaStore.getState().removeRemoteStream(socketId);
  };

  // 방 퇴장 시 전체 peer 정리
  const cleanupAllPeers = () => {
    peers.current.forEach((_, socketId) => cleanupPeer(socketId));
  };

  return {
    handleRoomJoined,  // useSocket의 onRoomJoined에 주입
    handleOffer,       // 소켓 'offer' 이벤트 수신 시 호출
    handleAnswer,      // 소켓 'answer' 이벤트 수신 시 호출
    handleIceCandidate, // 소켓 'ice-candidate' 이벤트 수신 시 호출
    cleanupPeer,       // useSocket의 onUserLeft에 주입
    cleanupAllPeers,   // 방 퇴장 시 호출
  };
};
