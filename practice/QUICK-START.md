# 🚀 빠른 시작 가이드

React 버전 연습 파일을 바로 시작하는 방법입니다!

## ⚡ 1분 안에 시작하기

### 방법 1: 독립 실행 (추천)

VSCode에서 바로 실행:

```bash
# 1. VSCode에서 파일 열기
practice/pages/WebRTCPracticePage.tsx

# 2. 마우스 우클릭
"Copy Path" 선택

# 3. 임시 테스트 페이지 생성
```

`app/webrtc-test/page.tsx` 파일 생성:

```typescript
'use client';

export { default } from '@/practice/pages/WebRTCPracticePage';
```

완료! 이제 `http://localhost:3000/webrtc-test` 접속

### 방법 2: HTML로 빠르게 테스트

```bash
# 브라우저에서 바로 열기
practice/webrtc-basic.html

# 탭 2개 띄워서 테스트
```

## 📝 TODO 완성 순서

### 1️⃣ 미디어 획득 (5분)

**파일**: `practice/hooks/useMediaPractice.ts`

**TODO 1-1**: Line 27
```typescript
stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});
```

**TODO 1-2**: Line 40
```typescript
stream?.getTracks().forEach(track => track.stop());
```

### 2️⃣ PeerConnection 생성 (10분)

**파일**: `practice/hooks/useWebRTCPractice.ts`

**TODO 2-1**: Line 43
```typescript
const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
```

**TODO 2-2**: Line 54
```typescript
localStream?.getTracks().forEach(track => {
  pc.addTrack(track, localStream);
});
```

**TODO 2-3**: Lines 67, 75, 83
```typescript
// onicecandidate
if (event.candidate) {
  console.log('🗺️ ICE Candidate:', event.candidate.type);
}

// ontrack
setRemoteStream(event.streams[0]);

// onconnectionstatechange
setConnectionState(pc.connectionState);
```

### 3️⃣ Offer 생성 (5분)

**TODO 3-1**: Line 102
```typescript
const offerObj = await pc.createOffer();
```

**TODO 3-2**: Line 109
```typescript
await pc.setLocalDescription(offerObj);
```

### 4️⃣ Offer 받기 & Answer 생성 (10분)

**TODO 4-1**: Line 132
```typescript
const offerObj = JSON.parse(offerText);
```

**TODO 4-2**: Line 139
```typescript
await pc.setRemoteDescription(offerObj);
```

**TODO 4-3**: Line 159
```typescript
const answerObj = await pc.createAnswer();
```

**TODO 4-4**: Line 166
```typescript
await pc.setLocalDescription(answerObj);
```

### 5️⃣ Answer 받기 (5분)

**TODO 5-1**: Line 187
```typescript
const answerObj = JSON.parse(answerText);
```

**TODO 5-2**: Line 194
```typescript
await pc.setRemoteDescription(answerObj);
```

## ✅ 테스트 체크리스트

### Alice (탭 1)
- [ ] 페이지 로드 → 카메라 자동 켜짐
- [ ] "PeerConnection 생성" 클릭
- [ ] "Offer 생성" 클릭
- [ ] "Offer 복사" 클릭
- [ ] 복사한 내용을 Bob에게 전달

### Bob (탭 2)
- [ ] 페이지 로드 → 카메라 자동 켜짐
- [ ] "PeerConnection 생성" 클릭
- [ ] Alice의 Offer 붙여넣기
- [ ] "Offer 받기" 클릭
- [ ] "Answer 생성" 클릭
- [ ] "Answer 복사" 클릭
- [ ] 복사한 내용을 Alice에게 전달

### Alice (탭 1)
- [ ] Bob의 Answer 붙여넣기
- [ ] "Answer 받기" 클릭
- [ ] ✨ 상대방 영상이 보이면 성공!

## 🐛 문제 해결

### 카메라가 안 켜져요
```
1. 브라우저 주소창 왼쪽 아이콘 클릭
2. 카메라/마이크 권한 "허용"
3. 페이지 새로고침 (F5)
```

### 에러가 나요
```
1. F12 → Console 탭 확인
2. 에러 메시지 복사
3. 해당 파일의 TODO 주석 다시 확인
4. practice/hooks/*-answer.ts 정답 파일 참고
```

### Offer/Answer가 너무 길어요
```
정상입니다! JSON 형태의 SDP 정보입니다.
전체를 복사해서 붙여넣으세요.
```

## 🎯 30분 완성 타임라인

| 시간 | 작업 |
|------|------|
| 0-5분 | 파일 구조 파악 & 페이지 열기 |
| 5-10분 | TODO 1 완성 (미디어 획득) |
| 10-20분 | TODO 2 완성 (PeerConnection) |
| 20-25분 | TODO 3, 4, 5 완성 (Offer/Answer) |
| 25-30분 | 테스트 & 성공! 🎉 |

## 💡 꿀팁

### VSCode 단축키
- `Cmd/Ctrl + P`: 파일 빠르게 열기
- `Cmd/Ctrl + F`: 파일 내 검색 (TODO 찾기)
- `F12`: 브라우저 개발자 도구

### 디버깅
```typescript
// 각 함수에 console.log 추가
console.log('🔍 디버그:', pc.connectionState);
console.log('🔍 localStream:', localStream);
```

### 빠른 복사
```
1. textarea 클릭
2. Ctrl/Cmd + A (전체 선택)
3. Ctrl/Cmd + C (복사)
```

## 📚 막혔을 때

### 1단계: 콘솔 확인
```
F12 → Console 탭
에러 메시지 읽기
```

### 2단계: 정답 파일 참고
```typescript
// 연습용
practice/hooks/useMediaPractice.ts

// 정답 (막혔을 때만!)
practice/hooks/useMediaPractice-answer.ts
```

### 3단계: 실제 프로젝트 참고
```typescript
// 실제로 작동하는 코드
hooks/useMedia.ts
hooks/useWebRTC.ts
```

## 🎉 완료 후

모든 TODO를 완성하고 영상이 보이면:

1. **축하합니다!** 🎊 WebRTC의 기본을 이해했습니다!
2. **다음 단계**: 실제 프로젝트 코드 분석
   - `hooks/useWebRTC.ts` - 실전 패턴
   - `hooks/useSocket.ts` - 자동 시그널링
   - `store/room/mediaStore.ts` - 상태 관리

3. **심화 학습**:
   - 화면 공유 구현
   - 3명 이상 통화
   - 채팅 기능
   - 녹화 기능

화이팅! 💪🚀
