import { STATE_CHANGES, CONTRACT_COLORS } from "./data";

interface Props {
  activeStep: number;
}

export default function StatePanel({ activeStep }: Props) {
  if (activeStep < 0) {
    return (
      <div style={{
        color: "var(--text-muted)",
        fontSize: "0.6rem",
        fontStyle: "italic",
        padding: "0.5rem 0",
      }}>
        \u25B6 Press "Next" to start
      </div>
    );
  }

  // Accumulate state across all completed steps
  const accum: Record<string, Record<string, string>> = {};
  for (let i = 0; i <= activeStep; i++) {
    const changes = STATE_CHANGES[i];
    for (const [contract, entries] of Object.entries(changes)) {
      if (!accum[contract]) accum[contract] = {};
      for (const e of entries) {
        accum[contract][e.k] = e.v;
      }
    }
  }

  const entries = Object.entries(accum);
  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "0.6rem", fontStyle: "italic", padding: "0.5rem 0" }}>
        No state changes
      </div>
    );
  }

  return (
    <>
      {entries.map(([name, kv]) => {
        const color = CONTRACT_COLORS[name] || "var(--text-primary)";
        const isNew = STATE_CHANGES[activeStep] && STATE_CHANGES[activeStep][name];
        return (
          <div
            key={name}
            className={isNew ? "flash" : undefined}
            style={{
              marginBottom: "0.75rem",
              border: "1px solid var(--border)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div style={{
              padding: "0.4rem 0.6rem",
              fontSize: "0.68rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: `${color}11`,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }} />
              <span style={{ color }}>{name}</span>
            </div>
            <div style={{
              padding: "0.4rem 0.6rem",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-primary)",
            }}>
              {Object.entries(kv).map(([k, v]) => {
                const isThisStep = isNew && STATE_CHANGES[activeStep][name]?.some((e) => e.k === k);
                return (
                  <div key={k} style={{
                    fontSize: "0.6rem",
                    padding: "0.15rem 0",
                    display: "flex",
                    gap: "0.3rem",
                  }}>
                    <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{k}:</span>
                    <span style={{
                      color: isThisStep ? "var(--accent-green)" : "var(--accent-green)",
                      fontWeight: isThisStep ? 600 : 400,
                      wordBreak: "break-all",
                    }}>
                      {v}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
