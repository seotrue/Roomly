import { describe, it, expect, beforeEach } from 'vitest';
import { roomStore } from './room-store';
import type { UserInfo } from './room-types';

// ---------------------------------------------------------------------------
// NOTE ON ISOLATION
// room-store.ts uses module-level Map variables (rooms, users) that are shared
// across all imports. Each describe block calls a resetAll helper (implemented
// via the public API) in beforeEach to clear every known key so that tests
// within a suite do not bleed into one another.
//
// There is no resetAll export, so we rely on the public API:
//   - deleteRoom  → clears a room and its socket set
//   - deleteUser  → clears a user entry
//
// To be truly safe, each test uses unique IDs that are unlikely to collide
// with IDs from other suites. The beforeEach in each suite handles cleanup
// of its own fixtures.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// hasRoom
// ---------------------------------------------------------------------------
describe('roomStore.hasRoom', () => {
  const roomId = 'has-room-test';

  beforeEach(() => {
    roomStore.deleteRoom(roomId);
  });

  it('should return false when the room does not exist', () => {
    expect(roomStore.hasRoom(roomId)).toBe(false);
  });

  it('should return true after the room has been created', () => {
    roomStore.createRoom(roomId);
    expect(roomStore.hasRoom(roomId)).toBe(true);
  });

  it('should return false after the room has been deleted', () => {
    roomStore.createRoom(roomId);
    roomStore.deleteRoom(roomId);
    expect(roomStore.hasRoom(roomId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createRoom
// ---------------------------------------------------------------------------
describe('roomStore.createRoom', () => {
  const roomId = 'create-room-test';

  beforeEach(() => {
    roomStore.deleteRoom(roomId);
  });

  it('should make hasRoom return true after creation', () => {
    roomStore.createRoom(roomId);
    expect(roomStore.hasRoom(roomId)).toBe(true);
  });

  it('should initialise the room with an empty socket set (size 0)', () => {
    roomStore.createRoom(roomId);
    expect(roomStore.getRoomSize(roomId)).toBe(0);
  });

  it('should overwrite an existing room with a fresh empty set when called again', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, 'socket-a');
    expect(roomStore.getRoomSize(roomId)).toBe(1);

    // Calling createRoom again resets the set
    roomStore.createRoom(roomId);
    expect(roomStore.getRoomSize(roomId)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRoom
// ---------------------------------------------------------------------------
describe('roomStore.getRoom', () => {
  const roomId = 'get-room-test';

  beforeEach(() => {
    roomStore.deleteRoom(roomId);
  });

  it('should return undefined for a non-existent room', () => {
    expect(roomStore.getRoom(roomId)).toBeUndefined();
  });

  it('should return the Set instance after the room is created', () => {
    roomStore.createRoom(roomId);
    const set = roomStore.getRoom(roomId);
    expect(set).toBeInstanceOf(Set);
  });

  it('should return an empty Set immediately after creation', () => {
    roomStore.createRoom(roomId);
    expect(roomStore.getRoom(roomId)?.size).toBe(0);
  });

  it('should reflect sockets added via addSocketToRoom', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, 'socket-x');
    const set = roomStore.getRoom(roomId);
    expect(set?.has('socket-x')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// addSocketToRoom
// ---------------------------------------------------------------------------
describe('roomStore.addSocketToRoom', () => {
  const roomId = 'add-socket-test';

  beforeEach(() => {
    roomStore.deleteRoom(roomId);
    roomStore.createRoom(roomId);
  });

  it('should increase the room size by 1 when a new socket is added', () => {
    roomStore.addSocketToRoom(roomId, 'socket-1');
    expect(roomStore.getRoomSize(roomId)).toBe(1);
  });

  it('should contain the added socketId in the room set', () => {
    roomStore.addSocketToRoom(roomId, 'socket-2');
    expect(roomStore.getRoom(roomId)?.has('socket-2')).toBe(true);
  });

  it('should allow multiple different sockets to be added', () => {
    roomStore.addSocketToRoom(roomId, 'socket-a');
    roomStore.addSocketToRoom(roomId, 'socket-b');
    roomStore.addSocketToRoom(roomId, 'socket-c');
    expect(roomStore.getRoomSize(roomId)).toBe(3);
  });

  it('should not increase size when the same socketId is added twice (Set semantics)', () => {
    roomStore.addSocketToRoom(roomId, 'socket-dup');
    roomStore.addSocketToRoom(roomId, 'socket-dup');
    expect(roomStore.getRoomSize(roomId)).toBe(1);
  });

  it('should silently do nothing when the room does not exist', () => {
    // No room with this ID exists; the optional chain prevents a throw
    expect(() => {
      roomStore.addSocketToRoom('non-existent-room-add', 'socket-z');
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// removeSocketFromRoom
// ---------------------------------------------------------------------------
describe('roomStore.removeSocketFromRoom', () => {
  const roomId = 'remove-socket-test';

  beforeEach(() => {
    roomStore.deleteRoom(roomId);
    roomStore.createRoom(roomId);
  });

  it('should decrease the room size by 1 after removing a socket', () => {
    roomStore.addSocketToRoom(roomId, 'socket-r1');
    roomStore.removeSocketFromRoom(roomId, 'socket-r1');
    expect(roomStore.getRoomSize(roomId)).toBe(0);
  });

  it('should no longer contain the socketId after removal', () => {
    roomStore.addSocketToRoom(roomId, 'socket-r2');
    roomStore.removeSocketFromRoom(roomId, 'socket-r2');
    expect(roomStore.getRoom(roomId)?.has('socket-r2')).toBe(false);
  });

  it('should not affect other sockets in the same room', () => {
    roomStore.addSocketToRoom(roomId, 'socket-r3');
    roomStore.addSocketToRoom(roomId, 'socket-r4');
    roomStore.removeSocketFromRoom(roomId, 'socket-r3');
    expect(roomStore.getRoom(roomId)?.has('socket-r4')).toBe(true);
    expect(roomStore.getRoomSize(roomId)).toBe(1);
  });

  it('should not change room size when removing a socketId that is not in the room', () => {
    roomStore.addSocketToRoom(roomId, 'socket-r5');
    roomStore.removeSocketFromRoom(roomId, 'non-member-socket');
    expect(roomStore.getRoomSize(roomId)).toBe(1);
  });

  it('should silently do nothing when the room does not exist', () => {
    expect(() => {
      roomStore.removeSocketFromRoom('non-existent-room-remove', 'socket-z');
    }).not.toThrow();
  });

  it('should leave room size at 0 when removing from an already-empty room', () => {
    roomStore.removeSocketFromRoom(roomId, 'socket-nobody');
    expect(roomStore.getRoomSize(roomId)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// deleteRoom
// ---------------------------------------------------------------------------
describe('roomStore.deleteRoom', () => {
  const roomId = 'delete-room-test';

  beforeEach(() => {
    roomStore.deleteRoom(roomId);
  });

  it('should make hasRoom return false after deletion', () => {
    roomStore.createRoom(roomId);
    roomStore.deleteRoom(roomId);
    expect(roomStore.hasRoom(roomId)).toBe(false);
  });

  it('should make getRoom return undefined after deletion', () => {
    roomStore.createRoom(roomId);
    roomStore.deleteRoom(roomId);
    expect(roomStore.getRoom(roomId)).toBeUndefined();
  });

  it('should make getRoomSize return 0 after deletion (no room → nullish fallback)', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, 'socket-del');
    roomStore.deleteRoom(roomId);
    expect(roomStore.getRoomSize(roomId)).toBe(0);
  });

  it('should silently do nothing when deleting a non-existent room', () => {
    expect(() => {
      roomStore.deleteRoom('non-existent-room-delete');
    }).not.toThrow();
  });

  it('should not affect other rooms when one room is deleted', () => {
    const otherRoom = 'delete-room-other';
    roomStore.deleteRoom(otherRoom);
    roomStore.createRoom(roomId);
    roomStore.createRoom(otherRoom);

    roomStore.deleteRoom(roomId);

    expect(roomStore.hasRoom(otherRoom)).toBe(true);

    // Cleanup
    roomStore.deleteRoom(otherRoom);
  });
});

// ---------------------------------------------------------------------------
// getRoomSize
// ---------------------------------------------------------------------------
describe('roomStore.getRoomSize', () => {
  const roomId = 'room-size-test';

  beforeEach(() => {
    roomStore.deleteRoom(roomId);
  });

  it('should return 0 for a non-existent room (nullish coalescing fallback)', () => {
    expect(roomStore.getRoomSize(roomId)).toBe(0);
  });

  it('should return 0 for a freshly created empty room', () => {
    roomStore.createRoom(roomId);
    expect(roomStore.getRoomSize(roomId)).toBe(0);
  });

  it('should return 1 after one socket is added', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, 'socket-s1');
    expect(roomStore.getRoomSize(roomId)).toBe(1);
  });

  it('should return 3 after three distinct sockets are added', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, 'socket-s2');
    roomStore.addSocketToRoom(roomId, 'socket-s3');
    roomStore.addSocketToRoom(roomId, 'socket-s4');
    expect(roomStore.getRoomSize(roomId)).toBe(3);
  });

  it('should return the correct count after sockets are added then removed', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, 'socket-s5');
    roomStore.addSocketToRoom(roomId, 'socket-s6');
    roomStore.removeSocketFromRoom(roomId, 'socket-s5');
    expect(roomStore.getRoomSize(roomId)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// setUser / getUser
// ---------------------------------------------------------------------------
describe('roomStore.setUser and roomStore.getUser', () => {
  const socketId = 'set-get-user-socket';
  const userInfo: UserInfo = { roomId: 'room-u1', userName: 'Alice' };

  beforeEach(() => {
    roomStore.deleteUser(socketId);
  });

  it('should return undefined for an unknown socketId', () => {
    expect(roomStore.getUser(socketId)).toBeUndefined();
  });

  it('should return the stored UserInfo after setUser is called', () => {
    roomStore.setUser(socketId, userInfo);
    expect(roomStore.getUser(socketId)).toEqual(userInfo);
  });

  it('should store an exact reference (deep equality) for the UserInfo object', () => {
    roomStore.setUser(socketId, userInfo);
    const result = roomStore.getUser(socketId);
    expect(result?.roomId).toBe(userInfo.roomId);
    expect(result?.userName).toBe(userInfo.userName);
  });

  it('should overwrite a previous entry when setUser is called again for the same socketId', () => {
    const updatedInfo: UserInfo = { roomId: 'room-u2', userName: 'Bob' };
    roomStore.setUser(socketId, userInfo);
    roomStore.setUser(socketId, updatedInfo);
    expect(roomStore.getUser(socketId)).toEqual(updatedInfo);
  });

  it('should store multiple users independently', () => {
    const socketId2 = 'set-get-user-socket-2';
    const userInfo2: UserInfo = { roomId: 'room-u3', userName: 'Charlie' };

    roomStore.deleteUser(socketId);
    roomStore.deleteUser(socketId2);

    roomStore.setUser(socketId, userInfo);
    roomStore.setUser(socketId2, userInfo2);

    expect(roomStore.getUser(socketId)).toEqual(userInfo);
    expect(roomStore.getUser(socketId2)).toEqual(userInfo2);

    // Cleanup
    roomStore.deleteUser(socketId2);
  });

  it('should allow a user to be stored with an empty userName string', () => {
    const emptyNameUser: UserInfo = { roomId: 'room-empty', userName: '' };
    roomStore.setUser(socketId, emptyNameUser);
    expect(roomStore.getUser(socketId)?.userName).toBe('');
  });
});

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------
describe('roomStore.deleteUser', () => {
  const socketId = 'delete-user-socket';
  const userInfo: UserInfo = { roomId: 'room-d1', userName: 'Diana' };

  beforeEach(() => {
    roomStore.deleteUser(socketId);
  });

  it('should make getUser return undefined after deletion', () => {
    roomStore.setUser(socketId, userInfo);
    roomStore.deleteUser(socketId);
    expect(roomStore.getUser(socketId)).toBeUndefined();
  });

  it('should silently do nothing when deleting a non-existent user', () => {
    expect(() => {
      roomStore.deleteUser('non-existent-socket');
    }).not.toThrow();
  });

  it('should not affect other users when one user is deleted', () => {
    const otherSocket = 'delete-user-other-socket';
    const otherUser: UserInfo = { roomId: 'room-d2', userName: 'Eve' };

    roomStore.deleteUser(otherSocket);
    roomStore.setUser(socketId, userInfo);
    roomStore.setUser(otherSocket, otherUser);

    roomStore.deleteUser(socketId);

    expect(roomStore.getUser(otherSocket)).toEqual(otherUser);

    // Cleanup
    roomStore.deleteUser(otherSocket);
  });
});

// ---------------------------------------------------------------------------
// getUserName
// ---------------------------------------------------------------------------
describe('roomStore.getUserName', () => {
  const socketId = 'get-username-socket';
  const userInfo: UserInfo = { roomId: 'room-n1', userName: 'Frank' };

  beforeEach(() => {
    roomStore.deleteUser(socketId);
  });

  it('should return an empty string for an unknown socketId (nullish coalescing fallback)', () => {
    expect(roomStore.getUserName(socketId)).toBe('');
  });

  it('should return the userName after the user is stored', () => {
    roomStore.setUser(socketId, userInfo);
    expect(roomStore.getUserName(socketId)).toBe('Frank');
  });

  it('should return the updated userName after the user is overwritten', () => {
    roomStore.setUser(socketId, userInfo);
    roomStore.setUser(socketId, { roomId: 'room-n2', userName: 'Grace' });
    expect(roomStore.getUserName(socketId)).toBe('Grace');
  });

  it('should return an empty string after the user is deleted', () => {
    roomStore.setUser(socketId, userInfo);
    roomStore.deleteUser(socketId);
    expect(roomStore.getUserName(socketId)).toBe('');
  });

  it('should return an empty string when the stored userName is explicitly empty', () => {
    roomStore.setUser(socketId, { roomId: 'room-n3', userName: '' });
    expect(roomStore.getUserName(socketId)).toBe('');
  });

  it('should return the Korean userName correctly', () => {
    roomStore.setUser(socketId, { roomId: 'room-n4', userName: '홍길동' });
    expect(roomStore.getUserName(socketId)).toBe('홍길동');
  });
});

// ---------------------------------------------------------------------------
// Compound scenarios (rooms + users interacting)
// ---------------------------------------------------------------------------
describe('roomStore compound scenarios', () => {
  const roomId = 'compound-room';
  const socket1 = 'compound-socket-1';
  const socket2 = 'compound-socket-2';

  beforeEach(() => {
    roomStore.deleteRoom(roomId);
    roomStore.deleteUser(socket1);
    roomStore.deleteUser(socket2);
  });

  it('should correctly reflect a full join flow: create room → add sockets → set users', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, socket1);
    roomStore.setUser(socket1, { roomId, userName: 'User1' });

    roomStore.addSocketToRoom(roomId, socket2);
    roomStore.setUser(socket2, { roomId, userName: 'User2' });

    expect(roomStore.getRoomSize(roomId)).toBe(2);
    expect(roomStore.getUserName(socket1)).toBe('User1');
    expect(roomStore.getUserName(socket2)).toBe('User2');
  });

  it('should correctly reflect a leave flow: remove socket → delete user', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, socket1);
    roomStore.setUser(socket1, { roomId, userName: 'Leaver' });

    // User leaves
    roomStore.removeSocketFromRoom(roomId, socket1);
    roomStore.deleteUser(socket1);

    expect(roomStore.getRoomSize(roomId)).toBe(0);
    expect(roomStore.getUser(socket1)).toBeUndefined();
  });

  it('should allow a room to be re-created after all members leave and room is deleted', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, socket1);
    roomStore.removeSocketFromRoom(roomId, socket1);
    roomStore.deleteRoom(roomId);

    // Re-create the same room
    roomStore.createRoom(roomId);
    expect(roomStore.hasRoom(roomId)).toBe(true);
    expect(roomStore.getRoomSize(roomId)).toBe(0);
  });

  it('should support querying room membership via getRoom after multiple join/leave operations', () => {
    roomStore.createRoom(roomId);
    roomStore.addSocketToRoom(roomId, socket1);
    roomStore.addSocketToRoom(roomId, socket2);
    roomStore.removeSocketFromRoom(roomId, socket1);

    const members = roomStore.getRoom(roomId);
    expect(members?.has(socket1)).toBe(false);
    expect(members?.has(socket2)).toBe(true);
  });
});
