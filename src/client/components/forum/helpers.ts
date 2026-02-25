import type { Message } from "../chat/types.ts";
import type { AgendaDraft, ViewState } from "./types.ts";

/** Parse a date string as UTC (SQLite datetime('now') omits the Z suffix). */
export function parseUtc(dateStr: string): Date {
  const s = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : dateStr + "Z";
  return new Date(s);
}

export function truncateAddress(addr: string): string {
  if (!addr || addr === "anonymous") return "Anonymous";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Map on-chain status string (e.g. "EXECUTED / ACCEPT") to a display label and data-status for CSS. */
export function getOnChainBadge(onChainStatus: string | null): { label: string; dataStatus: string } | null {
  if (!onChainStatus) return null;
  const status = onChainStatus.split("/")[0]!.trim();
  switch (status) {
    case "EXECUTED":
      return { label: "Executed", dataStatus: "executed" };
    case "ENDED":
      return { label: "Ended", dataStatus: "closed" };
    case "NOTICE":
      return { label: "Notice", dataStatus: "pending_review" };
    case "VOTING":
      return { label: "Voting", dataStatus: "open" };
    case "WAITING_EXEC":
      return { label: "Waiting", dataStatus: "draft" };
    default:
      return null;
  }
}

export function stripTipPrefix(title: string): string {
  return title.replace(/^TIP-[^:]*:\s*/, "");
}

export function makeTipPrefix(n: number): string {
  return `TIP-${n}: `;
}

export function ensureTipPrefix(title: string, n: number): string {
  const bare = stripTipPrefix(title);
  return bare ? `${makeTipPrefix(n)}${bare}` : "";
}

export function extractAgendaDraft(messages: Message[]): AgendaDraft | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    if (msg.role !== "assistant") continue;
    const text = msg.parts
      .filter((p) => p.type === "text" && p.content)
      .map((p) => p.content)
      .join("");
    const match = text.match(/```agenda-draft\s*\n([\s\S]*?)\n```/);
    if (match) {
      try {
        const data = JSON.parse(match[1]!);
        return data as AgendaDraft;
      } catch {}
    }
  }
  return null;
}

export function agentAvatarUrl(name: string): string {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - parseUtc(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function agendaIdFromPath(): number | null {
  const match = window.location.pathname.match(/^\/forum\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function isCreatePath(): boolean {
  return window.location.pathname === "/forum/new";
}

export function deriveInitialState(): ViewState {
  if (isCreatePath()) return { view: "create" };
  const id = agendaIdFromPath();
  if (id !== null) return { view: "detail", agendaId: id };
  return { view: "list" };
}
