import { describe, it, expect, beforeEach } from 'vitest';
import { useParticipantStore } from './participantStore';
import { Participant } from '@/types/room';

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'socket-default',
    name: 'Default User',
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    ...overrides,
  };
}

const participantAlice = makeParticipant({ id: 'socket-alice', name: 'Alice' });
const participantBob = makeParticipant({
  id: 'socket-bob',
  name: 'Bob',
  isAudioEnabled: false,
});
const participantCarol = makeParticipant({
  id: 'socket-carol',
  name: 'Carol',
  isVideoEnabled: false,
});

function getStore() {
  return useParticipantStore.getState();
}

// ─────────────────────────────────────────────
// Reset between tests
// ─────────────────────────────────────────────

beforeEach(() => {
  useParticipantStore.setState({ participants: new Map() });
});

// ─────────────────────────────────────────────
// setParticipants
// ─────────────────────────────────────────────

describe('setParticipants', () => {
  it('should convert an array of participants to a Map keyed by id', () => {
    getStore().setParticipants([participantAlice, participantBob]);
    const { participants } = getStore();
    expect(participants.size).toBe(2);
    expect(participants.get('socket-alice')).toEqual(participantAlice);
    expect(participants.get('socket-bob')).toEqual(participantBob);
  });

  it('should replace the entire participants map on each call', () => {
    getStore().setParticipants([participantAlice]);
    getStore().setParticipants([participantBob, participantCarol]);
    const { participants } = getStore();
    expect(participants.size).toBe(2);
    expect(participants.has('socket-alice')).toBe(false);
  });

  it('should result in an empty Map when given an empty array', () => {
    getStore().setParticipants([participantAlice]);
    getStore().setParticipants([]);
    expect(getStore().participants.size).toBe(0);
  });

  it('should preserve all participant fields during conversion', () => {
    const specialParticipant = makeParticipant({
      id: 'socket-special',
      name: 'Special',
      isAudioEnabled: false,
      isVideoEnabled: false,
      isScreenSharing: true,
    });
    getStore().setParticipants([specialParticipant]);
    expect(getStore().participants.get('socket-special')).toEqual(specialParticipant);
  });
});

// ─────────────────────────────────────────────
// addParticipant
// ─────────────────────────────────────────────

describe('addParticipant', () => {
  it('should add a new participant to an empty map', () => {
    getStore().addParticipant(participantAlice);
    expect(getStore().participants.get('socket-alice')).toEqual(participantAlice);
  });

  it('should add a new participant without disturbing existing ones', () => {
    getStore().addParticipant(participantAlice);
    getStore().addParticipant(participantBob);
    expect(getStore().participants.size).toBe(2);
    expect(getStore().participants.get('socket-alice')).toEqual(participantAlice);
    expect(getStore().participants.get('socket-bob')).toEqual(participantBob);
  });

  it('should overwrite an existing participant with the same id', () => {
    getStore().addParticipant(participantAlice);
    const updatedAlice = makeParticipant({
      id: 'socket-alice',
      name: 'Alice Updated',
    });
    getStore().addParticipant(updatedAlice);
    expect(getStore().participants.size).toBe(1);
    expect(getStore().participants.get('socket-alice')).toEqual(updatedAlice);
  });

  it('should produce a new Map instance on each call', () => {
    const mapBefore = getStore().participants;
    getStore().addParticipant(participantAlice);
    expect(getStore().participants).not.toBe(mapBefore);
  });
});

// ─────────────────────────────────────────────
// removeParticipant
// ─────────────────────────────────────────────

describe('removeParticipant', () => {
  it('should remove the participant with the given socketId', () => {
    getStore().setParticipants([participantAlice, participantBob]);
    getStore().removeParticipant('socket-alice');
    expect(getStore().participants.has('socket-alice')).toBe(false);
    expect(getStore().participants.has('socket-bob')).toBe(true);
  });

  it('should reduce the participant count by one', () => {
    getStore().setParticipants([participantAlice, participantBob]);
    getStore().removeParticipant('socket-alice');
    expect(getStore().participants.size).toBe(1);
  });

  it('should not throw when removing a socketId that does not exist', () => {
    expect(() => getStore().removeParticipant('nonexistent')).not.toThrow();
  });

  it('should leave the map unchanged when removing a nonexistent socketId', () => {
    getStore().setParticipants([participantAlice]);
    getStore().removeParticipant('nonexistent');
    expect(getStore().participants.size).toBe(1);
  });

  it('should produce a new Map instance after removal', () => {
    getStore().setParticipants([participantAlice]);
    const mapBefore = getStore().participants;
    getStore().removeParticipant('socket-alice');
    expect(getStore().participants).not.toBe(mapBefore);
  });
});

// ─────────────────────────────────────────────
// updateParticipantMedia
// ─────────────────────────────────────────────

describe('updateParticipantMedia', () => {
  it('should update isAudioEnabled and isVideoEnabled for the given participant', () => {
    getStore().setParticipants([participantAlice]);
    getStore().updateParticipantMedia('socket-alice', false, false);
    const updated = getStore().participants.get('socket-alice');
    expect(updated?.isAudioEnabled).toBe(false);
    expect(updated?.isVideoEnabled).toBe(false);
  });

  it('should not alter other fields on the participant', () => {
    getStore().setParticipants([participantAlice]);
    getStore().updateParticipantMedia('socket-alice', false, false);
    const updated = getStore().participants.get('socket-alice');
    expect(updated?.id).toBe(participantAlice.id);
    expect(updated?.name).toBe(participantAlice.name);
    expect(updated?.isScreenSharing).toBe(participantAlice.isScreenSharing);
  });

  it('should not modify other participants in the map', () => {
    getStore().setParticipants([participantAlice, participantBob]);
    getStore().updateParticipantMedia('socket-alice', false, false);
    // participantBob has isAudioEnabled: false — should remain unchanged
    expect(getStore().participants.get('socket-bob')).toEqual(participantBob);
  });

  it('should do nothing when the socketId does not exist in the map', () => {
    getStore().setParticipants([participantAlice]);
    const mapBefore = getStore().participants;
    getStore().updateParticipantMedia('nonexistent', false, false);
    // The store returns {} when participant is not found, so the map reference stays the same
    expect(getStore().participants).toBe(mapBefore);
  });

  it('should not throw when called on an empty participant map', () => {
    expect(() =>
      getStore().updateParticipantMedia('socket-alice', true, true)
    ).not.toThrow();
  });

  it('should produce a new Map instance when the update succeeds', () => {
    getStore().setParticipants([participantAlice]);
    const mapBefore = getStore().participants;
    getStore().updateParticipantMedia('socket-alice', false, true);
    expect(getStore().participants).not.toBe(mapBefore);
  });

  it('should correctly re-enable audio and video', () => {
    const silencedBob = makeParticipant({
      id: 'socket-bob',
      name: 'Bob',
      isAudioEnabled: false,
      isVideoEnabled: false,
    });
    getStore().setParticipants([silencedBob]);
    getStore().updateParticipantMedia('socket-bob', true, true);
    const updated = getStore().participants.get('socket-bob');
    expect(updated?.isAudioEnabled).toBe(true);
    expect(updated?.isVideoEnabled).toBe(true);
  });
});

// ─────────────────────────────────────────────
// resetParticipants
// ─────────────────────────────────────────────

describe('resetParticipants', () => {
  it('should clear all participants', () => {
    getStore().setParticipants([participantAlice, participantBob]);
    getStore().resetParticipants();
    expect(getStore().participants.size).toBe(0);
  });

  it('should produce a Map instance after reset', () => {
    getStore().setParticipants([participantAlice]);
    getStore().resetParticipants();
    expect(getStore().participants).toBeInstanceOf(Map);
  });

  it('should not throw when called on an already empty store', () => {
    expect(() => getStore().resetParticipants()).not.toThrow();
  });
});

// ─────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────

describe('initial state', () => {
  it('should start with an empty participants Map', () => {
    // beforeEach resets state — verify the initial value is correct
    expect(getStore().participants).toBeInstanceOf(Map);
    expect(getStore().participants.size).toBe(0);
  });
});
