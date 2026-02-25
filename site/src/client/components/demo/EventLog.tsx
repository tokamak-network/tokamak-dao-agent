import { useState } from "react";
import { useI18n } from "../../contexts/I18nContext";

export interface LogEntry {
  id: number;
  timestamp: number;
  event: string;
  args: Record<string, string>;
  txHash?: string;
}

let nextId = 0;

// Global event log that step components can push to
const listeners: Set<(entry: LogEntry) => void> = new Set();

export function pushLog(event: string, args: Record<string, string>, txHash?: string) {
  const entry: LogEntry = { id: nextId++, timestamp: Date.now(), event, args, txHash };
  for (const fn of listeners) fn(entry);
}

export default function EventLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();

  // Subscribe to global log pushes
  useState(() => {
    const fn = (entry: LogEntry) => setLogs((prev) => [entry, ...prev].slice(0, 50));
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  });

  if (logs.length === 0) return null;

  return (
    <div style={{
      marginTop: "2rem",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          background: "none",
          border: "none",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.78rem",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{t("eventLog.title")} ({logs.length})</span>
        <span>{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div style={{
          maxHeight: "300px",
          overflowY: "auto",
          padding: "0.5rem",
        }}>
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                padding: "0.5rem 0.75rem",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>{log.event}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {Object.entries(log.args).map(([k, v]) => (
                <div key={k} style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{k}:</span>{" "}
                  <span style={{ wordBreak: "break-all" }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
