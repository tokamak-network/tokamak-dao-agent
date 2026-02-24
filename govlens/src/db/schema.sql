-- GovLens Multi-Tenant Database Schema
-- PostgreSQL with Row-Level Security

-- ─── Extensions ──────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tenants ─────────────────────────────────────────────────

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  governor_address TEXT NOT NULL,
  framework_type TEXT NOT NULL CHECK (framework_type IN ('oz_governor', 'gnosis_snapshot', 'aragon', 'custom')),
  config JSONB NOT NULL DEFAULT '{}',
  api_key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_api_key_hash ON tenants(api_key_hash);

-- ─── Contracts (discovered per tenant) ───────────────────────

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  abi JSONB,
  proxy_implementation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, address)
);

CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);

-- ─── Proposals ───────────────────────────────────────────────

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  on_chain_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  proposer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  targets JSONB NOT NULL DEFAULT '[]',
  "values" JSONB NOT NULL DEFAULT '[]',
  calldatas JSONB NOT NULL DEFAULT '[]',
  start_block TEXT NOT NULL DEFAULT '0',
  end_block TEXT NOT NULL DEFAULT '0',
  for_votes TEXT NOT NULL DEFAULT '0',
  against_votes TEXT NOT NULL DEFAULT '0',
  abstain_votes TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, on_chain_id)
);

CREATE INDEX idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX idx_proposals_status ON proposals(tenant_id, status);

-- ─── Criterion Evaluations ───────────────────────────────────

CREATE TABLE criterion_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  evidence TEXT NOT NULL DEFAULT '',
  reasoning TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evaluations_proposal ON criterion_evaluations(proposal_id);
CREATE INDEX idx_evaluations_tenant ON criterion_evaluations(tenant_id);

-- ─── Aggregated Results ──────────────────────────────────────

CREATE TABLE aggregated_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  criterion_scores JSONB NOT NULL DEFAULT '{}',
  lens_results JSONB NOT NULL DEFAULT '[]',
  final_score INTEGER NOT NULL DEFAULT 0,
  verdict TEXT NOT NULL DEFAULT 'ABSTAIN',
  hard_veto BOOLEAN NOT NULL DEFAULT FALSE,
  veto_detail JSONB,
  contributing_criteria INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_results_proposal ON aggregated_results(proposal_id);
CREATE INDEX idx_results_tenant ON aggregated_results(tenant_id);

-- ─── Deliberation Rounds ─────────────────────────────────────

CREATE TABLE deliberation_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL CHECK (phase IN (1, 2)),
  agent_name TEXT NOT NULL,
  criterion_id TEXT,
  score INTEGER,
  reasoning TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliberation_proposal ON deliberation_rounds(proposal_id);

-- ─── Agent Credibility ───────────────────────────────────────

CREATE TABLE agent_credibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  predicted_verdict TEXT NOT NULL,
  predicted_score INTEGER NOT NULL,
  actual_outcome TEXT,
  score_delta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_credibility_tenant ON agent_credibility(tenant_id);
CREATE INDEX idx_credibility_agent ON agent_credibility(tenant_id, agent_name);

-- ─── Webhook Subscriptions ───────────────────────────────────

CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant ON webhook_subscriptions(tenant_id);

-- ─── Row-Level Security ──────────────────────────────────────

-- Enable RLS on all tenant-scoped tables
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterion_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregated_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliberation_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant can only see their own data
-- These require setting current_setting('app.tenant_id') before queries

CREATE POLICY tenant_contracts ON contracts
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_proposals ON proposals
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_evaluations ON criterion_evaluations
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_results ON aggregated_results
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_deliberation ON deliberation_rounds
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_credibility ON agent_credibility
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_webhooks ON webhook_subscriptions
  USING (tenant_id::text = current_setting('app.tenant_id', true));
