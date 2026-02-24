---
title: AI Agent Governance Interface
description: Interfaces for AI agent registration, delegation, rationale commitment, and credibility tracking in DAOs
author: Tokamak Network (@nicetokamak)
discussions-to: https://ethereum-magicians.org/t/erc-ai-agent-governance-interface
status: Draft
type: Standards Track
category: ERC
created: 2026-02-24
requires: 5805, 4824
---

## Abstract

This ERC defines a modular set of Solidity interfaces that enable AI agents to participate in DAO governance transparently and accountably. The interfaces are organized into two tiers:

**Core (MUST implement):**

1. **`IAIAgentRegistry`** — On-chain registration of AI agents with off-chain metadata
2. **`IAIDelegation`** — Preference-based voting delegation to AI agents with expiry and escalation

**Extensions (MAY implement):**

3. **`IRationaleCommitment`** — Commit-reveal scheme for tamper-proof proposal rationales
4. **`ICredibilityRegistry`** — Cross-DAO credibility tracking based on prediction accuracy

Together, these interfaces provide the minimal on-chain primitives needed for any DAO to integrate AI agents as governance participants while preserving human oversight, transparency, and accountability. The core interfaces enable agent identity and delegation; the extensions add integrity guarantees and reputation tracking.

## Motivation

### The Attention Bottleneck in DAO Governance

DAOs suffer from chronic voter apathy. Most token holders lack the time or expertise to evaluate every proposal, leading to low participation rates and governance capture by small, active minorities. AI agents can bridge this gap by analyzing proposals, providing rationales, and voting on behalf of delegators — but only if their participation is transparent and accountable.

### Current Problems

1. **No standard identity for AI agents.** AI agents participate in governance today through regular EOAs, indistinguishable from human participants. There is no way to know if a voter is an AI, who operates it, or what model it uses.

2. **ERC-5805 delegation lacks AI-specific constraints.** `delegate(address)` is permanent and unconditional. Delegating to an AI agent requires expiry (delegation MUST NOT be permanent), preference constraints (the delegator's values and risk tolerance), and escalation (the agent should defer to the human on low-confidence decisions).

3. **No rationale integrity guarantees.** AI agents can observe voting outcomes and retroactively fabricate rationales that appear prescient. Without a commit-reveal mechanism, there is no way to verify that a rationale was formed independently.

4. **No cross-DAO reputation.** An AI agent that consistently makes accurate predictions in one DAO has no portable credibility. Each DAO treats every agent as a blank slate, preventing informed delegation decisions.

### Why Now

- Vitalik Buterin proposed "AI stewards" for DAO governance (February 2026), generating significant community interest in formalizing AI governance participation.
- NEAR Foundation is actively developing AI delegate voting, signaling that cross-chain AI governance is imminent.
- AI agents are already participating in governance informally through regular addresses, making standardization urgent before fragmented approaches calcify.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Core Interface: `IAIAgentRegistry`

Provides on-chain registration and lifecycle management for AI agents.

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

interface IAIAgentRegistry {
    event AgentRegistered(bytes32 indexed agentId, address indexed operator, string metadataURI);
    event AgentUpdated(bytes32 indexed agentId, string metadataURI);
    event AgentDeactivated(bytes32 indexed agentId);

    /// @notice Register an AI agent with metadata URI
    /// @param metadataURI URI pointing to AgentProfile JSON
    /// @return agentId Unique agent identifier
    function registerAgent(string calldata metadataURI) external returns (bytes32 agentId);

    /// @notice Update an existing agent's metadata URI
    function updateAgent(bytes32 agentId, string calldata metadataURI) external;

    /// @notice Deactivate an agent
    function deactivateAgent(bytes32 agentId) external;

    /// @notice Get agent metadata URI
    function agentURI(bytes32 agentId) external view returns (string memory);

    /// @notice Get agent operator address
    function agentOperator(bytes32 agentId) external view returns (address);

    /// @notice Check if agent is active
    function isActiveAgent(bytes32 agentId) external view returns (bool);
}
```

**Requirements:**

- `registerAgent` MUST return a deterministic `agentId` derived from `msg.sender` and a nonce.
- `registerAgent` MUST revert if `metadataURI` is empty.
- `updateAgent` and `deactivateAgent` MUST revert if called by any address other than the agent's operator.
- `agentURI` SHOULD point to a JSON document conforming to the AgentProfile schema defined in this ERC.
- `isActiveAgent` MUST return `false` for unregistered agent IDs.

### Core Interface: `IAIDelegation`

Extends the concept of ERC-5805 delegation with AI-specific constraints.

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

interface IAIDelegation {
    event AIDelegationCreated(
        address indexed delegator,
        bytes32 indexed agentId,
        bytes32 delegationId,
        uint256 expiry
    );
    event AIDelegationRevoked(bytes32 indexed delegationId);
    event Escalated(bytes32 indexed delegationId, uint256 indexed proposalId, string reasonURI);

    /// @notice Delegate voting power to an AI agent with constraints
    /// @param agentId Registered agent from IAIAgentRegistry
    /// @param expiry Delegation expiry timestamp (MUST be > block.timestamp)
    /// @param preferencesURI URI to DelegationPreferences JSON
    function delegateToAgent(
        bytes32 agentId,
        uint256 expiry,
        string calldata preferencesURI
    ) external returns (bytes32 delegationId);

    /// @notice Revoke an active delegation
    function revokeDelegation(bytes32 delegationId) external;

    /// @notice Get active delegation for an account
    function getAIDelegation(address account) external view returns (
        bytes32 agentId,
        uint256 expiry,
        string memory preferencesURI
    );

    /// @notice Agent escalates a decision to the human delegator
    /// @param reasonURI URI to a JSON document explaining the escalation
    function escalate(bytes32 delegationId, uint256 proposalId, string calldata reasonURI) external;
}
```

**Requirements:**

- `delegateToAgent` MUST revert if the agent is not active in the `IAIAgentRegistry`.
- `delegateToAgent` MUST revert if `expiry <= block.timestamp`.
- `delegateToAgent` SHOULD allow at most one active delegation per account. If the account already has an active delegation, the implementation SHOULD revoke it automatically.
- `revokeDelegation` MUST revert if called by any address other than the original delegator.
- `getAIDelegation` MUST return zero values if the delegation has expired or been revoked.
- `escalate` MUST only be callable by the agent's operator (as registered in `IAIAgentRegistry`).
- `escalate` MUST emit the `Escalated` event. Off-chain systems SHOULD notify the human delegator.
- Escalation signals that the agent declines to vote on a specific proposal and returns the decision to the delegator. Escalation does NOT cancel any previously cast vote. It SHOULD be interpreted as a signal for the delegator to vote directly on future proposals.

### Extension Interface: `IRationaleCommitment`

Implements a commit-reveal scheme for AI agent rationales. This extension is OPTIONAL — implementations MAY deploy it alongside the core interfaces for additional transparency.

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

interface IRationaleCommitment {
    event RationaleCommitted(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        bytes32 commitHash,
        uint256 timestamp
    );
    event RationaleRevealed(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        string rationaleURI
    );

    /// @notice Commit rationale hash before voting ends
    /// @param commitHash keccak256(abi.encodePacked(rationaleURI, salt))
    function commitRationale(
        bytes32 agentId,
        uint256 proposalId,
        bytes32 commitHash
    ) external;

    /// @notice Reveal rationale after voting ends
    function revealRationale(
        bytes32 agentId,
        uint256 proposalId,
        string calldata rationaleURI,
        bytes32 salt
    ) external;

    /// @notice Get commitment for an agent-proposal pair
    function getCommitment(bytes32 agentId, uint256 proposalId)
        external view returns (bytes32 commitHash, uint256 timestamp);

    /// @notice Check if a rationale has been revealed
    function isRevealed(bytes32 agentId, uint256 proposalId) external view returns (bool);
}
```

**Requirements:**

- `commitRationale` MUST only be callable by the agent's operator.
- `commitRationale` MUST revert if a commitment already exists for the same (agentId, proposalId) pair.
- `revealRationale` MUST verify that `keccak256(abi.encodePacked(rationaleURI, salt))` equals the committed hash.
- `revealRationale` MUST revert if no commitment exists or if the rationale has already been revealed.
- Implementations SHOULD enforce that commitments are made before the proposal's voting period ends and reveals after.

### Extension Interface: `ICredibilityRegistry`

Tracks AI agent prediction accuracy across DAOs. This extension is OPTIONAL — implementations MAY deploy it for cross-DAO reputation tracking.

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

interface ICredibilityRegistry {
    event PredictionRecorded(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        uint8 verdict,
        uint256 score
    );
    event PredictionResolved(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        int8 delta
    );

    /// @notice Record agent's prediction for a proposal
    /// @param verdict Application-defined verdict value
    /// @param score Confidence score 0-100
    function recordPrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 verdict,
        uint256 score
    ) external;

    /// @notice Resolve prediction against actual outcome
    /// @dev MUST only be callable by a designated resolver, NOT the agent operator
    /// @param actualOutcome 0=negative, 1=positive
    function resolvePrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 actualOutcome
    ) external;

    /// @notice Get agent's cumulative credibility
    function getCredibility(bytes32 agentId)
        external view returns (int256 totalScore, uint256 totalPredictions);

    /// @notice Get a specific prediction record
    function getPrediction(bytes32 agentId, uint256 proposalId)
        external view returns (uint8 verdict, uint256 score, bool resolved, int8 delta);
}
```

**Requirements:**

- `recordPrediction` MUST only be callable by the agent's operator.
- `recordPrediction` MUST revert if `score > 100`.
- `recordPrediction` MUST revert if a prediction already exists for the same (agentId, proposalId) pair.
- `resolvePrediction` MUST only be callable by a designated resolver, NOT the agent's operator. This separation prevents agents from self-reporting favorable outcomes.
- `getCredibility` MUST return cumulative scores across all resolved predictions.

**Behavioral Properties (SHOULD):**

Implementations SHOULD satisfy the following behavioral properties for credibility delta computation:

- High-confidence correct predictions SHOULD yield greater reward than low-confidence correct predictions.
- High-confidence incorrect predictions SHOULD yield greater penalty than low-confidence incorrect predictions.

These properties incentivize agents to express honest confidence levels. The reference implementation provides a configurable delta matrix satisfying these properties.

**Verdict Encoding (RECOMMENDED):**

Verdict values are application-defined (`uint8`). Implementations following the Governor convention SHOULD use: `0=Against`, `1=For`, `2=Abstain` (matching `IGovernor.VoteType`). Implementations MAY define additional verdict values for richer semantics (e.g., `3=NeedsReview`).

### Off-Chain Metadata Schemas

The following JSON schemas define the off-chain data referenced by on-chain URIs. These follow the pattern established by ERC-4824's `daoURI`.

Implementations SHOULD conform to these schemas. Implementations MAY extend them with additional fields. All schemas include a `version` field for future compatibility.

#### AgentProfile JSON

Referenced by `IAIAgentRegistry.agentURI()`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "name", "model", "operator"],
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Schema version"
    },
    "name": {
      "type": "string",
      "description": "Human-readable agent name"
    },
    "model": {
      "type": "string",
      "description": "LLM model identifier (e.g., 'gpt-5.2', 'claude-opus-4')"
    },
    "operator": {
      "type": "string",
      "description": "Organization or individual operating this agent"
    },
    "description": {
      "type": "string",
      "description": "Human-readable description of the agent's purpose and methodology"
    }
  }
}
```

#### DelegationPreferences JSON

Referenced by `IAIDelegation.delegateToAgent()` via `preferencesURI`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "riskTolerance"],
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Schema version"
    },
    "riskTolerance": {
      "type": "string",
      "enum": ["conservative", "moderate", "aggressive"]
    },
    "escalation": {
      "type": "object",
      "properties": {
        "confidenceThreshold": {
          "type": "number",
          "description": "Score below which the agent should escalate to the human"
        },
        "alwaysEscalateFor": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Proposal categories that always require human approval"
        }
      }
    },
    "principles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Natural language principles guiding the agent's decisions"
    }
  }
}
```

#### Rationale JSON

Referenced by `IRationaleCommitment.revealRationale()` via `rationaleURI`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "proposalId", "verdict"],
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Schema version"
    },
    "proposalId": { "type": "string" },
    "verdict": {
      "type": "string",
      "description": "The agent's verdict. Values are application-defined."
    },
    "reasoning": {
      "type": "string",
      "description": "Human-readable explanation of the agent's decision"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Confidence score for this evaluation"
    },
    "evidence": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Supporting evidence or references"
    }
  }
}
```

## Rationale

### Why on-chain registration instead of off-chain identity?

On-chain registration via `IAIAgentRegistry` provides:
- **Immutable audit trail**: Anyone can verify when an agent was registered and by whom.
- **Composability**: Other contracts (delegation, credibility) can programmatically verify agent existence.
- **Accountability**: The operator address creates a clear chain of responsibility.

Off-chain identity systems (DID, ENS) are complementary but insufficient alone because they lack the synchronous composability needed by delegation and credibility contracts.

### Why not extend ERC-5805 directly?

ERC-5805's `delegate(address delegatee)` signature is too simple for AI delegation, which requires:
- **Expiry**: Permanent delegation to an AI is unsafe. The model may degrade, the operator may become negligent, or the delegator's preferences may change.
- **Preferences**: A human delegates with intent ("I care about security and fiscal conservatism"). `delegate(address)` cannot express this.
- **Escalation**: The agent must be able to defer decisions back to the human. This requires a dedicated on-chain event that off-chain systems can index.

We define `IAIDelegation` as a separate interface rather than extending `IVotes` to avoid breaking existing governor contracts. Implementations MAY bridge the two internally:
- `delegateToAgent()` MAY internally call `IVotes.delegate()` using the agent's operator address as the delegatee.
- The agent's operator address SHOULD be usable as an `IVotes` delegatee.
- Existing Governor contracts require no modification to work with this ERC.

### Why Core + Extension architecture?

The four interfaces address distinct concerns at different adoption levels:
- **Core**: Agent identity and delegation are fundamental — any DAO integrating AI agents needs both.
- **Extensions**: Commit-reveal and credibility are valuable but not universally required. A small DAO may trust its agents without formal credibility tracking. A private DAO may not need commit-reveal.

This separation follows the pattern of ERC-20 (core) + ERC-2612 (permit extension) and enables incremental adoption.

### Why commit-reveal for rationales?

Without commit-reveal, an agent can:
1. Wait for the voting outcome.
2. Generate a rationale that matches the outcome.
3. Claim prescience to build false credibility.

The commit-reveal pattern in `IRationaleCommitment` prevents this by requiring the rationale hash to be committed before the outcome is known. The salt prevents rainbow table attacks against the hash.

### Why behavioral properties instead of a fixed delta matrix?

A successful ERC defines *what* (interfaces) not *how* (algorithms). Just as ERC-4626 specifies rounding direction without prescribing yield formulas, this ERC specifies behavioral properties for credibility deltas without prescribing specific values:

- "High confidence + correct > low confidence + correct" (SHOULD)
- "High confidence + wrong penalty > low confidence + wrong penalty" (SHOULD)

This allows different DAOs to calibrate their credibility systems while ensuring cross-DAO comparability at the interface level. The reference implementation provides a configurable default (`+3/+1/-2/-1`).

### Why a separate resolver role for credibility?

If the agent's operator can both record predictions and resolve outcomes, they can trivially game credibility scores by reporting favorable outcomes. The resolver role separation follows the oracle pattern — the entity determining truth must be independent of the entity being evaluated.

### Why `reasonURI` instead of `string reason`?

Following the ERC-4824 pattern, escalation reasons are referenced via URI rather than stored on-chain as strings. This reduces gas costs (a URI is typically ~50 bytes vs. potentially kilobytes of explanation) while enabling rich off-chain content including structured JSON.

### Why `bytes32` agent IDs instead of addresses?

- **Deterministic**: `keccak256(operator, nonce)` allows offline ID computation.
- **Collision-resistant**: 256-bit space eliminates ID conflicts.
- **Separation of concerns**: The agent ID is distinct from the operator address, supporting multi-agent operators.

## Backwards Compatibility

### ERC-5805 (Voting with Delegation)

This ERC is complementary to ERC-5805, not a replacement. `IAIDelegation` operates alongside `IVotes`:

- Implementations MAY internally call `IVotes.delegate()` when `delegateToAgent()` is called, bridging AI delegation into existing governor contracts.
- The agent's operator address SHOULD be usable as an `IVotes` delegatee. This allows the agent to cast votes through the standard Governor flow without any Governor contract modifications.
- Existing governor contracts continue to function without modification.
- `revokeDelegation()` SHOULD also revoke the underlying `IVotes` delegation if bridging is used.

### ERC-4824 (Common Interfaces for DAOs)

This ERC follows the URI pattern established by ERC-4824:
- `agentURI` follows the same model as `daoURI`.
- Off-chain metadata schemas use JSON following the ERC-4824 convention.
- A DAO's `daoURI` MAY include references to its registered AI agents.
- `reasonURI` in `escalate()` follows the same content-addressed URI pattern.

### ERC-1202 (Voting Interface)

`ICredibilityRegistry` does not modify the voting interface but adds a transparency layer:
- AI agents' predictions are recorded alongside their votes.
- Post-resolution, anyone can verify whether the agent's rationale matched the outcome.

## Reference Implementation

A complete reference implementation is provided in the `contracts/src/governance/` directory:

- `AIAgentRegistry.sol` — Agent registration with deterministic IDs
- `AIDelegation.sol` — Delegation with expiry, auto-revocation, and escalation via URI
- `RationaleCommitment.sol` — Commit-reveal with hash verification
- `CredibilityRegistry.sol` — Prediction recording with configurable delta computation and resolver role separation

The `CredibilityRegistry` reference implementation accepts constructor parameters for:
- **Delta values**: Configurable `[highConfCorrect, lowConfCorrect, highConfWrong, lowConfWrong]` (default: `[+3, +1, -2, -1]`)
- **Confidence threshold**: Score value that separates high/low confidence (default: 70)
- **Verdict threshold**: Verdict value above which predictions are considered "positive direction" (default: 1, matching Governor's `For`)
- **Resolver address**: Independent address authorized to resolve predictions

## Security Considerations

### Agent Collusion

Multiple AI agents operated by the same entity could coordinate to manipulate credibility scores or voting outcomes. Mitigations:
- The `operator` field in `IAIAgentRegistry` is publicly visible, allowing delegators to identify same-operator agents.
- Implementations SHOULD consider weighting credibility by operator diversity.
- Governance frameworks SHOULD set maximum voting power caps for AI-delegated votes.

### Oracle Manipulation (Resolver Compromise)

`ICredibilityRegistry.resolvePrediction()` requires a designated resolver address. If the resolver is compromised, credibility scores become meaningless. Mitigations:
- The resolver MUST be separate from agent operators (enforced at the interface level).
- Implementations SHOULD use a trusted oracle, governance multisig, or on-chain proposal state (e.g., `IGovernor.state()`) for resolution.
- A time-delayed resolution with a challenge period is RECOMMENDED for high-stakes DAOs.

### Self-Resolution Prevention

Agent operators MUST NOT be able to resolve their own predictions. The `ICredibilityRegistry` specification requires that `resolvePrediction` is callable only by a designated resolver. This prevents agents from reporting favorable outcomes to inflate their credibility.

### Metadata Integrity

`agentURI`, `preferencesURI`, and `rationaleURI` point to off-chain data that can be modified after the on-chain reference is set. Mitigations:
- Content-addressed URIs (IPFS, Arweave) are RECOMMENDED over mutable HTTP URIs.
- `IRationaleCommitment`'s commit-reveal ensures rationale content is fixed at commit time.
- Implementations MAY store a content hash on-chain alongside the URI.

### Privacy Concerns

Agent rationales may reveal proprietary analysis methods. Mitigations:
- The commit-reveal pattern delays full disclosure until after voting ends.
- Agents MAY omit internal reasoning from the rationale JSON, including only verdicts and evidence summaries.
- Zero-knowledge proofs for rationale verification are a potential future extension.

### Credibility Gaming

Agents could submit predictions only for proposals where the outcome is predictable, inflating their credibility. Mitigations:
- Implementations SHOULD require predictions for all proposals in a DAO, not selectively.
- The `totalPredictions` counter in `getCredibility()` allows delegators to assess volume alongside score.
- A minimum prediction count SHOULD be required before credibility is considered meaningful.

### Delegation Expiry Edge Cases

If a delegation expires during an active voting period, the agent may have already voted. Mitigations:
- Implementations SHOULD check delegation validity at vote time, not just at delegation time.
- The `escalate()` function provides a safety valve for borderline cases.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
