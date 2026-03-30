import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMediaStore } from './mediaStore';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Build a minimal MediaStream-like object whose tracks can be spy-monitored.
 * The real MediaStream API is unavailable in the Node.js test environment.
 */
function makeMockStream(trackCount = 1): MediaStream {
  const tracks = Array.from({ length: trackCount }, () => ({
    stop: vi.fn(),
  }));

  return {
    getTracks: vi.fn(() => tracks),
  } as unknown as MediaStream;
}

function getStore() {
  return useMediaStore.getState();
}

// ─────────────────────────────────────────────
// Reset between tests
// ─────────────────────────────────────────────

beforeEach(() => {
  // Drive the store through its own resetMedia action so that
  // the internal stopStreamTracks calls don't bleed between tests.
  useMediaStore.setState({
    localStream: null,
    remoteStreams: new Map(),
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
  });
});

// ─────────────────────────────────────────────
// setLocalStream
// ─────────────────────────────────────────────

describe('setLocalStream', () => {
  it('should store the provided stream', () => {
    const stream = makeMockStream();
    getStore().setLocalStream(stream);
    expect(getStore().localStream).toBe(stream);
  });

  it('should stop tracks on the previous stream when a new stream is set', () => {
    const firstStream = makeMockStream(2);
    getStore().setLocalStream(firstStream);

    const secondStream = makeMockStream();
    getStore().setLocalStream(secondStream);

    const firstTracks = firstStream.getTracks();
    firstTracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalledOnce();
    });
    expect(getStore().localStream).toBe(secondStream);
  });

  it('should accept null to clear the local stream', () => {
    const stream = makeMockStream();
    getStore().setLocalStream(stream);
    getStore().setLocalStream(null);
    expect(getStore().localStream).toBeNull();
  });

  it('should stop tracks on the existing stream when null is set', () => {
    const stream = makeMockStream(1);
    getStore().setLocalStream(stream);
    getStore().setLocalStream(null);
    expect(stream.getTracks()[0].stop).toHaveBeenCalledOnce();
  });

  it('should not throw when setting null while stream is already null', () => {
    expect(() => getStore().setLocalStream(null)).not.toThrow();
  });
});

// ─────────────────────────────────────────────
// setRemoteStream
// ─────────────────────────────────────────────

describe('setRemoteStream', () => {
  it('should add a new remote stream keyed by socketId', () => {
    const stream = makeMockStream();
    getStore().setRemoteStream('socket-abc', stream);
    expect(getStore().remoteStreams.get('socket-abc')).toBe(stream);
  });

  it('should overwrite an existing entry for the same socketId', () => {
    const firstStream = makeMockStream();
    const secondStream = makeMockStream();
    getStore().setRemoteStream('socket-abc', firstStream);
    getStore().setRemoteStream('socket-abc', secondStream);
    expect(getStore().remoteStreams.get('socket-abc')).toBe(secondStream);
  });

  it('should store multiple remote streams independently', () => {
    const streamA = makeMockStream();
    const streamB = makeMockStream();
    getStore().setRemoteStream('socket-a', streamA);
    getStore().setRemoteStream('socket-b', streamB);
    expect(getStore().remoteStreams.size).toBe(2);
    expect(getStore().remoteStreams.get('socket-a')).toBe(streamA);
    expect(getStore().remoteStreams.get('socket-b')).toBe(streamB);
  });

  it('should produce a new Map instance on each update', () => {
    const mapBefore = getStore().remoteStreams;
    getStore().setRemoteStream('socket-abc', makeMockStream());
    expect(getStore().remoteStreams).not.toBe(mapBefore);
  });
});

// ─────────────────────────────────────────────
// removeRemoteStream
// ─────────────────────────────────────────────

describe('removeRemoteStream', () => {
  it('should remove the stream entry for the given socketId', () => {
    const stream = makeMockStream();
    getStore().setRemoteStream('socket-abc', stream);
    getStore().removeRemoteStream('socket-abc');
    expect(getStore().remoteStreams.has('socket-abc')).toBe(false);
  });

  it('should stop tracks of the removed stream', () => {
    const stream = makeMockStream(2);
    getStore().setRemoteStream('socket-abc', stream);
    getStore().removeRemoteStream('socket-abc');
    stream.getTracks().forEach((track) => {
      expect(track.stop).toHaveBeenCalledOnce();
    });
  });

  it('should leave other remote streams intact', () => {
    const streamA = makeMockStream();
    const streamB = makeMockStream();
    getStore().setRemoteStream('socket-a', streamA);
    getStore().setRemoteStream('socket-b', streamB);
    getStore().removeRemoteStream('socket-a');
    expect(getStore().remoteStreams.has('socket-a')).toBe(false);
    expect(getStore().remoteStreams.get('socket-b')).toBe(streamB);
  });

  it('should not throw when removing a socketId that does not exist', () => {
    expect(() => getStore().removeRemoteStream('nonexistent')).not.toThrow();
  });

  it('should produce a new Map instance after removal', () => {
    getStore().setRemoteStream('socket-abc', makeMockStream());
    const mapBefore = getStore().remoteStreams;
    getStore().removeRemoteStream('socket-abc');
    expect(getStore().remoteStreams).not.toBe(mapBefore);
  });
});

// ─────────────────────────────────────────────
// setAudioEnabled
// ─────────────────────────────────────────────

describe('setAudioEnabled', () => {
  it('should set isAudioEnabled to false', () => {
    getStore().setAudioEnabled(false);
    expect(getStore().isAudioEnabled).toBe(false);
  });

  it('should set isAudioEnabled to true', () => {
    getStore().setAudioEnabled(false);
    getStore().setAudioEnabled(true);
    expect(getStore().isAudioEnabled).toBe(true);
  });

  it('should default to true in the initial state', () => {
    expect(getStore().isAudioEnabled).toBe(true);
  });
});

// ─────────────────────────────────────────────
// setVideoEnabled
// ─────────────────────────────────────────────

describe('setVideoEnabled', () => {
  it('should set isVideoEnabled to false', () => {
    getStore().setVideoEnabled(false);
    expect(getStore().isVideoEnabled).toBe(false);
  });

  it('should set isVideoEnabled to true', () => {
    getStore().setVideoEnabled(false);
    getStore().setVideoEnabled(true);
    expect(getStore().isVideoEnabled).toBe(true);
  });

  it('should default to true in the initial state', () => {
    expect(getStore().isVideoEnabled).toBe(true);
  });
});

// ─────────────────────────────────────────────
// setScreenSharing
// ─────────────────────────────────────────────

describe('setScreenSharing', () => {
  it('should set isScreenSharing to true', () => {
    getStore().setScreenSharing(true);
    expect(getStore().isScreenSharing).toBe(true);
  });

  it('should set isScreenSharing to false', () => {
    getStore().setScreenSharing(true);
    getStore().setScreenSharing(false);
    expect(getStore().isScreenSharing).toBe(false);
  });

  it('should default to false in the initial state', () => {
    expect(getStore().isScreenSharing).toBe(false);
  });
});

// ─────────────────────────────────────────────
// resetMedia
// ─────────────────────────────────────────────

describe('resetMedia', () => {
  it('should set localStream back to null', () => {
    getStore().setLocalStream(makeMockStream());
    getStore().resetMedia();
    expect(getStore().localStream).toBeNull();
  });

  it('should clear all remote streams', () => {
    getStore().setRemoteStream('socket-a', makeMockStream());
    getStore().setRemoteStream('socket-b', makeMockStream());
    getStore().resetMedia();
    expect(getStore().remoteStreams.size).toBe(0);
  });

  it('should reset isAudioEnabled to true', () => {
    getStore().setAudioEnabled(false);
    getStore().resetMedia();
    expect(getStore().isAudioEnabled).toBe(true);
  });

  it('should reset isVideoEnabled to true', () => {
    getStore().setVideoEnabled(false);
    getStore().resetMedia();
    expect(getStore().isVideoEnabled).toBe(true);
  });

  it('should reset isScreenSharing to false', () => {
    getStore().setScreenSharing(true);
    getStore().resetMedia();
    expect(getStore().isScreenSharing).toBe(false);
  });

  it('should stop all tracks on the local stream', () => {
    const localStream = makeMockStream(2);
    getStore().setLocalStream(localStream);
    getStore().resetMedia();
    localStream.getTracks().forEach((track) => {
      expect(track.stop).toHaveBeenCalledOnce();
    });
  });

  it('should stop all tracks on every remote stream', () => {
    const streamA = makeMockStream(1);
    const streamB = makeMockStream(1);
    getStore().setRemoteStream('socket-a', streamA);
    getStore().setRemoteStream('socket-b', streamB);
    getStore().resetMedia();
    expect(streamA.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(streamB.getTracks()[0].stop).toHaveBeenCalledOnce();
  });

  it('should not throw when called with no active streams', () => {
    expect(() => getStore().resetMedia()).not.toThrow();
  });

  it('should produce a new empty Map instance for remoteStreams', () => {
    getStore().setRemoteStream('socket-a', makeMockStream());
    getStore().resetMedia();
    expect(getStore().remoteStreams).toBeInstanceOf(Map);
    expect(getStore().remoteStreams.size).toBe(0);
  });
});
