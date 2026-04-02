import { useEffect, useLayoutEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useConnectionStore } from "@/store/room/connectionStore";
import { useParticipantStore } from "@/store/room/participantStore";
import { useTranscriptStore } from "@/store/room/transcriptStore";
import type { RoomParticipant } from "@/server/room/room-types";
import type { TranscriptEntry } from "@/types/transcript";

// ─────────────────────────────────────────────────────────────────────────────
// useSocket
//
// 역할: Socket.io 연결 수립 + 방 관련 이벤트 전체 바인딩
//
// 이 훅이 담당하는 것:
//   - 서버 연결 (io())
//   - join-room emit (connect 이벤트 수신 직후)
//   - 방 입장/퇴장/에러 이벤트 처리
//   - WebRTC 시그널링 이벤트 수신 → useWebRTC 핸들러로 위임
//   - 시그널링 메시지 송신 함수 반환 (sendOffer/sendAnswer/sendIceCandidate)
//
// 이 훅이 담당하지 않는 것:
//   - RTCPeerConnection 생성/관리 (useWebRTC 담당)
//   - 미디어 스트림 관리 (useMedia 담당)
//
// Stale Closure 방지 전략:
//   useEffect 의존성 배열을 빈 배열([])로 유지하면서 최신 콜백을 참조하기 위해
//   콜백들을 useRef에 저장하고 useLayoutEffect로 매 렌더마다 갱신함.
//   → 소켓 이벤트 핸들러는 항상 최신 함수 참조를 사용하게 됨.
// ─────────────────────────────────────────────────────────────────────────────

type UseSocketParams = {
  roomId: string;
  userName: string;
  joinMode: "create" | "join";
  // 서버로부터 'room-joined' 수신 시 → 기존 참가자들에게 연결 시작 (useWebRTC.initiateConnectionsWithExistingPeers)
  onRoomJoined: (participants: RoomParticipant[]) => void;
  // 서버로부터 'user-left' 수신 시 → 해당 peer 연결 종료 (useWebRTC.cleanupPeer)
  onUserLeft: (socketId: string) => void;
  // 서버로부터 'offer' 수신 시 → 제안 수락 및 응답 전송 (useWebRTC.acceptProposalAndRespond)
  onOffer: (fromId: string, offer: RTCSessionDescriptionInit) => void;
  // 서버로부터 'answer' 수신 시 → 연결 완료 (useWebRTC.finalizeConnection)
  onAnswer: (fromId: string, answer: RTCSessionDescriptionInit) => void;
  // 서버로부터 'ice-candidate' 수신 시 → 네트워크 경로 추가 (useWebRTC.addNetworkPath)
  onIceCandidate: (fromId: string, candidate: RTCIceCandidateInit) => void;
};

export const useSocket = ({
  roomId,
  userName,
  joinMode,
  onRoomJoined,
  onUserLeft,
  onOffer,
  onAnswer,
  onIceCandidate,
}: UseSocketParams) => {
  const socket = useRef<Socket | null>(null);

  // ── Stale Closure 방지: 콜백 ref ────────────────────────────────────────
  // useEffect 내부 이벤트 핸들러는 최초 마운트 시 함수 참조를 캡처함.
  // 이후 부모 컴포넌트가 리렌더되어 새로운 함수가 내려와도 캡처된 참조는
  // 변하지 않음.
  // → ref에 저장하고 매 렌더마다 갱신하면 이벤트 핸들러가 항상 최신 함수를 호출함.
  const onRoomJoinedRef = useRef(onRoomJoined);
  const onUserLeftRef = useRef(onUserLeft);
  const onOfferRef = useRef(onOffer);
  const onAnswerRef = useRef(onAnswer);
  const onIceCandidateRef = useRef(onIceCandidate);

  // useLayoutEffect: 렌더 직후, 브라우저 페인트 전에 동기적으로 실행됨.
  // 의존성 배열 생략 → 매 렌더마다 실행 → ref가 항상 최신 콜백을 가리킴.
  // (React 19 lint rule: 렌더 중 ref.current 직접 수정 금지 → effect로 감싸야 함)
  useLayoutEffect(() => {
    onRoomJoinedRef.current = onRoomJoined;
    onUserLeftRef.current = onUserLeft;
    onOfferRef.current = onOffer;
    onAnswerRef.current = onAnswer;
    onIceCandidateRef.current = onIceCandidate;
  });

  useEffect(() => {
    // ── 소켓 연결 ────────────────────────────────────────────────────────
    // NEXT_PUBLIC_API_URL 이 설정되어 있으면 해당 URL로, 없으면 localhost:3000
    // Next.js + Socket.io가 포트 3000에서 함께 동작하므로 경로 분리 불필요
    //
    // 보안: 프로덕션에서는 WSS(WebSocket Secure) 사용 강제
    // getUserMedia는 HTTPS 환경 필수이므로 소켓도 WSS로 연결해야 함
    const getSocketUrl = (): string => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      // 환경 변수가 설정된 경우 사용
      if (apiUrl) return apiUrl;

      // 로컬 개발 환경: http 허용
      if (typeof window !== "undefined") {
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        return `${protocol}//${window.location.host}`;
      }

      return "http://localhost:3000";
    };

    const socketInstance = io(getSocketUrl(), {
      // 프로덕션에서 HTTP → HTTPS 자동 업그레이드 시도
      upgrade: true,
      // 재연결 설정 (네트워크 불안정 대응)
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // 타임아웃 설정 (DoS 방어)
      timeout: 10000,
    });
    socket.current = socketInstance;

    // store 액션을 useEffect 안에서 getState()로 직접 접근
    // → hook 레벨에서 구독하면 useEffect deps 배열에 추가해야 하고,
    //   그러면 소켓이 재생성되는 문제 발생
    const { setRoomInfo, setConnectionStatus, setErrorMessage } =
      useConnectionStore.getState();
    const {
      setParticipants,
      addParticipant,
      removeParticipant,
      updateParticipantMedia,
      updateParticipantScreenShare,
    } = useParticipantStore.getState();

    // 연결 시작을 사용자에게 알림 (로딩 UI 표시용)
    setConnectionStatus("connecting");

    // ── connect: 소켓 연결 완료 → 방 입장 요청 ───────────────────────────
    // 소켓 연결이 완료된 시점에 join-room을 emit해야 socket.id가 확정되어 있음.
    // useEffect 바깥에서 emit하면 아직 연결 전일 수 있음.
    socketInstance.on("connect", () => {
      socketInstance.emit("join-room", { roomId, userName, joinMode });
    });

    // ── room-joined: 방 입장 성공 ─────────────────────────────────────────
    // 서버가 방 입장을 허용하면 기존 참가자 목록과 함께 이 이벤트를 보냄.
    // 1) store에 내 정보 + 참가자 목록 저장
    // 2) useWebRTC.handleRoomJoined 호출 → 기존 참가자들에게 offer 전송
    socketInstance.on("room-joined", (existingParticipants: RoomParticipant[]) => {
      setRoomInfo(roomId, socketInstance.id ?? "", userName);
      setConnectionStatus("connected");

      // RoomParticipant(서버 타입) → Participant(클라이언트 타입) 변환
      // 초기 미디어 상태는 enabled로 가정 (실제 상태는 media-state-changed로 동기화)
      setParticipants(
        existingParticipants.map((p) => ({
          id: p.socketId,
          name: p.userName,
          isAudioEnabled: true,
          isVideoEnabled: true,
          isScreenSharing: false,
        })),
      );

      // useWebRTC가 기존 참가자들에게 연결 제안을 보내도록 위임
      onRoomJoinedRef.current(existingParticipants);
    });

    // ── join-room-error: 방 입장 실패 ────────────────────────────────────
    // join 모드에서 방이 존재하지 않거나, 정원 초과 등의 경우 서버가 에러를 보냄
    socketInstance.on("join-room-error", (message: string) => {
      setConnectionStatus("error");
      setErrorMessage(message);
    });

    // ── user-joined: 다른 사람이 방에 입장 ───────────────────────────────
    // 새로 들어온 사람이 나에게 연결 제안을 보내올 것이므로,
    // 여기서는 store에 참가자 추가만 하고 WebRTC 연결 준비는 제안 수신 시 처리.
    socketInstance.on("user-joined", (socketId: string, joinedUserName: string) => {
      addParticipant({
        id: socketId,
        name: joinedUserName,
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
      });
    });

    // ── user-left: 참가자 퇴장 ────────────────────────────────────────────
    // 1) store에서 참가자 제거 → VideoTile이 사라짐
    // 2) cleanupPeer 호출 → RTCPeerConnection 종료 + 스트림 해제
    socketInstance.on("user-left", (socketId: string) => {
      removeParticipant(socketId);
      onUserLeftRef.current(socketId);
    });

    socketInstance.on(
      "media-state-changed",
      (socketId: string, state: { audio?: boolean; video?: boolean }) => {
        updateParticipantMedia(socketId, state.audio, state.video);
      },
    );

    socketInstance.on("screen-share-changed", (socketId: string, enabled: boolean) => {
      updateParticipantScreenShare(socketId, enabled);
    });

    // ── transcript-entry: 자막 수신 ──────────────────────────────────────
    // 다른 참가자가 발화한 자막을 수신 → store에 추가
    socketInstance.on("transcript-entry", (entry: TranscriptEntry) => {
      // 타입 가드: text 길이 500자 제한 (서버에서도 검증하지만 클라이언트도 방어)
      if (typeof entry.text === "string" && entry.text.length <= 500) {
        useTranscriptStore.getState().addEntry(entry);
      }
    });

    //

    // ── WebRTC 시그널링 수신 → useWebRTC 핸들러로 위임 ───────────────────
    // 서버는 offer/answer/ice-candidate를 단순 중계(relay)만 함.
    // 실제 처리는 useWebRTC의 각 핸들러가 담당.

    // offer: 기존 참가자가 나에게 연결을 제안 → 수락하고 응답 전송
    socketInstance.on("offer", (fromId: string, offer: RTCSessionDescriptionInit) => {
      onOfferRef.current(fromId, offer);
    });

    // answer: 내가 보낸 제안에 대한 응답 → 연결 완료
    socketInstance.on("answer", (fromId: string, answer: RTCSessionDescriptionInit) => {
      onAnswerRef.current(fromId, answer);
    });

    // ice-candidate: 상대방이 찾은 네트워크 경로 후보 → 경로 추가
    socketInstance.on("ice-candidate", (fromId: string, candidate: RTCIceCandidateInit) => {
      onIceCandidateRef.current(fromId, candidate);
    });

    // ── disconnect: 소켓 연결 끊김 ───────────────────────────────────────
    // 네트워크 오류, 서버 재시작 등으로 연결이 끊긴 경우
    socketInstance.on("disconnect", () => {
      useConnectionStore.getState().setConnectionStatus("idle");
    });

    // ── cleanup: 컴포넌트 언마운트(방 퇴장) 시 소켓 연결 종료 ───────────
    return () => {
      socketInstance.disconnect();
    };
  }, []); // roomId/userName/joinMode는 마운트 시 URL에서 읽은 고정값 → 재실행 불필요

  // ─────────────────────────────────────────────────────────────────────────
  // 시그널링 송신 함수
  //
  // useWebRTC에서 직접 소켓에 접근하지 않고 이 함수들을 주입받아 사용함.
  // → useWebRTC와 소켓 구현이 분리됨 (테스트 용이성, 관심사 분리)
  // ─────────────────────────────────────────────────────────────────────────

  // 내가 생성한 연결 제안을 특정 대상에게 전송
  const sendConnectionProposal = (
    targetId: string,
    offer: RTCSessionDescriptionInit,
  ) => {
    socket.current?.emit("offer", targetId, offer);
  };

  // 상대방의 제안에 대한 응답을 전송
  const sendConnectionResponse = (
    targetId: string,
    answer: RTCSessionDescriptionInit,
  ) => {
    socket.current?.emit("answer", targetId, answer);
  };

  // 수집된 네트워크 경로를 상대방에게 전송
  const sendNetworkPath = (
    targetId: string,
    candidate: RTCIceCandidateInit,
  ) => {
    socket.current?.emit("ice-candidate", targetId, candidate);
  };

  // 자막 엔트리를 방 전체에 브로드캐스트
  const sendTranscriptEntry = (entry: TranscriptEntry) => {
    socket.current?.emit("transcript-entry", entry);
  };

  return {
    socket, // 필요 시 직접 소켓 접근용 (toggle-audio 등)
    sendConnectionProposal, // useWebRTC에 주입
    sendConnectionResponse, // useWebRTC에 주입
    sendNetworkPath, // useWebRTC에 주입
    sendTranscriptEntry, // useTranscription에 주입
  };
};
