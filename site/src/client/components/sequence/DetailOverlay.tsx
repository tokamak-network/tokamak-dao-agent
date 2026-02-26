import { DETAILS } from "./data";

interface Props {
  detailId: number | null;
  onClose: () => void;
}

export default function DetailOverlay({ detailId, onClose }: Props) {
  const isOpen = detailId !== null;
  const d = detailId !== null ? DETAILS[detailId] : null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: "var(--bg-card)",
      borderTop: "2px solid var(--accent-blue)",
      maxHeight: "45vh",
      overflowY: "auto",
      transform: isOpen ? "translateY(0)" : "translateY(100%)",
      transition: "transform 0.3s ease",
      boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
      fontFamily: "var(--font-mono)",
    }}>
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.75rem",
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "1.2rem",
          fontFamily: "var(--font-mono)",
        }}
      >
        &times;
      </button>

      {d && (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {/* Title */}
          <div style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-primary)",
          }}>
            <span style={{ color: "var(--accent-blue)" }}>{"\u25B8"}</span> {d.title}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}>
            {/* Left column: Signature & Params & Returns */}
            <div>
              <SectionHeader>Function Signature</SectionHeader>
              <DetailRow style={{ color: "var(--accent-blue)", fontSize: "0.62rem" }}>{d.signature}</DetailRow>

              {d.params.length > 0 && (
                <>
                  <SectionHeader style={{ marginTop: "0.75rem" }}>Parameters</SectionHeader>
                  {d.params.map((p) => (
                    <DetailRow key={p.name}>
                      <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>{" "}
                      <span style={{ color: "var(--accent-blue)" }}>{p.value}</span>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.58rem", marginTop: "0.1rem" }}>{p.desc}</div>
                    </DetailRow>
                  ))}
                </>
              )}

              {d.returns.length > 0 && (
                <>
                  <SectionHeader style={{ marginTop: "0.75rem" }}>Returns</SectionHeader>
                  {d.returns.map((r) => (
                    <DetailRow key={r.name}>
                      <span style={{ color: "var(--text-muted)" }}>{r.name}:</span>{" "}
                      <span style={{ color: "var(--accent-green)" }}>{r.value}</span>{" "}
                      <span style={{ color: "var(--text-muted)" }}>({r.type})</span>
                    </DetailRow>
                  ))}
                </>
              )}
            </div>

            {/* Right column: Logic & Events & Storage */}
            <div>
              {d.logic.length > 0 && (
                <>
                  <SectionHeader>Internal Logic</SectionHeader>
                  {d.logic.map((l, i) => (
                    <DetailRow key={i} style={{ color: "var(--accent-yellow)", fontSize: "0.62rem" }}>{l}</DetailRow>
                  ))}
                </>
              )}

              {d.events.length > 0 && (
                <>
                  <SectionHeader style={{ marginTop: "0.75rem" }}>Events</SectionHeader>
                  {d.events.map((e, i) => (
                    <DetailRow key={i}>
                      <span style={{ color: "var(--accent-green)" }}>{"\u25C6"} {e}</span>
                    </DetailRow>
                  ))}
                </>
              )}

              {d.storage.length > 0 && (
                <>
                  <SectionHeader style={{ marginTop: "0.75rem" }}>Storage Changes</SectionHeader>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr 16px 1fr",
                    gap: "0.2rem 0.5rem",
                    alignItems: "center",
                    fontSize: "0.62rem",
                  }}>
                    {d.storage.map((s, i) => (
                      <StorageRow key={i} slot={s.slot} before={s.before} after={s.after} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h4 style={{
      fontSize: "0.65rem",
      fontWeight: 600,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: "0.5rem",
      ...style,
    }}>
      {children}
    </h4>
  );
}

function DetailRow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: "0.68rem",
      padding: "0.3rem 0.5rem",
      background: "var(--bg-tertiary)",
      borderRadius: 4,
      marginBottom: "0.3rem",
      wordBreak: "break-all",
      ...style,
    }}>
      {children}
    </div>
  );
}

function StorageRow({ slot, before, after }: { slot: string; before: string; after: string }) {
  return (
    <>
      <span style={{ color: "var(--text-muted)" }}>{slot}</span>
      <span style={{ color: "var(--accent-red)", opacity: 0.7, textDecoration: "line-through" }}>{before}</span>
      <span style={{ color: "var(--text-muted)", textAlign: "center" }}>{"\u2192"}</span>
      <span style={{ color: "var(--accent-green)" }}>{after}</span>
    </>
  );
}
