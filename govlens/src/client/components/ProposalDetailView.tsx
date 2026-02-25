import { useState, useEffect } from "react";
import { getProposal, analyzeProposal, simulateProposal } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { QocSummary } from "./qoc/QocSummary";
import { SimulationResult } from "./SimulationResult";
import type { Proposal, AggregatedResult, SimulationResponse } from "../types";

interface Props {
  proposalId: string;
  onBack: () => void;
}

export function ProposalDetailView({ proposalId, onBack }: Props) {
  const { slug, apiKey } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [evaluation, setEvaluation] = useState<AggregatedResult | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || !apiKey) return;
    setLoading(true);
    getProposal(slug, proposalId, apiKey)
      .then((res) => {
        setProposal(res.proposal);
        setEvaluation(res.evaluation);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, apiKey, proposalId]);

  async function handleAnalyze() {
    if (!slug || !apiKey) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await analyzeProposal(slug, proposalId, apiKey);
      setEvaluation(res.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSimulate() {
    if (!slug || !apiKey) return;
    setSimulating(true);
    setError("");
    try {
      const res = await simulateProposal(slug, proposalId, apiKey);
      setSimulation({ overallSuccess: res.success, results: res.calls });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <span className="spinner" /> Loading proposal...
      </div>
    );
  }

  if (!proposal) {
    return <div className="error-msg">Proposal not found</div>;
  }

  return (
    <div>
      <button className="back-link" onClick={onBack}>
        &lt;- Back to proposals
      </button>

      <div className="proposal-header">
        <h2>{proposal.title || "Untitled Proposal"}</h2>
        <div className="proposal-meta">
          <span className="meta-item">
            <span className={`badge badge-${proposal.status}`}>{proposal.status}</span>
          </span>
          <span className="meta-item">
            Proposer: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
          </span>
          <span className="meta-item">
            ID: {proposal.onChainId.slice(0, 12)}...
          </span>
        </div>
      </div>

      {/* Vote summary */}
      <div className="section">
        <div className="votes">
          <span className="vote-for">For: {proposal.forVotes}</span>
          <span className="vote-against">Against: {proposal.againstVotes}</span>
          <span className="vote-abstain">Abstain: {proposal.abstainVotes}</span>
        </div>
      </div>

      {/* Description */}
      {proposal.description && (
        <div className="section">
          <div className="section-title">Description</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {proposal.description.slice(0, 2000)}
            {proposal.description.length > 2000 && "..."}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="proposal-actions">
        <button
          className="btn btn-primary"
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? <><span className="spinner" /> Analyzing...</> : "Run Analysis"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleSimulate}
          disabled={simulating}
        >
          {simulating ? <><span className="spinner" /> Simulating...</> : "Simulate"}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* QOC Result */}
      {evaluation && (
        <div className="section">
          <div className="section-title">QOC Analysis</div>
          <QocSummary result={evaluation} />
        </div>
      )}

      {/* Simulation Result */}
      {simulation && (
        <div className="section">
          <div className="section-title">Simulation Results</div>
          <SimulationResult data={simulation} />
        </div>
      )}
    </div>
  );
}
