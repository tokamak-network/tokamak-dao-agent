import { navigate } from "../../App";
import { isWalletConfigured } from "../../config/wagmi";

interface HeaderProps {
  currentView: "spec" | "demo";
}

export default function Header({ currentView }: HeaderProps) {
  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.75rem 1.5rem",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-secondary)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          ERC-AI-GOV
        </span>

        <nav style={{ display: "flex", gap: "0.25rem" }}>
          <NavLink active={currentView === "spec"} onClick={() => navigate("/")}>
            Spec
          </NavLink>
          <NavLink active={currentView === "demo"} onClick={() => navigate("/demo")}>
            Demo
          </NavLink>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <a
          href="https://github.com/nicetokamak/tokamak-dao-agent"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.8rem",
            fontFamily: "var(--font-mono)",
          }}
        >
          GitHub
        </a>
        {isWalletConfigured && <w3m-button size="sm" />}
      </div>
    </header>
  );
}

function NavLink({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.35rem 0.75rem",
        borderRadius: "var(--radius)",
        border: "none",
        background: active ? "var(--bg-tertiary)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        fontFamily: "var(--font-mono)",
        fontSize: "0.8rem",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

// Declare web component for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "w3m-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { size?: string }, HTMLElement>;
    }
  }
}
