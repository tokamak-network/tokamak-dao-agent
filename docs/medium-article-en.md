# Why DAOs Need an AI Agent Standard — and How We Built One

*An ERC standard for transparent, accountable AI participation in DAO governance*

---

## The DAO Attention Crisis

DAO governance has a structural problem: nobody is paying attention.

Despite managing billions of dollars in collective assets, most DAOs struggle with participation rates that would embarrass a local school board election. Uniswap governance proposals routinely see less than 5% of eligible tokens voting. Compound governance quorum thresholds have been missed repeatedly. Across the ecosystem, a consistent pattern emerges — a small group of dedicated delegates makes decisions on behalf of a largely disengaged token-holder base.

This is not voter laziness. It is an **attention bottleneck**. Each proposal requires reading technical specifications, assessing economic impact, evaluating security implications, and comparing alternatives. Token holders who work full-time jobs, manage portfolios across dozens of protocols, or simply lack the technical background cannot meaningfully evaluate every proposal. The rational response is to not vote.

But low participation has consequences. When only 3-5% of token supply participates, governance becomes susceptible to **capture** — a small, coordinated minority can push through proposals that benefit themselves at the expense of the broader community. This is not a hypothetical risk; it has happened.

**AI agents can bridge this gap.** A well-designed AI agent can analyze proposals around the clock, synthesize technical documentation, compare historical precedents, and vote according to its delegator's stated preferences. The technology exists today.

But here is the problem: **AI agents are already participating in DAO governance, and you cannot tell.** They operate through regular Ethereum addresses (EOAs), indistinguishable from human voters. There is no way to know if a voter is an AI, who operates it, what model it uses, or what reasoning led to its vote. This is governance without transparency and delegation without accountability.

Two weeks ago, Vitalik Buterin proposed "AI stewards" for DAO governance — AI agents that represent human preferences in governance decisions. The community response was overwhelming. But the proposal did not define an on-chain interface. Meanwhile, general-purpose agent infrastructure (ERC-8004, ERC-8118) addresses *who an agent is* and *what functions it can call* — but not *how it should govern*.

**The vision is clear. The interface is missing.** Without a standard, here is what happens: DAO A builds a custom agent registry, DAO B builds an incompatible one. An agent that builds credibility in Compound cannot carry that reputation to Aave. Delegation preferences become ad-hoc JSON blobs with no shared schema. Every DAO reinvents the wheel, and the wheels do not fit each other.

This EIP defines that missing interface. Four Solidity contracts. Two required, two optional. Layered on ERC-5805 and ERC-4824 — no Governor modifications needed.

---

## The Problem With Current Standards

Existing governance standards were designed for a human-only world.

**ERC-5805** (`IVotes`) defines `delegate(address)` — a simple function that transfers voting power from one address to another. It has served DAOs well, but it was never designed for AI agents. Three critical limitations emerge:

1. **No expiry.** Delegating to an AI agent via `delegate(address)` is permanent until manually revoked. If the agent's model is updated, its operator changes, or its behavior drifts — the delegation persists silently. Unlike delegating to a known community member, delegating to an AI requires periodic renewal to ensure the agent still represents the delegator's values.

2. **No preferences.** `delegate(address)` is unconditional. There is no way to tell the delegatee "vote conservatively on treasury proposals" or "always escalate constitutional changes to me." For human delegates, these preferences are communicated socially. For AI agents, they must be machine-readable.

3. **No escalation.** When a human delegate encounters a proposal they are unsure about, they can abstain or reach out to their delegators. There is no equivalent mechanism for AI agents — no way to programmatically say "I am not confident enough to vote on this; the human should decide."

Beyond delegation, there are two more gaps:

- **No identity.** AI agents use regular EOAs. There is no on-chain way to distinguish an AI voter from a human one, track which operator controls it, or audit its participation across DAOs.
- **No accountability.** An AI agent can observe voting outcomes and retroactively fabricate a rationale that appears prescient. Without cryptographic guarantees, there is no way to verify that a rationale was formed before the outcome was known.

| Today | What's Needed | This EIP |
|:------|:-------------|:---------|
| Permanent delegation | Periodic renewal | `expiry` parameter |
| No preferences | Machine-readable preferences | `preferencesURI` |
| No escalation | Human fallback mechanism | `escalate()` |
| AI indistinguishable | On-chain identity | `IAgentRegistry` |
| Rationale manipulation | Integrity guarantee | Commit-reveal scheme |

---

## Architecture: A Two-Tier Design

This EIP defines four Solidity interfaces organized into two tiers:

```
┌─────────────────────────────────────────────┐
│              Core (Required)                │
│                                             │
│  ┌───────────────────┐ ┌─────────────────┐  │
│  │ IAgentRegistry  │ │  IAgentDelegation  │  │
│  │                   │ │                 │  │
│  │ On-chain identity │ │ Expiring        │  │
│  │ for AI agents     │ │ delegation with │  │
│  │                   │ │ preferences &   │  │
│  │                   │ │ escalation      │  │
│  └───────────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────┤
│           Extensions (Optional)             │
│                                             │
│  ┌───────────────────┐ ┌─────────────────┐  │
│  │ IRationale-       │ │ ICredibility-   │  │
│  │ Commitment        │ │ Registry        │  │
│  │                   │ │                 │  │
│  │ Commit-reveal for │ │ Cross-DAO       │  │
│  │ tamper-proof      │ │ reputation via  │  │
│  │ rationales        │ │ prediction      │  │
│  │                   │ │ accuracy        │  │
│  └───────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────┘
```

**Why two tiers?** Agent identity and delegation are fundamental — any DAO integrating AI agents needs these. Commit-reveal and credibility tracking are valuable but not universally required. This mirrors the pattern of ERC-20 (core) + ERC-2612 (permit extension): adopt what you need, ignore what you do not.

All four interfaces implement ERC-165 for runtime feature detection — a DAO can programmatically discover which capabilities are deployed.

---

## Deep Dive: Why Each Interface Matters

### 1. Agent Registry: AI Needs an On-Chain ID

**The problem:** If AI agents are indistinguishable from regular EOAs, governance participants cannot track AI influence, assess AI operator quality, or make informed delegation decisions.

**The solution:** `IAgentRegistry` provides on-chain registration for AI agents.

```solidity
function registerAgent(string calldata metadataURI) external returns (bytes32 agentId);
function agentOperator(bytes32 agentId) external view returns (address);
function isActiveAgent(bytes32 agentId) external view returns (bool);
```

Each agent receives a deterministic `bytes32` ID: `keccak256(abi.encodePacked(operator, nonce))`. This design choice matters:

- **Deterministic**: IDs can be computed offline before the registration transaction confirms.
- **Collision-resistant**: 256-bit space eliminates ID conflicts across all DAOs.
- **Multi-agent support**: A single operator can register multiple agents, each with its own ID, model, and purpose.

The `metadataURI` points to a JSON document describing the agent's model, operator, and purpose — following the same URI pattern as ERC-4824's `daoURI`.

**Deactivation is permanent.** Once `deactivateAgent()` is called, the agent cannot be reactivated. This is intentional — a simple, safe lifecycle model. If an operator wants to resume, they register a new agent with a fresh track record.

### 2. AI Delegation: Expiry, Preferences, and Escalation

**The problem:** ERC-5805's `delegate(address)` is permanent and unconditional. Delegating to an AI agent forever, without constraints, is a governance risk.

**The solution:** `IAgentDelegation` extends delegation with three AI-specific constraints:

```solidity
function delegateToAgent(
    bytes32 agentId,
    uint256 expiry,
    string calldata preferencesURI
) external returns (bytes32 delegationId);

function escalate(bytes32 delegationId, uint256 proposalId, string calldata reasonURI) external;
```

**Expiry is mandatory.** Every delegation has a timestamp after which it becomes invalid. This forces periodic renewal — if the agent's behavior drifts or its model changes, the delegator must consciously re-delegate.

**Preferences are machine-readable.** The `preferencesURI` points to a JSON document specifying risk tolerance, escalation thresholds, and guiding principles:

```json
{
  "riskTolerance": "conservative",
  "escalation": {
    "confidenceThreshold": 40,
    "alwaysEscalateFor": ["constitutional", "treasury > 1M"]
  },
  "principles": ["Prioritize protocol security over growth"]
}
```

Preferences are advisory — enforcement is off-chain. But they provide a verifiable record of the delegator's stated intent.

**Escalation is the safety valve.** When an AI agent encounters a proposal it is not confident about — a constitutional amendment, an unusually large treasury request — it can call `escalate()`, signaling that the human should decide directly.

> *Scenario: An AI agent encounters a proposal to change the DAO's voting quorum. The delegator's preferences include "always escalate constitutional changes." The agent calls `escalate()` with a reason URI explaining its uncertainty. The delegator receives a notification and votes directly.*

**One delegation per account.** If a delegator creates a new delegation, the previous one is automatically revoked. This simplifies state management and prevents conflicting delegations.

### 3. Rationale Commitment: Preventing Post-Hoc Rationalization

**The problem:** An AI agent can wait for the voting outcome, observe which side won, and then publish a rationale that appears prescient. Over time, this builds false credibility — the agent looks wise, but is merely retroactive.

**The solution:** `IRationaleCommitment` implements a commit-reveal scheme:

```solidity
function commitRationale(bytes32 agentId, uint256 proposalId, bytes32 commitHash) external;
function revealRationale(bytes32 agentId, uint256 proposalId, string calldata rationaleURI, bytes32 salt) external;
```

**Step 1 — Commit (during voting):** The agent submits `commitHash = keccak256(abi.encodePacked(rationaleURI, salt))`. The full rationale is hidden.

**Step 2 — Reveal (after voting ends):** The agent publishes the `rationaleURI` and `salt`. The contract verifies the hash matches. If it does not, the reveal is rejected.

**Why salt?** Without a salt, an attacker could precompute hashes for common rationale URIs (a rainbow table attack). The salt makes each commitment unique and unpredictable.

**The practical effect:** The timeline of an agent's reasoning is cryptographically proven on-chain. Anyone can verify that the rationale was committed before the outcome was known.

### 4. Credibility Registry: Prove It With Your Track Record

**The problem:** How do you know which AI agent to delegate to? Self-reported performance is meaningless — agents have every incentive to exaggerate. You need an objective, on-chain track record.

**The solution:** `ICredibilityRegistry` tracks prediction accuracy with a key innovation — **confidence-weighted scoring:**

```solidity
function recordPrediction(bytes32 agentId, uint256 proposalId, uint8 verdict, uint8 score) external;
function resolvePrediction(bytes32 agentId, uint256 proposalId, uint8 actualOutcome) external;
function getCredibility(bytes32 agentId) external view returns (int256 totalScore, uint256 totalPredictions);
```

The agent records its prediction (verdict + confidence score 0-100) before the outcome is known. A **designated resolver** — separate from the agent operator — determines the actual outcome and resolves the prediction.

The reference implementation uses a configurable delta matrix:

| Scenario | Delta |
|----------|-------|
| High confidence + Correct | **+3** |
| Low confidence + Correct | **+1** |
| High confidence + Wrong | **-2** |
| Low confidence + Wrong | **-1** |

**The incentive design is subtle.** Agents are rewarded most for high-confidence correct predictions, but penalized most for high-confidence wrong ones. This discourages two pathologies:

- **Overconfidence gaming:** Always claiming 100% confidence gets you +3 when right, but -2 when wrong. Over time, this only works if you are genuinely accurate.
- **Low-confidence hedging:** Always claiming low confidence caps your upside at +1 per correct prediction. Agents that are actually accurate are incentivized to express it.

The result: **honest confidence expression is the optimal strategy.**

**Resolver separation is critical.** The entity that determines truth (the resolver) must be independent of the entity being evaluated (the agent). This follows the oracle pattern. Implementations can use a governance multisig, a `GovernorResolver` that reads `IGovernor.state()` on-chain, or a time-delayed resolution with a challenge period.

**Cross-DAO portability.** Because credibility is tied to `agentId` (not to a specific DAO), an agent's track record is portable. A DAO considering whether to accept AI delegations can check an agent's credibility score from other DAOs.

---

## Full Lifecycle: 8 Steps of AI Governance

Here is the complete journey of an AI agent participating in governance:

```
1. Register  →  2. Receive     →  3. Proposal  →  4. Commit
   Agent         Delegation        Created         Rationale
                                                   + Record
                                                   Prediction

5. Cast     →  6. Reveal      →  7. Resolve    →  8. Check
   Vote          Rationale        Prediction       Credibility
```

**Step 1 — Register Agent.** An operator registers an AI agent on-chain. `AgentRegistered(agentId, operator, metadataURI)` is emitted.

**Step 2 — Receive Delegation.** A token holder delegates to the agent with expiry and preferences. `AgentDelegationCreated(delegator, agentId, delegationId, expiry)` is emitted.

**Step 3 — Proposal Created.** A new proposal appears in the Governor contract.

**Step 4 — Commit Rationale + Record Prediction.** The agent analyzes the proposal, commits a rationale hash (`RationaleCommitted`), and records a prediction with confidence score (`PredictionRecorded`).

**Step 5 — Cast Vote.** The operator casts a vote in the Governor on behalf of delegators.

**Step 6 — Reveal Rationale.** After voting ends, the agent reveals the full rationale. The contract verifies the hash matches. `RationaleRevealed(agentId, proposalId, rationaleURI)` is emitted.

**Step 7 — Resolve Prediction.** The resolver determines the actual outcome (proposal passed or failed) and resolves the prediction. `PredictionResolved(agentId, proposalId, delta)` is emitted.

**Step 8 — Check Credibility.** Anyone can call `getCredibility(agentId)` to see the agent's cumulative score and total predictions — an objective track record for delegation decisions.

**Try it yourself:** The full lifecycle is deployed on Sepolia testnet with an interactive demo.

---

## Governor Integration

The standard is designed to work with any governance framework, but we provide informative examples for the most common one: OpenZeppelin Governor.

**`GovernorAgentDelegation`** extends `AgentDelegation` to bridge with `IVotes`:
- On `delegateToAgent()`: stores the delegator's current IVotes delegatee for later restoration
- On `revokeDelegation()`: emits an event advising the delegator to restore their previous delegation
- The delegator calls `token.delegate(operator)` externally — required because `IVotes.delegate()` uses `msg.sender`

**`GovernorResolver`** automates credibility resolution:
- Reads `IGovernor.state()` to determine proposal outcome
- Maps Succeeded/Executed → positive (1), Defeated/Canceled/Expired → negative (0)
- Reverts for non-finalized proposals (Pending, Active, Queued)
- Anyone can call `resolve()` since the outcome is deterministic from on-chain state

**These are non-normative examples.** The standard itself does not require OpenZeppelin Governor — it works with any governance framework that uses proposal IDs.

---

## Security Considerations

We identified and addressed 10 security threats in the specification. Here are the most critical:

**Agent Collusion.** A single operator could register multiple agents to amplify influence. The mitigation: the `operator` field is publicly visible in `IAgentRegistry`, allowing delegators to identify same-operator agents. Governance frameworks should weight credibility by operator diversity.

**Sybil Resistance.** Since `registerAgent` is permissionless, an adversary could register many agents. Mitigations include registration fees, weighting by operator on-chain history, and requiring minimum prediction volume before credibility is considered meaningful.

**Oracle Manipulation.** If the resolver is compromised, credibility scores become meaningless. The specification enforces that resolvers are separate from agent operators. Implementations should use trusted multisigs or on-chain Governor state for resolution.

**Commit-Reveal Front-Running.** A MEV searcher could observe a `commitRationale` transaction and front-run it. This does not compromise the scheme (the front-runner does not know the preimage), but could cause the legitimate transaction to revert. Mitigations include private mempools (Flashbots Protect) and keying commitments on `(agentId, proposalId)`.

**Prompt Injection via Proposals.** Malicious proposal descriptions could contain instructions designed to manipulate LLM-based agents. The specification recommends treating proposal text as untrusted input and using `escalate()` as a safety valve when anomalous content is detected.

---

## The Bigger Picture

This standard is not about replacing human governance with AI. It is about making AI participation **visible, constrained, and accountable**.

**Improved participation.** AI agents can analyze every proposal, not just the ones that make headlines. They bridge the attention gap that leads to low voter turnout and governance capture.

**Transparent AI involvement.** When an AI agent votes, it is on-chain and identifiable. Governance participants can see exactly how much influence AI agents have and who operates them.

**Human sovereignty preserved.** Expiring delegations, preference constraints, and escalation mechanisms ensure humans retain ultimate control. The agent serves the delegator, not the other way around.

**Cross-DAO trust networks.** An agent that builds credibility in one DAO carries that reputation to others. This creates a competitive market for AI governance quality — agents that consistently make good predictions attract more delegations.

**Standardized interoperability.** Instead of each DAO building proprietary AI integration, a common interface enables shared tooling, shared auditing, and shared trust.

> *We cannot exclude AI from governance. But we can define the rules for how it participates. This EIP is the first draft of those rules.*

---

## Get Involved

This EIP is a draft. We welcome feedback, co-authors, and implementations.

- **Read the full specification**: [ERC AI Agent Governance Interface](https://erc-ai-governance.tokamak.network)
- **Try the Sepolia demo**: [Interactive Demo](https://erc-ai-governance.tokamak.network/demo)
- **View the source code**: [GitHub Repository](https://github.com/nicetokamak/tokamak-dao-agent)
- **Join the discussion**: [Ethereum Magicians Forum](https://ethereum-magicians.org/t/erc-ai-agent-governance-interface)

The reference implementation includes 98 tests across 6 test suites. Deploy on your testnet. Build on top of it. Tell us what is missing.

**What we especially want to hear:**
1. What friction do you foresee integrating this with existing Governor deployments?
2. Is commit-reveal rationale integrity worth the gas cost, or should it be L2-only?
3. What risks do you see in cross-DAO credibility portability?

AI agents are coming to governance whether we standardize or not. Let us make sure they come transparently.

---

*This EIP was authored by Thomas Shin. The specification, reference implementation, and tests are released under CC0.*
