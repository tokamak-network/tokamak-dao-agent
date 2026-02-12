import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type PersonalityTrait = "progressive" | "conservative" | "aggressive" | "defensive";

export type StakeholderType =
  | "ton_holder"
  | "layer2_operator"
  | "dao_committee"
  | "community_member";

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
  addAgent: (agent: Omit<Agent, "id" | "createdAt">) => void;
  deleteAgent: (id: string) => void;
}

const STORAGE_KEY = "tokamak-dao-agents";

function loadAgents(): Agent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(loadAgents);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  }, [agents]);

  const addAgent = useCallback((data: Omit<Agent, "id" | "createdAt">) => {
    const agent: Agent = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setAgents((prev) => [...prev, agent]);
  }, []);

  const deleteAgent = useCallback((id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <AgentContext.Provider value={{ agents, addAgent, deleteAgent }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgentContext must be used within AgentProvider");
  return ctx;
}
