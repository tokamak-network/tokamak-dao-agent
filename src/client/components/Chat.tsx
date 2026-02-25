import { useState, useEffect, lazy, Suspense } from "react";
import { AsciiSpinner } from "./chat/AsciiSpinner";
import { TerminalHeader } from "./chat/TerminalHeader";
import { TabProvider, useTabContext } from "../contexts/TabContext";
import { TabBar } from "./TabBar";
import { ChatInterface } from "./ChatInterface";
import { ErrorBoundary } from "./ErrorBoundary";
import { AgentProvider } from "../contexts/AgentContext";
import { ElizaOSProvider } from "../contexts/ElizaOSContext";
import { WalletProvider } from "../contexts/WalletContext";

// Code-split heavy tabs for faster initial load
const MakeProposalTab = lazy(() => import("./MakeProposalTab").then((m) => ({ default: m.MakeProposalTab })));
const AnalyzeProposalTab = lazy(() => import("./AnalyzeProposalTab").then((m) => ({ default: m.AnalyzeProposalTab })));
const AgentsTab = lazy(() => import("./AgentsTab").then((m) => ({ default: m.AgentsTab })));
const ForumTab = lazy(() => import("./forum").then((m) => ({ default: m.ForumTab })));
const GuideTab = lazy(() => import("./guide").then((m) => ({ default: m.GuideTab })));

function LazyFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        color: "var(--term-text-dim, #888)",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 13,
      }}
    >
      Loading...
    </div>
  );
}

export default function Chat() {
  return (
    <WalletProvider>
      <TabProvider>
        <AgentProvider>
          <ElizaOSWrapper />
        </AgentProvider>
      </TabProvider>
    </WalletProvider>
  );
}

function ElizaOSWrapper() {
  const { activeTab } = useTabContext();
  return (
    <ElizaOSProvider active={true}>
      <ChatApp />
    </ElizaOSProvider>
  );
}


const CHAT_SUGGESTIONS = [
  { label: "TON + Uniswap?", text: "Can TON be traded on Uniswap?" },
  { label: "DAOCommittee Structure", text: "Explain the internal structure of DAOCommitteeProxy — its proxy pattern, routing, and current implementations" },
  { label: "SeigManager State", text: "Show me the current on-chain state of SeigManager" },
  { label: "WTON + DEX?", text: "Can WTON be traded on Uniswap? What about SushiSwap?" },
];

function ChatApp() {
  const { activeTab } = useTabContext();
  const [showBootSequence, setShowBootSequence] = useState(() => activeTab === "chat");
  const [providerName, setProviderName] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        setProviderName(data.provider);
        setSelectedModel((prev) => prev ?? data.model);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowBootSequence(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Boot Sequence Screen
  if (showBootSequence) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8"
        style={{ background: "var(--term-bg-primary)" }}
      >
        <div
          className="space-y-2 text-sm"
          style={{ color: "var(--term-accent)" }}
        >
          <div className="boot-line" style={{ animationDelay: "0ms" }}>
            TOKAMAK DAO AGENT v1.0.0
          </div>
          <div className="boot-line" style={{ animationDelay: "200ms" }}>
            Initializing neural interface...
          </div>
          <div className="boot-line" style={{ animationDelay: "400ms" }}>
            Loading language models...
          </div>
          <div className="boot-line" style={{ animationDelay: "600ms" }}>
            {`Connecting to ${providerName ?? "AI"} API...`}
          </div>
          <div className="boot-line" style={{ animationDelay: "800ms" }}>
            <AsciiSpinner /> System ready.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <TerminalHeader
        isConnected={true}
        isLoading={false}
        showAsciiArt={false}
        model={selectedModel}
        onModelChange={setSelectedModel}
      />

      <TabBar />

      {activeTab === "chat" && (
        <ErrorBoundary>
          <div className="tab-content" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <ChatInterface
              mode="chat"
              selectedModel={selectedModel}
              welcomeTitle="Tokamak DAO Agent"
              welcomeSubtitle="Verification-first AI for Tokamak Network governance. Pick a demo scenario or ask anything."
              suggestions={CHAT_SUGGESTIONS}
            />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === "make_proposal" && (
        <ErrorBoundary>
          <Suspense fallback={<LazyFallback />}>
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <MakeProposalTab selectedModel={selectedModel} />
            </div>
          </Suspense>
        </ErrorBoundary>
      )}

      {activeTab === "analyze_proposal" && (
        <ErrorBoundary>
          <Suspense fallback={<LazyFallback />}>
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <AnalyzeProposalTab selectedModel={selectedModel} />
            </div>
          </Suspense>
        </ErrorBoundary>
      )}

      {activeTab === "agents" && (
        <ErrorBoundary>
          <Suspense fallback={<LazyFallback />}>
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <AgentsTab />
            </div>
          </Suspense>
        </ErrorBoundary>
      )}

      {activeTab === "forum" && (
        <ErrorBoundary>
          <Suspense fallback={<LazyFallback />}>
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <ForumTab />
            </div>
          </Suspense>
        </ErrorBoundary>
      )}

      {activeTab === "guide" && (
        <ErrorBoundary>
          <Suspense fallback={<LazyFallback />}>
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <GuideTab />
            </div>
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
