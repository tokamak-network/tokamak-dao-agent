import { useTabContext, type TabMode } from "../contexts/TabContext";

const TABS: { mode: TabMode; label: string }[] = [
  { mode: "chat", label: "Chat" },
  { mode: "make_proposal", label: "Generate Calldata" },
  { mode: "analyze_proposal", label: "Analyze Proposal" },
  { mode: "agents", label: "Agents" },
  { mode: "forum", label: "Forum" },
];

export function TabBar() {
  const { activeTab, navigate } = useTabContext();

  return (
    <div className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          className={`tab-button${activeTab === tab.mode ? " active" : ""}`}
          onClick={() => navigate(tab.mode)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
