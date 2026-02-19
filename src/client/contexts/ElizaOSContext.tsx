import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export interface ElizaAgent {
  id: string;
  name: string;
  characterName?: string;
  bio?: string;
  status: "active" | "inactive";
}

interface ElizaOSContextValue {
  available: boolean;
  agents: ElizaAgent[];
  loading: boolean;
  startAgent: (id: string) => Promise<void>;
  stopAgent: (id: string) => Promise<void>;
  refresh: () => void;
}

const ElizaOSContext = createContext<ElizaOSContextValue | null>(null);

const POLL_INTERVAL_MS = 10_000;

export function ElizaOSProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const [available, setAvailable] = useState(false);
  const [agents, setAgents] = useState<ElizaAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const tickRef = useRef(0);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/elizaos/agents");
      const data = await res.json();
      if (data.error) {
        setAvailable(false);
        setAgents([]);
      } else {
        setAvailable(true);
        setAgents(data.agents ?? []);
      }
    } catch {
      setAvailable(false);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling when active
  useEffect(() => {
    if (!active) return;

    setLoading(true);
    fetchAgents();

    const id = setInterval(() => {
      tickRef.current++;
      fetchAgents();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [active, fetchAgents]);

  const startAgent = useCallback(
    async (id: string) => {
      // Optimistic update
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "active" as const } : a)),
      );
      try {
        const res = await fetch(`/api/elizaos/agents/${id}/start`, {
          method: "POST",
        });
        if (!res.ok) {
          // Rollback
          await fetchAgents();
        }
      } catch {
        await fetchAgents();
      }
    },
    [fetchAgents],
  );

  const stopAgent = useCallback(
    async (id: string) => {
      // Optimistic update
      setAgents((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "inactive" as const } : a,
        ),
      );
      try {
        const res = await fetch(`/api/elizaos/agents/${id}/stop`, {
          method: "POST",
        });
        if (!res.ok) {
          await fetchAgents();
        }
      } catch {
        await fetchAgents();
      }
    },
    [fetchAgents],
  );

  return (
    <ElizaOSContext.Provider
      value={{ available, agents, loading, startAgent, stopAgent, refresh: fetchAgents }}
    >
      {children}
    </ElizaOSContext.Provider>
  );
}

export function useElizaOS(): ElizaOSContextValue {
  const ctx = useContext(ElizaOSContext);
  if (!ctx) throw new Error("useElizaOS must be used within ElizaOSProvider");
  return ctx;
}
