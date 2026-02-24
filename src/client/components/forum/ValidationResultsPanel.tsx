import { useState, useEffect } from "react";
import type { Validation } from "./types.ts";

export function ValidationResultsPanel({
  agendaId,
  status,
  onEdit,
  onStatusChange,
}: {
  agendaId: number;
  status: "pending_review" | "rejected";
  onEdit: () => void;
  onStatusChange: () => void;
}) {
  const [validations, setValidations] = useState<Validation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchValidations() {
      try {
        const res = await fetch(`/api/forum/agenda/${agendaId}/validations`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setValidations(data.validations);
          setLoading(false);

          // Stop polling if all 3 validations are in
          if (data.validations.length === 3 && interval) {
            clearInterval(interval);
            interval = null;
            // Status might have changed, refresh parent
            onStatusChange();
          }
        }
      } catch (err) {
        console.error("[forum] failed to load validations:", err);
      }
    }

    fetchValidations();

    // Poll if still pending
    if (status === "pending_review") {
      interval = setInterval(fetchValidations, 3_000);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [agendaId, status, onStatusChange]);

  const validatorLabels: Record<string, string> = {
    format: "Format",
    relevance: "Relevance",
    feasibility: "Feasibility",
  };

  const isPending = status === "pending_review" && validations.length < 3;

  return (
    <div className="forum-validation-panel">
      <h3 className="forum-section-title">Validation Results</h3>
      <div className="forum-validation-grid">
        {["format", "relevance", "feasibility"].map((type) => {
          const v = validations.find((v) => v.validatorType === type);
          return (
            <div
              key={type}
              className={`forum-validation-card ${v ? v.status : "pending"}`}
            >
              <div className="forum-validation-card-header">
                <span className="forum-validation-type">
                  {validatorLabels[type]}
                </span>
                {v ? (
                  <span
                    className={`forum-validation-status ${v.status}`}
                  >
                    {v.status === "pass" ? "PASS" : "FAIL"}
                    {v.score !== null && ` (${v.score}/10)`}
                  </span>
                ) : (
                  <span className="forum-validation-status pending">
                    {isPending ? "..." : "N/A"}
                  </span>
                )}
              </div>
              {v ? (
                <div className="forum-validation-feedback">{v.feedback}</div>
              ) : isPending ? (
                <div className="forum-validation-feedback dim">
                  Analyzing...
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {status === "rejected" && (
        <button className="forum-form-submit resubmit" onClick={onEdit}>
          Edit and Resubmit
        </button>
      )}

      {isPending && (
        <div className="forum-validation-waiting">
          Validation in progress...
        </div>
      )}
    </div>
  );
}
