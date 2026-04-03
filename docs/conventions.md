# Roomly 코딩 컨벤션

## TypeScript

- 모든 타입을 명시적으로 정의
- `any` 사용 금지, 축약형 변수명 금지
- 인터페이스보다 타입 별칭(type) 선호
- 런타임 데이터(fetch 응답 등)는 타입 가드로 검증
- 타입 파일은 `types/` 디렉토리에 집중 관리

## React

- 함수형 컴포넌트만 사용
- Custom hooks로 로직 분리
- Props는 타입으로 명시적 정의
- 파일명: PascalCase (컴포넌트), camelCase (hooks)

## 기능 모듈 구조 (features/)

### api/ 레이어
- fetch 호출만 담당
- 런타임 타입 가드 필수 포함
- 에러 처리 책임

### model/ 레이어
- 순수 함수만 구현 (normalize, validate, URL 빌더 등)
- 외부 의존성 없음
- 테스트 가능해야 함

### 페이지 컴포넌트 규칙
- UI + 상태 관리만 담당
- normalize/validate/fetch 직접 구현 금지
- features/ 모듈 호출만 수행

## 스타일링

- CSS Modules + SCSS 사용
- 임포트 패턴: `@use '../styles/variables' as *`
- Tailwind, shadcn/ui 사용 금지, UI 직접 구현
- 반응형 디자인 필수
- 다크모드 지원 권장

## 상태 관리

- 전역 상태: Zustand 사용 (devtools 미들웨어 적용)
- 컴포넌트 로컬 상태: useState
- WebRTC 객체: useRef (중요: useState 금지)
- 부수 효과: useEffect
- **Map 업데이트**: 반드시 `new Map(...)` 으로 새 인스턴스 생성

```typescript
// 올바른 예
addParticipant: (p) => set((state) => ({
  participants: new Map(state.participants).set(p.id, p)
}))

// 틀린 예 (변경사항이 감지되지 않음)
state.participants.set(p.id, p)
```

## 환경

- HTTPS 환경에서만 카메라/마이크 접근 가능 (로컬은 localhost로 OK)
- 개발 환경: `npm run dev`
- 환경 변수는 `.env.local`에 관리

## Git 컨벤션

- Commit 메시지: `feat:`, `fix:`, `refactor:`, `style:`, `docs:` prefix 사용
- 기능별로 작은 단위로 커밋
- main 브랜치에서 직접 작업

### 커밋 메시지 예시

```
feat: 실시간 자막 생성 기능 추가
fix: 방 ID 입력 글자수 제한 수정
docs: WebRTC 가이드 추가
```
