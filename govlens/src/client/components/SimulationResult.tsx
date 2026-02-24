import type { SimulationResponse } from "../types";

interface Props {
  data: SimulationResponse;
}

export function SimulationResult({ data }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span className={`badge ${data.overallSuccess ? "badge-executed" : "badge-defeated"}`}>
          {data.overallSuccess ? "ALL PASS" : "HAS FAILURES"}
        </span>
      </div>
      {data.results.map((r, i) => (
        <div key={i} className="sim-row">
          <div className={`sim-icon ${r.success ? "pass" : "fail"}`}>
            {r.success ? "+" : "x"}
          </div>
          <span className="sim-target">
            {r.target.slice(0, 6)}...{r.target.slice(-4)}
          </span>
          <span className="sim-fn">{r.functionName || "call"}</span>
          {r.revertReason && (
            <span className="sim-revert">{r.revertReason}</span>
          )}
        </div>
      ))}
    </div>
  );
}
