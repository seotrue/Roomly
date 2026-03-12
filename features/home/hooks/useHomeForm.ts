import { useState, useCallback } from 'react';
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

// ─────────────────────────────────────────────
// 홈 폼 상태 + 제출 로직을 캡슐화한 훅
// page.tsx는 UI 렌더링에만 집중
// ─────────────────────────────────────────────

export function useHomeForm() {
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<RoomMode>('create');
  const [errors, setErrors] = useState<HomeFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 탭 전환: 에러 초기화, create 전환 시 roomId도 초기화
  const handleModeChange = useCallback((nextMode: RoomMode) => {
    setMode(nextMode);
    setErrors({});
    if (nextMode === 'create') setRoomId('');
  }, []);

  // 이름 변경: setter를 직접 노출하지 않고 핸들러로 감싸 일관성 유지
  const handleUserNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUserName(e.target.value);
    },
    []
  );

  // 방 ID 입력: 허용 문자(영문 소문자, 숫자)만 통과
  const handleRoomIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRoomId(sanitizeRoomIdInput(e.target.value));
    },
    []
  );

  // create 모드 처리: 새 방 생성 후 이동
  const handleCreateMode = useCallback(
    async (values: { userName: string; roomId: string; mode: RoomMode }) => {
      const createResult = await createRoom();
      if (!createResult.success) {
        setErrors({ form: createResult.errorMessage });
        return false;
      }
      router.push(buildRoomUrl(values, createResult.roomId));
      return true;
    },
    [router]
  );

  // join 모드 처리: 방 존재 여부 확인 후 이동
  const handleJoinMode = useCallback(
    async (values: { userName: string; roomId: string; mode: RoomMode }) => {
      const checkResult = await checkRoomExists(values.roomId);
      if (!checkResult.exists) {
        setErrors({ form: checkResult.errorMessage });
        return false;
      }
      router.push(buildRoomUrl(values, normalizeRoomId(values.roomId)));
      return true;
    },
    [router]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const values = { userName, roomId, mode };
      const validationErrors = validateHomeForm(values);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors({});
      setIsSubmitting(true);

      try {
        if (mode === 'create') {
          await handleCreateMode(values);
        } else {
          await handleJoinMode(values);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [userName, roomId, mode, handleCreateMode, handleJoinMode]
  );

  return {
    // 상태
    userName,
    roomId,
    mode,
    errors,
    isSubmitting,
    // 핸들러
    handleUserNameChange,
    handleModeChange,
    handleRoomIdChange,
    handleSubmit,
  };
}
