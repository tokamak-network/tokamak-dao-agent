import { useState, useEffect } from "react";
import {
  useAgentContext,
  type StakeholderType,
  type PersonalityTrait,
  type GovernancePriority,
} from "../contexts/AgentContext";
import { STAKEHOLDER_TYPES, PERSONALITIES, GOVERNANCE_PRIORITIES } from "./AgentCreator";

const PERSONALITY_COLORS: Record<PersonalityTrait, string> = {
  progressive: "#4ade80",
  conservative: "#818cf8",
  aggressive: "#fbbf24",
  defensive: "#9ca3af",
};

/**
 * Pre-written sample previews: [personality][stakeholderType]
 * Shows how the agent would react to a sample seigniorage rate change proposal.
 */
const SAMPLE_PREVIEWS: Record<string, Record<string, string>> = {
  progressive: {
    ton_holder:
      "This seigniorage rate adjustment is an opportunity to optimize staker yields. If the new rate incentivizes broader participation, the resulting increase in total staked TON strengthens network security while potentially boosting individual returns. I SUPPORT this proposal.",
    layer2_operator:
      "A well-calibrated seigniorage rate can attract more deposits to L2 operators, increasing sequencer revenue. This change aligns with growth-oriented economics. I'm inclined to SUPPORT with monitoring of deposit flow impacts.",
    validator:
      "Adjusting seigniorage parameters is a natural evolution of the protocol's economic model. As long as security budgets remain adequate, this opens new efficiency gains. I SUPPORT this direction.",
    foundation:
      "This rate change positions the protocol competitively against other staking ecosystems. It's a strategic move that should drive ecosystem growth. I SUPPORT with the recommendation to review after one quarter.",
  },
  conservative: {
    ton_holder:
      "Before modifying seigniorage rates, we must carefully assess the impact on existing stakers' expected returns. Any disruption to predictable yields could trigger unstaking cascades. I recommend a CAUTIOUS approach with phased implementation.",
    layer2_operator:
      "Changes to seigniorage mechanics directly affect operator economics. I need to see detailed modeling of how this impacts deposit manager flows and operator profitability before taking a position. NEEDS_REVIEW.",
    validator:
      "Security parameter changes require thorough analysis. We must verify that the new rate maintains sufficient validator incentives and doesn't compromise the challenge mechanism's economic guarantees. I lean toward CAUTION.",
    foundation:
      "Treasury impacts from seigniorage changes cascade through the entire ecosystem. I recommend extensive modeling and a testnet trial before mainnet deployment. Current approach: NEEDS_REVIEW.",
  },
  aggressive: {
    ton_holder:
      "This rate change doesn't go far enough. If we're going to adjust seigniorage, we should optimize aggressively for maximum staker returns. Half-measures waste governance bandwidth. I say PUSH FURTHER or don't bother.",
    layer2_operator:
      "This proposal needs teeth. Operators need clear economic advantages, and this adjustment is too timid. I DEMAND stronger incentive alignment or I REJECT this half-measure.",
    validator:
      "Either commit to meaningful security budget improvements or don't touch the parameters. This middle-ground approach satisfies nobody. I STRONGLY OPPOSE incremental tinkering.",
    foundation:
      "The protocol needs bold economic restructuring, not minor rate tweaks. I CHALLENGE the committee to think bigger. This proposal is a missed opportunity for transformative change.",
  },
  defensive: {
    ton_holder:
      "Any seigniorage modification introduces risk to current stakers. What happens if the new rate creates perverse incentives? What's the rollback plan if yields collapse? I need safety guarantees before supporting this. Likely REJECT.",
    layer2_operator:
      "This change could destabilize operator economics. I see multiple failure modes: deposit flight, reduced sequencer profitability, and cascading withdrawals. Without a comprehensive risk assessment, I OPPOSE.",
    validator:
      "Modifying core economic parameters is inherently dangerous. The current system is proven and stable. The burden of proof lies with the proposer to demonstrate this won't weaken security. I default to REJECT.",
    foundation:
      "Protocol stability must come first. This change touches fundamental economics and I see insufficient analysis of downside scenarios. Without a thorough security audit of the new parameters, I OPPOSE.",
  },
};

const DEPLOY_LINES = [
  "Initializing agent neural network...",
  "Loading stakeholder knowledge base...",
  "Calibrating personality matrix...",
];

interface Props {
  onComplete: () => void;
}

export function CharacterCreation({ onComplete }: Props) {
  const { addAgent } = useAgentContext();
  const [step, setStep] = useState(0); // 0=welcome, 1=identity, 2=personality, 3=priorities, 4=preview, 5=review
  const [name, setName] = useState("");
  const [stakeholder, setStakeholder] = useState<StakeholderType | null>(null);
  const [personality, setPersonality] = useState<PersonalityTrait | null>(null);
  const [priorities, setPriorities] = useState<GovernancePriority[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

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
      case 0: return true;
      case 1: return name.trim().length > 0 && stakeholder !== null;
      case 2: return personality !== null;
      case 3: return priorities.length >= 3;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleDeploy = () => {
    if (!stakeholder || !personality) return;
    setDeploying(true);
    setDeployStep(0);
  };

  // Deploy animation sequence
  useEffect(() => {
    if (!deploying) return;
    if (deployStep < DEPLOY_LINES.length) {
      const timer = setTimeout(() => setDeployStep((s) => s + 1), 600);
      return () => clearTimeout(timer);
    }
    // All lines shown, actually deploy
    const timer = setTimeout(() => {
      if (stakeholder && personality) {
        addAgent({ name: name.trim(), stakeholderType: stakeholder, personality, priorities });
      }
      onComplete();
    }, 800);
    return () => clearTimeout(timer);
  }, [deploying, deployStep]);

  const personalityColor = personality ? PERSONALITY_COLORS[personality] : "var(--term-accent)";

  // Deploy animation overlay
  if (deploying) {
    return (
      <div className="cc-fullscreen">
        <div className="cc-deploy-animation">
          {DEPLOY_LINES.map((line, i) => (
            <div
              key={i}
              className="boot-line"
              style={{
                animationDelay: `${i * 500}ms`,
                color: i < deployStep ? "var(--term-success)" : "var(--term-accent)",
              }}
            >
              {i < deployStep ? "[OK] " : "> "}{line}
            </div>
          ))}
          {deployStep >= DEPLOY_LINES.length && (
            <div
              className="boot-line"
              style={{ animationDelay: `${DEPLOY_LINES.length * 500}ms`, color: personalityColor }}
            >
              Agent "{name}" deployed successfully.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cc-fullscreen">
      {/* Progress bar (hidden on welcome) */}
      {step > 0 && (
        <div className="cc-progress-bar">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`cc-progress-segment ${s <= step ? "active" : ""}`} />
          ))}
        </div>
      )}

      <div className="cc-content">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="cc-step cc-welcome-step">
            <div className="cc-welcome-icon">&#x1F916;</div>
            <h1 className="cc-title phosphor-glow">Create Your DAO Agent</h1>
            <p className="cc-subtitle">
              Build an AI agent with a unique personality to analyze Tokamak Network proposals from your stakeholder perspective.
            </p>
            <button className="cc-start-btn" onClick={() => setStep(1)}>
              Begin Setup
            </button>
          </div>
        )}

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="cc-step">
            <h2 className="cc-step-title phosphor-glow">Name Your Agent</h2>
            <p className="cc-step-desc">Choose a name and your stakeholder role</p>
            <input
              className="agent-name-input"
              placeholder="Agent name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoFocus
            />
            <h3 className="cc-section-label">Stakeholder Type</h3>
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

        {/* Step 2: Personality */}
        {step === 2 && (
          <div className="cc-step">
            <h2 className="cc-step-title phosphor-glow">Choose Personality</h2>
            <p className="cc-step-desc">How should {name || "your agent"} approach governance decisions?</p>
            <div className="agent-card-grid cols-2">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.trait}
                  className={`agent-selection-card personality-card ${personality === p.trait ? "selected" : ""}`}
                  onClick={() => setPersonality(p.trait)}
                  style={personality === p.trait ? { borderColor: PERSONALITY_COLORS[p.trait], boxShadow: `0 0 16px ${PERSONALITY_COLORS[p.trait]}33, inset 0 0 16px ${PERSONALITY_COLORS[p.trait]}1a` } : undefined}
                >
                  <span className="agent-card-icon">{p.icon}</span>
                  <span className="agent-card-label" style={personality === p.trait ? { color: PERSONALITY_COLORS[p.trait] } : undefined}>
                    {p.label}
                  </span>
                  <span className="agent-card-desc">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Priorities */}
        {step === 3 && (
          <div className="cc-step">
            <h2 className="cc-step-title phosphor-glow">Set Priorities</h2>
            <p className="cc-step-desc">
              Select 3-5 governance priorities and set their importance ({priorities.length}/5 selected)
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

        {/* Step 4: Preview */}
        {step === 4 && personality && stakeholder && (
          <div className="cc-step">
            <h2 className="cc-step-title phosphor-glow">Preview Response</h2>
            <p className="cc-step-desc">
              Here's how {name || "your agent"} would react to a seigniorage rate change proposal
            </p>
            <div className="cc-preview-card" style={{ borderColor: `${personalityColor}66` }}>
              <div className="cc-preview-header">
                <span className="cc-preview-agent-name" style={{ color: personalityColor }}>
                  {name || "Agent"}
                </span>
                <span className="cc-preview-badge" style={{ background: `${personalityColor}22`, color: personalityColor }}>
                  {PERSONALITIES.find((p) => p.trait === personality)?.label}{" "}
                  {STAKEHOLDER_TYPES.find((s) => s.type === stakeholder)?.label}
                </span>
              </div>
              <div className="cc-preview-body">
                {SAMPLE_PREVIEWS[personality]?.[stakeholder] ?? "Analysis pending..."}
              </div>
              <div className="cc-preview-proposal">
                Sample: "Change DAO seigniorage rate from 5% to 10%"
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="cc-step">
            <h2 className="cc-step-title phosphor-glow">Deploy Agent</h2>
            <p className="cc-step-desc">Review your agent before deployment</p>
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
                <span
                  className={`agent-review-value agent-badge personality-${personality}`}
                >
                  {PERSONALITIES.find((p) => p.trait === personality)?.label}
                </span>
              </div>
              <div className="agent-review-row priorities">
                <span className="agent-review-label">Priorities</span>
                <div className="agent-review-priorities">
                  {[...priorities].sort((a, b) => b.weight - a.weight).map((p) => (
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

      {/* Navigation (hidden on welcome) */}
      {step > 0 && (
        <div className="cc-nav">
          <button className="terminal-btn" onClick={() => setStep(step - 1)}>
            Back
          </button>
          <div className="cc-step-indicator">Step {step} of 5</div>
          {step < 5 ? (
            <button className="terminal-btn" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next
            </button>
          ) : (
            <button className="agent-deploy-btn" onClick={handleDeploy}>
              Deploy Agent
            </button>
          )}
        </div>
      )}
    </div>
  );
}
