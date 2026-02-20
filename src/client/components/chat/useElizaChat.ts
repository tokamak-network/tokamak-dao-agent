import { useState, useEffect, useRef, useCallback } from "react";
import type { ElizaMessage, ChatTarget } from "./types";

const POLL_INTERVAL = 2000;

interface UseElizaChatResult {
  messages: ElizaMessage[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useElizaChat(target: ChatTarget | null): UseElizaChatResult {
  const [messages, setMessages] = useState<ElizaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelIdRef = useRef<string | null>(null);
  const messageServerIdRef = useRef<string | null>(null);
  const entityIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Fetch messages for current channel
  const fetchMessages = useCallback(async (chId: string) => {
    try {
      const res = await fetch(`/api/elizaos/channels/${chId}/messages`);
      const data = await res.json();
      const msgs: ElizaMessage[] = (data.messages ?? []).map((m: any) => ({
        id: m.id ?? m.messageId ?? crypto.randomUUID(),
        content: m.content?.text ?? m.content ?? m.body ?? "",
        senderId: m.senderId ?? m.entityId ?? "",
        senderName: m.senderName ?? m.authorName ?? "Unknown",
        channelId: m.channelId ?? chId,
        createdAt: m.createdAt ?? new Date().toISOString(),
      }));
      // Sort by createdAt ascending
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(msgs);
    } catch {
      // Silent fail — polling will retry
    }
  }, []);

  // Initialize channel when target changes
  useEffect(() => {
    if (!target) {
      stopPolling();
      channelIdRef.current = null;
      setMessages([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function setup() {
      setIsConnecting(true);
      setError(null);
      setMessages([]);
      stopPolling();

      try {
        // 1. Get entity
        const entityRes = await fetch("/api/elizaos/entity");
        const entityData = await entityRes.json();
        if (!entityData.entityId) throw new Error("Failed to get entity");
        entityIdRef.current = entityData.entityId;

        // 2. Get message server
        const msRes = await fetch("/api/elizaos/message-server");
        const msData = await msRes.json();
        const msId = msData?.data?.id ?? msData?.id ?? msData?.messageServerId;
        if (!msId) throw new Error("Failed to get message server");
        messageServerIdRef.current = msId;

        // 3. Get or create channel
        let channelId: string | null = null;

        if (target.type === "dm" && target.agentId) {
          const dmRes = await fetch(`/api/elizaos/dm-channel?agentId=${target.agentId}`);
          const dmData = await dmRes.json();
          channelId = dmData?.data?.id ?? dmData?.channelId ?? dmData?.id ?? null;
        } else if (target.type === "group" && target.agentIds?.length) {
          const grpRes = await fetch("/api/elizaos/group-channel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `Governance Discussion ${Date.now()}`,
              agentIds: target.agentIds,
            }),
          });
          const grpData = await grpRes.json();
          channelId = grpData?.data?.id ?? grpData?.channelId ?? grpData?.id ?? null;
        }

        if (cancelled) return;

        if (!channelId) throw new Error("Failed to create channel");
        channelIdRef.current = channelId;

        // 4. Fetch initial messages
        await fetchMessages(channelId);

        // 5. Start polling
        pollRef.current = setInterval(() => fetchMessages(channelId!), POLL_INTERVAL);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Connection failed");
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    }

    setup();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [target, fetchMessages, stopPolling]);

  const sendMessage = useCallback(async (content: string) => {
    const chId = channelIdRef.current;
    const msId = messageServerIdRef.current;
    if (!chId || !msId || !content.trim()) return;

    setIsLoading(true);
    try {
      const metadata: Record<string, string> = {};
      if (target?.type === "dm" && target.agentId) {
        metadata.targetAgentId = target.agentId;
      }

      await fetch(`/api/elizaos/channels/${chId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          messageServerId: msId,
          ...(target?.type === "dm" && target.agentId
            ? { targetAgentId: target.agentId }
            : {}),
        }),
      });

      // Immediately poll for new messages
      await fetchMessages(chId);
    } catch {
      setError("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  }, [target, fetchMessages]);

  return { messages, sendMessage, isLoading, isConnecting, error };
}
