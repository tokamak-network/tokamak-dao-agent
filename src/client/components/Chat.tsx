import { useState, useEffect } from "react";
import { AsciiSpinner } from "./chat/AsciiSpinner";
import { TerminalHeader } from "./chat/TerminalHeader";
import { TabProvider, useTabContext } from "../contexts/TabContext";
import { TabBar } from "./TabBar";
import { ChatInterface } from "./ChatInterface";
import { MakeProposalTab } from "./MakeProposalTab";
import { AnalyzeProposalTab } from "./AnalyzeProposalTab";
import { AgentsTab } from "./AgentsTab";
import { ForumTab } from "./ForumTab";
import { AgentProvider } from "../contexts/AgentContext";

export default function Chat() {
  return (
    <TabProvider>
      <AgentProvider>
        <ChatApp />
      </AgentProvider>
    </TabProvider>
  );
}

const CHAT_SUGGESTIONS = [
  { label: "SeigManager Info", text: "Show me SeigManager contract info" },
  { label: "DAO Proposals", text: "Analyze recent DAO proposals" },
  { label: "Contract Source", text: "Show me TON token contract source code" },
  { label: "On-chain State", text: "Read the current storage state of DepositManager" },
];

function ChatApp() {
  const { activeTab } = useTabContext();
  const [showBootSequence, setShowBootSequence] = useState(true);
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

      <div className="tab-content" style={{ display: activeTab === "chat" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <ChatInterface
          mode="chat"
          selectedModel={selectedModel}
          suggestions={CHAT_SUGGESTIONS}
        />
      </div>

      <div className="tab-content" style={{ display: activeTab === "make_proposal" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <MakeProposalTab selectedModel={selectedModel} />
      </div>

      <div className="tab-content" style={{ display: activeTab === "analyze_proposal" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <AnalyzeProposalTab selectedModel={selectedModel} />
      </div>

      <div className="tab-content" style={{ display: activeTab === "agents" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <AgentsTab />
      </div>

      <div className="tab-content" style={{ display: activeTab === "forum" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <ForumTab />
      </div>
    </div>
  );
}
