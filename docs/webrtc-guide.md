# WebRTC 관리 가이드

## 핵심 원칙

RTCPeerConnection은 **반드시 useRef로 관리**하며, 메모리 누수 방지를 위해 cleanup 함수를 필수로 구현해야 합니다.

## Peer 객체 관리

### 올바른 구현

```typescript
const peers = useRef<Map<string, RTCPeerConnection>>(new Map());

// Peer 생성
const createPeerConnection = (socketId: string) => {
  const pc = new RTCPeerConnection({ iceServers: [...] });
  peers.current.set(socketId, pc);
  return pc;
};

// Peer 정리
const cleanupPeer = (socketId: string) => {
  const pc = peers.current.get(socketId);
  if (pc) {
    pc.close();
    peers.current.delete(socketId);
  }
};

// 모든 Peer 정리 (cleanup 함수)
const cleanupAllPeers = () => {
  peers.current.forEach(pc => pc.close());
  peers.current.clear();
};
```

### Map 업데이트 패턴

그룹 통화에서 peers를 Zustand 스토어에 저장할 수 없으므로 (직렬화 불가), 반드시 useRef로 관리합니다.

## 연결 생명주기

### 1. 생성 (createPeerConnection)

```typescript
const pc = new RTCPeerConnection({ iceServers });

// 로컬 스트림 추가
localStream.getTracks().forEach(track => {
  pc.addTrack(track, localStream);
});

// ICE candidate 수집
pc.onicecandidate = (event) => {
  if (event.candidate) {
    sendIceCandidate(targetId, event.candidate);
  }
};

// 원격 스트림 수신
pc.ontrack = (event) => {
  mediaStore.setRemoteStream(targetId, event.streams[0]);
};

// 연결 상태 모니터링
pc.onconnectionstatechange = () => {
  if (['failed', 'disconnected'].includes(pc.connectionState)) {
    cleanupPeer(targetId);
  }
};
```

### 2. Offer/Answer 교환

**Offer 생성 측 (기존 참가자가 새 참가자에게):**

```typescript
const pc = createPeerConnection(newParticipantId);
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
sendOffer(newParticipantId, offer);
```

**Answer 생성 측 (새 참가자):**

```typescript
const pc = createPeerConnection(existingParticipantId);
await pc.setRemoteDescription(new RTCSessionDescription(offer));
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
sendAnswer(existingParticipantId, answer);
```

**Answer 수신 측:**

```typescript
const pc = peers.current.get(senderId);
await pc.setRemoteDescription(new RTCSessionDescription(answer));
```

### 3. ICE Candidate 교환

```typescript
// 발신
pc.onicecandidate = (event) => {
  if (event.candidate) {
    sendIceCandidate(targetId, event.candidate);
  }
};

// 수신
const pc = peers.current.get(senderId);
await pc.addIceCandidate(new RTCIceCandidate(candidate));
```

### 4. 종료 (cleanup)

```typescript
const cleanupPeer = (socketId: string) => {
  const pc = peers.current.get(socketId);
  if (pc) {
    // 모든 트랙 정지
    pc.getSenders().forEach(sender => {
      sender.track?.stop();
    });
    
    // 연결 종료
    pc.close();
    
    // Map에서 제거
    peers.current.delete(socketId);
    
    // 스토어에서 원격 스트림 제거
    mediaStore.removeRemoteStream(socketId);
  }
};
```

## 주의사항

### 비동기 에러 처리

WebRTC 작업은 비동기이므로 모든 작업에 에러 핸들링이 필수입니다.

```typescript
try {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
} catch (error) {
  console.error('Answer 생성 실패:', error);
  cleanupPeer(peerId);
}
```

### ICE Candidate 수집

ICE candidate는 연결이 완료되더라도 계속 수집됩니다. offer/answer 교환이 완료될 때까지 기다렸다가 candidate를 보내야 합니다.

### 크로스 브라우저 호환성

- Chrome: RTCSessionDescription 생성자 필수
- Firefox: 호환성 양호, 신규 API도 지원
- Safari: 제한적 지원, ICE candidate 타이밍 주의

### 메모리 누수 방지

Peer 연결 종료 시 반드시 정리:

```typescript
useEffect(() => {
  return () => {
    cleanupAllPeers(); // 컴포넌트 언마운트 시
  };
}, []);
```

## join-room Payload 구조

소켓 연결 직후 반드시 다음 구조로 emit:

```typescript
socket.emit('join-room', {
  roomId: string,
  userName: string,
  joinMode: 'create' | 'join'
});
```

이 구조는 서버의 room-service에서 엄격하게 검증됩니다.
