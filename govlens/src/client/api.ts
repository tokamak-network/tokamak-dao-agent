/** Fetch wrapper with Bearer token injection */

import type {
  DiscoveryResult,
  Tenant,
  Proposal,
  AggregatedResult,
  SimulationCallResult,
  CredibilitySummary,
} from "./types";

const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  apiKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: "UNKNOWN", message: res.statusText }));
    throw new ApiError(res.status, body.code ?? "UNKNOWN", body.message ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

// ─── Public endpoints ────────────────────────────────────────

/** POST /discover → { framework, confidence, contracts } */
export function discover(address: string, chainId: number) {
  return request<DiscoveryResult>("/discover", {
    method: "POST",
    body: JSON.stringify({ address, chainId }),
  });
}

/** POST /tenants → { tenant, apiKey, discovery } */
export function createTenant(params: {
  slug: string;
  name: string;
  governorAddress: string;
  chainId: number;
}) {
  return request<{ tenant: Partial<Tenant>; apiKey: string }>("/tenants", {
    method: "POST",
    body: JSON.stringify({
      slug: params.slug,
      name: params.name,
      address: params.governorAddress,
      chainId: params.chainId,
    }),
  });
}

// ─── Authenticated endpoints ─────────────────────────────────

/** GET /tenants/:slug → flat tenant object */
export function getTenant(slug: string, apiKey: string) {
  return request<Partial<Tenant>>(`/tenants/${slug}`, {}, apiKey);
}

/** GET .../proposals → { proposals, total } */
export function listProposals(
  slug: string,
  apiKey: string,
  params?: { limit?: number; offset?: number; status?: string },
) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString() ? `?${qs}` : "";
  return request<{ proposals: Proposal[]; total: number }>(
    `/tenants/${slug}/proposals${query}`,
    {},
    apiKey,
  );
}

/** GET .../proposals/:id → { proposal, evaluation } */
export function getProposal(slug: string, proposalId: string, apiKey: string) {
  return request<{ proposal: Proposal; evaluation: AggregatedResult | null }>(
    `/tenants/${slug}/proposals/${proposalId}`,
    {},
    apiKey,
  );
}

/** POST .../analyze → { result: { ... } } */
export function analyzeProposal(slug: string, proposalId: string, apiKey: string) {
  return request<{ result: AggregatedResult }>(
    `/tenants/${slug}/proposals/${proposalId}/analyze`,
    { method: "POST" },
    apiKey,
  );
}

/** POST .../simulate → { success, failedAt, calls } */
export function simulateProposal(slug: string, proposalId: string, apiKey: string) {
  return request<{
    success: boolean;
    failedAt: number | null;
    calls: SimulationCallResult[];
  }>(
    `/tenants/${slug}/proposals/${proposalId}/simulate`,
    { method: "POST" },
    apiKey,
  );
}

/** GET .../credibility → { agents: [...] } */
export function getCredibility(slug: string, apiKey: string) {
  return request<{ agents: CredibilitySummary[] }>(
    `/tenants/${slug}/credibility`,
    {},
    apiKey,
  );
}
