import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock roomStore so every test starts with a clean, fully controlled store.
// vi.mock hoists to the top of the file, replacing the real module-level Maps
// with vi.fn() stubs. Each test configures return values as needed.
// ---------------------------------------------------------------------------
vi.mock('./room-store', () => ({
  roomStore: {
    hasRoom: vi.fn(),
    createRoom: vi.fn(),
    getRoom: vi.fn(),
    addSocketToRoom: vi.fn(),
    setUser: vi.fn(),
    getUser: vi.fn(),
    deleteUser: vi.fn(),
    deleteRoom: vi.fn(),
    getRoomSize: vi.fn(),
    getUserName: vi.fn(),
    removeSocketFromRoom: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock room-utils so generateRoomId is fully deterministic in handleCreateRoom
// tests. normalizeRoomId / isValidRoomId / isValidUserName are also stubbed so
// validation behaviour can be controlled per-test when needed.
// ---------------------------------------------------------------------------
vi.mock('./room-utils', () => ({
  normalizeRoomId: vi.fn((id: string) => id.trim().toLowerCase()),
  isValidRoomId: vi.fn(() => true),
  isValidUserName: vi.fn(() => true),
  generateRoomId: vi.fn(),
}));

import { roomStore } from './room-store';
import {
  normalizeRoomId,
  isValidRoomId,
  isValidUserName,
  generateRoomId,
} from './room-utils';
import {
  handleJoinRoom,
  handleLeaveRoom,
  getRoomInfo,
  getSocketRoomId,
  arePeersInSameRoom,
  handleCreateRoom,
} from './room-service';
import type { JoinRoomPayload } from './room-types';

// Typed mock helpers — avoids casting at every call site
const mockHasRoom = vi.mocked(roomStore.hasRoom);
const mockCreateRoom = vi.mocked(roomStore.createRoom);
const mockGetRoom = vi.mocked(roomStore.getRoom);
const mockAddSocketToRoom = vi.mocked(roomStore.addSocketToRoom);
const mockSetUser = vi.mocked(roomStore.setUser);
const mockGetUser = vi.mocked(roomStore.getUser);
const mockDeleteUser = vi.mocked(roomStore.deleteUser);
const mockDeleteRoom = vi.mocked(roomStore.deleteRoom);
const mockGetRoomSize = vi.mocked(roomStore.getRoomSize);
const mockGetUserName = vi.mocked(roomStore.getUserName);
const mockRemoveSocketFromRoom = vi.mocked(roomStore.removeSocketFromRoom);
const mockGenerateRoomId = vi.mocked(generateRoomId);
const mockIsValidRoomId = vi.mocked(isValidRoomId);
const mockIsValidUserName = vi.mocked(isValidUserName);
const mockNormalizeRoomId = vi.mocked(normalizeRoomId);

beforeEach(() => {
  vi.clearAllMocks();
  // Restore sensible defaults after clearAllMocks resets return values
  mockNormalizeRoomId.mockImplementation((id: string) => id.trim().toLowerCase());
  mockIsValidRoomId.mockReturnValue(true);
  mockIsValidUserName.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// handleJoinRoom
// ---------------------------------------------------------------------------
describe('handleJoinRoom', () => {
  const socketId = 'socket-abc';
  const basePayload: JoinRoomPayload = {
    roomId: 'room01',
    userName: 'Alice',
    joinMode: 'create',
  };

  // ── Validation failures ──────────────────────────────────────────────────

  describe('validation failures', () => {
    it('should return failure when normalised roomId fails isValidRoomId', () => {
      mockIsValidRoomId.mockReturnValue(false);

      const result = handleJoinRoom(socketId, { ...basePayload, roomId: '!!bad!!' });

      expect(result).toEqual({ success: false, errorMessage: '유효하지 않은 방 ID입니다.' });
    });

    it('should not touch the store when roomId validation fails', () => {
      mockIsValidRoomId.mockReturnValue(false);

      handleJoinRoom(socketId, basePayload);

      expect(mockHasRoom).not.toHaveBeenCalled();
      expect(mockCreateRoom).not.toHaveBeenCalled();
    });

    it('should return failure when userName fails isValidUserName', () => {
      mockIsValidUserName.mockReturnValue(false);

      const result = handleJoinRoom(socketId, { ...basePayload, userName: '   ' });

      expect(result).toEqual({ success: false, errorMessage: '유효하지 않은 이름입니다.' });
    });

    it('should not touch the store when userName validation fails', () => {
      mockIsValidUserName.mockReturnValue(false);

      handleJoinRoom(socketId, basePayload);

      expect(mockHasRoom).not.toHaveBeenCalled();
    });

    it('should trim the userName before passing it to isValidUserName', () => {
      // Allow handleJoinRoom to run through to completion by providing the
      // store state it needs after validation passes.
      mockHasRoom.mockReturnValue(false);
      mockGetRoom.mockReturnValue(new Set());
      mockGetUserName.mockReturnValue('');

      handleJoinRoom(socketId, { ...basePayload, userName: '  Alice  ' });

      // The function trims userName itself before calling isValidUserName.
      // We verify that the value seen by setUser is also trimmed.
      expect(mockSetUser).toHaveBeenCalledWith(
        socketId,
        expect.objectContaining({ userName: 'Alice' })
      );
    });

    it('should normalise the roomId before passing it to isValidRoomId', () => {
      // Allow handleJoinRoom to run through to completion.
      mockHasRoom.mockReturnValue(false);
      mockGetRoom.mockReturnValue(new Set());
      mockGetUserName.mockReturnValue('');

      handleJoinRoom(socketId, { ...basePayload, roomId: '  ROOM01  ' });

      // normalizeRoomId ('  ROOM01  ') → 'room01' (via our mock impl)
      expect(mockIsValidRoomId).toHaveBeenCalledWith('room01');
    });
  });

  // ── join mode: room does not exist ──────────────────────────────────────

  describe('join mode — room does not exist', () => {
    it('should return failure when joinMode is join and the room does not exist', () => {
      mockHasRoom.mockReturnValue(false);

      const result = handleJoinRoom(socketId, { ...basePayload, joinMode: 'join' });

      expect(result).toEqual({ success: false, errorMessage: '존재하지 않는 방입니다.' });
    });

    it('should not create the room when joinMode is join and the room does not exist', () => {
      mockHasRoom.mockReturnValue(false);

      handleJoinRoom(socketId, { ...basePayload, joinMode: 'join' });

      expect(mockCreateRoom).not.toHaveBeenCalled();
    });
  });

  // ── create mode: room does not exist ────────────────────────────────────

  describe('create mode — room does not exist', () => {
    beforeEach(() => {
      mockHasRoom.mockReturnValue(false);
      // getRoom is called AFTER createRoom; return an empty Set to represent
      // the freshly-created room (no prior participants).
      mockGetRoom.mockReturnValue(new Set());
      mockGetUserName.mockReturnValue('');
    });

    it('should create the room when joinMode is create and the room does not exist', () => {
      handleJoinRoom(socketId, basePayload);

      expect(mockCreateRoom).toHaveBeenCalledWith('room01');
    });

    it('should add the socket to the room', () => {
      handleJoinRoom(socketId, basePayload);

      expect(mockAddSocketToRoom).toHaveBeenCalledWith('room01', socketId);
    });

    it('should register the user in the store', () => {
      handleJoinRoom(socketId, basePayload);

      expect(mockSetUser).toHaveBeenCalledWith(socketId, {
        roomId: 'room01',
        userName: 'Alice',
      });
    });

    it('should return success with an empty existingParticipants list', () => {
      const result = handleJoinRoom(socketId, basePayload);

      expect(result).toEqual({ success: true, existingParticipants: [] });
    });
  });

  // ── create mode: room already exists ────────────────────────────────────

  describe('create mode — room already exists', () => {
    const socket1 = 'socket-existing-1';
    const socket2 = 'socket-existing-2';

    beforeEach(() => {
      mockHasRoom.mockReturnValue(true);
      // Simulate two prior occupants in the room
      mockGetRoom.mockReturnValue(new Set([socket1, socket2]));
      mockGetUserName.mockImplementation((id: string) => {
        if (id === socket1) return 'Bob';
        if (id === socket2) return 'Charlie';
        return '';
      });
    });

    it('should NOT create the room when it already exists', () => {
      handleJoinRoom(socketId, basePayload);

      expect(mockCreateRoom).not.toHaveBeenCalled();
    });

    it('should still add the new socket to the existing room', () => {
      handleJoinRoom(socketId, basePayload);

      expect(mockAddSocketToRoom).toHaveBeenCalledWith('room01', socketId);
    });

    it('should still register the new user in the store', () => {
      handleJoinRoom(socketId, basePayload);

      expect(mockSetUser).toHaveBeenCalledWith(socketId, {
        roomId: 'room01',
        userName: 'Alice',
      });
    });

    it('should return success with the correct list of existing participants', () => {
      const result = handleJoinRoom(socketId, basePayload);

      expect(result).toEqual({
        success: true,
        existingParticipants: expect.arrayContaining([
          { socketId: socket1, userName: 'Bob' },
          { socketId: socket2, userName: 'Charlie' },
        ]),
      });

      if (result.success) {
        expect(result.existingParticipants).toHaveLength(2);
      }
    });

    it('should collect existingParticipants BEFORE adding the new socket', () => {
      // getRoom is called before addSocketToRoom; the Set at that moment must
      // not yet contain the new socketId.
      const existingSet = new Set([socket1]);
      mockGetRoom.mockReturnValue(existingSet);
      mockGetUserName.mockImplementation((id: string) =>
        id === socket1 ? 'Bob' : ''
      );

      const result = handleJoinRoom(socketId, basePayload);

      if (result.success) {
        const ids = result.existingParticipants.map((p) => p.socketId);
        expect(ids).not.toContain(socketId);
        expect(ids).toContain(socket1);
      }
    });
  });

  // ── join mode: room exists ───────────────────────────────────────────────

  describe('join mode — room already exists', () => {
    beforeEach(() => {
      mockHasRoom.mockReturnValue(true);
      mockGetRoom.mockReturnValue(new Set(['socket-prev']));
      mockGetUserName.mockReturnValue('Dave');
    });

    it('should succeed when joinMode is join and the room exists', () => {
      const result = handleJoinRoom(socketId, { ...basePayload, joinMode: 'join' });

      expect(result).toEqual({
        success: true,
        existingParticipants: [{ socketId: 'socket-prev', userName: 'Dave' }],
      });
    });

    it('should NOT create the room when joinMode is join and room exists', () => {
      handleJoinRoom(socketId, { ...basePayload, joinMode: 'join' });

      expect(mockCreateRoom).not.toHaveBeenCalled();
    });
  });

  // ── roomId normalisation passthrough ────────────────────────────────────

  describe('roomId normalisation', () => {
    it('should call store methods with the normalised (lowercased + trimmed) roomId', () => {
      mockHasRoom.mockReturnValue(false);
      mockGetRoom.mockReturnValue(new Set());
      mockGetUserName.mockReturnValue('');

      handleJoinRoom(socketId, { ...basePayload, roomId: '  ROOM01  ' });

      expect(mockHasRoom).toHaveBeenCalledWith('room01');
      expect(mockCreateRoom).toHaveBeenCalledWith('room01');
      expect(mockAddSocketToRoom).toHaveBeenCalledWith('room01', socketId);
    });
  });
});

// ---------------------------------------------------------------------------
// handleLeaveRoom
// ---------------------------------------------------------------------------
describe('handleLeaveRoom', () => {
  const socketId = 'socket-leaver';
  const roomId = 'room-leave';

  // ── Unknown socket ───────────────────────────────────────────────────────

  describe('unknown socket', () => {
    it('should return null when the socket has no registered user', () => {
      mockGetUser.mockReturnValue(undefined);

      expect(handleLeaveRoom(socketId)).toBeNull();
    });

    it('should not touch the store when the user is unknown', () => {
      mockGetUser.mockReturnValue(undefined);

      handleLeaveRoom(socketId);

      expect(mockRemoveSocketFromRoom).not.toHaveBeenCalled();
      expect(mockDeleteRoom).not.toHaveBeenCalled();
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });

  // ── Known socket, room still has other members ──────────────────────────

  describe('known socket, room still has other members', () => {
    beforeEach(() => {
      mockGetUser.mockReturnValue({ roomId, userName: 'Leaver' });
      // After the socket is removed the room still has 1 occupant
      mockGetRoomSize.mockReturnValue(1);
    });

    it('should remove the socket from the room', () => {
      handleLeaveRoom(socketId);

      expect(mockRemoveSocketFromRoom).toHaveBeenCalledWith(roomId, socketId);
    });

    it('should NOT delete the room when it is not empty after removal', () => {
      handleLeaveRoom(socketId);

      expect(mockDeleteRoom).not.toHaveBeenCalled();
    });

    it('should delete the user entry from the store', () => {
      handleLeaveRoom(socketId);

      expect(mockDeleteUser).toHaveBeenCalledWith(socketId);
    });

    it('should return the roomId', () => {
      const result = handleLeaveRoom(socketId);

      expect(result).toEqual({ roomId });
    });
  });

  // ── Known socket, last member in room ───────────────────────────────────

  describe('known socket, last member in room', () => {
    beforeEach(() => {
      mockGetUser.mockReturnValue({ roomId, userName: 'Last' });
      // Room is now empty after removal
      mockGetRoomSize.mockReturnValue(0);
    });

    it('should delete the room when it becomes empty', () => {
      handleLeaveRoom(socketId);

      expect(mockDeleteRoom).toHaveBeenCalledWith(roomId);
    });

    it('should still delete the user entry', () => {
      handleLeaveRoom(socketId);

      expect(mockDeleteUser).toHaveBeenCalledWith(socketId);
    });

    it('should return the roomId', () => {
      const result = handleLeaveRoom(socketId);

      expect(result).toEqual({ roomId });
    });
  });

  // ── Ordering of store operations ─────────────────────────────────────────

  describe('operation ordering', () => {
    it('should call getRoomSize after removeSocketFromRoom', () => {
      mockGetUser.mockReturnValue({ roomId, userName: 'Ordered' });
      mockGetRoomSize.mockReturnValue(0);

      const callOrder: string[] = [];
      mockRemoveSocketFromRoom.mockImplementation(() => { callOrder.push('remove'); });
      mockGetRoomSize.mockImplementation(() => { callOrder.push('size'); return 0; });
      mockDeleteRoom.mockImplementation(() => { callOrder.push('deleteRoom'); });
      mockDeleteUser.mockImplementation(() => { callOrder.push('deleteUser'); });

      handleLeaveRoom(socketId);

      expect(callOrder).toEqual(['remove', 'size', 'deleteRoom', 'deleteUser']);
    });
  });
});

// ---------------------------------------------------------------------------
// getRoomInfo
// ---------------------------------------------------------------------------
describe('getRoomInfo', () => {
  // ── Room does not exist ──────────────────────────────────────────────────

  describe('room does not exist', () => {
    beforeEach(() => {
      mockHasRoom.mockReturnValue(false);
    });

    it('should return exists: false', () => {
      const result = getRoomInfo('room01');

      expect(result.exists).toBe(false);
    });

    it('should return participantCount: 0 when the room does not exist', () => {
      const result = getRoomInfo('room01');

      expect(result.participantCount).toBe(0);
    });

    it('should NOT call getRoomSize when the room does not exist', () => {
      getRoomInfo('room01');

      expect(mockGetRoomSize).not.toHaveBeenCalled();
    });
  });

  // ── Room exists ──────────────────────────────────────────────────────────

  describe('room exists', () => {
    beforeEach(() => {
      mockHasRoom.mockReturnValue(true);
      mockGetRoomSize.mockReturnValue(3);
    });

    it('should return exists: true', () => {
      const result = getRoomInfo('room01');

      expect(result.exists).toBe(true);
    });

    it('should return the participant count from getRoomSize', () => {
      const result = getRoomInfo('room01');

      expect(result.participantCount).toBe(3);
    });

    it('should call getRoomSize with the normalised roomId', () => {
      getRoomInfo('  ROOM01  ');

      expect(mockGetRoomSize).toHaveBeenCalledWith('room01');
    });
  });

  // ── roomId normalisation ─────────────────────────────────────────────────

  describe('roomId normalisation', () => {
    it('should pass the normalised roomId to hasRoom', () => {
      mockHasRoom.mockReturnValue(false);

      getRoomInfo('  UPPER  ');

      expect(mockHasRoom).toHaveBeenCalledWith('upper');
    });

    it('should return participantCount: 0 for a non-existent room even when getRoomSize is stubbed', () => {
      mockHasRoom.mockReturnValue(false);
      mockGetRoomSize.mockReturnValue(99); // should be ignored

      const result = getRoomInfo('ghost');

      expect(result.participantCount).toBe(0);
    });
  });

  // ── Empty room ───────────────────────────────────────────────────────────

  it('should return participantCount: 0 for an existing but empty room', () => {
    mockHasRoom.mockReturnValue(true);
    mockGetRoomSize.mockReturnValue(0);

    const result = getRoomInfo('emptyroom');

    expect(result).toEqual({ exists: true, participantCount: 0 });
  });
});

// ---------------------------------------------------------------------------
// getSocketRoomId
// ---------------------------------------------------------------------------
describe('getSocketRoomId', () => {
  it('should return the roomId when the socket has a registered user', () => {
    mockGetUser.mockReturnValue({ roomId: 'room-x', userName: 'Alice' });

    expect(getSocketRoomId('socket-1')).toBe('room-x');
  });

  it('should return null when the socket has no registered user', () => {
    mockGetUser.mockReturnValue(undefined);

    expect(getSocketRoomId('socket-unknown')).toBeNull();
  });

  it('should call getUser with the provided socketId', () => {
    mockGetUser.mockReturnValue(undefined);

    getSocketRoomId('socket-abc');

    expect(mockGetUser).toHaveBeenCalledWith('socket-abc');
  });

  it('should return null (not undefined) for an unknown socket', () => {
    mockGetUser.mockReturnValue(undefined);

    // The function uses `?? null`, so the return type is string | null
    const result = getSocketRoomId('socket-none');
    expect(result).toBeNull();
    expect(result).not.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// arePeersInSameRoom
// ---------------------------------------------------------------------------
describe('arePeersInSameRoom', () => {
  const socketA = 'socket-peer-a';
  const socketB = 'socket-peer-b';

  it('should return true when both sockets are in the same room', () => {
    mockGetUser
      .mockReturnValueOnce({ roomId: 'shared-room', userName: 'A' })
      .mockReturnValueOnce({ roomId: 'shared-room', userName: 'B' });

    expect(arePeersInSameRoom(socketA, socketB)).toBe(true);
  });

  it('should return false when the two sockets are in different rooms', () => {
    mockGetUser
      .mockReturnValueOnce({ roomId: 'room-a', userName: 'A' })
      .mockReturnValueOnce({ roomId: 'room-b', userName: 'B' });

    expect(arePeersInSameRoom(socketA, socketB)).toBe(false);
  });

  it('should return false when socketA has no registered user', () => {
    mockGetUser
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({ roomId: 'room-b', userName: 'B' });

    expect(arePeersInSameRoom(socketA, socketB)).toBe(false);
  });

  it('should return false when socketB has no registered user', () => {
    mockGetUser
      .mockReturnValueOnce({ roomId: 'room-a', userName: 'A' })
      .mockReturnValueOnce(undefined);

    expect(arePeersInSameRoom(socketA, socketB)).toBe(false);
  });

  it('should return false when neither socket has a registered user', () => {
    mockGetUser.mockReturnValue(undefined);

    expect(arePeersInSameRoom(socketA, socketB)).toBe(false);
  });

  it('should call getUser for both socketIds', () => {
    mockGetUser
      .mockReturnValueOnce({ roomId: 'room-x', userName: 'A' })
      .mockReturnValueOnce({ roomId: 'room-x', userName: 'B' });

    arePeersInSameRoom(socketA, socketB);

    expect(mockGetUser).toHaveBeenCalledWith(socketA);
    expect(mockGetUser).toHaveBeenCalledWith(socketB);
    expect(mockGetUser).toHaveBeenCalledTimes(2);
  });

  it('should return false when both sockets have undefined roomId (edge: undefined === undefined)', () => {
    // getUser returns an object but roomId would need to be undefined — this
    // cannot happen with the current types, but the implementation checks
    // `roomIdA !== undefined` so we verify the guard works.
    // We simulate it by returning undefined for both lookups.
    mockGetUser.mockReturnValue(undefined);

    expect(arePeersInSameRoom(socketA, socketB)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// handleCreateRoom
// ---------------------------------------------------------------------------
describe('handleCreateRoom', () => {
  // ── Happy path: first attempt succeeds ──────────────────────────────────

  describe('first attempt succeeds', () => {
    beforeEach(() => {
      mockGenerateRoomId.mockReturnValue('newroom1');
      mockHasRoom.mockReturnValue(false); // ID is free
    });

    it('should return the generated roomId', () => {
      const result = handleCreateRoom();

      expect(result).toEqual({ roomId: 'newroom1' });
    });

    it('should call createRoom with the generated roomId', () => {
      handleCreateRoom();

      expect(mockCreateRoom).toHaveBeenCalledWith('newroom1');
    });

    it('should call generateRoomId exactly once on the first attempt', () => {
      handleCreateRoom();

      expect(mockGenerateRoomId).toHaveBeenCalledTimes(1);
    });
  });

  // ── Collision on first attempt, success on second ────────────────────────

  describe('collision on first attempt', () => {
    it('should retry and return the second generated ID when the first collides', () => {
      mockGenerateRoomId
        .mockReturnValueOnce('collide1')
        .mockReturnValueOnce('success2');
      mockHasRoom
        .mockReturnValueOnce(true)   // 'collide1' already exists
        .mockReturnValueOnce(false); // 'success2' is free

      const result = handleCreateRoom();

      expect(result).toEqual({ roomId: 'success2' });
    });

    it('should call generateRoomId twice when the first ID collides', () => {
      mockGenerateRoomId
        .mockReturnValueOnce('collide1')
        .mockReturnValueOnce('success2');
      mockHasRoom
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      handleCreateRoom();

      expect(mockGenerateRoomId).toHaveBeenCalledTimes(2);
    });

    it('should NOT create a room for the colliding ID', () => {
      mockGenerateRoomId
        .mockReturnValueOnce('collide1')
        .mockReturnValueOnce('success2');
      mockHasRoom
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      handleCreateRoom();

      expect(mockCreateRoom).not.toHaveBeenCalledWith('collide1');
      expect(mockCreateRoom).toHaveBeenCalledWith('success2');
    });
  });

  // ── Maximum retries: 4 collisions, 5th attempt succeeds ─────────────────

  describe('four collisions, fifth attempt succeeds', () => {
    it('should succeed on the 5th attempt (last retry allowed)', () => {
      mockGenerateRoomId
        .mockReturnValueOnce('c1')
        .mockReturnValueOnce('c2')
        .mockReturnValueOnce('c3')
        .mockReturnValueOnce('c4')
        .mockReturnValueOnce('ok5');
      mockHasRoom
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = handleCreateRoom();

      expect(result).toEqual({ roomId: 'ok5' });
      expect(mockGenerateRoomId).toHaveBeenCalledTimes(5);
      expect(mockCreateRoom).toHaveBeenCalledOnce();
      expect(mockCreateRoom).toHaveBeenCalledWith('ok5');
    });
  });

  // ── All 5 retries exhausted ──────────────────────────────────────────────

  describe('all retries exhausted', () => {
    beforeEach(() => {
      // Every generated ID already exists
      mockGenerateRoomId.mockReturnValue('taken');
      mockHasRoom.mockReturnValue(true);
    });

    it('should throw when all 5 attempts produce a collision', () => {
      expect(() => handleCreateRoom()).toThrow(
        '[room] failed to generate unique roomId after max retries'
      );
    });

    it('should call generateRoomId exactly 5 times before throwing', () => {
      try {
        handleCreateRoom();
      } catch {
        // expected
      }

      expect(mockGenerateRoomId).toHaveBeenCalledTimes(5);
    });

    it('should never call createRoom when all attempts collide', () => {
      try {
        handleCreateRoom();
      } catch {
        // expected
      }

      expect(mockCreateRoom).not.toHaveBeenCalled();
    });

    it('should throw an Error instance (not a plain string or other type)', () => {
      expect(() => handleCreateRoom()).toThrow(Error);
    });
  });
});
