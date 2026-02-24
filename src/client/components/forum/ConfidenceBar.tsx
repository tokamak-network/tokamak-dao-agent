export function ConfidenceBar({ level }: { level: number }) {
  const blocks = 5;
  const filled = Math.min(Math.max(Math.round(level), 0), blocks);

  return (
    <div className="forum-confidence" title={`Confidence: ${level}/5`}>
      {Array.from({ length: blocks }, (_, i) => (
        <span
          key={i}
          className={`forum-confidence-block${i < filled ? " filled" : ""}`}
        />
      ))}
    </div>
  );
}
