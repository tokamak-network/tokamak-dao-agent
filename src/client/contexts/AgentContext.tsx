import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type PersonalityTrait = "progressive" | "conservative" | "aggressive" | "defensive";

export type StakeholderType =
  | "ton_holder"
  | "layer2_operator"
  | "validator"
  | "foundation";

export interface GovernancePriority {
  id: string;
  label: string;
  weight: number; // 1-5
}

export interface Agent {
  id: string;
  name: string;
  stakeholderType: StakeholderType;
  personality: PersonalityTrait;
  priorities: GovernancePriority[];
  createdAt: string;
}

interface AgentContextValue {
  agents: Agent[];
  loading: boolean;
  addAgent: (agent: Omit<Agent, "id" | "createdAt">) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
}

const STORAGE_KEY = "tokamak-dao-agents";

function parseDbAgent(raw: any): Agent {
  return {
    id: raw.id,
    name: raw.name,
    stakeholderType: raw.stakeholderType,
    personality: raw.personality,
    priorities: typeof raw.prioritiesJson === "string"
      ? JSON.parse(raw.prioritiesJson)
      : raw.priorities ?? [],
    createdAt: raw.createdAt,
  };
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch agents from API and handle one-time localStorage migration
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/forum/agent");
        if (!res.ok) throw new Error("Failed to fetch agents");
        const data = await res.json();

        if (cancelled) return;

        const dbAgents: Agent[] = (data.agents ?? []).map(parseDbAgent);

        // One-time migration: if DB is empty but localStorage has agents, migrate them
        if (dbAgents.length === 0) {
          const localRaw = localStorage.getItem(STORAGE_KEY);
          if (localRaw) {
            try {
              const localAgents: Agent[] = JSON.parse(localRaw);
              if (Array.isArray(localAgents) && localAgents.length > 0) {
                const migrated: Agent[] = [];
                for (const agent of localAgents) {
                  const postRes = await fetch("/forum/agent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: agent.id,
                      name: agent.name,
                      stakeholderType: agent.stakeholderType,
                      personality: agent.personality,
                      priorities: agent.priorities,
                    }),
                  });
                  if (postRes.ok) {
                    const created = await postRes.json();
                    migrated.push(parseDbAgent(created));
                  }
                }
                localStorage.removeItem(STORAGE_KEY);
                if (!cancelled) setAgents(migrated);
                return;
              }
            } catch {
              // Ignore corrupt localStorage
            }
          }
        }

        // Clean up localStorage if DB has agents (migration already happened)
        if (dbAgents.length > 0 && localStorage.getItem(STORAGE_KEY)) {
          localStorage.removeItem(STORAGE_KEY);
        }

        if (!cancelled) setAgents(dbAgents);
      } catch (err) {
        console.error("[AgentContext] failed to load agents:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const addAgent = useCallback(async (data: Omit<Agent, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    const body = {
      id,
      name: data.name,
      stakeholderType: data.stakeholderType,
      personality: data.personality,
      priorities: data.priorities,
    };

    // Optimistic update
    const optimistic: Agent = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    setAgents((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/forum/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Rollback on failure
        setAgents((prev) => prev.filter((a) => a.id !== id));
        console.error("[AgentContext] failed to create agent:", await res.text());
      }
    } catch (err) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
      console.error("[AgentContext] failed to create agent:", err);
    }
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    // Optimistic update
    let removed: Agent | undefined;
    setAgents((prev) => {
      removed = prev.find((a) => a.id === id);
      return prev.filter((a) => a.id !== id);
    });

    try {
      const res = await fetch(`/forum/agent/${id}`, { method: "DELETE" });
      if (!res.ok) {
        // Rollback on failure
        if (removed) setAgents((prev) => [...prev, removed!]);
        console.error("[AgentContext] failed to delete agent:", await res.text());
      }
    } catch (err) {
      if (removed) setAgents((prev) => [...prev, removed!]);
      console.error("[AgentContext] failed to delete agent:", err);
    }
  }, []);

  return (
    <AgentContext.Provider value={{ agents, loading, addAgent, deleteAgent }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgentContext must be used within AgentProvider");
  return ctx;
}
