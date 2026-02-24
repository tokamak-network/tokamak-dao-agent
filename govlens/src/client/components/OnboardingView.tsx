import { useState } from "react";
import { discover, createTenant } from "../api";
import { useAuth } from "../contexts/AuthContext";
import type { DiscoveryResult } from "../types";

const CHAINS = [
  { id: 1, name: "Ethereum" },
  { id: 42161, name: "Arbitrum" },
  { id: 10, name: "Optimism" },
  { id: 8453, name: "Base" },
  { id: 137, name: "Polygon" },
];

export function OnboardingView() {
  const { login } = useAuth();

  // Phase 1: Discovery
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState(1);
  const [discovering, setDiscovering] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [discError, setDiscError] = useState("");

  // Phase 2: Create Tenant
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");

  async function handleDiscover() {
    setDiscovering(true);
    setDiscError("");
    setDiscovery(null);
    try {
      const res = await discover(address, chainId);
      setDiscovery(res.data);
    } catch (err: any) {
      setDiscError(err.message || "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError("");
    try {
      const res = await createTenant({
        slug,
        name,
        governorAddress: address,
        chainId,
      });
      setApiKey(res.data.apiKey);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create tenant");
    } finally {
      setCreating(false);
    }
  }

  function handleEnterDashboard() {
    if (apiKey && slug) {
      login(slug, apiKey);
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1>GovLens</h1>
        <p className="subtitle">Universal DAO Governance Analysis</p>

        {!apiKey ? (
          <>
            {/* Phase 1: Discover */}
            <div className="section">
              <div className="section-title">1. Detect Governance</div>
              <div className="field">
                <label>Governor Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Chain</label>
                <select
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                >
                  {CHAINS.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleDiscover}
                disabled={discovering || !address}
              >
                {discovering ? <><span className="spinner" /> Detecting...</> : "Detect"}
              </button>
              {discError && <div className="error-msg">{discError}</div>}
            </div>

            {discovery && (
              <>
                <div className="discovery-result">
                  <div className="framework">{discovery.framework.replace(/_/g, " ").toUpperCase()}</div>
                  <div className="confidence">
                    Confidence: {Math.round(discovery.confidence * 100)}%
                  </div>
                  <ul className="contract-list">
                    {discovery.contracts.map((c, i) => (
                      <li key={i}>
                        <span className="role">{c.role}</span>
                        <span className="addr">{c.address.slice(0, 6)}...{c.address.slice(-4)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Phase 2: Create Tenant */}
                <div className="section">
                  <div className="section-title">2. Create Tenant</div>
                  <div className="field">
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="My DAO"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Slug</label>
                    <input
                      type="text"
                      placeholder="my-dao"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreate}
                    disabled={creating || !name || !slug}
                  >
                    {creating ? <><span className="spinner" /> Creating...</> : "Create Tenant"}
                  </button>
                  {createError && <div className="error-msg">{createError}</div>}
                </div>
              </>
            )}
          </>
        ) : (
          <div>
            <div className="api-key-box">
              <div className="warning">Save this API key — it won't be shown again.</div>
              <code>{apiKey}</code>
            </div>
            <button className="btn btn-primary" onClick={handleEnterDashboard}>
              Enter Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
