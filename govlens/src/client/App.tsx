import { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { OnboardingView } from "./components/OnboardingView";
import type { View } from "./types";

function parseView(): { view: View; proposalId?: string } {
  const path = window.location.pathname;
  if (path.startsWith("/proposals/")) {
    return { view: "proposal-detail", proposalId: path.split("/")[2] };
  }
  if (path === "/credibility") return { view: "credibility" };
  if (path === "/proposals") return { view: "proposals" };
  return { view: "proposals" };
}

function AppInner() {
  const { apiKey, loading } = useAuth();
  const [route, setRoute] = useState(parseView);

  const navigate = useCallback((view: View, proposalId?: string) => {
    let path = "/dashboard";
    if (view === "proposals") path = "/proposals";
    else if (view === "proposal-detail" && proposalId) path = `/proposals/${proposalId}`;
    else if (view === "credibility") path = "/credibility";

    window.history.pushState(null, "", path);
    setRoute({ view, proposalId });
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(parseView());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <span className="spinner" />
        Initializing...
      </div>
    );
  }

  if (!apiKey) {
    return <OnboardingView />;
  }

  return (
    <Layout
      currentView={route.view}
      navigate={navigate}
      proposalId={route.proposalId}
    />
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
