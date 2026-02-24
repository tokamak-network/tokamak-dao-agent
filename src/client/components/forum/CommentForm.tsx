import { useState } from "react";
import { truncateAddress } from "./helpers.ts";
import { useWallet } from "../../contexts/WalletContext.tsx";
import { isWalletConfigured } from "../../config/wagmi.ts";

export function CommentForm({
  agendaId,
  onCommentAdded,
}: {
  agendaId: number;
  onCommentAdded: () => void;
}) {
  const { address, isConnected, openModal } = useWallet();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isWalletConfigured && !isConnected) {
    return (
      <div className="forum-comment-form-connect">
        <button className="forum-form-submit" onClick={() => openModal()}>
          Connect Wallet to Comment
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!content.trim() || !address) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setContent("");
      onCommentAdded();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forum-comment-form">
      <textarea
        className="forum-form-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        maxLength={2000}
        rows={3}
      />
      {error && <div className="forum-form-error">{error}</div>}
      <div className="forum-comment-form-footer">
        <span className="forum-comment-form-address">
          {truncateAddress(address || "")}
        </span>
        <button
          className="forum-form-submit"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? "Posting..." : "Post Comment"}
        </button>
      </div>
    </div>
  );
}
