interface Props {
  score: number;
  height?: number;
}

function getBarClass(score: number): string {
  if (score < 35) return "bar-low";
  if (score <= 65) return "bar-mid";
  return "bar-high";
}

export function ScoreBar({ score, height = 8 }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="score-bar-container">
      <div className="score-bar" style={{ height }}>
        <div
          className={`score-bar-fill ${getBarClass(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="score-value">{Math.round(clamped)}</span>
    </div>
  );
}
