# Roomly 개발 플랜

## Context
Google Meet 같은 그룹 화상회의 웹앱 Roomly를 단계별로 구현한다.
학습이 목적이므로 쏠이가 프론트엔드를 직접 구현하고, Claude는 백엔드 주도 + 리뷰/가이드 역할.
0단계(프로젝트 초기 설정, 타입 정의, SCSS 시스템)는 완료된 상태.

## 기술 스택
- Next.js (App Router) + TypeScript
- CSS Modules + SCSS (shadcn/ui 사용 안 함, UI 직접 구현)
- Zustand 상태관리
- Socket.io 시그널링 서버 (별도 Express 서버, 포트 3001)
- WebRTC 브라우저 네이티브 API (P2P Mesh 방식)

---

## 사전 정리 작업 (1단계 시작 전)

- `app/globals.css` 삭제 (globals.scss로 대체됨)
- `app/layout.tsx`에서 `globals.css` import 제거 확인 (globals.scss만 import)
- Tailwind 관련 패키지(tailwindcss, @tailwindcss/postcss) 사용 안 하므로 무시 (빌드에 영향 없음)

---

## 1단계: 기반 인프라 (백엔드 + 상태관리)

### 목표
Socket.io 시그널링 서버 구동, REST API, Zustand store, WebRTC 설정 완성.

### 구현 파일

| 파일 | 담당 | 역할 |
|---|---|---|
| `server/index.ts` | Claude | Socket.io + Express 시그널링 서버 |
| `server/roomManager.ts` | Claude | 서버 사이드 방/참가자 메모리 관리 |
| `app/api/rooms/route.ts` | Claude | 방 생성(POST) / 확인(GET) REST API |
| `lib/webrtc.ts` | Claude | RTCPeerConnection ICE 서버 설정 |
| `store/roomStore.ts` | 쏠이 (Claude 가이드) | Zustand 전역 상태 |
| `.env.local` | 쏠이 | 환경변수 (NEXT_PUBLIC_SOCKET_URL, TURN 설정) |

### 완료 기준
- `npx tsx server/index.ts` 실행 시 포트 3001 정상 기동
- `POST /api/rooms` → 방 ID 반환
- `store/roomStore.ts` TypeScript 오류 없이 컴파일

---

## 2단계: 홈 페이지 (방 만들기 / 입장)

### 목표
이름 입력 + 방 만들기/입장 UI 구현. API 연동 후 방 페이지로 라우팅.

### 구현 파일

| 파일 | 담당 | 역할 |
|---|---|---|
| `app/page.tsx` | 쏠이 | 홈 페이지 (기본 템플릿 교체) |
| `app/page.module.scss` | 쏠이 | 홈 페이지 스타일 |
| `components/HomeForm.tsx` | 쏠이 | 방 만들기/입장 폼 |
| `components/HomeForm.module.scss` | 쏠이 | HomeForm 스타일 |
| `hooks/useRoom.ts` | 쏠이 (Claude 가이드) | 방 생성/입장 API 호출 훅 |

### 완료 기준
- 이름 + 방 만들기 → `/room/[roomId]`로 라우팅
- 이름 + 방 ID 입장 → `/room/[roomId]`로 라우팅
- 존재하지 않는 방 → 에러 메시지 노출
- 반응형 레이아웃

---

## 3단계: 미디어 스트림 + 방 페이지 UI

### 목표
카메라/마이크 권한 획득 후 로컬 스트림 표시. 방 페이지 레이아웃 완성.

### 구현 파일

| 파일 | 담당 | 역할 |
|---|---|---|
| `app/room/[roomId]/page.tsx` | 쏠이 | 화상회의 방 페이지 |
| `app/room/[roomId]/page.module.scss` | 쏠이 | 방 레이아웃 스타일 |
| `hooks/useMedia.ts` | 쏠이 (Claude 가이드) | 카메라/마이크 스트림 관리 훅 |
| `components/VideoGrid.tsx` | 쏠이 | 참가자 수에 따른 그리드 레이아웃 |
| `components/VideoGrid.module.scss` | 쏠이 | 그리드 스타일 |
| `components/VideoTile.tsx` | 쏠이 | 개별 비디오 타일 (이름 태그, 상태 아이콘) |
| `components/VideoTile.module.scss` | 쏠이 | 비디오 타일 스타일 |
| `components/Controls.tsx` | 쏠이 | 하단 컨트롤 바 (마이크/카메라/화면공유/나가기) |
| `components/Controls.module.scss` | 쏠이 | 컨트롤 바 스타일 |

### 완료 기준
- 방 입장 시 카메라/마이크 권한 요청 후 로컬 비디오 표시
- 마이크/카메라 토글 작동
- 나가기 → 스트림 정지 + 홈으로 이동

---

## 4단계: Socket.io + WebRTC P2P 핵심 구현

### 목표
시그널링 연동으로 피어 간 WebRTC 연결 수립. 실제 영상/음성 교환.

### 구현 파일

| 파일 | 담당 | 역할 |
|---|---|---|
| `hooks/useSocket.ts` | 쏠이 (Claude 집중 가이드) | Socket.io 연결/이벤트 구독/발행 |
| `hooks/useWebRTC.ts` | 쏠이 (Claude 집중 가이드) | RTCPeerConnection 생성/관리, offer/answer/ICE 처리 |
| `server/index.ts` | Claude (보강) | 시그널링 이벤트 핸들러 완성 |

### 완료 기준
- 두 탭에서 같은 방 입장 시 영상/음성 연결 성립
- 세 번째 참가자 입장 시 Full Mesh 연결
- 참가자 퇴장 시 타일 제거 + 연결 정리

---

## 5단계: 화면 공유 + 미디어 상태 동기화

### 목표
화면 공유 기능 완성. 마이크/카메라 상태를 다른 참가자에게 실시간 동기화.

### 구현 파일

| 파일 | 담당 | 역할 |
|---|---|---|
| `hooks/useMedia.ts` | 쏠이 (보강) | 화면 공유 스트림 전환 |
| `hooks/useWebRTC.ts` | 쏠이 (보강) | replaceTrack으로 화면 공유 트랙 교체 |
| `components/VideoTile.tsx` | 쏠이 (보강) | 음소거/카메라 오프 아이콘 오버레이 |
| `components/Controls.tsx` | 쏠이 (보강) | 화면 공유 버튼 상태 반영 |

### 완료 기준
- 화면 공유 시작/종료 정상 작동
- 마이크/카메라 상태 다른 참가자 UI에 즉시 반영
- 화면 공유 중 참가자 타일 강조 표시

---

## 전체 파일 트리 (완성 시)

```
/
├── server/
│   ├── index.ts                      [Claude - 1단계]
│   └── roomManager.ts                [Claude - 1단계]
├── app/
│   ├── layout.tsx                    [완료]
│   ├── page.tsx                      [쏠이 - 2단계]
│   ├── page.module.scss              [쏠이 - 2단계]
│   ├── room/[roomId]/
│   │   ├── page.tsx                  [쏠이 - 3단계]
│   │   └── page.module.scss         [쏠이 - 3단계]
│   └── api/rooms/
│       └── route.ts                  [Claude - 1단계]
├── components/
│   ├── HomeForm.tsx                  [쏠이 - 2단계]
│   ├── HomeForm.module.scss         [쏠이 - 2단계]
│   ├── VideoGrid.tsx                 [쏠이 - 3단계]
│   ├── VideoGrid.module.scss        [쏠이 - 3단계]
│   ├── VideoTile.tsx                 [쏠이 - 3단계]
│   ├── VideoTile.module.scss        [쏠이 - 3단계]
│   ├── Controls.tsx                  [쏠이 - 3단계]
│   └── Controls.module.scss         [쏠이 - 3단계]
├── hooks/
│   ├── useRoom.ts                    [쏠이 - 2단계]
│   ├── useMedia.ts                   [쏠이 - 3단계]
│   ├── useSocket.ts                  [쏠이 - 4단계]
│   └── useWebRTC.ts                  [쏠이 - 4단계]
├── store/
│   └── roomStore.ts                  [쏠이 - 1단계]
├── lib/
│   └── webrtc.ts                     [Claude - 1단계]
├── types/
│   └── room.ts                       [완료]
├── styles/
│   ├── globals.scss                  [완료]
│   ├── _variables.scss               [완료]
│   └── _mixins.scss                  [완료]
└── .env.local                        [쏠이 - 1단계]
```

---

## Socket.io 이벤트 명세

기존 `types/room.ts`의 `SocketEvents` 타입과 연계.

### Client → Server

| 이벤트 | Payload | 발생 시점 |
|---|---|---|
| `join-room` | `(roomId: string, userName: string)` | 방 페이지 마운트 + 미디어 스트림 준비 완료 후 |
| `leave-room` | `(roomId: string)` | 나가기 버튼 or 페이지 언마운트 |
| `signal` | `SignalingMessage` | offer/answer/ice-candidate 생성 시 |
| `toggle-audio` | `(roomId: string, enabled: boolean)` | 마이크 토글 클릭 |
| `toggle-video` | `(roomId: string, enabled: boolean)` | 카메라 토글 클릭 |
| `start-screen-share` | `(roomId: string)` | 화면 공유 시작 |
| `stop-screen-share` | `(roomId: string)` | 화면 공유 종료 |

### Server → Client

| 이벤트 | Payload | 의미 |
|---|---|---|
| `room-joined` | `(participants: Participant[])` | 입장 성공. 기존 참가자 목록 전달 |
| `user-joined` | `(userId: string, userName: string)` | 다른 사람이 입장. 기존 참가자가 offer를 보내야 함 |
| `user-left` | `(userId: string)` | 참가자 퇴장. 피어 연결 종료 + UI 제거 |
| `signal-received` | `(message: SignalingMessage)` | offer/answer/ice-candidate 수신 |
| `media-state-changed` | `(userId: string, audio: boolean, video: boolean)` | 다른 참가자 마이크/카메라 상태 변경 |
| `error` | `(message: string)` | 서버 에러 |

### 서버 내부 처리 흐름

```
join-room 수신
  → roomManager에 참가자 추가
  → emit('room-joined', 기존참가자목록) → 신규 소켓
  → broadcast('user-joined', userId, userName) → 방의 나머지 소켓

signal 수신
  → to 필드의 userId로 소켓 ID 조회
  → emit('signal-received', message) → 해당 소켓

toggle-audio / toggle-video 수신
  → broadcast('media-state-changed', userId, audio, video) → 방의 나머지

leave-room / disconnect 수신
  → roomManager에서 참가자 제거
  → broadcast('user-left', userId) → 방의 나머지
```

---

## WebRTC 연결 흐름 (코드 레벨)

### 전제
- 모든 참가자는 로컬 미디어 스트림을 보유한 상태에서 `join-room` emit
- Offer를 보내는 쪽: 기존 참가자 (`user-joined` 이벤트 수신 시)
- Answer를 보내는 쪽: 신규 참가자 (`room-joined`에서 목록 확인 후 offer 수신 대기)

### B가 방에 입장하는 전체 흐름 (A가 이미 있는 경우)

```
1. B: socket.emit('join-room', roomId, userName)

2. Server:
   → B에게: emit('room-joined', [A의 정보])
   → A에게: emit('user-joined', B.userId, B.userName)

3. A: user-joined 수신
   → createPeerConnection(B.userId)
   → pc.addTrack(localStream 각 트랙)
   → pc.createOffer()
   → pc.setLocalDescription(offer)
   → socket.emit('signal', { type:'offer', from:A.userId, to:B.userId, offer })

4. B: room-joined 수신
   → createPeerConnection(A.userId)  ← 미리 준비
   → pc.addTrack(localStream 각 트랙)
   → ICE candidate 대기

5. B: signal-received { type:'offer', from:A.userId } 수신
   → pc.setRemoteDescription(offer)
   → pc.createAnswer()
   → pc.setLocalDescription(answer)
   → socket.emit('signal', { type:'answer', from:B.userId, to:A.userId, answer })

6. A: signal-received { type:'answer' } 수신
   → pc.setRemoteDescription(answer)

7. 양측: ICE candidate 수집 (pc.onicecandidate)
   → socket.emit('signal', { type:'ice-candidate', from, to, candidate })

8. 상대방: signal-received { type:'ice-candidate' } 수신
   → pc.addIceCandidate(candidate)

9. 연결 수립 완료 (pc.ontrack)
   → 원격 스트림 → Zustand store → VideoTile 반영
```

### 3인 이상 Mesh 예시 (C 입장, A-B 이미 연결)

```
Server → C: room-joined([A, B])
Server → A: user-joined(C)
Server → B: user-joined(C)

결과:
  A → C: offer (A가 user-joined 수신)
  B → C: offer (B가 user-joined 수신)
  C → A: answer, C → B: answer

최종: A-B, A-C, B-C = Full Mesh
```

---

## Zustand 상태 관리 설계 (store/roomStore.ts)

### State

```typescript
type RoomState = {
  roomId: string | null;
  myUserId: string | null;
  myUserName: string | null;
  participants: Map<string, Participant>;   // userId → Participant
  remoteStreams: Map<string, MediaStream>;  // userId → MediaStream
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
};
```

### Actions

```typescript
type RoomActions = {
  setRoomInfo: (roomId: string, userId: string, userName: string) => void;
  setParticipants: (participants: Participant[]) => void;  // room-joined 초기 목록
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipantMedia: (userId: string, audio: boolean, video: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;
  setConnectionStatus: (status: RoomState['connectionStatus']) => void;
  setErrorMessage: (message: string | null) => void;
  resetRoom: () => void;
};
```

### 주의: Map 업데이트 패턴

Map을 직접 mutate하면 Zustand가 변경을 감지하지 못함. 반드시 새 Map 생성:
```typescript
addParticipant: (p) => set((s) => ({
  participants: new Map(s.participants).set(p.id, p)
}))
```

---

## 단계별 학습 포인트

### 1단계
- Zustand `create`, `set`, `get` 사용법 + Map 불변성 패턴
- Next.js App Router API Route (`route.ts` 파일 규칙, `NextRequest`/`NextResponse`)
- Socket.io 서버: `socket.join()`, `socket.to().emit()` vs `io.to().emit()` 차이

### 2단계
- CSS Modules + SCSS: `@use '../styles/variables' as *` 임포트 패턴
- Next.js App Router 클라이언트 컴포넌트 (`'use client'` 필요 시점)
- `useRouter().push()`, `useParams()` 사용법

### 3단계
- `getUserMedia` 비동기 호출 + 권한 거부 에러 처리
- `track.enabled = false` vs `track.stop()` 차이 (음소거 vs 완전 종료)
- `videoRef.current.srcObject = stream` 패턴 (React에서 video 엘리먼트 다루기)
- `useEffect` cleanup에서 `stream.getTracks().forEach(t => t.stop())` 필수

### 4단계 (핵심)
- WebRTC 3단계: SDP offer/answer 교환 → ICE candidate 교환 → 연결 수립
- `RTCPeerConnection` 상태 머신: `connectionState`, `iceConnectionState`, `signalingState`
- **useRef vs useState**: RTCPeerConnection은 렌더링과 무관한 생명주기 → `useRef(new Map())`으로 관리
- **stale closure 방지**: 이벤트 핸들러에서 `peersRef.current`로 최신 참조 접근
- Mesh 구조에서 N명 → 각자 N-1개 업스트림 (4-6명이 학습용 적절한 한계)
- Trickle ICE: candidate 생성 즉시 전송 (모아서 보내기보다 연결 속도 유리)

### 5단계
- `RTCRtpSender.replaceTrack(newTrack)`: 연결 끊지 않고 트랙 교체
- 화면 공유 종료 감지: `displayStream.getVideoTracks()[0].onended` 이벤트

---

## 리스크 및 주의사항

### 1. Stale Closure (가장 흔한 버그)

```typescript
// 나쁜 패턴
useEffect(() => {
  socket.on('signal-received', (msg) => {
    peers[msg.from]?.setRemoteDescription(...)  // 초기 빈 Map 캡처
  })
}, [])

// 올바른 패턴
const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
useEffect(() => {
  socket.on('signal-received', (msg) => {
    peersRef.current.get(msg.from)?.setRemoteDescription(...)  // 항상 최신
  })
}, [])
```

### 2. ICE Candidate Timing

`setRemoteDescription` 완료 전에 `addIceCandidate` 호출 시 에러.
→ candidate 큐에 버퍼링 후 `setRemoteDescription` 완료 시점에 순서대로 처리:

```
candidateQueue: Map<userId, RTCIceCandidateInit[]>
→ ice-candidate 수신 시: remoteDescription 없으면 큐에 push
→ setRemoteDescription 완료 후: 큐의 candidate 순서대로 addIceCandidate
```

### 3. Offer 중복 방지

`user-joined` 이벤트 중복 수신 or 컴포넌트 리마운트 시 동일 userId에게 offer 두 번 전송 가능.
→ `peersRef.current.has(userId)` 확인 후 없을 때만 연결 생성.

### 4. 화면 공유 트랙 교체

`replaceTrack` 후 공유 종료 시 카메라 트랙으로 다시 교체 필요.
로컬 미리보기(`localStream`)와 각 peer sender 트랙 동기화 필수.

### 5. 연결 실패 처리

`pc.onconnectionstatechange`에서 `'failed'` 감지 시 `pc.restartIce()` 시도 or 피어 연결 재생성.

### 6. 서버 포트 분리

Next.js 개발 서버(3000) + Socket.io 서버(3001) 분리 운용.
`.env.local`의 `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001`로 관리.
HTTPS 환경에서는 `wss://`로 변경 필요.

---

## 협업 워크플로우 (매 단계 반복)

```
1. Claude: 핵심 개념 설명 + 구현할 파일의 인터페이스/구조 가이드
2. 쏠이: 해당 파일 직접 구현
3. Claude: 코드 리뷰
   - TypeScript 타입 안전성
   - WebRTC/React 패턴 준수 (useRef vs useState)
   - 메모리 누수 가능성 (cleanup 확인)
   - SCSS @use 임포트 방식
4. 쏠이: 피드백 반영 후 다음 파일로 이동
```
