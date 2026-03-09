'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/home.scss';

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = userName.trim();
    const trimmedRoom = roomId.trim();

    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (mode === 'join') {
      if (!trimmedRoom) {
        setError('방 ID를 입력해주세요.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/rooms/${trimmedRoom}`);
        const data = await res.json() as { exists: boolean };
        if (!data.exists) {
          setError('존재하지 않는 방입니다.');
          return;
        }
      } catch {
        setError('서버 연결에 실패했습니다.');
        return;
      } finally {
        setIsLoading(false);
      }
    }

    const targetRoomId = mode === 'create' ? generateRoomId() : trimmedRoom;
    router.push(`/room/${targetRoomId}?name=${encodeURIComponent(trimmedName)}`);
  };

  return (
    <div className="home-container">
      <div className="home-card">
        {/* 로고 */}
        <div className="home-logo">
          <div className="home-logo-icon">R</div>
          <h1 className="home-logo-text">Roomly</h1>
        </div>
        <p className="home-subtitle">무료 그룹 화상회의</p>

        {/* 탭 */}
        <div className="home-tabs">
          <button
            type="button"
            className={`home-tab ${mode === 'create' ? 'home-tab--active' : ''}`}
            onClick={() => { setMode('create'); setError(''); }}
          >
            방 만들기
          </button>
          <button
            type="button"
            className={`home-tab ${mode === 'join' ? 'home-tab--active' : ''}`}
            onClick={() => { setMode('join'); setError(''); }}
          >
            방 입장
          </button>
        </div>

        {/* 폼 */}
        <form className="home-form" onSubmit={handleSubmit}>
          <div className="home-field">
            <label className="home-label" htmlFor="userName">
              이름
            </label>
            <input
              id="userName"
              className="home-input"
              type="text"
              placeholder="사용할 이름을 입력하세요"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
          </div>

          {mode === 'join' && (
            <div className="home-field">
              <label className="home-label" htmlFor="roomId">
                방 ID
              </label>
              <input
                id="roomId"
                className="home-input"
                type="text"
                placeholder="초대받은 방 ID를 입력하세요"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                maxLength={20}
                autoComplete="off"
              />
            </div>
          )}

          {error && <p className="home-error">{error}</p>}

          <button
            type="submit"
            className="home-submit"
            disabled={isLoading}
          >
            {isLoading ? '확인 중...' : mode === 'create' ? '방 만들기' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
