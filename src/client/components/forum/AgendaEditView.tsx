import { useState } from "react";
import type { AgendaDetail } from "./types.ts";

export function AgendaEditView({
  agenda,
  onBack,
  onUpdated,
}: {
  agenda: AgendaDetail;
  onBack: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(agenda.title);
  const [content, setContent] = useState(agenda.content);
  const [deadline, setDeadline] = useState(agenda.deadline.slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/forum/agenda/${agenda.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          deadline: new Date(deadline).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      onUpdated();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forum-container">
      <button className="forum-back-btn" onClick={onBack}>
        &larr; Back to agenda
      </button>

      <div className="forum-form-card">
        <h2 className="forum-form-title">Edit & Resubmit</h2>
        <p className="forum-form-desc">
          Modify your proposal and resubmit for validation.
        </p>

        <form onSubmit={handleSubmit} className="forum-form">
          <div className="forum-form-field">
            <label className="forum-form-label" htmlFor="edit-title">
              Title
            </label>
            <input
              id="edit-title"
              className="forum-form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="forum-form-field">
            <label className="forum-form-label" htmlFor="edit-content">
              Content
            </label>
            <textarea
              id="edit-content"
              className="forum-form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={10000}
              rows={8}
              required
            />
          </div>

          <div className="forum-form-field">
            <label className="forum-form-label" htmlFor="edit-deadline">
              Deadline
            </label>
            <input
              id="edit-deadline"
              className="forum-form-input"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          {error && <div className="forum-form-error">{error}</div>}

          <button
            type="submit"
            className="forum-form-submit"
            disabled={submitting || !title || !content || !deadline}
          >
            {submitting ? "Resubmitting..." : "Resubmit for Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
