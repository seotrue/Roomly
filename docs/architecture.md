# Roomly 아키텍처 문서

> 최종 업데이트: 2026-03-13
> 구현 완료 단계: 1단계(서버) ~ 4단계(WebRTC P2P)

---

## 1. 전체 구조 한눈에 보기

```
브라우저 A                   서버 (포트 3000)              브라우저 B
─────────────────           ──────────────────           ─────────────────
app/room/page.tsx           Express + Socket.io          app/room/page.tsx
  │                           │                            │
  ├─ useMedia                 │                            ├─ useMedia
  │   └─ getUserMedia()       │                            │   └─ getUserMedia()
  │                           │                            │
  ├─ useSocket ──────────────►│◄──────────────── useSocket─┤
  │   └─ emit/on             │   join-room                │   └─ emit/on
  │                          │   room-joined              │
  │                          │   user-joined/left         │
  │                          │   offer/answer/ice ──────► │
  │◄──────────────────────────│                            │
  │                           │                            │
  └─ useWebRTC                │                            └─ useWebRTC
      └─ RTCPeerConnection ◄──────────────────────────────── RTCPeerConnection
         (P2P 직접 연결, 서버 미경유)
```

---

## 2. 디렉토리 책임

```
/
├── app/
│   ├── page.tsx                  홈 페이지 — 방 만들기/입장 UI
│   └── room/[roomId]/page.tsx    방 페이지 — 훅 조립 + 비디오/컨트롤 UI
│
├── features/home/
│   ├── api/room.ts               REST API 호출 (checkRoomExists, createRoom)
│   └── model/home-form.ts        폼 타입 / normalize / validate / URL 빌더
│
├── hooks/
│   ├── useMedia.ts               getUserMedia → localStream 관리
│   ├── useSocket.ts              Socket.io 연결 + 모든 이벤트 바인딩
│   └── useWebRTC.ts              RTCPeerConnection P2P Mesh 생명주기
│
├── store/room/
│   ├── connectionStore.ts        소켓 연결 상태 + 내 방/소켓 정보
│   ├── participantStore.ts       참가자 목록 (Map<socketId, Participant>)
│   └── mediaStore.ts             로컬/원격 스트림 + 미디어 ON/OFF 상태
│
└── server/
    ├── server.ts                 Express + Socket.io 통합 진입점
    └── room/
        ├── room-types.ts         서버 전용 타입 정의
        ├── room-store.ts         rooms/users 인메모리 저장소
        ├── room-utils.ts         roomId normalize/validate
        └── room-service.ts       join/leave/조회 비즈니스 로직
```

---

## 3. 사용자 액션 플로우

### 3-1. 홈 페이지 — 방 만들기

```
사용자: 이름 입력 → "방 만들기" 클릭
  │
  ├─ validateHomeForm() → 이름 비어있으면 필드 에러 표시, 중단
  │
  ├─ POST /api/rooms
  │   └─ 서버: generateRoomId() → roomStore.createRoom(roomId) → { roomId } 반환
  │
  └─ router.push('/room/{roomId}?name={userName}&mode=create')
```

### 3-2. 홈 페이지 — 방 입장

```
사용자: 이름 + 방 ID 입력 → "입장하기" 클릭
  │
  ├─ validateHomeForm() → 이름/방ID 비어있으면 필드 에러, 중단
  │
  ├─ GET /api/rooms/{roomId}
  │   ├─ 404: "존재하지 않는 방" 에러 메시지 표시
  │   └─ 200: 다음 단계로
  │
  └─ router.push('/room/{roomId}?name={userName}&mode=join')
```

### 3-3. 방 페이지 마운트 순서

```
1. useMedia 실행
   └─ navigator.mediaDevices.getUserMedia({ video, audio })
       ├─ 성공 → mediaStore.setLocalStream(stream)
       └─ 실패 → 콘솔 에러 (카메라/마이크 없는 환경 등)

2. useWebRTC 초기화
   └─ peers ref (Map<socketId, RTCPeerConnection>) 준비

3. useSocket 실행
   └─ io(NEXT_PUBLIC_API_URL) → 소켓 연결 시작
       └─ 'connect' 이벤트 수신 시
           └─ emit('join-room', { roomId, userName, joinMode })
```

### 3-4. 방 입장 후 시그널링 흐름 (B가 입장, A는 이미 있음)

```
B: emit('join-room')
    │
    ▼
서버: handleJoinRoom() 실행
    ├─ B에게: emit('room-joined', [A 정보])     ← B가 기존 참가자 목록 파악
    └─ A에게: emit('user-joined', B.socketId, B.userName)

A: 'user-joined' 수신
    └─ createPeerConnection(B.socketId)
        ├─ localStream 트랙 추가 (pc.addTrack)
        ├─ pc.createOffer()
        ├─ pc.setLocalDescription(offer)
        └─ emit('offer', B.socketId, offer)

B: 'offer' 수신 (fromId = A.socketId)
    └─ createPeerConnection(A.socketId)
        ├─ localStream 트랙 추가
        ├─ pc.setRemoteDescription(offer)
        ├─ pc.createAnswer()
        ├─ pc.setLocalDescription(answer)
        └─ emit('answer', A.socketId, answer)

A: 'answer' 수신
    └─ pc.setRemoteDescription(answer)

양측: pc.onicecandidate 발화
    └─ emit('ice-candidate', targetId, candidate)

상대방: 'ice-candidate' 수신
    └─ pc.addIceCandidate(candidate)

연결 수립 완료:
    └─ pc.ontrack 발화 → mediaStore.setRemoteStream(socketId, stream)
        └─ RemoteVideo 컴포넌트가 store 구독 → video.srcObject 갱신 → 영상 표시
```

### 3-5. 참가자 퇴장

```
퇴장자: 나가기 버튼 클릭 or 탭 닫기
    ├─ cleanupAllPeers() → 모든 RTCPeerConnection.close()
    └─ socket disconnect 발생

서버: handleLeaveRoom() → emit('user-left', socketId) → 방의 나머지 참가자들

남은 참가자들: 'user-left' 수신
    ├─ participantStore.removeParticipant(socketId)   ← UI에서 타일 제거
    ├─ useWebRTC.cleanupPeer(socketId)                ← RTCPeerConnection 종료
    └─ mediaStore.removeRemoteStream(socketId)         ← 스트림 해제
```

---

## 4. Socket.io 이벤트 명세

### Client → Server

| 이벤트 | 페이로드 | 발생 시점 |
|---|---|---|
| `join-room` | `{ roomId, userName, joinMode: 'create'\|'join' }` | 소켓 connect 직후 |
| `leave-room` | — | 나가기 버튼 |
| `offer` | `(targetSocketId, RTCSessionDescriptionInit)` | A가 B에게 연결 요청 |
| `answer` | `(targetSocketId, RTCSessionDescriptionInit)` | B가 A의 offer에 응답 |
| `ice-candidate` | `(targetSocketId, RTCIceCandidateInit)` | ICE 후보 수집 시마다 |
| `toggle-audio` | `(enabled: boolean)` | 마이크 토글 |
| `toggle-video` | `(enabled: boolean)` | 카메라 토글 |

### Server → Client

| 이벤트 | 페이로드 | 의미 |
|---|---|---|
| `room-joined` | `RoomParticipant[]` | 입장 성공. 기존 참가자 목록 |
| `join-room-error` | `string` | 입장 실패 (방 없음/정원 초과 등) |
| `user-joined` | `(socketId, userName)` | 다른 사람 입장. 기존 참가자가 offer 보내야 함 |
| `user-left` | `socketId` | 참가자 퇴장 |
| `offer` | `(fromSocketId, RTCSessionDescriptionInit)` | offer 수신 |
| `answer` | `(fromSocketId, RTCSessionDescriptionInit)` | answer 수신 |
| `ice-candidate` | `(fromSocketId, RTCIceCandidateInit)` | ICE candidate 수신 |
| `media-state-changed` | `(socketId, { audio?: boolean, video?: boolean })` | 상대방 미디어 상태 변경 |

### 서버의 emit 패턴 정리

| 코드 | 수신 대상 |
|---|---|
| `socket.emit(이벤트)` | 이벤트를 보낸 소켓(나)에게만 |
| `socket.to(roomId).emit(이벤트)` | 해당 방의 나 제외 전원 |
| `io.to(socketId).emit(이벤트)` | 특정 소켓 1명에게만 |

---

## 5. Zustand 스토어 구조

### 스토어 분리 이유
단일 거대 스토어 대신 관심사별로 분리 → 불필요한 리렌더 최소화

```
connectionStore   연결 상태(idle/connecting/connected/error), 내 socketId/userName/roomId
participantStore  참가자 목록 Map<socketId, Participant>
mediaStore        localStream, remoteStreams Map, 마이크/카메라/화면공유 ON/OFF
```

### 주요 업데이트 패턴

```typescript
// Map 업데이트: 직접 mutate 금지 → new Map()으로 복사 후 수정
addParticipant: (p) => set((state) => ({
  participants: new Map(state.participants).set(p.id, p)
}))

// store 액션을 useEffect 안에서 쓸 때: getState()로 직접 접근
// → hook 레벨에서 구독하면 useEffect 의존성 배열 경고 발생
const { setRoomInfo } = useConnectionStore.getState();
```

---

## 6. 훅 의존성 구조

```
RoomPage
  │
  ├─ useMedia()
  │   └─ 반환: { localStream }
  │
  ├─ useWebRTC({ localStream, sendOffer, sendAnswer, sendIceCandidate })
  │   └─ 반환: { handleRoomJoined, handleOffer, handleAnswer,
  │              handleIceCandidate, cleanupPeer, cleanupAllPeers }
  │
  └─ useSocket({ roomId, userName, joinMode,
  │              onRoomJoined, onUserLeft,
  │              onOffer, onAnswer, onIceCandidate })
      └─ 반환: { sendOffer, sendAnswer, sendIceCandidate }

주의: useWebRTC → useSocket (sendOffer 등) 순서로 선언되어 있지만,
      실제 함수 호출은 클로저로 바인딩되어 있어 순환 참조 없음.
      useWebRTC에 넘기는 sendOffer는 래퍼 함수 (targetId, offer) => sendOffer(...)
```

---

## 7. WebRTC P2P Mesh 구조

### N명 참가 시 연결 수

```
2명: 1개 연결 (A-B)
3명: 3개 연결 (A-B, A-C, B-C)
4명: 6개 연결
N명: N*(N-1)/2 개 연결
```

각 클라이언트는 자신을 제외한 N-1명과 각각 RTCPeerConnection을 유지한다.

### Peer 연결 생명주기

```
생성: createPeerConnection(targetId)
  └─ new RTCPeerConnection({ iceServers })
  └─ localStream.getTracks() → pc.addTrack(track, stream)
  └─ pc.onicecandidate → sendIceCandidate(targetId, candidate)
  └─ pc.ontrack → mediaStore.setRemoteStream(targetId, stream)
  └─ pc.onconnectionstatechange → 'failed'|'disconnected' 시 cleanupPeer

종료: cleanupPeer(socketId)
  └─ pc.close()
  └─ peers.current.delete(socketId)
  └─ mediaStore.removeRemoteStream(socketId)
```

---

## 8. REST API 명세

| 메서드 | 경로 | 응답 | 역할 |
|---|---|---|---|
| `POST` | `/api/rooms` | `{ roomId: string }` | 방 생성 (고유 ID 발급) |
| `GET` | `/api/rooms/:roomId` | `{ exists: boolean, participantCount: number }` | 방 존재 여부 확인 |

---

## 9. 환경변수

| 변수명 | 설명 | 예시 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Socket.io 서버 URL | `http://localhost:3000` |

> 프로덕션 배포 시 실제 서버 도메인으로 교체. `NEXT_PUBLIC_` prefix가 붙어야 브라우저에서 접근 가능.

---

## 10. 알려진 미구현 사항 (다음 단계)

| 항목 | 관련 파일 | 우선순위 |
|---|---|---|
| 화면 공유 | `hooks/useMedia.ts`, `useWebRTC.ts` | 높음 |
| media-state-changed 수신 처리 | `hooks/useSocket.ts` | 높음 |
| 방 퇴장 시 store 완전 리셋 | `app/room/[roomId]/page.tsx` | 보통 |
| ICE candidate 큐 (타이밍 이슈 방지) | `hooks/useWebRTC.ts` | 보통 |
| offer 중복 방지 | `hooks/useWebRTC.ts` | 보통 |
