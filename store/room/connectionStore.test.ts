import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore, ConnectionStatus } from './connectionStore';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getStore() {
  return useConnectionStore.getState();
}

const initialState = {
  roomId: null,
  mySocketId: null,
  myUserName: null,
  connectionStatus: 'idle' as ConnectionStatus,
  errorMessage: null,
};

// ─────────────────────────────────────────────
// Reset between tests
// ─────────────────────────────────────────────

beforeEach(() => {
  useConnectionStore.setState(initialState);
});

// ─────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────

describe('initial state', () => {
  it('should start with roomId as null', () => {
    expect(getStore().roomId).toBeNull();
  });

  it('should start with mySocketId as null', () => {
    expect(getStore().mySocketId).toBeNull();
  });

  it('should start with myUserName as null', () => {
    expect(getStore().myUserName).toBeNull();
  });

  it('should start with connectionStatus as idle', () => {
    expect(getStore().connectionStatus).toBe('idle');
  });

  it('should start with errorMessage as null', () => {
    expect(getStore().errorMessage).toBeNull();
  });
});

// ─────────────────────────────────────────────
// setRoomInfo
// ─────────────────────────────────────────────

describe('setRoomInfo', () => {
  it('should store roomId, mySocketId, and myUserName', () => {
    getStore().setRoomInfo('room-123', 'socket-abc', 'Alice');
    expect(getStore().roomId).toBe('room-123');
    expect(getStore().mySocketId).toBe('socket-abc');
    expect(getStore().myUserName).toBe('Alice');
  });

  it('should not alter connectionStatus or errorMessage', () => {
    getStore().setConnectionStatus('connecting');
    getStore().setErrorMessage('prior error');
    getStore().setRoomInfo('room-123', 'socket-abc', 'Alice');
    expect(getStore().connectionStatus).toBe('connecting');
    expect(getStore().errorMessage).toBe('prior error');
  });

  it('should overwrite previously stored room info', () => {
    getStore().setRoomInfo('room-111', 'socket-111', 'OldUser');
    getStore().setRoomInfo('room-222', 'socket-222', 'NewUser');
    expect(getStore().roomId).toBe('room-222');
    expect(getStore().mySocketId).toBe('socket-222');
    expect(getStore().myUserName).toBe('NewUser');
  });

  it('should handle an empty string roomId without throwing', () => {
    expect(() => getStore().setRoomInfo('', 'socket-abc', 'Alice')).not.toThrow();
    expect(getStore().roomId).toBe('');
  });

  it('should handle a userName that contains special characters', () => {
    getStore().setRoomInfo('room-123', 'socket-abc', '이름 & "특수"');
    expect(getStore().myUserName).toBe('이름 & "특수"');
  });
});

// ─────────────────────────────────────────────
// setConnectionStatus
// ─────────────────────────────────────────────

describe('setConnectionStatus', () => {
  it('should transition to connecting', () => {
    getStore().setConnectionStatus('connecting');
    expect(getStore().connectionStatus).toBe('connecting');
  });

  it('should transition to connected', () => {
    getStore().setConnectionStatus('connecting');
    getStore().setConnectionStatus('connected');
    expect(getStore().connectionStatus).toBe('connected');
  });

  it('should transition to error', () => {
    getStore().setConnectionStatus('error');
    expect(getStore().connectionStatus).toBe('error');
  });

  it('should transition back to idle', () => {
    getStore().setConnectionStatus('connected');
    getStore().setConnectionStatus('idle');
    expect(getStore().connectionStatus).toBe('idle');
  });

  it('should not alter other state fields', () => {
    getStore().setRoomInfo('room-123', 'socket-abc', 'Alice');
    getStore().setConnectionStatus('connected');
    expect(getStore().roomId).toBe('room-123');
    expect(getStore().mySocketId).toBe('socket-abc');
    expect(getStore().myUserName).toBe('Alice');
  });

  it('should handle repeated assignment of the same status', () => {
    getStore().setConnectionStatus('connected');
    getStore().setConnectionStatus('connected');
    expect(getStore().connectionStatus).toBe('connected');
  });
});

// ─────────────────────────────────────────────
// setErrorMessage
// ─────────────────────────────────────────────

describe('setErrorMessage', () => {
  it('should store a non-null error message', () => {
    getStore().setErrorMessage('Room not found');
    expect(getStore().errorMessage).toBe('Room not found');
  });

  it('should clear the error message when given null', () => {
    getStore().setErrorMessage('Room not found');
    getStore().setErrorMessage(null);
    expect(getStore().errorMessage).toBeNull();
  });

  it('should store an empty string', () => {
    getStore().setErrorMessage('');
    expect(getStore().errorMessage).toBe('');
  });

  it('should overwrite a previous error message', () => {
    getStore().setErrorMessage('First error');
    getStore().setErrorMessage('Second error');
    expect(getStore().errorMessage).toBe('Second error');
  });

  it('should not alter other state fields', () => {
    getStore().setRoomInfo('room-123', 'socket-abc', 'Alice');
    getStore().setConnectionStatus('error');
    getStore().setErrorMessage('join-room-error');
    expect(getStore().roomId).toBe('room-123');
    expect(getStore().connectionStatus).toBe('error');
  });
});

// ─────────────────────────────────────────────
// resetConnection
// ─────────────────────────────────────────────

describe('resetConnection', () => {
  it('should reset roomId to null', () => {
    getStore().setRoomInfo('room-123', 'socket-abc', 'Alice');
    getStore().resetConnection();
    expect(getStore().roomId).toBeNull();
  });

  it('should reset mySocketId to null', () => {
    getStore().setRoomInfo('room-123', 'socket-abc', 'Alice');
    getStore().resetConnection();
    expect(getStore().mySocketId).toBeNull();
  });

  it('should reset myUserName to null', () => {
    getStore().setRoomInfo('room-123', 'socket-abc', 'Alice');
    getStore().resetConnection();
    expect(getStore().myUserName).toBeNull();
  });

  it('should reset connectionStatus to idle', () => {
    getStore().setConnectionStatus('connected');
    getStore().resetConnection();
    expect(getStore().connectionStatus).toBe('idle');
  });

  it('should reset errorMessage to null', () => {
    getStore().setErrorMessage('some error');
    getStore().resetConnection();
    expect(getStore().errorMessage).toBeNull();
  });

  it('should reset all fields simultaneously', () => {
    getStore().setRoomInfo('room-123', 'socket-abc', 'Alice');
    getStore().setConnectionStatus('connected');
    getStore().setErrorMessage('lingering error');
    getStore().resetConnection();
    const state = getStore();
    expect(state.roomId).toBeNull();
    expect(state.mySocketId).toBeNull();
    expect(state.myUserName).toBeNull();
    expect(state.connectionStatus).toBe('idle');
    expect(state.errorMessage).toBeNull();
  });

  it('should not throw when called on an already reset store', () => {
    expect(() => getStore().resetConnection()).not.toThrow();
  });
});
