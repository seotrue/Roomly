import type { UserInfo } from './room-types';

// roomId -> Set<socketId>
const rooms = new Map<string, Set<string>>();

// socketId -> UserInfo
const users = new Map<string, UserInfo>();

export const roomStore = {
  // ── rooms ────────────────────────────────

  hasRoom(roomId: string): boolean {
    return rooms.has(roomId);
  },

  createRoom(roomId: string): void {
    rooms.set(roomId, new Set());
  },

  getRoom(roomId: string): Set<string> | undefined {
    return rooms.get(roomId);
  },

  addSocketToRoom(roomId: string, socketId: string): void {
    rooms.get(roomId)?.add(socketId);
  },

  removeSocketFromRoom(roomId: string, socketId: string): void {
    rooms.get(roomId)?.delete(socketId);
  },

  deleteRoom(roomId: string): void {
    rooms.delete(roomId);
  },

  getRoomSize(roomId: string): number {
    return rooms.get(roomId)?.size ?? 0;
  },

  // ── users ────────────────────────────────

  setUser(socketId: string, userInfo: UserInfo): void {
    users.set(socketId, userInfo);
  },

  getUser(socketId: string): UserInfo | undefined {
    return users.get(socketId);
  },

  deleteUser(socketId: string): void {
    users.delete(socketId);
  },

  getUserName(socketId: string): string {
    return users.get(socketId)?.userName ?? '';
  },
};
