# Roomly 보안 가이드

이 문서는 Roomly 프로젝트의 보안 고려사항과 실무 배포 시 필수 체크리스트를 정리합니다.

## ✅ 현재 구현된 보안 기능

### 1. 네트워크 보안
- ✅ CORS 화이트리스트 (server/server.ts)
- ✅ WSS(WebSocket Secure) 자동 업그레이드 (hooks/useSocket.ts)
- ✅ 보안 HTTP 헤더 (next.config.ts)
  - X-XSS-Protection
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy
  - Permissions-Policy (camera/microphone)

### 2. 입력 검증
- ✅ roomId 정규화 및 검증 (영문소문자+숫자, 1-40자)
- ✅ userName XSS 방어 (HTML 특수문자, 제어문자 차단)
- ✅ 최대 메시지 크기 제한 (1MB)

### 3. 리소스 보호
- ✅ 방당 최대 참가자 수 제한 (50명)
- ✅ Socket.io 타임아웃 설정
  - pingTimeout: 20초
  - pingInterval: 25초
  - connectTimeout: 45초
- ✅ 클라이언트 재연결 시도 제한 (5회)

### 4. WebRTC 보안
- ✅ 시그널링 메시지 방 멤버십 검증 (arePeersInSameRoom)
- ✅ peer connection cleanup (메모리 누수 방지)
- ✅ ICE candidate 큐 (race condition 방어)

## ⚠️ 프로덕션 배포 전 필수 체크리스트

### 1. HTTPS/WSS 설정
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.roomly.example.com  # ⚠️ HTTPS 필수
ALLOWED_ORIGINS=https://roomly.example.com,https://www.roomly.example.com
```

**검증 방법**:
```bash
# 브라우저 개발자 도구 → Network 탭
# WebSocket 연결이 wss://로 시작하는지 확인
```

### 2. TURN 서버 설정 (NAT 통과)
현재는 STUN만 사용 중 → 대칭형 NAT 환경에서 연결 실패 가능

**추가 필요**:
```typescript
// hooks/useWebRTC.ts
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  // ⚠️ 프로덕션 필수: TURN 서버 추가
  {
    urls: process.env.NEXT_PUBLIC_TURN_URL!,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME!,
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL!,
  },
];
```

**TURN 서버 선택지**:
- Cloudflare TURN (유료)
- Twilio STUN/TURN (유료)
- coturn (오픈소스, 자체 호스팅)

### 3. 레이트 리밋 추가
현재 구현 안 됨 → npm 패키지로 추가 권장

**설치**:
```bash
npm install express-rate-limit
```

**적용 예시** (server/server.ts):
```typescript
import rateLimit from 'express-rate-limit';

// API 레이트 리밋
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 100회
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
});

expressApp.use('/api/', apiLimiter);

// Socket.io 연결 레이트 리밋
const connectionLimiter = new Map<string, number>();

io.use((socket, next) => {
  const ip = socket.handshake.address;
  const count = connectionLimiter.get(ip) || 0;

  if (count > 10) { // IP당 동시 연결 10개 제한
    return next(new Error('연결 제한 초과'));
  }

  connectionLimiter.set(ip, count + 1);
  socket.on('disconnect', () => {
    connectionLimiter.set(ip, (connectionLimiter.get(ip) || 1) - 1);
  });

  next();
});
```

### 4. 방 ID를 UUID로 변경
현재 8자리 랜덤 → 브루트포스 공격 가능

**변경 예시** (server/room/room-utils.ts):
```typescript
import { randomUUID } from 'crypto';

export function generateRoomId(): string {
  return randomUUID(); // xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
}
```

### 5. 환경 변수 보안
```bash
# ⚠️ .env.local을 절대 git에 커밋하지 마세요
# .gitignore에 .env* 포함되어 있는지 확인

# 프로덕션 배포 시 플랫폼 환경 변수로 설정
# Render: Environment → Add Environment Variable
# Vercel: Settings → Environment Variables
```

## 🔍 추가 고려사항 (선택)

### 1. 인증 시스템 추가
현재는 누구나 방 생성/입장 가능 → 사용자 인증 추가 권장

**옵션**:
- NextAuth.js (OAuth, JWT)
- Supabase Auth
- Clerk

**추가 시 보안 이점**:
- 방 주인 개념 → 강제 퇴장, 방 삭제 권한
- 사용자별 이용 내역 추적
- 악의적 사용자 차단

### 2. Redis 기반 상태 관리
현재 메모리(Map)에 저장 → 서버 재시작 시 모든 방 손실

**Redis 사용 시 이점**:
- 서버 재시작해도 방 정보 유지
- 수평 확장 (로드 밸런서) 가능
- Socket.io Redis Adapter로 멀티 서버 지원

**설치**:
```bash
npm install redis @socket.io/redis-adapter
```

### 3. 로깅 및 모니터링
보안 이벤트 추적을 위한 로깅 시스템 추가

**로깅 대상**:
- 차단된 CORS 요청
- 입력 검증 실패 (XSS 시도 등)
- 비정상적인 연결 패턴 (DoS 시도)
- 방 생성/입장/퇴장 이벤트

**도구**:
- Winston (로깅 라이브러리)
- Sentry (에러 추적)
- Datadog, Grafana (모니터링)

### 4. Content Security Policy (CSP)
XSS 방어를 더 강화하려면 CSP 헤더 추가

**next.config.ts 추가**:
```typescript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline'; media-src 'self' blob:; connect-src 'self' wss://api.roomly.example.com;"
}
```

### 5. WebRTC 보안 강화
**추가 설정**:
```typescript
// hooks/useWebRTC.ts
const pc = new RTCPeerConnection({
  iceServers: ICE_SERVERS,
  // DTLS 암호화 강제 (기본적으로 활성화되지만 명시)
  iceCandidatePoolSize: 10,
  // 연결 타임아웃 설정
  iceTransportPolicy: 'all', // 'relay'로 설정하면 TURN 서버만 사용 (보안 강화, 속도 저하)
});
```

### 6. 화면 공유 보안
현재 화면 공유 시 아무 제한 없음

**추가 고려**:
- 화면 공유 권한 관리 (방 주인만 가능 등)
- 공유 중인 화면 워터마크 추가
- 녹화 방지 정책

## 🚨 취약점 신고
보안 취약점을 발견하시면 다음으로 연락해주세요:
- Email: security@roomly.example.com (예시)
- 공개 이슈 트래커에 보안 취약점을 올리지 마세요

## 📚 참고 자료
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [WebRTC Security Best Practices](https://webrtc-security.github.io/)
- [Socket.io Security](https://socket.io/docs/v4/security/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
