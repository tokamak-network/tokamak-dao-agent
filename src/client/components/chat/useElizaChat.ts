import { useState, useEffect, useRef, useCallback } from "react";
import type { ElizaMessage, ChatTarget } from "./types";

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

  // Initialize channel when target changes
  useEffect(() => {
    if (!target) {
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

      try {
        // 1. Get entity
        const entityRes = await fetch("/api/elizaos/entity");
        const entityData = await entityRes.json();
        if (!entityData.entityId) throw new Error("Failed to get entity");
        entityIdRef.current = entityData.entityId;

        // 2. Get message server
        const msRes = await fetch("/api/elizaos/message-server");
        const msData = await msRes.json();
        const msId = msData?.data?.messageServerId ?? msData?.data?.id ?? msData?.messageServerId ?? msData?.id;
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
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Connection failed");
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, [target]);

  const sendMessage = useCallback(async (content: string) => {
    const chId = channelIdRef.current;
    const msId = messageServerIdRef.current;
    const entityId = entityIdRef.current;
    if (!chId || !msId || !content.trim()) return;

    // Optimistically add user message
    const userMsg: ElizaMessage = {
      id: crypto.randomUUID(),
      content,
      senderId: entityId ?? "",
      senderName: "You",
      channelId: chId,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/elizaos/channels/${chId}/send`, {
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

      const data = await res.json();

      if (data.agentResponse?.text) {
        // Add agent response message
        const agentMsg: ElizaMessage = {
          id: data.agentResponse.responseId ?? crypto.randomUUID(),
          content: data.agentResponse.text,
          senderId: target?.agentId ?? "agent",
          senderName: target?.agentName ?? "Agent",
          channelId: chId,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  }, [target]);

  return { messages, sendMessage, isLoading, isConnecting, error };
}
