import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type TabMode = "chat" | "make_proposal" | "analyze_proposal" | "agents";

export interface Proposal {
  targets: string[];
  functionBytecodes: string[];
  atomicExecute: boolean;
  description: string;
  decodedCalls: {
    target: string;
    targetName: string;
    functionName: string;
    args: { name: string; value: string }[];
    calldata: string;
  }[];
}

interface TabContextValue {
  activeTab: TabMode;
  setActiveTab: (tab: TabMode) => void;
  pendingProposal: Proposal | null;
  transferToAnalyze: (proposal: Proposal) => void;
  clearPendingProposal: () => void;
}

const TabContext = createContext<TabContextValue | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabMode>("chat");
  const [pendingProposal, setPendingProposal] = useState<Proposal | null>(null);

  const transferToAnalyze = useCallback((proposal: Proposal) => {
    setPendingProposal(proposal);
    setActiveTab("analyze_proposal");
  }, []);

  const clearPendingProposal = useCallback(() => {
    setPendingProposal(null);
  }, []);

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab, pendingProposal, transferToAnalyze, clearPendingProposal }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext(): TabContextValue {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTabContext must be used within TabProvider");
  return ctx;
}
