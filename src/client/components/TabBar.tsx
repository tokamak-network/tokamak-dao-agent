import { useTabContext, type TabMode } from "../contexts/TabContext";

const TABS: { mode: TabMode; label: string }[] = [
  { mode: "chat", label: "Chat" },
  { mode: "make_proposal", label: "Generate Calldata" },
  { mode: "analyze_proposal", label: "Analyze Proposal" },
  { mode: "agents", label: "Agents" },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useTabContext();

  return (
    <div className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          className={`tab-button${activeTab === tab.mode ? " active" : ""}`}
          onClick={() => setActiveTab(tab.mode)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
