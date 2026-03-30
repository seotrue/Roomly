import { useRef } from "react";
import { useMediaStore } from "@/store/room/mediaStore";
import type { RoomParticipant } from "@/server/room/room-types";

// ─────────────────────────────────────────────────────────────────────────────
// ICE 서버 설정
//
// ICE(Interactive Connectivity Establishment): 두 피어가 서로 연결 가능한
// 네트워크 경로(candidate)를 찾는 프로토콜.
//
// STUN 서버: 클라이언트의 공인 IP/포트를 알려줌 (NAT 통과용).
//   같은 네트워크가 아닌 경우에도 직접 P2P 연결이 가능하도록 도움.
//   Google이 무료로 제공하는 공개 STUN 서버 사용.
//
// TURN 서버: STUN으로 연결 불가한 경우(대칭형 NAT 등) 데이터를 중계.
//   프로덕션에서는 필수 (연결 성공률 99%+).
//   Cloudflare, Twilio, 또는 coturn(오픈소스) 사용 가능.
// ─────────────────────────────────────────────────────────────────────────────

const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    // STUN 서버: 공인 IP 확인용 (무료)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  // TURN 서버: NAT 통과 실패 시 중계용 (환경 변수로 설정)
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
    console.log("[WebRTC] TURN server configured");
  } else {
    console.warn(
      "[WebRTC] TURN server not configured - some users may fail to connect behind symmetric NAT"
    );
  }

  return servers;
};

const ICE_SERVERS = getIceServers();

// ─────────────────────────────────────────────────────────────────────────────
// useWebRTC
//
// 역할: RTCPeerConnection P2P Mesh 연결 전체 생명주기 관리
//
// P2P Mesh 구조:
//   N명 참가 시 각 클라이언트는 나머지 N-1명과 각각 RTCPeerConnection을 유지.
//   서버는 시그널링(offer/answer/ICE) 메시지만 중계하고,
//   실제 영상/음성 데이터는 브라우저 간 직접 전송.
//
// Offer/Answer 역할 분담:
//   - Offer를 보내는 쪽: 이미 방에 있던 기존 참가자 (user-joined 수신 시)
//   - Answer를 보내는 쪽: 새로 입장한 참가자 (offer 수신 시)
//
// 의존성 주입:
//   sendOffer / sendAnswer / sendIceCandidate 는 useSocket에서 주입받음.
//   → useWebRTC는 소켓 구현을 모르고, 함수 시그니처만 의존.
// ─────────────────────────────────────────────────────────────────────────────

type UseWebRTCParams = {
  localStream: MediaStream | null;
  // 아래 3개는 useSocket에서 반환된 emit 래퍼 함수 (page.tsx에서 주입)
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
  // socketId → RTCPeerConnection 맵
  // useState가 아닌 useRef 사용 이유:
  //   RTCPeerConnection은 렌더링과 무관한 생명주기를 가짐.
  //   Map이 바뀌어도 리렌더 필요 없음 → useRef로 관리.
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());

  // ICE candidate 큐: setRemoteDescription 완료 전에 도착한 candidate를 보관.
  // setRemoteDescription이 완료되어야 브라우저가 candidate를 처리할 수 있음.
  // 완료 전에 addIceCandidate를 호출하면 InvalidStateError 발생.
  // → 큐에 쌓았다가 setRemoteDescription 직후에 일괄 적용.
  const iceCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );

  // ─────────────────────────────────────────────────────────────────────────
  // createPeerConnection
  //
  // RTCPeerConnection 생성 + 공통 이벤트 핸들러 등록.
  // offer를 보내는 쪽(기존 참가자)과 받는 쪽(신규 참가자) 모두 이 함수로 생성.
  // ─────────────────────────────────────────────────────────────────────────

  const createPeerConnection = (targetId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // 내 로컬 스트림의 각 트랙(비디오/오디오)을 peer connection에 추가.
    // 이렇게 해야 상대방이 pc.ontrack으로 내 스트림을 받을 수 있음.
    localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // ICE candidate 수집: 브라우저가 자동으로 여러 경로(candidate)를 찾아
    // 이 콜백으로 하나씩 전달함. 찾을 때마다 즉시 상대방에게 전송 (Trickle ICE).
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // toJSON()으로 직렬화 가능한 형태(RTCIceCandidateInit)로 변환 후 전송
        sendIceCandidate(targetId, event.candidate.toJSON());
      }
    };

    // 상대방 트랙 수신: 상대방이 addTrack한 스트림이 이쪽으로 도착.
    // store에 저장하면 RemoteVideo 컴포넌트가 구독해서 video.srcObject에 연결.
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      useMediaStore.getState().setRemoteStream(targetId, remoteStream);
    };

    // 연결 상태 변화 감지: 'disconnected' or 'failed' 시 피어 리소스 정리.
    // 상대방이 갑자기 종료(탭 강제 종료 등)된 경우에도 처리됨.
    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        cleanupPeer(targetId);
      }
    };

    peers.current.set(targetId, pc);
    return pc;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // flushIceCandidateQueue
  //
  // setRemoteDescription 완료 직후 호출.
  // 그 전에 도착해서 큐에 쌓인 ICE candidate들을 일괄 적용.
  // ─────────────────────────────────────────────────────────────────────────

  const flushIceCandidateQueue = async (
    targetId: string,
    pc: RTCPeerConnection,
  ) => {
    const queue = iceCandidateQueues.current.get(targetId) ?? [];
    for (const candidate of queue) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    iceCandidateQueues.current.delete(targetId);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // initiateConnectionsWithExistingPeers
  //
  // 내가 새로 방에 입장했을 때, 이미 있던 참가자들에게 연결 제안을 보내는 함수.
  // useSocket의 onRoomJoined 콜백으로 주입됨.
  //
  // 호출 시점: 서버로부터 'room-joined' 이벤트 수신 직후
  // ─────────────────────────────────────────────────────────────────────────

  const initiateConnectionsWithExistingPeers = async (
    existingParticipants: RoomParticipant[],
  ) => {
    for (const participant of existingParticipants) {
      const pc = createPeerConnection(participant.socketId);

      // offer 생성 → setLocalDescription → 상대방에게 전송
      // setLocalDescription이 완료되어야 ICE candidate 수집이 시작됨
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(participant.socketId, offer);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // acceptProposalAndRespond
  //
  // 기존 참가자로부터 연결 제안을 받았을 때 수락하고 응답을 돌려보내는 함수.
  // useSocket의 onOffer 콜백으로 주입됨.
  //
  // 호출 시점: 서버로부터 'offer' 이벤트 수신 시
  // ─────────────────────────────────────────────────────────────────────────

  const acceptProposalAndRespond = async (
    fromId: string,
    offer: RTCSessionDescriptionInit,
  ) => {
    const pc = createPeerConnection(fromId);

    // 상대방이 보낸 offer를 remote description으로 설정
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    // setRemoteDescription 완료 → 큐에 쌓인 candidate 일괄 적용
    await flushIceCandidateQueue(fromId, pc);

    // answer 생성 → setLocalDescription → 상대방에게 전송
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendAnswer(fromId, answer);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // finalizeConnection
  //
  // 내가 보낸 연결 제안에 대한 응답을 받았을 때 연결을 완료하는 함수.
  // useSocket의 onAnswer 콜백으로 주입됨.
  //
  // 호출 시점: 서버로부터 'answer' 이벤트 수신 시
  // ─────────────────────────────────────────────────────────────────────────

  const finalizeConnection = async (
    fromId: string,
    answer: RTCSessionDescriptionInit,
  ) => {
    const pc = peers.current.get(fromId);
    if (!pc) return; // 이미 정리된 peer면 무시

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    // setRemoteDescription 완료 → 큐에 쌓인 candidate 일괄 적용
    await flushIceCandidateQueue(fromId, pc);
    // 이 시점부터 ICE candidate 교환으로 실제 연결 경로 확정
  };

  // ─────────────────────────────────────────────────────────────────────────
  // addNetworkPath
  //
  // 상대방이 찾은 네트워크 경로(ICE candidate)를 내 peer connection에 추가.
  // useSocket의 onIceCandidate 콜백으로 주입됨.
  //
  // remoteDescription이 아직 설정되지 않은 경우(offer/answer 도착 전)
  // candidate를 큐에 보관했다가 setRemoteDescription 완료 후 일괄 적용.
  // ─────────────────────────────────────────────────────────────────────────

  const addNetworkPath = async (
    fromId: string,
    candidate: RTCIceCandidateInit,
  ) => {
    const pc = peers.current.get(fromId);
    if (!pc) return;

    if (!pc.remoteDescription) {
      // remoteDescription 미설정 → 큐에 보관
      const queue = iceCandidateQueues.current.get(fromId) ?? [];
      iceCandidateQueues.current.set(fromId, [...queue, candidate]);
      return;
    }

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // cleanupPeer / cleanupAllPeers
  //
  // 피어 연결 종료 + 관련 리소스 해제.
  // peer connection을 닫지 않으면 네트워크 연결과 메모리가 계속 점유됨.
  // ─────────────────────────────────────────────────────────────────────────

  // 특정 참가자 1명의 연결 종료 (user-left 수신 or 연결 실패 시)
  const cleanupPeer = (socketId: string) => {
    const pc = peers.current.get(socketId);
    if (!pc) return;

    pc.close(); // RTCPeerConnection 종료 + ICE 수집 중단
    peers.current.delete(socketId);
    iceCandidateQueues.current.delete(socketId); // 미처리 candidate 큐 정리
    useMediaStore.getState().removeRemoteStream(socketId); // 원격 스트림 해제
  };

  // 방 퇴장 시 모든 연결 일괄 종료
  const cleanupAllPeers = () => {
    peers.current.forEach((_, socketId) => cleanupPeer(socketId));
  };

  // 공유 시작
  // RTCPeerConnection이 뭔데?
  // WebRTC에서 두 브라우저를 직접 연결하는 객체입니다.

  // 이 객체를 통해 영상/음성 데이터가 서버를 거치지 않고 직접 전송됨
  // 각 참가자마다 별도의 RTCPeerConnection이 필요
  const startScreenShare = async (): Promise<MediaStream | null> => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const screenTrack = screenStream.getTracks()[0];
    //peers는 다른 참가자들과의 RTCPeerConnection 객체들을 담은 Map입니다.
    peers.current.forEach((pc, socketId) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(screenTrack);
    });

    screenTrack.onended = () => stopScreenShare(screenStream);

    return screenStream;
  };

  const stopScreenShare = (screenStream: MediaStream) => {
    const cameraTrack =
      useMediaStore.getState().localStream?.getVideoTracks()[0] ?? null;

    peers.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(cameraTrack);
    });

    screenStream.getTracks().forEach((t) => t.stop());
  };

  return {
    initiateConnectionsWithExistingPeers, // page.tsx → useSocket onRoomJoined에 주입
    acceptProposalAndRespond, // page.tsx → useSocket onOffer에 주입
    finalizeConnection, // page.tsx → useSocket onAnswer에 주입
    addNetworkPath, // page.tsx → useSocket onIceCandidate에 주입
    cleanupPeer, // page.tsx → useSocket onUserLeft에 주입
    cleanupAllPeers,
    startScreenShare,
    stopScreenShare,
  };
};
