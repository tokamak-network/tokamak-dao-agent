import { useTabContext, type TabMode } from "../contexts/TabContext";

const TAB_TO_PATH: Record<string, string> = {
  chat: "/chat",
  make_proposal: "/calldata",
  analyze_proposal: "/proposal",
  agents: "/agents",
  forum: "/forum",
};

const TABS: { mode: TabMode; label: string }[] = [
  { mode: "chat", label: "Chat" },
  { mode: "make_proposal", label: "Generate Calldata" },
  { mode: "analyze_proposal", label: "Analyze Proposal" },
  { mode: "agents", label: "Agents" },
  { mode: "forum", label: "Forum" },
];

export function TabBar() {
  const { activeTab } = useTabContext();

  return (
    <div className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          className={`tab-button${activeTab === tab.mode ? " active" : ""}`}
          onClick={() => {
            if (activeTab === tab.mode) return;
            window.location.href = TAB_TO_PATH[tab.mode];
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
