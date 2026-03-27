import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoom, checkRoomExists } from './room';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Creates a minimal Response-like object whose .json() resolves to the given
 * value.  We only need the subset of the Response interface that the source
 * code actually calls.
 */
function makeJsonResponse(body: unknown): Response {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

/**
 * Creates a Response-like object whose .json() rejects with the given error.
 */
function makeJsonErrorResponse(error: unknown): Response {
  return {
    json: () => Promise.reject(error),
  } as unknown as Response;
}

// ─────────────────────────────────────────────
// createRoom
// ─────────────────────────────────────────────

describe('createRoom', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Happy path ─────────────────────────────

  it('should return success: true and the roomId when the server responds with a valid roomId string', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: 'abc123' }));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({ success: true, roomId: 'abc123' });
  });

  it('should call fetch with POST method', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: 'abc123' }));

    // Act
    await createRoom();

    // Assert
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should call fetch with the /api/rooms path', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: 'x' }));

    // Act
    await createRoom();

    // Assert
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/rooms$/);
  });

  it('should preserve a non-empty roomId string exactly as returned by the server', async () => {
    // Arrange
    const serverRoomId = 'room-2024-xyz';
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: serverRoomId }));

    // Act
    const result = await createRoom();

    // Assert
    if (!result.success) throw new Error('Expected success');
    expect(result.roomId).toBe(serverRoomId);
  });

  it('should return success: true even when roomId is an empty string (guard only checks the type)', async () => {
    // The runtime guard accepts any string value for roomId, including "".
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: '' }));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({ success: true, roomId: '' });
  });

  // ── Runtime guard failures ─────────────────

  it('should return success: false with the invalid-response message when body is null', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse(null));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return success: false with the invalid-response message when body is a plain string', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse('abc123'));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return success: false with the invalid-response message when body is a number', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse(42));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return success: false with the invalid-response message when the roomId field is missing', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ id: 'abc123' }));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return success: false with the invalid-response message when roomId is a number instead of a string', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: 99 }));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return success: false with the invalid-response message when roomId is null', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: null }));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return success: false with the invalid-response message when roomId is a boolean', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: true }));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return success: false with the invalid-response message when body is an empty object', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({}));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return success: false with the invalid-response message when body is an array', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse([{ roomId: 'abc' }]));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  // ── Network / parse errors ─────────────────

  it('should return success: false with the connection-failure message when fetch rejects', async () => {
    // Arrange
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 연결에 실패했습니다.',
    });
  });

  it('should return success: false with the connection-failure message when response.json() rejects', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonErrorResponse(new SyntaxError('Unexpected token')));

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 연결에 실패했습니다.',
    });
  });

  it('should return success: false with the connection-failure message when a non-Error value is thrown', async () => {
    // Arrange — catch block handles any thrown value, not only Error instances
    vi.mocked(fetch).mockRejectedValue('timeout');

    // Act
    const result = await createRoom();

    // Assert
    expect(result).toEqual({
      success: false,
      errorMessage: '서버 연결에 실패했습니다.',
    });
  });

  // ── URL construction ───────────────────────

  it('should use /api/rooms as the URL when NEXT_PUBLIC_API_URL is not set', async () => {
    // Arrange — env var is undefined in the test environment
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ roomId: 'r1' }));

    // Act
    await createRoom();

    // Assert
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe('/api/rooms');
  });
});

// ─────────────────────────────────────────────
// checkRoomExists
// ─────────────────────────────────────────────

describe('checkRoomExists', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Happy path ─────────────────────────────

  it('should return exists: true when the server responds with exists: true', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: true }));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({ exists: true });
  });

  it('should call fetch with a GET request (no explicit method override)', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: true }));

    // Act
    await checkRoomExists('room123');

    // Assert
    // fetch is called with only the URL (no options object), which defaults to GET
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/rooms/room123'));
  });

  it('should include the roomId in the request URL', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: true }));

    // Act
    await checkRoomExists('my-room');

    // Assert
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('my-room');
  });

  it('should URL-encode the roomId when it contains special characters', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: true }));

    // Act
    await checkRoomExists('room/with spaces');

    // Assert — encodeURIComponent turns '/' → '%2F' and ' ' → '%20'
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('room%2Fwith%20spaces');
  });

  it('should URL-encode a roomId that contains a hash character', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: true }));

    // Act
    await checkRoomExists('room#1');

    // Assert
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('room%231');
  });

  // ── Room not found ─────────────────────────

  it('should return exists: false with the not-found message when the server responds with exists: false', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: false }));

    // Act
    const result = await checkRoomExists('ghost-room');

    // Assert
    expect(result).toEqual({ exists: false, errorMessage: '존재하지 않는 방입니다.' });
  });

  // ── Runtime guard failures ─────────────────

  it('should return exists: false with the invalid-response message when body is null', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse(null));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return exists: false with the invalid-response message when body is a plain string', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse('true'));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return exists: false with the invalid-response message when body is a number', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse(1));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return exists: false with the invalid-response message when the exists field is missing', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ status: 'ok' }));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return exists: false with the invalid-response message when exists is a string instead of a boolean', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: 'true' }));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return exists: false with the invalid-response message when exists is a number', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: 1 }));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return exists: false with the invalid-response message when exists is null', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: null }));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return exists: false with the invalid-response message when body is an empty object', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({}));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  it('should return exists: false with the invalid-response message when body is an array', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse([{ exists: true }]));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 응답이 올바르지 않습니다.',
    });
  });

  // ── Network / parse errors ─────────────────

  it('should return exists: false with the connection-failure message when fetch rejects', async () => {
    // Arrange
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 연결에 실패했습니다.',
    });
  });

  it('should return exists: false with the connection-failure message when response.json() rejects', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonErrorResponse(new SyntaxError('Unexpected token')));

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 연결에 실패했습니다.',
    });
  });

  it('should return exists: false with the connection-failure message when a non-Error value is thrown', async () => {
    // Arrange — catch block handles any thrown value, not only Error instances
    vi.mocked(fetch).mockRejectedValue(null);

    // Act
    const result = await checkRoomExists('room123');

    // Assert
    expect(result).toEqual({
      exists: false,
      errorMessage: '서버 연결에 실패했습니다.',
    });
  });

  // ── URL construction ───────────────────────

  it('should use /api/rooms/<roomId> as the URL when NEXT_PUBLIC_API_URL is not set', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: true }));

    // Act
    await checkRoomExists('room42');

    // Assert
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe('/api/rooms/room42');
  });

  it('should call fetch exactly once per invocation', async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(makeJsonResponse({ exists: true }));

    // Act
    await checkRoomExists('room123');

    // Assert
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
