import { useState, useEffect } from "react";
import { getCredibility } from "../api";
import { useAuth } from "../contexts/AuthContext";
import type { CredibilitySummary } from "../types";

type SortKey = "agentName" | "accuracy" | "totalPredictions" | "totalScore";

export function CredibilityView() {
  const { slug, apiKey } = useAuth();
  const [data, setData] = useState<CredibilitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("accuracy");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!slug || !apiKey) return;
    setLoading(true);
    getCredibility(slug, apiKey)
      .then((res) => setData(res.agents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, apiKey]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  if (loading) {
    return (
      <div className="loading-overlay">
        <span className="spinner" /> Loading credibility data...
      </div>
    );
  }

  if (error) {
    return <div className="error-msg">{error}</div>;
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ^" : " v") : "";

  return (
    <div>
      <div className="page-header">
        <h2>Agent Credibility</h2>
        <p>Tracking prediction accuracy across all agents</p>
      </div>

      {data.length === 0 ? (
        <div className="empty-state">
          No credibility data yet. Analyze proposals to start tracking accuracy.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleSort("agentName")}
              >
                Agent{sortIcon("agentName")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleSort("totalPredictions")}
              >
                Predictions{sortIcon("totalPredictions")}
              </th>
              <th>Resolved</th>
              <th>Correct</th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleSort("accuracy")}
              >
                Accuracy{sortIcon("accuracy")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleSort("totalScore")}
              >
                Score{sortIcon("totalScore")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.agentName}>
                <td>{row.agentName}</td>
                <td>{row.totalPredictions}</td>
                <td>{row.resolvedPredictions}</td>
                <td>{row.correctCount}</td>
                <td>
                  <span
                    style={{
                      color:
                        row.accuracy >= 0.7
                          ? "var(--accent-green)"
                          : row.accuracy >= 0.4
                            ? "var(--accent-yellow)"
                            : "var(--accent-red)",
                    }}
                  >
                    {(row.accuracy * 100).toFixed(1)}%
                  </span>
                </td>
                <td>{row.totalScore.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
