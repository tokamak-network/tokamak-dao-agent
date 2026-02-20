import { useState } from "react";
import { useAgentContext, type StakeholderType, type PersonalityTrait, type GovernancePriority } from "../contexts/AgentContext";

interface Props {
  onCancel: () => void;
  onComplete: () => void;
}

export const STAKEHOLDER_TYPES: { type: StakeholderType; icon: string; label: string; desc: string }[] = [
  { type: "ton_holder", icon: "\u{1FA99}", label: "TON Holder", desc: "Stakes TON for governance, earns seigniorage rewards" },
  { type: "layer2_operator", icon: "\u26D3", label: "Layer2 Operator", desc: "Runs L2 sequencer, earns tx fees and seigniorage" },
  { type: "validator", icon: "\u{1F6E1}", label: "Validator", desc: "Verifies L2 state transitions, submits fraud proofs via RAT" },
  { type: "foundation", icon: "\u{1F3DB}", label: "Foundation", desc: "Sets protocol parameters, manages DAO treasury" },
];

export const PERSONALITIES: { trait: PersonalityTrait; icon: string; label: string; desc: string }[] = [
  { trait: "progressive", icon: "\u{1F680}", label: "Progressive", desc: "Embraces innovation and calculated risks" },
  { trait: "conservative", icon: "\u{1F6E1}", label: "Conservative", desc: "Values stability and proven approaches" },
  { trait: "aggressive", icon: "\u26A1", label: "Aggressive", desc: "Takes bold stances with strong convictions" },
  { trait: "defensive", icon: "\u{1F512}", label: "Defensive", desc: "Protects existing systems from disruption" },
];

/** QOC 7 criteria — aligned with the evaluation system */
export const GOVERNANCE_PRIORITIES: { id: string; label: string; desc: string }[] = [
  { id: "techSafety", label: "Technical Safety", desc: "Fork test results, revert risks, side effects" },
  { id: "econImpact", label: "Economic Impact", desc: "Staking yield, treasury, token supply effects" },
  { id: "govIntegrity", label: "Governance Integrity", desc: "Decentralization, quorum, voting fairness" },
  { id: "opsContinuity", label: "Operational Continuity", desc: "Staking flow, L2 ops, contract interop" },
  { id: "stratAlign", label: "Strategic Alignment", desc: "Roadmap fit, partnerships, ecosystem growth" },
  { id: "reversibility", label: "Reversibility", desc: "Rollback capability, setter functions, upgrade path" },
  { id: "implQuality", label: "Implementation Quality", desc: "Calldata correctness, documentation clarity" },
];

/** Suggested weight presets per stakeholder type */
const WEIGHT_PRESETS: Record<StakeholderType, Record<string, number>> = {
  ton_holder: { techSafety: 15, econImpact: 30, govIntegrity: 10, opsContinuity: 10, stratAlign: 20, reversibility: 10, implQuality: 5 },
  layer2_operator: { techSafety: 25, econImpact: 10, govIntegrity: 10, opsContinuity: 30, stratAlign: 5, reversibility: 15, implQuality: 5 },
  validator: { techSafety: 30, econImpact: 15, govIntegrity: 20, opsContinuity: 10, stratAlign: 5, reversibility: 15, implQuality: 5 },
  foundation: { techSafety: 10, econImpact: 15, govIntegrity: 10, opsContinuity: 5, stratAlign: 35, reversibility: 5, implQuality: 20 },
};

function buildPrioritiesFromWeights(weights: Record<string, number>): GovernancePriority[] {
  return GOVERNANCE_PRIORITIES.map((gp) => ({
    id: gp.id,
    label: gp.label,
    weight: weights[gp.id] ?? 5,
  }));
}

export function AgentCreator({ onCancel, onComplete }: Props) {
  const { addAgent } = useAgentContext();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [stakeholder, setStakeholder] = useState<StakeholderType | null>(null);
  const [personality, setPersonality] = useState<PersonalityTrait | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({
    techSafety: 15, econImpact: 15, govIntegrity: 15, opsContinuity: 15, stratAlign: 15, reversibility: 15, implQuality: 10,
  });

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const setWeight = (id: string, value: number) => {
    setWeights((prev) => ({ ...prev, [id]: value }));
  };

  const applyPreset = () => {
    if (stakeholder) {
      setWeights({ ...WEIGHT_PRESETS[stakeholder] });
    }
  };

  const handleStakeholderSelect = (type: StakeholderType) => {
    setStakeholder(type);
    // Auto-apply preset weights when stakeholder is selected
    setWeights({ ...WEIGHT_PRESETS[type] });
  };

  const canNext = () => {
    switch (step) {
      case 1: return name.trim().length > 0 && stakeholder !== null;
      case 2: return personality !== null;
      case 3: return totalWeight === 100;
      case 4: return true;
      default: return false;
    }
  };

  const handleDeploy = () => {
    if (!stakeholder || !personality) return;
    const priorities = buildPrioritiesFromWeights(weights);
    addAgent({ name: name.trim(), stakeholderType: stakeholder, personality, priorities });
    onComplete();
  };

  return (
    <div className="agent-creator">
      {/* Progress bar */}
      <div className="agent-creator-progress">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`agent-progress-step ${s <= step ? "active" : ""} ${s < step ? "done" : ""}`}>
            <div className="agent-progress-dot">{s < step ? "\u2713" : s}</div>
            <span className="agent-progress-label">
              {s === 1 ? "Identity" : s === 2 ? "Personality" : s === 3 ? "Weights" : "Review"}
            </span>
          </div>
        ))}
        <div className="agent-progress-line">
          <div className="agent-progress-fill" style={{ width: `${((step - 1) / 3) * 100}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className="agent-creator-body">
        {step === 1 && (
          <div className="agent-step">
            <h2 className="agent-step-title phosphor-glow">Name Your Agent</h2>
            <p className="agent-step-desc">Choose a name and stakeholder role</p>
            <input
              className="agent-name-input"
              placeholder="Agent name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoFocus
            />
            <h3 className="agent-step-subtitle">Stakeholder Type</h3>
            <div className="agent-card-grid cols-2">
              {STAKEHOLDER_TYPES.map((s) => (
                <button
                  key={s.type}
                  className={`agent-selection-card ${stakeholder === s.type ? "selected" : ""}`}
                  onClick={() => handleStakeholderSelect(s.type)}
                >
                  <span className="agent-card-icon">{s.icon}</span>
                  <span className="agent-card-label">{s.label}</span>
                  <span className="agent-card-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="agent-step">
            <h2 className="agent-step-title phosphor-glow">Choose Personality</h2>
            <p className="agent-step-desc">How should {name || "your agent"} approach governance decisions?</p>
            <div className="agent-card-grid cols-2">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.trait}
                  className={`agent-selection-card personality ${personality === p.trait ? "selected" : ""}`}
                  onClick={() => setPersonality(p.trait)}
                >
                  <span className="agent-card-icon">{p.icon}</span>
                  <span className="agent-card-label">{p.label}</span>
                  <span className="agent-card-desc">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="agent-step">
            <h2 className="agent-step-title phosphor-glow">Evaluation Weights</h2>
            <p className="agent-step-desc">
              Set how much weight each criterion gets (must total 100)
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: totalWeight === 100 ? "var(--term-success)" : "var(--term-error)",
                fontVariantNumeric: "tabular-nums",
              }}>
                Total: {totalWeight}/100
              </span>
              {stakeholder && (
                <button
                  className="terminal-btn"
                  onClick={applyPreset}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  Reset to {STAKEHOLDER_TYPES.find((s) => s.type === stakeholder)?.label} preset
                </button>
              )}
            </div>
            <div className="agent-priorities-list">
              {GOVERNANCE_PRIORITIES.map((gp) => {
                const w = weights[gp.id] ?? 5;
                return (
                  <div key={gp.id} className="agent-priority-item selected">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--term-text-primary)" }}>
                        {gp.label}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--term-text-dim)" }}>
                        {gp.desc}
                      </span>
                    </div>
                    <div className="agent-weight-slider" style={{ paddingLeft: 0 }}>
                      <input
                        type="range"
                        min={5}
                        max={40}
                        step={5}
                        value={w}
                        onChange={(e) => setWeight(gp.id, Number(e.target.value))}
                        className="agent-slider"
                      />
                      <span className="agent-weight-value" style={{ minWidth: 24 }}>{w}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="agent-step">
            <h2 className="agent-step-title phosphor-glow">Deploy Agent</h2>
            <p className="agent-step-desc">Review your agent configuration before deployment</p>
            <div className="agent-review-sheet">
              <div className="agent-review-row">
                <span className="agent-review-label">Name</span>
                <span className="agent-review-value">{name}</span>
              </div>
              <div className="agent-review-row">
                <span className="agent-review-label">Stakeholder</span>
                <span className="agent-review-value agent-badge stakeholder">
                  {STAKEHOLDER_TYPES.find((s) => s.type === stakeholder)?.label}
                </span>
              </div>
              <div className="agent-review-row">
                <span className="agent-review-label">Personality</span>
                <span className={`agent-review-value agent-badge personality-${personality}`}>
                  {PERSONALITIES.find((p) => p.trait === personality)?.label}
                </span>
              </div>
              <div className="agent-review-row priorities">
                <span className="agent-review-label">Evaluation Weights</span>
                <div className="agent-review-priorities">
                  {GOVERNANCE_PRIORITIES.map((gp) => (
                    <div key={gp.id} className="agent-review-priority">
                      <span>{gp.label}</span>
                      <span className="agent-review-weight">{weights[gp.id]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="agent-creator-nav">
        <button className="terminal-btn" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          {step === 1 ? "Cancel" : "Back"}
        </button>
        <div className="agent-step-indicator">Step {step} of 4</div>
        {step < 4 ? (
          <button className="terminal-btn" onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Next
          </button>
        ) : (
          <button className="agent-deploy-btn" onClick={handleDeploy}>
            Deploy Agent
          </button>
        )}
      </div>
    </div>
  );
}
