# Roomly 프로젝트

## 프로젝트 개요
Roomly는 Google Meet과 같은 그룹 화상회의 웹 애플리케이션입니다.
WebRTC 기술을 직접 구현하여 학습하는 것이 주요 목표입니다.

## 기술 스택
- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Signaling**: Socket.io
- **WebRTC**: 브라우저 네이티브 API (라이브러리 없이 직접 구현)
- **STUN**: Google 무료 서버
- **TURN**: Cloudflare (환경 변수로 관리)

## 핵심 기능
- 그룹 화상회의 (P2P Mesh 방식)
- 화면 공유
- 마이크/카메라 온오프

## 아키텍처
- **REST API**: 방 생성/확인 등 최소한의 기능만 제공
- **Socket.io**: 시그널링 처리 (offer/answer/ice-candidate/user-joined/user-left)
- **WebRTC P2P**: 실제 영상/음성 데이터 전송

## 프로젝트 구조
```
/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 홈 (방 만들기/입장)
│   ├── room/[roomId]/
│   │   └── page.tsx       # 화상회의 방
│   └── api/               # REST API routes
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── VideoGrid.tsx     # 비디오 그리드
│   ├── VideoTile.tsx     # 개별 비디오 타일
│   └── Controls.tsx      # 컨트롤 버튼 (마이크/카메라/화면공유)
├── hooks/                # Custom React Hooks
│   ├── useWebRTC.ts      # WebRTC 연결 관리
│   ├── useMedia.ts       # 미디어 스트림 관리
│   ├── useSocket.ts      # Socket.io 연결/이벤트
│   └── useRoom.ts        # 참가자 목록, 방 상태
├── store/                # Zustand 상태 관리
│   └── roomStore.ts      # 방 상태 (참가자, 스트림 등)
├── types/                # TypeScript 타입 정의
│   └── room.ts           # 방, 참가자, 시그널링 메시지 타입
└── lib/                  # 유틸리티 함수
    └── webrtc.ts         # RTCPeerConnection 설정
```

## 코딩 컨벤션

### TypeScript
- 모든 타입을 명시적으로 정의
- `any` 사용 금지
- 인터페이스보다 타입 별칭(type) 선호
- 타입 파일은 `types/` 디렉토리에 집중 관리

### React
- 함수형 컴포넌트만 사용
- Custom hooks로 로직 분리
- Props는 타입으로 명시적 정의
- 파일명: PascalCase (컴포넌트), camelCase (hooks)

### WebRTC 관리
- **중요**: RTCPeerConnection은 `useState`가 아닌 `useRef`로 관리
- 그룹 통화의 peers는 `Map<string, RTCPeerConnection>`으로 useRef 관리
- 메모리 누수 방지를 위해 cleanup 함수 필수 구현

### 환경
- HTTPS 환경에서만 카메라/마이크 접근 가능 (로컬은 localhost로 OK)
- 개발 환경: `npm run dev`
- 환경 변수는 `.env.local`에 관리

### 스타일링
- Tailwind CSS 유틸리티 클래스 사용
- shadcn/ui 컴포넌트 활용
- 반응형 디자인 필수
- 다크모드 지원 권장

### 상태 관리
- 전역 상태는 Zustand 사용
- 컴포넌트 로컬 상태는 useState
- WebRTC 객체는 useRef
- 부수 효과는 useEffect

### Git 컨벤션
- Commit 메시지: `feat:`, `fix:`, `refactor:`, `style:`, `docs:` 등의 prefix 사용
- 기능별로 작은 단위로 커밋
- main 브랜치에서 직접 작업

## 주의사항
- WebRTC는 비동기 작업이므로 항상 에러 핸들링 필요
- ICE candidate는 연결이 완료될 때까지 계속 수집됨
- 피어 연결 종료 시 반드시 리소스 정리 (track.stop(), pc.close())
- 크로스 브라우저 호환성 고려 (Chrome, Firefox, Safari)
