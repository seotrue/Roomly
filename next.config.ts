import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  // ─────────────────────────────────────────────────────────────────
  // 보안 HTTP 헤더 설정
  // ─────────────────────────────────────────────────────────────────
  async headers() {
    // CSP 정책 빌드
    const ContentSecurityPolicy = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob:;
      font-src 'self' data:;
      media-src 'self' blob: mediastream:;
      connect-src 'self' ws: wss: https: stun: turn: turns: ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"};
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
      upgrade-insecure-requests;
    `
      .replace(/\s{2,}/g, " ")
      .trim();

    return [
      {
        source: "/:path*",
        headers: [
          // XSS 방어: 브라우저의 XSS 필터 활성화
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Clickjacking 방어: iframe 삽입 차단
          // WebRTC 화상회의는 iframe에 임베드되면 안 됨
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // MIME 타입 스니핑 방지
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Referrer 정보 제어: 외부 사이트에 URL 정보 최소화
          // origin-when-cross-origin: 같은 도메인엔 전체 URL, 외부엔 도메인만
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          // Permissions Policy: 카메라/마이크 접근 제어
          // self: 현재 도메인만 허용, 외부 iframe은 차단
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self)",
          },
          // Content Security Policy: XSS 방어 강화
          // default-src 'self': 기본적으로 같은 도메인만 허용
          // script-src: Next.js 동적 로딩을 위해 unsafe-eval 필요
          // media-src: WebRTC 미디어 스트림을 위해 blob:, mediastream: 허용
          // connect-src: Socket.io WebSocket 연결 허용
          // frame-ancestors 'none': iframe 삽입 완전 차단
          // upgrade-insecure-requests: HTTP → HTTPS 자동 업그레이드
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
