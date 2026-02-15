import { useState } from "react";
import { useAgentContext, type StakeholderType, type PersonalityTrait, type GovernancePriority } from "../contexts/AgentContext";

interface Props {
  onCancel: () => void;
  onComplete: () => void;
}

const STAKEHOLDER_TYPES: { type: StakeholderType; icon: string; label: string; desc: string }[] = [
  { type: "ton_holder", icon: "\u{1FA99}", label: "TON Holder", desc: "Stakes TON for governance, earns seigniorage rewards" },
  { type: "layer2_operator", icon: "\u26D3", label: "Layer2 Operator", desc: "Runs L2 sequencer, earns tx fees and seigniorage" },
  { type: "validator", icon: "\u{1F6E1}", label: "Validator", desc: "Verifies L2 state transitions, submits fraud proofs via RAT" },
  { type: "foundation", icon: "\u{1F3DB}", label: "Foundation", desc: "Sets protocol parameters, manages DAO treasury" },
];

const PERSONALITIES: { trait: PersonalityTrait; icon: string; label: string; desc: string }[] = [
  { trait: "progressive", icon: "\u{1F680}", label: "Progressive", desc: "Embraces innovation and calculated risks" },
  { trait: "conservative", icon: "\u{1F6E1}", label: "Conservative", desc: "Values stability and proven approaches" },
  { trait: "aggressive", icon: "\u26A1", label: "Aggressive", desc: "Takes bold stances with strong convictions" },
  { trait: "defensive", icon: "\u{1F512}", label: "Defensive", desc: "Protects existing systems from disruption" },
];

const GOVERNANCE_PRIORITIES: { id: string; label: string }[] = [
  { id: "security", label: "Protocol Security" },
  { id: "decentralization", label: "Decentralization" },
  { id: "growth", label: "Ecosystem Growth" },
  { id: "gas", label: "Gas Efficiency" },
  { id: "interop", label: "Interoperability" },
  { id: "treasury", label: "Treasury Management" },
  { id: "community", label: "Community Engagement" },
  { id: "innovation", label: "Innovation & R&D" },
];

export function AgentCreator({ onCancel, onComplete }: Props) {
  const { addAgent } = useAgentContext();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [stakeholder, setStakeholder] = useState<StakeholderType | null>(null);
  const [personality, setPersonality] = useState<PersonalityTrait | null>(null);
  const [priorities, setPriorities] = useState<GovernancePriority[]>([]);

  const togglePriority = (id: string, label: string) => {
    setPriorities((prev) => {
      const exists = prev.find((p) => p.id === id);
      if (exists) return prev.filter((p) => p.id !== id);
      if (prev.length >= 5) return prev;
      return [...prev, { id, label, weight: 3 }];
    });
  };

  const setWeight = (id: string, weight: number) => {
    setPriorities((prev) => prev.map((p) => (p.id === id ? { ...p, weight } : p)));
  };

  const canNext = () => {
    switch (step) {
      case 1: return name.trim().length > 0 && stakeholder !== null;
      case 2: return personality !== null;
      case 3: return priorities.length >= 3;
      case 4: return true;
      default: return false;
    }
  };

  const handleDeploy = () => {
    if (!stakeholder || !personality) return;
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
              {s === 1 ? "Identity" : s === 2 ? "Personality" : s === 3 ? "Priorities" : "Review"}
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
            <p className="agent-step-desc">Choose a name and role for your stakeholder agent</p>
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
                  onClick={() => setStakeholder(s.type)}
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
            <h2 className="agent-step-title phosphor-glow">Set Priorities</h2>
            <p className="agent-step-desc">
              Select 3-5 governance priorities and set their importance (selected: {priorities.length}/5)
            </p>
            <div className="agent-priorities-list">
              {GOVERNANCE_PRIORITIES.map((gp) => {
                const selected = priorities.find((p) => p.id === gp.id);
                return (
                  <div key={gp.id} className={`agent-priority-item ${selected ? "selected" : ""}`}>
                    <button
                      className="agent-priority-toggle"
                      onClick={() => togglePriority(gp.id, gp.label)}
                    >
                      <span className={`agent-priority-check ${selected ? "checked" : ""}`}>
                        {selected ? "\u2713" : ""}
                      </span>
                      <span className="agent-priority-label">{gp.label}</span>
                    </button>
                    {selected && (
                      <div className="agent-weight-slider">
                        <span className="agent-weight-label">Weight</span>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={selected.weight}
                          onChange={(e) => setWeight(gp.id, Number(e.target.value))}
                          className="agent-slider"
                        />
                        <span className="agent-weight-value">{selected.weight}</span>
                      </div>
                    )}
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
                <span className="agent-review-label">Priorities</span>
                <div className="agent-review-priorities">
                  {priorities.map((p) => (
                    <div key={p.id} className="agent-review-priority">
                      <span>{p.label}</span>
                      <span className="agent-review-weight">{"*".repeat(p.weight)}</span>
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
