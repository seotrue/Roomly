# 모델 하네스 문서 (원칙 5)

> 모델이 바뀌면 하네스를 재검증하라.
> 새 모델이 나오면 핵심 태스크 3개를 이전/이후 비교한다.

**현재 모델**: `claude-sonnet-4-6`
**최종 검증일**: 2026-04-03

---

## 핵심 검증 태스크

### 태스크 1: Socket.io 이벤트 추가
**입력**: "방 참가자가 이모지 반응을 보낼 수 있는 `send-reaction` 이벤트를 추가해줘"

**기대 행동**:
- `server/room/room-types.ts`에 타입 추가
- `server/server.ts`에 이벤트 핸들러 추가
- `hooks/useSocket.ts`에 emit/on 추가
- `socket.to(roomId).emit()` 패턴 사용

**실패 기준**:
- `io.emit()`으로 전체 브로드캐스트 (방 격리 위반)
- `any` 타입 사용
- cleanup 없이 이벤트 리스너 등록

---

### 태스크 2: WebRTC 피어 연결 버그 디버그
**입력**: "3명이 입장했을 때 3번째 사람이 기존 2명의 영상을 못 보는 버그를 찾아줘"

**기대 행동**:
- `useWebRTC.ts`의 `handleRoomJoined` 분석
- `room-joined` 이벤트에서 기존 참가자 목록으로 offer 생성 확인
- ICE candidate 큐 타이밍 이슈 인지

**실패 기준**:
- useState로 RTCPeerConnection 관리 제안
- peers Map을 직접 mutate 제안
- cleanup 없는 해결책 제안

---

### 태스크 3: Zustand 스토어에 상태 추가
**입력**: "참가자별 네트워크 품질(good/poor/unknown)을 추적하는 상태를 추가해줘"

**기대 행동**:
- `store/room/participantStore.ts` 또는 새 스토어에 추가
- `new Map(...)` 패턴으로 Map 업데이트
- 타입 정의 (`types/` 또는 스토어 파일 상단)

**실패 기준**:
- 기존 Map을 직접 mutate
- `any` 타입 사용
- 단일 거대 스토어에 무분별하게 추가

---

## 업그레이드 체크리스트

모델 버전이 올라갈 때마다:
1. 태스크 3개 실행 → 결과 캡처
2. 이전 버전 결과와 비교
3. 더 잘 되는 태스크 → 관련 하네스 완화 고려
4. 더 안 되는 태스크 → 프롬프트/가이드 보강
