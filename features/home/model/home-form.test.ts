import { describe, it, expect } from 'vitest';
import {
  normalizeUserName,
  normalizeRoomId,
  sanitizeRoomIdInput,
  validateHomeForm,
  buildRoomUrl,
  type HomeFormValues,
} from './home-form';

// ─────────────────────────────────────────────
// normalizeUserName
// ─────────────────────────────────────────────

describe('normalizeUserName', () => {
  it('should return the string unchanged when it has no surrounding whitespace', () => {
    const result = normalizeUserName('Alice');
    expect(result).toBe('Alice');
  });

  it('should trim leading whitespace', () => {
    const result = normalizeUserName('   Alice');
    expect(result).toBe('Alice');
  });

  it('should trim trailing whitespace', () => {
    const result = normalizeUserName('Alice   ');
    expect(result).toBe('Alice');
  });

  it('should trim both leading and trailing whitespace', () => {
    const result = normalizeUserName('  Alice  ');
    expect(result).toBe('Alice');
  });

  it('should preserve internal whitespace', () => {
    const result = normalizeUserName('  Alice Bob  ');
    expect(result).toBe('Alice Bob');
  });

  it('should return an empty string when input is only whitespace', () => {
    const result = normalizeUserName('   ');
    expect(result).toBe('');
  });

  it('should return an empty string when input is an empty string', () => {
    const result = normalizeUserName('');
    expect(result).toBe('');
  });

  it('should not alter casing of the input', () => {
    const result = normalizeUserName('  ALICE bob  ');
    expect(result).toBe('ALICE bob');
  });

  it('should handle tab and newline whitespace characters', () => {
    const result = normalizeUserName('\t Alice \n');
    expect(result).toBe('Alice');
  });

  it('should handle unicode characters without modification', () => {
    const result = normalizeUserName('  김철수  ');
    expect(result).toBe('김철수');
  });
});

// ─────────────────────────────────────────────
// normalizeRoomId
// ─────────────────────────────────────────────

describe('normalizeRoomId', () => {
  it('should return the string unchanged when it is already lowercase with no surrounding whitespace', () => {
    const result = normalizeRoomId('room123');
    expect(result).toBe('room123');
  });

  it('should convert uppercase letters to lowercase', () => {
    const result = normalizeRoomId('ROOM123');
    expect(result).toBe('room123');
  });

  it('should trim leading whitespace and lowercase the result', () => {
    const result = normalizeRoomId('   ROOM123');
    expect(result).toBe('room123');
  });

  it('should trim trailing whitespace and lowercase the result', () => {
    const result = normalizeRoomId('ROOM123   ');
    expect(result).toBe('room123');
  });

  it('should trim both sides and lowercase', () => {
    const result = normalizeRoomId('  ROOM-ABC  ');
    expect(result).toBe('room-abc');
  });

  it('should convert mixed-case input to lowercase', () => {
    const result = normalizeRoomId('RoOm123');
    expect(result).toBe('room123');
  });

  it('should return an empty string when input is only whitespace', () => {
    const result = normalizeRoomId('   ');
    expect(result).toBe('');
  });

  it('should return an empty string when input is an empty string', () => {
    const result = normalizeRoomId('');
    expect(result).toBe('');
  });

  it('should handle tab and newline whitespace characters', () => {
    const result = normalizeRoomId('\t ROOM \n');
    expect(result).toBe('room');
  });

  it('should lowercase while preserving numeric characters', () => {
    const result = normalizeRoomId('  ABC123DEF  ');
    expect(result).toBe('abc123def');
  });
});

// ─────────────────────────────────────────────
// sanitizeRoomIdInput
// ─────────────────────────────────────────────

describe('sanitizeRoomIdInput', () => {
  it('should return alphanumeric lowercase string unchanged', () => {
    const result = sanitizeRoomIdInput('room123');
    expect(result).toBe('room123');
  });

  it('should convert uppercase letters to lowercase', () => {
    const result = sanitizeRoomIdInput('ROOM123');
    expect(result).toBe('room123');
  });

  it('should strip spaces', () => {
    const result = sanitizeRoomIdInput('room 123');
    expect(result).toBe('room123');
  });

  it('should allow hyphens (for UUID format)', () => {
    const result = sanitizeRoomIdInput('room-123');
    expect(result).toBe('room-123');
  });

  it('should strip underscores', () => {
    const result = sanitizeRoomIdInput('room_123');
    expect(result).toBe('room123');
  });

  it('should strip special characters', () => {
    const result = sanitizeRoomIdInput('room!@#$%^&*()123');
    expect(result).toBe('room123');
  });

  it('should strip unicode characters that are not a-z or 0-9', () => {
    const result = sanitizeRoomIdInput('방room123');
    expect(result).toBe('room123');
  });

  it('should return an empty string when all characters are disallowed', () => {
    const result = sanitizeRoomIdInput('!!! ___');
    expect(result).toBe('');
  });

  it('should return an empty string for an empty string', () => {
    const result = sanitizeRoomIdInput('');
    expect(result).toBe('');
  });

  it('should handle a mix of allowed and disallowed characters', () => {
    const result = sanitizeRoomIdInput('A-B_C 1.2.3');
    expect(result).toBe('a-bc123'); // hyphens allowed, underscores/spaces/dots removed
  });

  it('should handle numeric-only input without modification', () => {
    const result = sanitizeRoomIdInput('123456');
    expect(result).toBe('123456');
  });

  it('should strip leading and trailing spaces (spaces are disallowed, not trimmed semantically)', () => {
    // Unlike normalizeRoomId, sanitizeRoomIdInput removes spaces outright rather than trimming
    const result = sanitizeRoomIdInput('  abc  ');
    expect(result).toBe('abc');
  });
});

// ─────────────────────────────────────────────
// validateHomeForm
// ─────────────────────────────────────────────

describe('validateHomeForm', () => {
  describe('mode: create', () => {
    it('should return no errors when userName is valid and mode is create', () => {
      const values: HomeFormValues = { userName: 'Alice', roomId: '', mode: 'create' };
      const errors = validateHomeForm(values);
      expect(errors).toEqual({});
    });

    it('should return userName error when userName is empty and mode is create', () => {
      const values: HomeFormValues = { userName: '', roomId: '', mode: 'create' };
      const errors = validateHomeForm(values);
      expect(errors.userName).toBe('이름을 입력해주세요.');
    });

    it('should return userName error when userName is only whitespace and mode is create', () => {
      const values: HomeFormValues = { userName: '   ', roomId: '', mode: 'create' };
      const errors = validateHomeForm(values);
      expect(errors.userName).toBe('이름을 입력해주세요.');
    });

    it('should not produce a roomId error when mode is create regardless of roomId value', () => {
      const values: HomeFormValues = { userName: 'Alice', roomId: '', mode: 'create' };
      const errors = validateHomeForm(values);
      expect(errors.roomId).toBeUndefined();
    });

    it('should not produce a roomId error even when roomId is whitespace and mode is create', () => {
      const values: HomeFormValues = { userName: 'Alice', roomId: '   ', mode: 'create' };
      const errors = validateHomeForm(values);
      expect(errors.roomId).toBeUndefined();
    });

    it('should return only userName error when userName is empty and mode is create', () => {
      const values: HomeFormValues = { userName: '', roomId: '', mode: 'create' };
      const errors = validateHomeForm(values);
      expect(Object.keys(errors)).toEqual(['userName']);
    });
  });

  describe('mode: join', () => {
    it('should return no errors when both userName and roomId are valid and mode is join', () => {
      const values: HomeFormValues = { userName: 'Alice', roomId: 'room123', mode: 'join' };
      const errors = validateHomeForm(values);
      expect(errors).toEqual({});
    });

    it('should return userName error when userName is empty and mode is join', () => {
      const values: HomeFormValues = { userName: '', roomId: 'room123', mode: 'join' };
      const errors = validateHomeForm(values);
      expect(errors.userName).toBe('이름을 입력해주세요.');
    });

    it('should return userName error when userName is only whitespace and mode is join', () => {
      const values: HomeFormValues = { userName: '   ', roomId: 'room123', mode: 'join' };
      const errors = validateHomeForm(values);
      expect(errors.userName).toBe('이름을 입력해주세요.');
    });

    it('should return roomId error when roomId is empty and mode is join', () => {
      const values: HomeFormValues = { userName: 'Alice', roomId: '', mode: 'join' };
      const errors = validateHomeForm(values);
      expect(errors.roomId).toBe('방 ID를 입력해주세요.');
    });

    it('should return roomId error when roomId is only whitespace and mode is join', () => {
      // normalizeRoomId trims then lowercases, so "   " becomes "", which is falsy
      const values: HomeFormValues = { userName: 'Alice', roomId: '   ', mode: 'join' };
      const errors = validateHomeForm(values);
      expect(errors.roomId).toBe('방 ID를 입력해주세요.');
    });

    it('should return both userName and roomId errors when both are empty and mode is join', () => {
      const values: HomeFormValues = { userName: '', roomId: '', mode: 'join' };
      const errors = validateHomeForm(values);
      expect(errors.userName).toBe('이름을 입력해주세요.');
      expect(errors.roomId).toBe('방 ID를 입력해주세요.');
    });

    it('should return both errors when both fields are whitespace-only and mode is join', () => {
      const values: HomeFormValues = { userName: '  ', roomId: '  ', mode: 'join' };
      const errors = validateHomeForm(values);
      expect(errors.userName).toBe('이름을 입력해주세요.');
      expect(errors.roomId).toBe('방 ID를 입력해주세요.');
    });

    it('should not produce a roomId error when roomId contains only uppercase (normalizes to non-empty)', () => {
      // "ROOM" normalizes to "room", which is truthy — no error expected
      const values: HomeFormValues = { userName: 'Alice', roomId: 'ROOM', mode: 'join' };
      const errors = validateHomeForm(values);
      expect(errors.roomId).toBeUndefined();
    });
  });

  describe('form-level error field', () => {
    it('should never set the form error field during validation', () => {
      const values: HomeFormValues = { userName: '', roomId: '', mode: 'join' };
      const errors = validateHomeForm(values);
      // form error is reserved for API-level errors; pure validation should not set it
      expect(errors.form).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────
// buildRoomUrl
// ─────────────────────────────────────────────

describe('buildRoomUrl', () => {
  it('should build a correct URL for create mode', () => {
    const values: HomeFormValues = { userName: 'Alice', roomId: '', mode: 'create' };
    const result = buildRoomUrl(values, 'abc123');
    expect(result).toBe('/room/abc123?name=Alice&mode=create');
  });

  it('should build a correct URL for join mode', () => {
    const values: HomeFormValues = { userName: 'Bob', roomId: 'abc123', mode: 'join' };
    const result = buildRoomUrl(values, 'abc123');
    expect(result).toBe('/room/abc123?name=Bob&mode=join');
  });

  it('should use the roomId parameter for the path, not values.roomId', () => {
    // buildRoomUrl accepts roomId separately to support server-generated IDs on create
    const values: HomeFormValues = { userName: 'Alice', roomId: 'ignored', mode: 'create' };
    const result = buildRoomUrl(values, 'server-generated-id');
    expect(result).toContain('/room/server-generated-id');
  });

  it('should trim leading and trailing whitespace from the userName in the URL', () => {
    const values: HomeFormValues = { userName: '  Alice  ', roomId: '', mode: 'create' };
    const result = buildRoomUrl(values, 'abc123');
    // normalizeUserName trims whitespace; the query param should be "Alice", not "  Alice  "
    expect(result).toBe('/room/abc123?name=Alice&mode=create');
  });

  it('should URL-encode special characters in the userName', () => {
    const values: HomeFormValues = { userName: 'Alice & Bob', roomId: '', mode: 'create' };
    const result = buildRoomUrl(values, 'abc123');
    // URLSearchParams encodes '&' as '%26' and space as '+'
    expect(result).toContain('name=Alice+%26+Bob');
  });

  it('should URL-encode Korean characters in the userName', () => {
    const values: HomeFormValues = { userName: '김철수', roomId: '', mode: 'create' };
    const result = buildRoomUrl(values, 'room1');
    expect(result).toContain('name=%EA%B9%80%EC%B2%A0%EC%88%98');
  });

  it('should include the mode parameter as "create" in the URL', () => {
    const values: HomeFormValues = { userName: 'Alice', roomId: '', mode: 'create' };
    const result = buildRoomUrl(values, 'abc123');
    expect(result).toContain('mode=create');
  });

  it('should include the mode parameter as "join" in the URL', () => {
    const values: HomeFormValues = { userName: 'Alice', roomId: 'abc123', mode: 'join' };
    const result = buildRoomUrl(values, 'abc123');
    expect(result).toContain('mode=join');
  });

  it('should start with /room/ followed by the provided roomId', () => {
    const values: HomeFormValues = { userName: 'Alice', roomId: '', mode: 'create' };
    const result = buildRoomUrl(values, 'xyz789');
    expect(result.startsWith('/room/xyz789')).toBe(true);
  });

  it('should separate the path from query parameters with a single "?"', () => {
    const values: HomeFormValues = { userName: 'Alice', roomId: '', mode: 'create' };
    const result = buildRoomUrl(values, 'abc123');
    const questionMarkCount = (result.match(/\?/g) ?? []).length;
    expect(questionMarkCount).toBe(1);
  });

  it('should produce an empty name parameter when userName is whitespace-only', () => {
    const values: HomeFormValues = { userName: '   ', roomId: '', mode: 'create' };
    const result = buildRoomUrl(values, 'abc123');
    // normalizeUserName("   ") === "", so name param is empty
    expect(result).toContain('name=');
    expect(result).toContain('name=&');
  });
});
