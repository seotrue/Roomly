'use client';

import { useHomeForm } from '@/features/home/hooks/useHomeForm';
import { FormField } from '@/components/FormField';
import '@/styles/home.scss';

export default function HomePage() {
  const {
    userName,
    roomId,
    mode,
    errors,
    isSubmitting,
    handleUserNameChange,
    handleModeChange,
    handleRoomIdChange,
    handleSubmit,
  } = useHomeForm();

  const submitButtonText = isSubmitting
    ? '확인 중...'
    : mode === 'create'
      ? '방 만들기'
      : '입장하기';

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
          <FormField
            id="userName"
            label="이름"
            placeholder="사용할 이름을 입력하세요"
            value={userName}
            error={errors.userName}
            maxLength={20}
            onChange={handleUserNameChange}
          />

          {mode === 'join' && (
            <FormField
              id="roomId"
              label="방 ID"
              placeholder="초대받은 방 ID를 입력하세요"
              value={roomId}
              error={errors.roomId}
              maxLength={20}
              onChange={handleRoomIdChange}
            />
          )}

          {errors.form && <p className="home-error">{errors.form}</p>}

          <button
            type="submit"
            className="home-submit"
            disabled={isSubmitting}
          >
            {submitButtonText}
          </button>
        </form>
      </div>
    </div>
  );
}
