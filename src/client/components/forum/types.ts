import type { Message } from "../chat/types.ts";

export interface Agenda {
  id: number;
  title: string;
  content: string;
  onChainAgendaId: number | null;
  onChainCreatedAt: string | null;
  onChainStatus: string | null;
  creator: string;
  deadline: string;
  status: "draft" | "pending_review" | "rejected" | "open" | "closed" | "archived";
  createdAt: string;
  opinionCount?: number;
}

export interface Opinion {
  id: number;
  agendaId: number;
  agentName: string;
  stakeholderType: string;
  personality: string;
  verdict: string;
  reasoning: string;
  confidence: number;
  prioritiesJson: string | null;
  createdAt: string;
}

export interface Validation {
  id: number;
  agendaId: number;
  validatorType: "format" | "relevance" | "feasibility";
  status: "pass" | "fail";
  score: number | null;
  feedback: string;
  createdAt: string;
}

export interface UserComment {
  id: number;
  agendaId: number;
  walletAddress: string;
  content: string;
  createdAt: string;
}

export interface AgendaDetail extends Agenda {
  updatedAt: string;
  opinions: Opinion[];
  comments: UserComment[];
}

export interface AgentInfo {
  agentName?: string;
  name?: string;
}

export type ViewState =
  | { view: "list" }
  | { view: "create" }
  | { view: "detail"; agendaId: number };

export interface AgendaDraftCalldata {
  description: string;
  targets: string[];
  functionBytecodes: string[];
  atomicExecute: boolean;
  decodedCalls: {
    target: string;
    targetName: string;
    functionName: string;
    args: { name: string; value: string }[];
    calldata: string;
  }[];
}

export interface AgendaDraft {
  title?: string;
  content?: string;
  calldata?: AgendaDraftCalldata;
}
