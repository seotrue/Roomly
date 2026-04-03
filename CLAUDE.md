# Roomly 프로젝트

프로덕션 수준의 그룹 화상회의 웹 앱. Google Meet처럼 WebRTC 네이티브 API로 구현합니다.

## 기술 스택

- **Framework**: Next.js (App Router) + TypeScript
- **State**: Zustand
- **Signaling**: Socket.io
- **WebRTC**: 브라우저 네이티브 API (라이브러리 없음)
- **Styling**: CSS Modules + SCSS (shadcn/ui 없음)
- **ICE**: Google STUN + Cloudflare TURN

## 핵심 기능

- 그룹 화상회의 (P2P Mesh)
- 화면 공유
- 마이크/카메라 온오프

## 아키텍처

```
REST API (방 생성/확인)
     ↓
Socket.io (시그널링: offer/answer/ICE)
     ↓
WebRTC P2P (영상/음성 전송)
```

## 디렉토리 구조

```
app/                    # Next.js 페이지
  ├── page.tsx          # 홈 (방 만들기/입장)
  └── room/[roomId]/    # 화상회의 방
features/home/          # 기능 모듈
  ├── api/              # API 호출
  └── model/            # normalize/validate 로직
components/             # React 컴포넌트
hooks/                  # Custom hooks (useMedia, useSocket, useWebRTC)
store/                  # Zustand 스토어 (roomStore)
types/                  # TypeScript 타입
lib/                    # 유틸리티 (webrtc ICE 설정)
styles/                 # SCSS 스타일
server/                 # Express + Socket.io (시그널링 서버)
```

상세 문서: **[아키텍처](docs/architecture.md)**

## 코딩 컨벤션

### TypeScript
- 명시적 타입 정의 (any 금지)
- type > interface
- 런타임 가드 필수

### React
- 함수형 컴포넌트만 사용
- Custom hooks로 로직 분리
- PascalCase (컴포넌트), camelCase (hooks)

### 기능 모듈 (features/)
- `api/`: fetch만 (런타임 가드 포함)
- `model/`: 순수 함수 (normalize, validate 등)
- 페이지: UI + 상태만 (fetch/validate 직접 금지)

### WebRTC
- **RTCPeerConnection은 useRef만** (useState 금지)
- Peers: `Map<socketId, RTCPeerConnection>` useRef로 관리
- cleanup 함수 필수 (메모리 누수 방지)

### 상태 관리
- 전역: Zustand (devtools 미들웨어 적용)
- 로컬: useState
- WebRTC 객체: useRef
- 부수 효과: useEffect
- **Map 업데이트**: 반드시 `new Map(...)` 사용

### 스타일
- CSS Modules + SCSS
- 반응형 필수, 다크모드 권장
- `@use '../styles/variables' as *` 패턴

### 환경
- HTTPS만 (카메라/마이크) — localhost OK
- 개발: `npm run dev`
- env vars: `.env.local`

### Git
- `feat:`, `fix:`, `refactor:`, `style:`, `docs:` prefix
- 작은 단위 커밋

상세 문서: **[컨벤션](docs/conventions.md)**, **[WebRTC 가이드](docs/webrtc-guide.md)**

## 핵심 주의사항

- WebRTC는 비동기 → 에러 핸들링 필수
- ICE candidate는 연결 완료 후에도 수집됨
- 피어 정리: `pc.close()` + `peers.delete(socketId)`
- join-room payload: `{ roomId, userName, joinMode }`
- 크로스브라우저: Chrome, Firefox, Safari 호환성 필수
