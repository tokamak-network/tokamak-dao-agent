import { useState } from "react";
import type { UserComment } from "./types.ts";
import { truncateAddress, timeAgo } from "./helpers.ts";
import { useWallet } from "../../contexts/WalletContext.tsx";

export function UserCommentItem({
  comment,
  agendaId,
  onChanged,
}: {
  comment: UserComment;
  agendaId: number;
  onChanged: () => void;
}) {
  const { address } = useWallet();
  const isOwner = !!address && address.toLowerCase() === comment.walletAddress.toLowerCase();
  const initials = comment.walletAddress.slice(2, 4).toUpperCase();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}/comment/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, content: editContent.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment?")) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/forum/agenda/${agendaId}/comment/${comment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onChanged();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="forum-comment">
      <div className="forum-comment-avatar-wallet">{initials}</div>
      <div className="forum-comment-body">
        <div className="forum-comment-meta">
          <span className="forum-comment-name">
            {truncateAddress(comment.walletAddress)}
          </span>
          <span className="forum-comment-time">{timeAgo(comment.createdAt)}</span>
          {isOwner && !editing && (
            <span className="forum-comment-actions">
              <button className="forum-comment-action-btn" onClick={() => { setEditing(true); setEditContent(comment.content); }}>Edit</button>
              <button className="forum-comment-action-btn delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? "..." : "Delete"}
              </button>
            </span>
          )}
        </div>
        {error && <div className="forum-form-error">{error}</div>}
        {editing ? (
          <div className="forum-comment-edit">
            <textarea
              className="forum-form-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={2000}
              rows={3}
            />
            <div className="forum-comment-edit-actions">
              <button className="forum-comment-action-btn" onClick={() => setEditing(false)}>Cancel</button>
              <button className="forum-form-submit" onClick={handleSave} disabled={saving || !editContent.trim()}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="forum-comment-text">
            <p>{comment.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}
