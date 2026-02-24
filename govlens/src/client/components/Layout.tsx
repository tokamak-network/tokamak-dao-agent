import { useAuth } from "../contexts/AuthContext";
import { ProposalListView } from "./ProposalListView";
import { ProposalDetailView } from "./ProposalDetailView";
import { CredibilityView } from "./CredibilityView";
import type { View } from "../types";

interface Props {
  currentView: View;
  navigate: (view: View, proposalId?: string) => void;
  proposalId?: string;
}

export function Layout({ currentView, navigate, proposalId }: Props) {
  const { tenant, logout } = useAuth();

  const navItems: { view: View; label: string; icon: string }[] = [
    { view: "proposals", label: "Proposals", icon: ">" },
    { view: "credibility", label: "Credibility", icon: "#" },
  ];

  function renderContent() {
    switch (currentView) {
      case "proposal-detail":
        return (
          <ProposalDetailView
            proposalId={proposalId!}
            onBack={() => navigate("proposals")}
          />
        );
      case "credibility":
        return <CredibilityView />;
      case "proposals":
      default:
        return (
          <ProposalListView
            onSelectProposal={(id) => navigate("proposal-detail", id)}
          />
        );
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>GovLens</h1>
          {tenant && <div className="tenant-name">{tenant.name}</div>}
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={`sidebar-link ${currentView === item.view || (item.view === "proposals" && currentView === "proposal-detail") ? "active" : ""}`}
              onClick={() => navigate(item.view)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={logout}>Disconnect</button>
        </div>
      </aside>
      <main className="main-content">{renderContent()}</main>
    </div>
  );
}
