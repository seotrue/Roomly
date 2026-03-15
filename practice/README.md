# 🎥 WebRTC 연습 파일

WebRTC의 기본 흐름을 직접 코딩하면서 학습할 수 있는 연습 파일입니다.

## 📁 파일 구조

```
practice/
├── webrtc-basic.html        # 📝 연습용 파일 (TODO가 있는 버전)
├── webrtc-basic-answer.html # ✅ 정답 파일 (완성된 버전)
└── README.md                # 📖 이 파일
```

## 🎯 학습 목표

1. **미디어 획득**: `getUserMedia()`로 카메라/마이크 접근
2. **PeerConnection 생성**: WebRTC 연결 객체 만들기
3. **트랙 추가**: 내 미디어를 연결에 추가
4. **이벤트 리스너**: `onicecandidate`, `ontrack`, `onconnectionstatechange`
5. **Offer/Answer 교환**: SDP 협상 과정 이해
6. **연결 완료**: P2P 통신 성공!

## 🚀 사용 방법

### 1단계: 브라우저 2개 준비

```
크롬 탭 1  👤 Alice 역할
크롬 탭 2  👤 Bob 역할

또는

크롬 창 1  👤 Alice 역할
파이어폭스  👤 Bob 역할
```

### 2단계: 연습 파일 열기

```bash
# 방법 1: 파일 탐색기에서 더블클릭
practice/webrtc-basic.html

# 방법 2: 브라우저에서 직접 열기
# File > Open File... > webrtc-basic.html 선택
```

### 3단계: 코드 작성

파일을 열면 TODO 주석이 있습니다. 각 TODO를 완성하세요!

```javascript
// TODO 1-1: getUserMedia 구현하기
localStream = null; // 여기를 수정하세요!

// TODO 2-1: PeerConnection 생성
pc = null; // 여기를 수정하세요!

// TODO 2-2: 트랙 추가
// 여기에 코드를 작성하세요!

// ... 등등
```

### 4단계: 테스트

#### Alice (탭 1)
1. "카메라 켜기" 클릭
2. "PeerConnection 생성" 클릭
3. "Offer 생성" 클릭
4. "Offer 복사" 클릭
5. Bob에게 전달 (탭 2로 이동)

#### Bob (탭 2)
1. "카메라 켜기" 클릭
2. "PeerConnection 생성" 클릭
3. Alice의 Offer 붙여넣기
4. "Offer 받기" 클릭
5. "Answer 생성" 클릭
6. "Answer 복사" 클릭
7. Alice에게 전달 (탭 1로 이동)

#### Alice (탭 1)
1. Bob의 Answer 붙여넣기
2. "Answer 받기" 클릭
3. ✨ 연결 완료! 서로의 영상이 보입니다!

## 📝 TODO 리스트

### TODO 1: 미디어 획득
```javascript
// 힌트:
localStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});
```

### TODO 2-1: PeerConnection 생성
```javascript
// 힌트:
pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});
```

### TODO 2-2: 트랙 추가
```javascript
// 힌트:
localStream.getTracks().forEach(track => {
  pc.addTrack(track, localStream);
});
```

### TODO 2-3: 이벤트 리스너
```javascript
// 1) ICE Candidate
pc.onicecandidate = (event) => {
  if (event.candidate) {
    log('🗺️ ICE Candidate 발견');
  }
};

// 2) 상대방 트랙 수신
pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
  log('📹 상대방 영상 수신!');
};

// 3) 연결 상태
pc.onconnectionstatechange = () => {
  log(`🔌 연결 상태: ${pc.connectionState}`);
};
```

### TODO 3: Offer 생성
```javascript
// 힌트:
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
```

### TODO 4: Offer 받기 & Answer 생성
```javascript
// Offer 받기:
const offer = JSON.parse(offerText);
await pc.setRemoteDescription(offer);

// Answer 생성:
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
```

### TODO 5: Answer 받기
```javascript
// 힌트:
const answer = JSON.parse(answerText);
await pc.setRemoteDescription(answer);
```

## 💡 막혔을 때

### 1. 로그 확인
브라우저 개발자 도구 (F12) > Console 탭에서 에러 확인

### 2. 정답 파일 참고
```bash
practice/webrtc-basic-answer.html
```
완성된 코드를 확인할 수 있습니다.

### 3. 다시 시작
페이지를 새로고침 (F5)하면 처음부터 다시 시작할 수 있습니다.

## 🐛 트러블슈팅

### 카메라/마이크 권한 거부됨
```
해결: 브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭
     → 카메라/마이크 권한 "허용"으로 변경
     → 페이지 새로고침
```

### Offer/Answer 복사가 안 됨
```
해결: textarea를 드래그해서 Ctrl+C (또는 Cmd+C) 직접 복사
```

### 영상이 안 보임
```
체크리스트:
☐ 양쪽 모두 카메라를 켰는가?
☐ PeerConnection을 생성했는가?
☐ Offer와 Answer를 정확히 복사/붙여넣기 했는가?
☐ 로그에 "연결 완료" 메시지가 있는가?
☐ 개발자 도구 Console에 에러가 있는가?
```

## 📚 추가 학습 자료

### MDN 문서
- [WebRTC API](https://developer.mozilla.org/ko/docs/Web/API/WebRTC_API)
- [getUserMedia](https://developer.mozilla.org/ko/docs/Web/API/MediaDevices/getUserMedia)
- [RTCPeerConnection](https://developer.mozilla.org/ko/docs/Web/API/RTCPeerConnection)

### 다음 단계
연습이 끝나면 실제 프로젝트 코드로 돌아가서:
- `hooks/useWebRTC.ts` 코드 분석
- `hooks/useSocket.ts`의 시그널링 로직 이해
- Socket.IO를 사용한 실시간 Offer/Answer 교환 구현

## 🎉 완료!

모든 TODO를 완성하고 양쪽 영상이 보이면 성공입니다!

이제 WebRTC의 기본 흐름을 이해했으니, 실제 프로젝트 코드를 분석해보세요:
- `hooks/useWebRTC.ts`: PeerConnection 관리
- `hooks/useSocket.ts`: 시그널링 서버 통신
- `hooks/useMedia.ts`: 미디어 스트림 관리

화이팅! 🚀
