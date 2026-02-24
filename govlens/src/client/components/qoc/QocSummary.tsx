import { ScoreBar } from "./ScoreBar";
import { VerdictBadge } from "./VerdictBadge";
import { CriterionGrid } from "./CriterionGrid";
import { LensPanel } from "./LensPanel";
import type { AggregatedResult } from "../../types";

interface Props {
  result: AggregatedResult;
}

export function QocSummary({ result }: Props) {
  return (
    <div>
      {/* Verdict Banner */}
      <div className={`verdict-banner banner-${result.verdict}`}>
        <div className="banner-header">
          <div className="banner-title">
            <VerdictBadge verdict={result.verdict} />
          </div>
          <span className="banner-score">
            Final Score: {Math.round(result.finalScore)}/100
          </span>
        </div>
        <ScoreBar score={result.finalScore} height={10} />
        {result.hardVeto && result.vetoDetail && (
          <div className="veto-warning">
            Hard Veto: {result.vetoDetail.criterionId} scored{" "}
            {result.vetoDetail.score} (threshold: {result.vetoDetail.threshold})
          </div>
        )}
      </div>

      {/* Criterion Scores */}
      <div className="section">
        <div className="section-title">Criterion Scores</div>
        <CriterionGrid scores={result.criterionScores} />
      </div>

      {/* Lens Results */}
      {result.lensResults.length > 0 && (
        <div className="section">
          <div className="section-title">Stakeholder Lenses</div>
          <LensPanel lenses={result.lensResults} />
        </div>
      )}
    </div>
  );
}
