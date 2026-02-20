/**
 * Singleton Socket.IO client for communicating with ElizaOS.
 * Lazy-connects on first use. Tracks joined channels to avoid duplicates.
 */

import { io, type Socket } from "socket.io-client";
import { ELIZAOS_BASE_URL } from "../config.ts";

let socket: Socket | null = null;
const joinedChannels = new Set<string>();

/** Fixed entity ID representing the DAO Agent web user. */
export const WEB_USER_ENTITY_ID = "00000000-da0a-4000-8000-000000000001";
export const WEB_USER_NAME = "DAO Agent User";

function getSocket(): Socket {
  if (!socket) {
    socket = io(ELIZAOS_BASE_URL, {
      auth: { entityId: WEB_USER_ENTITY_ID },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      // Re-join channels after reconnect
      joinedChannels.clear();
    });

    socket.on("disconnect", () => {
      joinedChannels.clear();
    });
  }
  return socket;
}

/** Join a channel (idempotent — skips if already joined). */
export function joinChannel(
  channelId: string,
  messageServerId: string,
  metadata?: Record<string, string>,
): void {
  const s = getSocket();
  if (joinedChannels.has(channelId)) return;

  s.emit("1", {
    channelId,
    entityId: WEB_USER_ENTITY_ID,
    messageServerId,
    metadata: metadata ?? {},
  });
  joinedChannels.add(channelId);
}

/** Send a message via Socket.IO event "2". */
export function sendSocketMessage(
  channelId: string,
  messageServerId: string,
  content: string,
  metadata?: Record<string, string>,
): void {
  const s = getSocket();
  s.emit("2", {
    channelId,
    senderId: WEB_USER_ENTITY_ID,
    senderName: WEB_USER_NAME,
    messageServerId,
    content,
    metadata: metadata ?? {},
  });
}

/** Disconnect and clean up. */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    joinedChannels.clear();
  }
}
