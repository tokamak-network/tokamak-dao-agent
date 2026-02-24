import { ScoreBar } from "./ScoreBar";
import { VerdictBadge } from "./VerdictBadge";
import type { LensResult } from "../../types";

interface Props {
  lenses: LensResult[];
}

export function LensPanel({ lenses }: Props) {
  return (
    <div className="lens-panel">
      {lenses.map((lens) => (
        <div key={lens.lensId} className={`lens-card lens-${lens.lensId}`}>
          <div className="lens-name">{lens.lensName}</div>
          <div className="lens-score">{Math.round(lens.weightedScore)}</div>
          <div className="lens-bar">
            <ScoreBar score={lens.weightedScore} height={6} />
          </div>
          <VerdictBadge verdict={lens.verdict} />
        </div>
      ))}
    </div>
  );
}
