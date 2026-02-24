import { useState, useEffect, useCallback } from "react";
import type { Agenda } from "./types.ts";
import { STATUS_LABELS } from "./constants.ts";
import { parseUtc, truncateAddress, getOnChainBadge } from "./helpers.ts";
import { useWallet } from "../../contexts/WalletContext.tsx";
import { isWalletConfigured } from "../../config/wagmi.ts";

export function AgendaListView({
  onSelect,
  onCreate,
}: {
  onSelect: (id: number) => void;
  onCreate: () => void;
}) {
  const { isConnected, openModal } = useWallet();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    if (isWalletConfigured && !isConnected) {
      openModal();
      return;
    }
    onCreate();
  }, [isConnected, openModal, onCreate]);

  const fetchAgendas = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/agenda");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAgendas(data.agendas);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgendas();
    const interval = setInterval(fetchAgendas, 30_000);
    return () => clearInterval(interval);
  }, [fetchAgendas]);

  if (loading) {
    return (
      <div className="forum-container">
        <div className="forum-loading">Loading agendas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forum-container">
        <div className="forum-error">Failed to load agendas: {error}</div>
      </div>
    );
  }

  if (agendas.length === 0) {
    return (
      <div className="welcome-container">
        <div className="chat-welcome">
          <div className="chat-welcome-title phosphor-glow">Forum</div>
          <div className="chat-welcome-subtitle">
            No agendas yet. Create one to start the governance discussion.
          </div>
          <button className="forum-create-btn" onClick={handleCreate}>
            {isWalletConfigured && !isConnected ? "Connect Wallet to Create" : "+ New Agenda"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-container">
      <div className="forum-header">
        <div className="forum-header-row">
          <h2 className="forum-title">Forum Agendas</h2>
          <button className="forum-create-btn" onClick={handleCreate}>
            {isWalletConfigured && !isConnected ? "Connect Wallet to Create" : "+ New Agenda"}
          </button>
        </div>
      </div>
      <div className="forum-thread-list">
        <div className="forum-thread-header">
          <span className="forum-thread-header-topic">Topic</span>
          <span className="forum-thread-header-stat" style={{ width: 80 }}>Opinions</span>
          <span className="forum-thread-header-stat" style={{ width: 100 }}>Activity</span>
        </div>
        {agendas.map((agenda) => (
          <button
            key={agenda.id}
            className="forum-thread-row"
            onClick={() => onSelect(agenda.id)}
          >
            <div className="forum-thread-main">
              <div className="forum-thread-title-line">
                {(() => {
                  const badge = getOnChainBadge(agenda.onChainStatus);
                  return (
                    <span
                      className="forum-status-badge"
                      data-status={badge?.dataStatus ?? agenda.status}
                    >
                      {badge?.label ?? STATUS_LABELS[agenda.status] ?? agenda.status}
                    </span>
                  );
                })()}
                <span className="forum-thread-title">{agenda.title}</span>
              </div>
              {agenda.creator && agenda.creator !== "anonymous" && agenda.creator !== "on-chain-sync" && (
                <span className="forum-thread-creator">{truncateAddress(agenda.creator)}</span>
              )}
            </div>
            <div className="forum-thread-stats">
              <span className="forum-thread-stat-opinions">
                {agenda.opinionCount ?? 0}
              </span>
              <span className="forum-thread-stat-activity">
                {parseUtc(agenda.onChainCreatedAt ?? agenda.createdAt).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
