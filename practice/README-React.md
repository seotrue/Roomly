# 🎥 WebRTC 연습 (React + TypeScript)

실제 프로젝트 구조와 유사한 형태로 WebRTC를 학습할 수 있는 연습용 파일입니다!

## 📁 파일 구조

```
practice/
├── hooks/
│   ├── useMediaPractice.ts          # 📝 연습용: 미디어 획득 hook
│   ├── useMediaPractice-answer.ts   # ✅ 정답
│   ├── useWebRTCPractice.ts         # 📝 연습용: WebRTC hook
│   └── useWebRTCPractice-answer.ts  # ✅ 정답
├── pages/
│   └── WebRTCPracticePage.tsx       # 📄 메인 페이지 컴포넌트
├── webrtc-basic.html                # 바닐라 JS 버전
├── webrtc-basic-answer.html         # 바닐라 JS 정답
├── README.md                        # 바닐라 JS 가이드
└── README-React.md                  # 이 파일
```

## 🎯 학습 목표

1. **Custom Hooks 작성**: React hooks 패턴으로 WebRTC 로직 분리
2. **useState/useRef 활용**: 상태 관리와 인스턴스 관리 구분
3. **useEffect 생명주기**: 미디어 리소스의 setup/cleanup
4. **TypeScript 타입**: RTCPeerConnection 관련 타입 이해
5. **실전 패턴**: 실제 프로젝트와 유사한 코드 구조

## 🚀 사용 방법

### 1단계: 프로젝트에 통합

이 파일들은 이미 `practice/` 폴더에 생성되어 있습니다!

### 2단계: Next.js에 페이지 추가 (선택사항)

Next.js 앱에서 테스트하려면:

```bash
# practice 폴더를 app 폴더 안으로 복사 (또는 링크)
# 예시: app/practice/page.tsx 로 이동
```

또는 개발 서버 없이 바로 실행:

```tsx
// 임시 테스트 페이지 만들기
// app/webrtc-test/page.tsx

export { default } from '@/practice/pages/WebRTCPracticePage';
```

### 3단계: TODO 완성하기

#### ✍️ TODO 1: 미디어 획득

**파일**: `practice/hooks/useMediaPractice.ts`

```typescript
// TODO 1-1: getUserMedia 구현
stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// TODO 1-2: cleanup
return () => {
  stream?.getTracks().forEach(track => track.stop());
};
```

#### ✍️ TODO 2: PeerConnection 생성

**파일**: `practice/hooks/useWebRTCPractice.ts`

```typescript
// TODO 2-1: PeerConnection 생성
const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

// TODO 2-2: 트랙 추가
localStream?.getTracks().forEach(track => {
  pc.addTrack(track, localStream);
});

// TODO 2-3: 이벤트 리스너
pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('🗺️ ICE Candidate:', event.candidate.type);
  }
};

pc.ontrack = (event) => {
  setRemoteStream(event.streams[0]);
};

pc.onconnectionstatechange = () => {
  setConnectionState(pc.connectionState);
};
```

#### ✍️ TODO 3: Offer 생성

```typescript
// TODO 3-1: Offer 생성
const offerObj = await pc.createOffer();

// TODO 3-2: Local Description 설정
await pc.setLocalDescription(offerObj);
```

#### ✍️ TODO 4: Offer 받기 & Answer 생성

```typescript
// TODO 4-1: Offer 파싱
const offerObj = JSON.parse(offerText);

// TODO 4-2: Remote Description 설정
await pc.setRemoteDescription(offerObj);

// TODO 4-3: Answer 생성
const answerObj = await pc.createAnswer();

// TODO 4-4: Local Description 설정
await pc.setLocalDescription(answerObj);
```

#### ✍️ TODO 5: Answer 받기

```typescript
// TODO 5-1: Answer 파싱
const answerObj = JSON.parse(answerText);

// TODO 5-2: Remote Description 설정
await pc.setRemoteDescription(answerObj);
```

## 🎓 실제 프로젝트와의 비교

### 연습용 vs 실제 프로젝트

| 구분 | 연습용 | 실제 프로젝트 |
|------|--------|--------------|
| **hooks/useMedia** | `useMediaPractice.ts` | `hooks/useMedia.ts` |
| **hooks/useWebRTC** | `useWebRTCPractice.ts` | `hooks/useWebRTC.ts` |
| **시그널링** | 수동 복사/붙여넣기 | Socket.IO (`hooks/useSocket.ts`) |
| **상태 관리** | useState | Zustand (`store/room/`) |
| **페이지** | `WebRTCPracticePage.tsx` | `app/room/[roomId]/page.tsx` |

### 다음 단계: 실제 코드 이해하기

연습을 마쳤다면 실제 프로젝트 코드를 분석해보세요:

```typescript
// 1. 미디어 관리
hooks/useMedia.ts
store/room/mediaStore.ts

// 2. WebRTC 연결
hooks/useWebRTC.ts

// 3. 시그널링 (Socket.IO)
hooks/useSocket.ts

// 4. 메인 페이지
app/room/[roomId]/page.tsx
```

## 💡 React Hooks 패턴 설명

### useState vs useRef

```typescript
// ✅ useState: UI에 반영되어야 하는 값
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
// → remoteStream이 바뀌면 컴포넌트 리렌더

// ✅ useRef: 인스턴스 관리 (리렌더 불필요)
const pcRef = useRef<RTCPeerConnection | null>(null);
// → pcRef.current가 바뀌어도 리렌더 안 됨
```

### useEffect cleanup

```typescript
useEffect(() => {
  // setup: 미디어 스트림 획득
  const stream = await getUserMedia(...);
  
  // cleanup: 컴포넌트 언마운트 시 실행
  return () => {
    stream?.getTracks().forEach(track => track.stop());
  };
}, []);
```

### Custom Hook 패턴

```typescript
// ✅ 로직을 hook으로 분리
export const useMediaPractice = () => {
  // 내부 구현...
  
  // 필요한 것만 export
  return { localStream, error };
};

// 컴포넌트에서 사용
const { localStream, error } = useMediaPractice();
```

## 🐛 트러블슈팅

### Q: Next.js에서 "window is not defined" 에러

**A**: 컴포넌트 최상단에 `'use client'` 추가

```typescript
'use client';

import { useMediaPractice } from '@/practice/hooks/useMediaPractice';
```

### Q: TypeScript 에러: RTCPeerConnection 타입

**A**: `@types/node` 대신 브라우저 타입 사용

```json
// tsconfig.json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"]
  }
}
```

### Q: 카메라/마이크 권한 에러

**A**: HTTPS 또는 localhost에서 실행

```bash
# localhost에서 실행 (HTTP OK)
npm run dev

# 또는 브라우저 설정에서 권한 허용
```

### Q: 영상이 안 보임

**체크리스트:**
- ☐ 양쪽 모두 카메라를 켰는가?
- ☐ PeerConnection을 생성했는가?
- ☐ Offer와 Answer를 정확히 복사/붙여넣기 했는가?
- ☐ 개발자 도구 Console에 에러가 있는가?
- ☐ `connectionState`가 'connected'인가?

## 📚 학습 흐름 추천

### 1단계: 바닐라 JS 버전 (기초)
```
practice/webrtc-basic.html → 이해하기
```
WebRTC API를 순수하게 경험

### 2단계: React 버전 (실전)
```
practice/hooks/*.ts → TODO 완성
practice/pages/WebRTCPracticePage.tsx → 테스트
```
React 패턴으로 구조화

### 3단계: 실제 프로젝트 (응용)
```
hooks/useMedia.ts → 미디어 관리
hooks/useWebRTC.ts → WebRTC 로직
hooks/useSocket.ts → 시그널링
```
Socket.IO와 Zustand 통합

### 4단계: 확장 (심화)
- 화면 공유 구현
- 마이크/카메라 on/off
- 3명 이상 통화 (Mesh)
- 채팅 기능 (DataChannel)

## 🎉 완료 후 체크리스트

- [ ] `useMediaPractice.ts`의 TODO 1-1, 1-2 완성
- [ ] `useWebRTCPractice.ts`의 TODO 2-1, 2-2, 2-3 완성
- [ ] `useWebRTCPractice.ts`의 TODO 3-1, 3-2 완성
- [ ] `useWebRTCPractice.ts`의 TODO 4-1, 4-2, 4-3, 4-4 완성
- [ ] `useWebRTCPractice.ts`의 TODO 5-1, 5-2 완성
- [ ] 브라우저 2개에서 테스트 성공
- [ ] 실제 프로젝트 코드 분석 완료

## 🚀 다음 단계

모든 TODO를 완성했다면:

1. **정답 파일 비교**: `*-answer.ts` 파일과 비교
2. **실제 프로젝트 분석**: `hooks/useWebRTC.ts` 등 분석
3. **Socket.IO 학습**: 자동 시그널링 구현 이해
4. **Zustand 학습**: 전역 상태 관리 이해
5. **심화 기능 구현**: 화면 공유, 채팅 등

화이팅! 💪🎯
