import { useState } from "react";
import { ScoreBar } from "./ScoreBar";

const CRITERION_LABELS: Record<string, string> = {
  techSafety: "Technical Safety",
  econImpact: "Economic Impact",
  govIntegrity: "Governance Integrity",
  opsContinuity: "Ops Continuity",
  stratAlign: "Strategic Alignment",
  reversibility: "Reversibility",
  implQuality: "Implementation Quality",
};

interface Props {
  scores: Record<string, { score: number; evidence: string }>;
}

export function CriterionGrid({ scores }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const entries = Object.entries(scores).sort(([a], [b]) => {
    const order = Object.keys(CRITERION_LABELS);
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div className="criterion-grid">
      {entries.map(([id, { score, evidence }]) => (
        <div key={id}>
          <div
            className="criterion-row"
            onClick={() => setExpanded(expanded === id ? null : id)}
          >
            <span className="criterion-label">
              {CRITERION_LABELS[id] ?? id}
            </span>
            <ScoreBar score={score} />
          </div>
          {expanded === id && evidence && (
            <div className="criterion-evidence">{evidence}</div>
          )}
        </div>
      ))}
    </div>
  );
}
