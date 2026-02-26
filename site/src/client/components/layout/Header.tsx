import { navigate } from "../../App";
import { useTheme } from "../../contexts/ThemeContext";
import { useI18n } from "../../contexts/I18nContext";
import { LOCALE_LABELS, type Locale } from "../../i18n/translations";

interface HeaderProps {
  currentView: "landing" | "spec" | "demo" | "sequence";
}

export default function Header({ currentView }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

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
          <NavLink active={currentView === "spec"} onClick={() => navigate("/spec")}>
            {t("header.spec")}
          </NavLink>
          <NavLink active={currentView === "demo"} onClick={() => navigate("/demo")}>
            {t("header.demo")}
          </NavLink>
          <NavLink active={currentView === "sequence"} onClick={() => navigate("/sequence")}>
            {t("header.sequence")}
          </NavLink>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "1rem",
            transition: "all 0.15s ease",
          }}
        >
          {theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
        </button>

        {/* Language selector */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([loc, label]) => (
            <button
              key={loc}
              onClick={() => setLocale(loc)}
              style={{
                padding: "0.3rem 0.55rem",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: locale === loc ? "var(--accent-purple)" : "transparent",
                color: locale === loc ? "#fff" : "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                fontWeight: locale === loc ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <a
          href="https://github.com/tokamak-network/tokamak-dao-agent"
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

