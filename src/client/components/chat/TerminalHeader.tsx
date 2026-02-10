export function TerminalHeader({
  isConnected,
  isLoading,
  showAsciiArt = true,
  onNewChat,
}: {
  isConnected: boolean;
  isLoading: boolean;
  showAsciiArt?: boolean;
  onNewChat?: () => void;
}) {
  return (
    <div className="terminal-box-header">
      <div style={{ borderBottom: "1px solid var(--term-border)" }}>
        <div
          className="text-xs"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--term-text-muted)", fontSize: "13px" }}>
              Tokamak DAO Agent
            </span>
            {onNewChat && (
              <button
                className="new-chat-btn"
                onClick={onNewChat}
                title="New Chat"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center">
            <span
              className={`status-dot ${
                isLoading
                  ? "status-loading"
                  : isConnected
                  ? "status-connected"
                  : "status-disconnected"
              }`}
            />
            <span style={{ color: "var(--term-text-muted)" }}>
              {isLoading
                ? "PROCESSING"
                : isConnected
                ? "CONNECTED"
                : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </div>
      {showAsciiArt && (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}
        >
          <pre
            className="terminal-header-ascii phosphor-glow"
            style={{
              color: "var(--term-accent)",
              fontSize: "12px",
              lineHeight: "1.3",
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
          >
            {` _____ ___  _  __    _    __  __    _    _  __
|_   _/ _ \\| |/ /   / \\  |  \\/  |  / \\  | |/ /
  | || | | | ' /   / _ \\ | |\\/| | / _ \\ | ' /
  | || |_| | . \\  / ___ \\| |  | |/ ___ \\| . \\
  |_| \\___/|_|\\_\\/_/   \\_\\_|  |_/_/   \\_\\_|\\_\\

            DAO AGENT v1.0.0                  `}
          </pre>
        </div>
      )}
    </div>
  );
}
