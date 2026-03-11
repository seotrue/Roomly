'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, checkRoomExists } from '@/features/home/api/room';
import {
  type RoomMode,
  type HomeFormErrors,
  sanitizeRoomIdInput,
  normalizeRoomId,
  validateHomeForm,
  buildRoomUrl,
} from '@/features/home/model/home-form';
import '@/styles/home.scss';

export default function HomePage() {
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<RoomMode>('create');
  const [errors, setErrors] = useState<HomeFormErrors>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModeChange = (nextMode: RoomMode) => {
    setMode(nextMode);
    setErrors({});
    setErrorMessage('');
    if (nextMode === 'create') {
      setRoomId('');
    }
  };

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomId(sanitizeRoomIdInput(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    const values = { userName, roomId, mode };
    const validationErrors = validateHomeForm(values);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    if (mode === 'create') {
      const result = await createRoom();
      setIsSubmitting(false);

      if (!result.success) {
        setErrorMessage(result.errorMessage);
        return;
      }

      router.push(buildRoomUrl(values, result.roomId));
      return;
    }

    const result = await checkRoomExists(roomId);
    setIsSubmitting(false);

    if (!result.exists) {
      setErrorMessage(result.errorMessage);
      return;
    }

    router.push(buildRoomUrl(values, normalizeRoomId(roomId)));
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-logo">
          <div className="home-logo-icon">R</div>
          <h1 className="home-logo-text">Roomly</h1>
        </div>
        <p className="home-subtitle">무료 그룹 화상회의</p>

        <div className="home-tabs">
          <button
            type="button"
            className={`home-tab ${mode === 'create' ? 'home-tab--active' : ''}`}
            onClick={() => handleModeChange('create')}
          >
            방 만들기
          </button>
          <button
            type="button"
            className={`home-tab ${mode === 'join' ? 'home-tab--active' : ''}`}
            onClick={() => handleModeChange('join')}
          >
            방 입장
          </button>
        </div>

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
            {errors.userName && (
              <p className="home-error">{errors.userName}</p>
            )}
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
                onChange={handleRoomIdChange}
                maxLength={20}
                autoComplete="off"
              />
              {errors.roomId && (
                <p className="home-error">{errors.roomId}</p>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="home-error">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="home-submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? '확인 중...'
              : mode === 'create'
                ? '방 만들기'
                : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
