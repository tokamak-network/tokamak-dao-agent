import { useState, useCallback } from "react";

export function useTranslation(originalText: string) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  const toggle = useCallback(async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }

    if (translated) {
      setShowTranslated(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/forum/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTranslated(data.translated);
      setShowTranslated(true);
    } catch (err) {
      console.error("[translate] failed:", err);
    } finally {
      setLoading(false);
    }
  }, [originalText, translated, showTranslated]);

  const displayText = showTranslated && translated ? translated : originalText;

  return { displayText, loading, showTranslated, toggle };
}

export function TranslateButton({
  loading,
  showTranslated,
  onClick,
}: {
  loading: boolean;
  showTranslated: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="forum-translate-btn"
      onClick={onClick}
      disabled={loading}
    >
      {loading
        ? "Translating..."
        : showTranslated
          ? "Show Original"
          : "Translate"}
    </button>
  );
}
