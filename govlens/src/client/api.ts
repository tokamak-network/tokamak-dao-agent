/** Fetch wrapper with Bearer token injection */

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

export function discover(address: string, chainId: number) {
  return request<{ data: import("./types").DiscoveryResult }>("/discover", {
    method: "POST",
    body: JSON.stringify({ address, chainId }),
  });
}

export function createTenant(params: {
  slug: string;
  name: string;
  governorAddress: string;
  chainId: number;
}) {
  return request<{ data: { tenant: import("./types").Tenant; apiKey: string } }>("/tenants", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ─── Authenticated endpoints ─────────────────────────────────

export function getTenant(slug: string, apiKey: string) {
  return request<{ data: import("./types").Tenant }>(`/tenants/${slug}`, {}, apiKey);
}

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
  return request<{ data: import("./types").Proposal[] }>(
    `/tenants/${slug}/proposals${query}`,
    {},
    apiKey,
  );
}

export function getProposal(slug: string, proposalId: string, apiKey: string) {
  return request<{ data: { proposal: import("./types").Proposal; evaluation: import("./types").AggregatedResult | null } }>(
    `/tenants/${slug}/proposals/${proposalId}`,
    {},
    apiKey,
  );
}

export function analyzeProposal(slug: string, proposalId: string, apiKey: string) {
  return request<{ data: import("./types").AggregatedResult }>(
    `/tenants/${slug}/proposals/${proposalId}/analyze`,
    { method: "POST" },
    apiKey,
  );
}

export function simulateProposal(slug: string, proposalId: string, apiKey: string) {
  return request<{ data: import("./types").SimulationResponse }>(
    `/tenants/${slug}/proposals/${proposalId}/simulate`,
    { method: "POST" },
    apiKey,
  );
}

export function getCredibility(slug: string, apiKey: string) {
  return request<{ data: import("./types").CredibilitySummary[] }>(
    `/tenants/${slug}/credibility`,
    {},
    apiKey,
  );
}
