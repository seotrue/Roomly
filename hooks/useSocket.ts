import { useEffect, useLayoutEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useConnectionStore } from "@/store/room/connectionStore";
import { useParticipantStore } from "@/store/room/participantStore";
import type { RoomParticipant } from "@/server/room/room-types";

// ─────────────────────────────────────────────
// useSocket
// 방 페이지 마운트 시 소켓 연결 + 이벤트 바인딩
// WebRTC offer/answer/ice 전송은 useWebRTC에서 담당
// ─────────────────────────────────────────────

type UseSocketParams = {
  roomId: string;
  userName: string;
  joinMode: "create" | "join";
  // room-joined 수신 후 기존 참가자들에게 offer 전송 (useWebRTC에서 주입)
  onRoomJoined: (participants: RoomParticipant[]) => void;
  // user-left 수신 후 peer 연결 종료 (useWebRTC에서 주입)
  onUserLeft: (socketId: string) => void;
  // WebRTC 시그널링 수신 핸들러 (useWebRTC에서 주입)
  onOffer: (fromId: string, offer: RTCSessionDescriptionInit) => void;
  onAnswer: (fromId: string, answer: RTCSessionDescriptionInit) => void;
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

  // 콜백 최신값을 ref에 저장 → useEffect 재실행 없이 항상 최신 함수 참조
  const onRoomJoinedRef = useRef(onRoomJoined);
  const onUserLeftRef = useRef(onUserLeft);
  const onOfferRef = useRef(onOffer);
  const onAnswerRef = useRef(onAnswer);
  const onIceCandidateRef = useRef(onIceCandidate);

  // 매 렌더마다 ref 갱신 — useLayoutEffect로 감싸야 lint 규칙 통과
  // (렌더 중 ref.current 직접 수정 금지 → effect 안에서 수정)
  useLayoutEffect(() => {
    onRoomJoinedRef.current = onRoomJoined;
    onUserLeftRef.current = onUserLeft;
    onOfferRef.current = onOffer;
    onAnswerRef.current = onAnswer;
    onIceCandidateRef.current = onIceCandidate;
  });

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000");
    socket.current = s;

    // store 액션은 getState()로 직접 접근 → 의존성 배열 문제 없음
    const { setRoomInfo, setConnectionStatus, setErrorMessage } =
      useConnectionStore.getState();
    const { setParticipants, addParticipant, removeParticipant } =
      useParticipantStore.getState();

    setConnectionStatus("connecting");

    // ── 연결 완료 → join-room emit ──────────
    s.on("connect", () => {
      s.emit("join-room", { roomId, userName, joinMode });
    });

    // ── 입장 성공 ────────────────────────────
    s.on("room-joined", (existingParticipants: RoomParticipant[]) => {
      setRoomInfo(roomId, s.id ?? "", userName);
      setConnectionStatus("connected");

      setParticipants(
        existingParticipants.map((p) => ({
          id: p.socketId,
          name: p.userName,
          isAudioEnabled: true,
          isVideoEnabled: true,
          isScreenSharing: false,
        })),
      );

      onRoomJoinedRef.current(existingParticipants);
    });

    // ── 입장 실패 ────────────────────────────
    s.on("join-room-error", (message: string) => {
      setConnectionStatus("error");
      setErrorMessage(message);
    });

    // ── 새 참가자 입장 ───────────────────────
    s.on("user-joined", (socketId: string, joinedUserName: string) => {
      addParticipant({
        id: socketId,
        name: joinedUserName,
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
      });
    });

    // ── 참가자 퇴장 ──────────────────────────
    s.on("user-left", (socketId: string) => {
      removeParticipant(socketId);
      onUserLeftRef.current(socketId);
    });

    // ── WebRTC 시그널링 수신 ─────────────────
    s.on("offer", (fromId: string, offer: RTCSessionDescriptionInit) => {
      onOfferRef.current(fromId, offer);
    });

    s.on("answer", (fromId: string, answer: RTCSessionDescriptionInit) => {
      onAnswerRef.current(fromId, answer);
    });

    s.on("ice-candidate", (fromId: string, candidate: RTCIceCandidateInit) => {
      onIceCandidateRef.current(fromId, candidate);
    });

    // ── 연결 끊김 ────────────────────────────
    s.on("disconnect", () => {
      useConnectionStore.getState().setConnectionStatus("idle");
    });

    return () => {
      s.disconnect();
    };
  }, []); // roomId/userName은 마운트 시 URL에서 읽은 고정값

  // ─────────────────────────────────────────────
  // 시그널링 emit 함수 (useWebRTC에서 호출)
  // ─────────────────────────────────────────────

  const sendOffer = (targetId: string, offer: RTCSessionDescriptionInit) => {
    socket.current?.emit("offer", targetId, offer);
  };

  const sendAnswer = (targetId: string, answer: RTCSessionDescriptionInit) => {
    socket.current?.emit("answer", targetId, answer);
  };

  const sendIceCandidate = (
    targetId: string,
    candidate: RTCIceCandidateInit,
  ) => {
    socket.current?.emit("ice-candidate", targetId, candidate);
  };

  return {
    socket,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
  };
};
