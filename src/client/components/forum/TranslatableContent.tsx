import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation, TranslateButton } from "./useTranslation.tsx";

export function TranslatableContent({ text }: { text: string }) {
  const { displayText, loading, showTranslated, toggle } = useTranslation(text);
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <>
      <div className="forum-detail-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown></div>
      <div className="forum-content-actions">
        <TranslateButton loading={loading} showTranslated={showTranslated} onClick={toggle} />
        <button className="forum-translate-btn" onClick={handleCopyMarkdown}>
          {copied ? "Copied!" : "Copy Markdown"}
        </button>
      </div>
    </>
  );
}
