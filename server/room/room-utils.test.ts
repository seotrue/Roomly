import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeRoomId,
  generateRoomId,
  isValidRoomId,
  isValidUserName,
} from './room-utils';

// ---------------------------------------------------------------------------
// normalizeRoomId
// ---------------------------------------------------------------------------
describe('normalizeRoomId', () => {
  it('should return the same string when already lowercase and trimmed', () => {
    expect(normalizeRoomId('abc123')).toBe('abc123');
  });

  it('should convert uppercase letters to lowercase', () => {
    expect(normalizeRoomId('ABC123')).toBe('abc123');
  });

  it('should trim leading whitespace', () => {
    expect(normalizeRoomId('  abc123')).toBe('abc123');
  });

  it('should trim trailing whitespace', () => {
    expect(normalizeRoomId('abc123  ')).toBe('abc123');
  });

  it('should trim both leading and trailing whitespace', () => {
    expect(normalizeRoomId('  abc123  ')).toBe('abc123');
  });

  it('should convert mixed case and trim simultaneously', () => {
    expect(normalizeRoomId('  MyRoom42  ')).toBe('myroom42');
  });

  it('should return an empty string when given only whitespace', () => {
    expect(normalizeRoomId('   ')).toBe('');
  });

  it('should return an empty string when given an empty string', () => {
    expect(normalizeRoomId('')).toBe('');
  });

  it('should preserve hyphens and special characters (only lowercases and trims)', () => {
    // normalizeRoomId does not strip non-alphanumeric chars — that is a separate concern
    expect(normalizeRoomId('  My-Room  ')).toBe('my-room');
  });

  it('should handle a string that is already fully normalized', () => {
    const id = 'room5678';
    expect(normalizeRoomId(id)).toBe(id);
  });
});

// ---------------------------------------------------------------------------
// generateRoomId
// ---------------------------------------------------------------------------
describe('generateRoomId', () => {
  it('should return a string of exactly 8 characters', () => {
    const id = generateRoomId();
    expect(id).toHaveLength(8);
  });

  it('should only contain lowercase letters and digits', () => {
    const id = generateRoomId();
    expect(id).toMatch(/^[a-z0-9]{8}$/);
  });

  it('should produce different values on successive calls (statistical uniqueness)', () => {
    // Generate a reasonably large sample. The probability that all 20 are identical
    // with a 36^8 character space is astronomically low.
    const ids = new Set(Array.from({ length: 20 }, () => generateRoomId()));
    expect(ids.size).toBeGreaterThan(1);
  });

  it('should produce IDs that pass isValidRoomId', () => {
    for (let i = 0; i < 10; i++) {
      expect(isValidRoomId(generateRoomId())).toBe(true);
    }
  });

  it('should use Math.random internally — each character is sampled from the 36-char alphabet', () => {
    // Spy on Math.random to assert it is called exactly 8 times per invocation
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const id = generateRoomId();
    expect(spy).toHaveBeenCalledTimes(8);
    // When Math.random returns 0, chars[0] === 'a', so the ID should be 'aaaaaaaa'
    expect(id).toBe('aaaaaaaa');
    spy.mockRestore();
  });

  it('should pick the last character when Math.random approaches 1', () => {
    // Math.floor(0.9999 * 36) === 35 → chars[35] === '9'
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    const id = generateRoomId();
    expect(id).toBe('99999999');
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// isValidRoomId
// ---------------------------------------------------------------------------
describe('isValidRoomId', () => {
  // Happy path
  it('should return true for a valid 8-char lowercase alphanumeric string', () => {
    expect(isValidRoomId('abcd1234')).toBe(true);
  });

  it('should return true for a single lowercase letter (minimum length 1)', () => {
    expect(isValidRoomId('a')).toBe(true);
  });

  it('should return true for a single digit', () => {
    expect(isValidRoomId('0')).toBe(true);
  });

  it('should return true for a 40-character string (maximum allowed length)', () => {
    const id = 'a'.repeat(40);
    expect(isValidRoomId(id)).toBe(true);
  });

  it('should return true for a string consisting entirely of digits', () => {
    expect(isValidRoomId('12345678')).toBe(true);
  });

  it('should return true for a string consisting entirely of lowercase letters', () => {
    expect(isValidRoomId('abcdefgh')).toBe(true);
  });

  // Boundary: length violations
  it('should return false for an empty string (below minimum length)', () => {
    expect(isValidRoomId('')).toBe(false);
  });

  it('should return false for a 41-character string (above maximum length)', () => {
    const id = 'a'.repeat(41);
    expect(isValidRoomId(id)).toBe(false);
  });

  // Character violations
  it('should return false for a string containing uppercase letters', () => {
    expect(isValidRoomId('ABCDefgh')).toBe(false);
  });

  it('should return false for a string containing a hyphen', () => {
    expect(isValidRoomId('abc-def1')).toBe(false);
  });

  it('should return false for a string containing a space', () => {
    expect(isValidRoomId('abc def1')).toBe(false);
  });

  it('should return false for a string containing a dot', () => {
    expect(isValidRoomId('abc.def1')).toBe(false);
  });

  it('should return false for a string containing an underscore', () => {
    expect(isValidRoomId('abc_def1')).toBe(false);
  });

  it('should return false for a string containing Korean characters', () => {
    expect(isValidRoomId('abc한글12')).toBe(false);
  });

  it('should return false for a string containing special characters', () => {
    expect(isValidRoomId('abc!@#$%')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidUserName
// ---------------------------------------------------------------------------
describe('isValidUserName', () => {
  // Happy path
  it('should return true for a plain non-empty string', () => {
    expect(isValidUserName('Alice')).toBe(true);
  });

  it('should return true for a single non-whitespace character (minimum after trim)', () => {
    expect(isValidUserName('A')).toBe(true);
  });

  it('should return true for a 20-character string (maximum allowed length)', () => {
    expect(isValidUserName('A'.repeat(20))).toBe(true);
  });

  it('should return true for a name with leading/trailing whitespace that trims within bounds', () => {
    // '  Bob  ' trims to 'Bob' (length 3) — valid
    expect(isValidUserName('  Bob  ')).toBe(true);
  });

  it('should return true for a name containing internal spaces', () => {
    // Internal spaces are NOT trimmed, only leading/trailing are
    expect(isValidUserName('John Doe')).toBe(true);
  });

  it('should return true for a name containing Korean characters', () => {
    expect(isValidUserName('홍길동')).toBe(true);
  });

  it('should return true for a name containing digits', () => {
    expect(isValidUserName('user123')).toBe(true);
  });

  // Boundary: empty / whitespace-only
  it('should return false for an empty string', () => {
    expect(isValidUserName('')).toBe(false);
  });

  it('should return false for a string consisting entirely of spaces', () => {
    expect(isValidUserName('   ')).toBe(false);
  });

  it('should return false for a string consisting entirely of tab characters', () => {
    expect(isValidUserName('\t\t\t')).toBe(false);
  });

  it('should return false for a string consisting entirely of newline characters', () => {
    expect(isValidUserName('\n\n')).toBe(false);
  });

  // Boundary: length > 20 after trim
  it('should return false for a 21-character string (above maximum length)', () => {
    expect(isValidUserName('A'.repeat(21))).toBe(false);
  });

  it('should return false for a very long string', () => {
    expect(isValidUserName('A'.repeat(100))).toBe(false);
  });

  it('should return false when only whitespace pads an otherwise-empty payload', () => {
    // 22 spaces: trimmed length === 0
    expect(isValidUserName(' '.repeat(22))).toBe(false);
  });

  it('should return false when trimmed length is exactly 21 (one over the limit)', () => {
    // Surround 21 real chars with spaces so it reaches the trim check
    expect(isValidUserName('  ' + 'B'.repeat(21) + '  ')).toBe(false);
  });

  it('should return true when trimmed length is exactly 20 (at the limit)', () => {
    expect(isValidUserName('  ' + 'B'.repeat(20) + '  ')).toBe(true);
  });
});
