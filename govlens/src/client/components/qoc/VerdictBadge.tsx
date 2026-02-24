import type { QocVerdict } from "../../types";

interface Props {
  verdict: QocVerdict;
}

export function VerdictBadge({ verdict }: Props) {
  return (
    <span className={`verdict-badge verdict-${verdict}`}>
      {verdict.replace(/_/g, " ")}
    </span>
  );
}
