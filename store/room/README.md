# Room Stores

화상회의 방 관련 상태 관리를 담당하는 Zustand 스토어 모음입니다.

## 배경

기존 단일 `store/roomStore.ts` (251줄)를 관심사별로 3개의 스토어로 분리했습니다.

### 문제점
- 251줄, 16개 액션이 한 스토어에 집중
- 낮은 응집성 (서로 다른 관심사가 섞임)
- 불필요한 리렌더 (관계없는 상태 변경에도 구독 컴포넌트가 리렌더)

### 개선 효과
✅ **단일 책임 원칙 (SRP)** - 각 스토어가 명확한 하나의 역할  
✅ **선택적 구독** - 필요한 상태만 구독 → 불필요한 리렌더 방지  
✅ **테스트 용이성** - 각 스토어를 독립적으로 테스트  
✅ **확장성** - 새 기능 추가 시 새 스토어로 격리

## 구조

```
store/room/
├── connectionStore.ts    # 연결 상태 + 방 기본 정보
├── participantStore.ts   # 참가자 관리
├── mediaStore.ts         # 스트림 + 미디어 제어
├── index.ts              # 통합 export (배럴 파일)
└── README.md             # 이 문서
```

## 설계 원칙

### 단일 책임 원칙 (SRP)
각 스토어는 **하나의 명확한 책임**만 가집니다:
- **connectionStore**: 소켓 연결 상태, 방 메타데이터, 에러 처리
- **participantStore**: 참가자 추가/제거/업데이트
- **mediaStore**: WebRTC 스트림, 내 미디어 제어 상태

### 선택적 구독
컴포넌트가 필요한 스토어만 구독하여 불필요한 리렌더를 방지합니다.

```typescript
// ❌ 기존: 모든 상태 변경에 리렌더
const allState = useRoomStore();

// ✅ 개선: 필요한 것만 구독
const participants = useParticipantList(); // 참가자 변경 시만 리렌더
const localStream = useLocalStream();     // 스트림 변경 시만 리렌더
```

## 스토어 상세

### 1. connectionStore

**책임**: 방 연결 상태 관리

**State**:
```typescript
{
  roomId: string | null;
  mySocketId: string | null;
  myUserName: string | null;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
}
```

**주요 액션**:
- `setRoomInfo(roomId, socketId, userName)` - room-joined 이벤트 처리
- `setConnectionStatus(status)` - 연결 상태 업데이트
- `setErrorMessage(message)` - 에러 표시
- `resetConnection()` - 연결 정보 초기화

**Selectors**:
- `useRoomInfo()` - 방 기본 정보
- `useConnectionStatus()` - 연결 상태
- `useErrorMessage()` - 에러 메시지

**사용 예시**:
```typescript
import { useConnectionStatus, useConnectionStore } from '@/store/room';

function LoadingScreen() {
  const status = useConnectionStatus();
  
  if (status === 'connecting') return <Spinner />;
  if (status === 'error') return <ErrorScreen />;
  return null;
}
```

### 2. participantStore

**책임**: 참가자 목록 관리

**State**:
```typescript
{
  participants: Map<socketId, Participant>;
}
```

**주요 액션**:
- `setParticipants(participants)` - 초기 참가자 목록 세팅
- `addParticipant(participant)` - user-joined 이벤트 처리
- `removeParticipant(socketId)` - user-left 이벤트 처리
- `updateParticipantMedia(socketId, audio, video)` - media-state-changed 처리
- `resetParticipants()` - 목록 초기화

**Selectors**:
- `useParticipant(socketId)` - 특정 참가자 1명
- `useParticipantList()` - 전체 참가자 배열
- `useParticipantCount()` - 참가자 수

**사용 예시**:
```typescript
import { useParticipantList } from '@/store/room';

function VideoGrid() {
  const participants = useParticipantList();
  
  return (
    <div className="grid">
      {participants.map((p) => (
        <VideoTile key={p.id} participant={p} />
      ))}
    </div>
  );
}
```

### 3. mediaStore

**책임**: WebRTC 스트림 및 미디어 제어

**State**:
```typescript
{
  localStream: MediaStream | null;
  remoteStreams: Map<socketId, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}
```

**주요 액션**:
- `setLocalStream(stream)` - getUserMedia() 결과 저장
- `setRemoteStream(socketId, stream)` - pc.ontrack 이벤트 처리
- `removeRemoteStream(socketId)` - 스트림 제거
- `setAudioEnabled(enabled)` - 마이크 상태 업데이트
- `setVideoEnabled(enabled)` - 카메라 상태 업데이트
- `setScreenSharing(sharing)` - 화면 공유 상태 업데이트
- `resetMedia()` - 모든 스트림 정리 (track.stop() 포함)

**Selectors**:
- `useLocalStream()` - 내 스트림
- `useRemoteStream(socketId)` - 특정 참가자 스트림
- `useMyMediaState()` - 내 미디어 제어 상태

**사용 예시**:
```typescript
import { useMyMediaState, useMediaStore } from '@/store/room';

function Controls() {
  const { isAudioEnabled, isVideoEnabled } = useMyMediaState();
  const setAudioEnabled = useMediaStore((state) => state.setAudioEnabled);
  
  const toggleAudio = () => {
    // 실제 track.enabled 토글은 useMedia 훅에서
    localStream?.getAudioTracks().forEach(t => t.enabled = !isAudioEnabled);
    setAudioEnabled(!isAudioEnabled);
  };
  
  return (
    <button onClick={toggleAudio}>
      {isAudioEnabled ? '🎤' : '🔇'}
    </button>
  );
}
```

## 통합 사용

### 전체 리셋

방 퇴장 시 모든 스토어를 한 번에 초기화:

```typescript
import { resetAllRoomStores } from '@/store/room';

const handleLeaveRoom = () => {
  // 1. 모든 스토어 리셋 (스트림 정리 포함)
  resetAllRoomStores();
  
  // 2. 소켓 연결 해제
  socket.disconnect();
  
  // 3. 홈으로 이동
  router.push('/');
};
```

### 여러 스토어 동시 사용

```typescript
import {
  useRoomInfo,
  useParticipantCount,
  useMyMediaState,
  useConnectionStore,
  useParticipantStore,
  useMediaStore,
} from '@/store/room';

function RoomHeader() {
  // Selectors로 상태 구독
  const { roomId } = useRoomInfo();
  const participantCount = useParticipantCount();
  const { isAudioEnabled } = useMyMediaState();
  
  // 액션은 필요할 때만 가져오기
  const setAudioEnabled = useMediaStore((state) => state.setAudioEnabled);
  
  return (
    <header>
      <h1>방: {roomId}</h1>
      <p>{participantCount + 1}명 참여 중</p>
      <span>{isAudioEnabled ? '🎤' : '🔇'}</span>
    </header>
  );
}
```

## 데이터 흐름

### 방 입장 시 (Socket.io → Store)

```
1. socket.emit('join-room')
2. socket.on('room-joined') 수신
   ↓
3. connectionStore.setRoomInfo()     ← roomId, socketId, userName
4. participantStore.setParticipants() ← 기존 참가자 목록
5. connectionStore.setConnectionStatus('connected')
```

### 새 참가자 입장 (Socket.io → Store)

```
1. socket.on('user-joined') 수신
   ↓
2. participantStore.addParticipant() ← 새 참가자 정보
3. WebRTC offer 전송 (useWebRTC에서 처리)
```

### 미디어 스트림 수신 (WebRTC → Store)

```
1. pc.ontrack 이벤트 발생
   ↓
2. mediaStore.setRemoteStream(socketId, stream) ← 상대방 스트림
3. VideoTile에서 useRemoteStream(socketId)로 스트림 구독
4. video.srcObject = stream
```

### 참가자 퇴장 (Socket.io → Store)

```
1. socket.on('user-left') 수신
   ↓
2. participantStore.removeParticipant(socketId) ← 참가자 제거
3. mediaStore.removeRemoteStream(socketId)      ← 스트림 제거
4. pc.close() (useWebRTC에서 처리)
```

## 주의사항

### ⚠️ Map 업데이트는 새 인스턴스 생성 필수

Zustand는 참조 동등성으로 변경을 감지합니다. Map을 직접 수정하면 변경이 감지되지 않습니다.

```typescript
// ❌ 나쁨 - Zustand가 변경 감지 못함
const addParticipant = (participant) => {
  state.participants.set(participant.id, participant);
};

// ✅ 좋음 - 새 Map 인스턴스 생성
const addParticipant = (participant) =>
  set((state) => ({
    participants: new Map(state.participants).set(participant.id, participant),
  }));
```

### ⚠️ 스트림 정리는 resetMedia()에서 자동 처리

미디어 스트림은 반드시 `track.stop()`으로 정리해야 카메라 LED가 꺼지고 하드웨어가 해제됩니다.

```typescript
// mediaStore의 resetMedia()가 자동으로 track.stop() 호출
resetAllRoomStores(); // 모든 트랙 정리 포함

// 직접 정리가 필요한 경우
localStream?.getTracks().forEach(track => track.stop());
```

## 성능 최적화

### 1. Shallow Equality

Zustand는 기본적으로 strict equality(`===`)를 사용합니다. 여러 필드를 동시에 구독할 때 shallow equality를 사용하면 불필요한 리렌더를 방지할 수 있습니다:

```typescript
import { shallow } from 'zustand/shallow';

// ❌ 나쁨: 매번 새 객체 생성 → 항상 리렌더
const { roomId, myUserName } = useConnectionStore((state) => ({
  roomId: state.roomId,
  myUserName: state.myUserName,
}));

// ✅ 좋음: shallow equality 사용
const { roomId, myUserName } = useConnectionStore(
  (state) => ({
    roomId: state.roomId,
    myUserName: state.myUserName,
  }),
  shallow
);

// ✅ 더 좋음: 이미 제공되는 selector 사용
const { roomId, myUserName } = useRoomInfo();
```

### 2. 선택적 구독

필요한 것만 구독하세요:

```typescript
// ❌ 나쁨: 전체 상태 구독
const state = useParticipantStore();
console.log(state.participants.size);

// ✅ 좋음: 필요한 값만 구독
const count = useParticipantCount();
console.log(count);
```

### 3. Selector 재사용

자주 사용하는 패턴은 커스텀 selector로 만드세요:

```typescript
// store/room/participantStore.ts에 추가
export const useIsAlone = () =>
  useParticipantStore((state) => state.participants.size === 0);

// 컴포넌트에서
function EmptyRoomNotice() {
  const isAlone = useIsAlone();
  if (!isAlone) return null;
  return <p>아직 아무도 없어요. 친구를 초대해보세요!</p>;
}
```

## 디버깅

모든 스토어는 Redux DevTools 미들웨어를 사용합니다:

1. Chrome에서 Redux DevTools 확장 설치
2. 개발자 도구 → Redux 탭 열기
3. `ConnectionStore`, `ParticipantStore`, `MediaStore` 각각 확인 가능
4. 액션 이름이 명확하게 표시됨 (`setRoomInfo`, `addParticipant` 등)

## 테스트

각 스토어는 독립적으로 테스트 가능합니다:

```typescript
// __tests__/store/participantStore.test.ts
import { useParticipantStore } from '@/store/room/participantStore';

describe('participantStore', () => {
  beforeEach(() => {
    useParticipantStore.getState().resetParticipants();
  });
  
  test('addParticipant', () => {
    const { addParticipant, participants } = useParticipantStore.getState();
    
    addParticipant({ id: 'user1', userName: 'Alice', isAudioEnabled: true, isVideoEnabled: true });
    
    expect(participants.size).toBe(1);
    expect(participants.get('user1')?.userName).toBe('Alice');
  });
});
```

## 확장 가이드

새로운 기능(예: 채팅, 녹화) 추가 시:

1. **새 스토어 생성**: `store/room/chatStore.ts`
2. **기존 스토어와 독립적으로 관리**
3. **index.ts에 export 추가**
4. **resetAllRoomStores()에 추가**

```typescript
// store/room/index.ts
export { useChatStore, useChatMessages } from './chatStore';

export const resetAllRoomStores = () => {
  useConnectionStore.getState().resetConnection();
  useParticipantStore.getState().resetParticipants();
  useMediaStore.getState().resetMedia();
  useChatStore.getState().resetChat(); // 새로 추가
};
```

## 빠른 시작

### 기본 사용법

```typescript
import {
  useRoomInfo,
  useParticipantList,
  useLocalStream,
  useMyMediaState,
  resetAllRoomStores,
} from '@/store/room';

function RoomPage() {
  // 선택적 구독
  const { roomId } = useRoomInfo();
  const participants = useParticipantList();
  const localStream = useLocalStream();
  const { isAudioEnabled } = useMyMediaState();
  
  // 방 퇴장
  const handleLeave = () => {
    resetAllRoomStores();
    router.push('/');
  };
  
  return (
    <div>
      <h1>방: {roomId}</h1>
      <p>{participants.length + 1}명 참여 중</p>
      <button onClick={handleLeave}>나가기</button>
    </div>
  );
}
```

## 참고 자료

- [Zustand 공식 문서](https://github.com/pmndrs/zustand)
- [프로젝트 CLAUDE.md](/CLAUDE.md) - 전체 프로젝트 구조
