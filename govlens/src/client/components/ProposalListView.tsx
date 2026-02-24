import { useState, useEffect } from "react";
import { listProposals } from "../api";
import { useAuth } from "../contexts/AuthContext";
import type { Proposal } from "../types";

function formatVotes(raw: string): string {
  const n = BigInt(raw || "0");
  if (n >= 1_000_000_000_000_000_000n) {
    return (Number(n / 1_000_000_000_000_000n) / 1000).toFixed(1) + " ETH";
  }
  return n.toLocaleString();
}

function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) + "..." : s;
}

interface Props {
  onSelectProposal: (id: string) => void;
}

export function ProposalListView({ onSelectProposal }: Props) {
  const { slug, apiKey } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || !apiKey) return;
    setLoading(true);
    listProposals(slug, apiKey, { limit: 50 })
      .then((res) => setProposals(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, apiKey]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <span className="spinner" /> Loading proposals...
      </div>
    );
  }

  if (error) {
    return <div className="error-msg">{error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Proposals</h2>
        <p>{proposals.length} proposal{proposals.length !== 1 ? "s" : ""} found</p>
      </div>

      {proposals.length === 0 ? (
        <div className="empty-state">
          No proposals found. Proposals will appear after syncing from on-chain.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Status</th>
              <th>For</th>
              <th>Against</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr
                key={p.id}
                className="clickable"
                onClick={() => onSelectProposal(p.id)}
              >
                <td>{p.onChainId.slice(0, 8)}</td>
                <td>{truncate(p.title || "Untitled", 60)}</td>
                <td>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </td>
                <td className="vote-for">{formatVotes(p.forVotes)}</td>
                <td className="vote-against">{formatVotes(p.againstVotes)}</td>
                <td style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
