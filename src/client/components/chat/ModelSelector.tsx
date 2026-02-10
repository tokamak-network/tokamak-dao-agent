import { useState, useEffect, useRef } from "react";

export function ModelSelector({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);

    if (models.length === 0) {
      setLoading(true);
      try {
        const res = await fetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
        }
      } catch {
        // Ignore — user sees just the current model
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        style={{
          background: "var(--term-bg-secondary)",
          border: "1px solid var(--term-border)",
          borderRadius: "4px",
          color: "var(--term-text-primary)",
          fontSize: "12px",
          padding: "3px 10px",
          cursor: "pointer",
          transition: "border-color 0.15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "var(--term-text-muted)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "var(--term-border)")
        }
        title="Click to switch model"
      >
        {current}{" "}
        <span style={{ color: "var(--term-text-dim)", fontSize: "10px" }}>
          {open ? "\u25B4" : "\u25BE"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--term-bg-secondary)",
            border: "1px solid var(--term-border)",
            borderRadius: "6px",
            minWidth: "240px",
            maxHeight: "360px",
            overflowY: "auto",
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: "10px 14px",
                color: "var(--term-text-muted)",
                fontSize: "12px",
              }}
            >
              Loading models...
            </div>
          ) : models.length === 0 ? (
            <div
              style={{
                padding: "10px 14px",
                color: "var(--term-text-muted)",
                fontSize: "12px",
              }}
            >
              {current}
            </div>
          ) : (
            models.map((m) => {
              const isActive = m === current;
              return (
                <button
                  key={m}
                  onClick={() => {
                    onSelect(m);
                    setOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: isActive
                      ? "var(--term-border)"
                      : "transparent",
                    border: "none",
                    padding: "8px 14px",
                    color: isActive
                      ? "var(--term-text-primary)"
                      : "var(--term-text-muted)",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--term-border)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isActive
                      ? "var(--term-border)"
                      : "transparent")
                  }
                >
                  {m}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
