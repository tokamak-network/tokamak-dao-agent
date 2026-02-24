import { useState, useEffect } from "react";
import type { Opinion, AgentInfo } from "./types.ts";
import { FALLBACK_AGENT_NAMES } from "./constants.ts";

export function OpinionRequestPanel({
  agendaId,
  existingOpinions,
  onOpinionAdded,
}: {
  agendaId: number;
  existingOpinions: Opinion[];
  onOpinionAdded: () => void;
}) {
  const [agents, setAgents] = useState<string[]>([]);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/forum/agent");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const customNames = (data.agents ?? []).map(
          (a: AgentInfo) => a.name ?? a.agentName ?? "Unknown",
        );
        // Core agents + custom agents, deduplicated
        const all = [...FALLBACK_AGENT_NAMES, ...customNames.filter(
          (n: string) => !FALLBACK_AGENT_NAMES.includes(n),
        )];
        setAgents(all);
      } catch {
        setAgents(FALLBACK_AGENT_NAMES);
      }
    }
    fetchAgents();
  }, []);

  const existingNames = new Set(existingOpinions.map((o) => o.agentName));

  const handleRequest = async (agentName: string) => {
    setRequesting(agentName);
    setStatusMsg({ text: `${agentName} is analyzing the agenda...`, type: "info" });

    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}/opinion/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName }),
      });

      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

      if (res.status === 409) {
        setStatusMsg({ text: `${agentName} has already submitted an opinion.`, type: "info" });
        onOpinionAdded();
      } else if (res.status === 201) {
        setStatusMsg({ text: `${agentName} submitted their opinion!`, type: "success" });
        onOpinionAdded();
        setTimeout(() => setStatusMsg(null), 5_000);
      } else {
        setStatusMsg({ text: `Error: ${data.error || "Unknown error"}`, type: "error" });
      }
    } catch (err) {
      console.error("[forum] opinion request error:", err);
      setStatusMsg({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="forum-opinion-request-panel">
      <h3 className="forum-section-title">Request Agent Opinions</h3>

      {statusMsg && (
        <div className={`forum-request-status ${statusMsg.type}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="forum-agent-request-grid">
        {agents.map((name) => {
          const hasOpinion = existingNames.has(name);
          const isLoading = requesting === name;

          return (
            <button
              key={name}
              className={`forum-agent-request-btn ${hasOpinion ? "done" : ""}`}
              onClick={() => handleRequest(name)}
              disabled={hasOpinion || requesting !== null}
            >
              {isLoading ? (
                <span className="forum-agent-btn-loading">Generating...</span>
              ) : hasOpinion ? (
                <>
                  <span className="forum-agent-btn-check">&#10003;</span>
                  {name}
                </>
              ) : (
                <>Ask {name}</>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
