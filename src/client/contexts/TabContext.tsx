import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type TabMode = "chat" | "make_proposal" | "analyze_proposal" | "agents" | "forum";

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

const TAB_TO_PATH: Record<TabMode, string> = {
  chat: "/app/chat",
  make_proposal: "/app/calldata",
  analyze_proposal: "/app/proposal",
  agents: "/app/agents",
  forum: "/app/forum",
};

const PATH_TO_TAB: Record<string, TabMode> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as TabMode]),
) as Record<string, TabMode>;

function tabFromPath(): TabMode {
  const path = window.location.pathname;
  if (PATH_TO_TAB[path]) return PATH_TO_TAB[path];
  // Sub-route match (e.g. /app/forum/123)
  for (const [routePath, tab] of Object.entries(PATH_TO_TAB)) {
    if (path.startsWith(routePath + "/")) return tab;
  }
  return "chat";
}

interface TabContextValue {
  activeTab: TabMode;
  navigate: (tab: TabMode) => void;
  pendingProposal: Proposal | null;
  transferToAnalyze: (proposal: Proposal) => void;
  clearPendingProposal: () => void;
}

const TabContext = createContext<TabContextValue | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabMode>(tabFromPath);
  const [pendingProposal, setPendingProposal] = useState<Proposal | null>(null);

  const navigate = useCallback((tab: TabMode) => {
    setActiveTab(tab);
    history.pushState(null, "", TAB_TO_PATH[tab]);
  }, []);

  useEffect(() => {
    // Normalize bare /app to /app/chat
    if (!PATH_TO_TAB[window.location.pathname]) {
      history.replaceState(null, "", TAB_TO_PATH[activeTab]);
    }

    const onPopState = () => setActiveTab(tabFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const transferToAnalyze = useCallback((proposal: Proposal) => {
    setPendingProposal(proposal);
    navigate("analyze_proposal");
  }, [navigate]);

  const clearPendingProposal = useCallback(() => {
    setPendingProposal(null);
  }, []);

  return (
    <TabContext.Provider value={{ activeTab, navigate, pendingProposal, transferToAnalyze, clearPendingProposal }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext(): TabContextValue {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTabContext must be used within TabProvider");
  return ctx;
}
