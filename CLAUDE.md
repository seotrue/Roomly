# Roomly 프로젝트

## 프로젝트 개요
Roomly는 Google Meet과 같은 프로덕션 수준의 그룹 화상회의 웹 애플리케이션입니다.
WebRTC 기술을 브라우저 네이티브 API로 직접 구현합니다.

## 기술 스택
- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: CSS Modules + SCSS (shadcn/ui 사용 안 함, UI 직접 구현)
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
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 홈 (방 만들기/입장) — UI + 상태만
│   ├── room/[roomId]/
│   │   └── page.tsx              # 화상회의 방
│   └── api/                      # REST API routes (없음, Express에서 처리)
├── features/                     # 기능 단위 모듈
│   └── home/
│       ├── api/
│       │   └── room.ts           # 방 존재 확인 API (checkRoomExists)
│       └── model/
│           └── home-form.ts      # 폼 타입, normalize, validate, URL 빌더
├── components/                   # React 컴포넌트
│   ├── VideoGrid.tsx             # 비디오 그리드
│   ├── VideoTile.tsx             # 개별 비디오 타일
│   └── Controls.tsx              # 컨트롤 버튼 (마이크/카메라/화면공유)
├── hooks/                        # Custom React Hooks
│   ├── useWebRTC.ts              # WebRTC 연결 관리
│   ├── useMedia.ts               # 미디어 스트림 관리
│   └── useSocket.ts              # Socket.io 연결/이벤트
├── store/                        # Zustand 상태 관리
│   └── roomStore.ts              # 방 상태 (참가자, 스트림 등)
├── types/                        # TypeScript 타입 정의
│   └── room.ts                   # 방, 참가자, 시그널링 메시지 타입
├── lib/                          # 유틸리티
│   └── webrtc.ts                 # RTCPeerConnection ICE 설정
├── styles/                       # SCSS 스타일
│   ├── _variables.scss
│   ├── _mixins.scss
│   ├── globals.scss
│   ├── home.scss
│   └── room.scss
└── server/                       # Express + Socket.io 시그널링 서버
    ├── server.ts
    └── room/
        ├── room-types.ts
        ├── room-store.ts
        ├── room-utils.ts
        └── room-service.ts
```

## 코딩 컨벤션

### TypeScript
- 모든 타입을 명시적으로 정의
- `any` 사용 금지, 축약형 변수명 금지
- 인터페이스보다 타입 별칭(type) 선호
- 런타임 데이터(fetch 응답 등)는 타입 가드로 검증
- 타입 파일은 `types/` 디렉토리에 집중 관리

### React
- 함수형 컴포넌트만 사용
- Custom hooks로 로직 분리
- Props는 타입으로 명시적 정의
- 파일명: PascalCase (컴포넌트), camelCase (hooks)

### 기능 모듈 (features/)
- `api/` : fetch 호출만 담당. 런타임 가드 포함
- `model/` : 순수 함수 (normalize, validate, URL 빌더 등). 테스트 가능하게 유지
- 페이지 컴포넌트는 UI + 상태만 — normalize/validate/fetch 직접 구현 금지

### WebRTC 관리
- **중요**: RTCPeerConnection은 `useState`가 아닌 `useRef`로 관리
- 그룹 통화의 peers는 `Map<string, RTCPeerConnection>`으로 useRef 관리
- 메모리 누수 방지를 위해 cleanup 함수 필수 구현

### 환경
- HTTPS 환경에서만 카메라/마이크 접근 가능 (로컬은 localhost로 OK)
- 개발 환경: `npm run dev`
- 환경 변수는 `.env.local`에 관리

### 스타일링
- CSS Modules + SCSS (`@use '../styles/variables' as *` 임포트 패턴)
- Tailwind, shadcn/ui 사용 안 함
- 반응형 디자인 필수
- 다크모드 지원 권장

### 상태 관리
- 전역 상태는 Zustand 사용 (devtools 미들웨어 적용)
- 컴포넌트 로컬 상태는 useState
- WebRTC 객체는 useRef
- 부수 효과는 useEffect
- Map 업데이트는 반드시 `new Map(...)` 으로 새 인스턴스 생성

### Git 컨벤션
- Commit 메시지: `feat:`, `fix:`, `refactor:`, `style:`, `docs:` 등의 prefix 사용
- 기능별로 작은 단위로 커밋
- main 브랜치에서 직접 작업

## 주의사항
- WebRTC는 비동기 작업이므로 항상 에러 핸들링 필요
- ICE candidate는 연결이 완료될 때까지 계속 수집됨
- 피어 연결 종료 시 반드시 리소스 정리 (track.stop(), pc.close())
- 크로스 브라우저 호환성 고려 (Chrome, Firefox, Safari)
- join-room emit 시 반드시 `{ roomId, userName, joinMode }` payload 구조 사용
