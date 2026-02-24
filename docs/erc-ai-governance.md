---
title: AI Agent Governance Interface
description: Interfaces for AI agent registration, delegation, evaluation commitment, and credibility tracking in DAOs
author: Tokamak Network (@nicetokamak)
discussions-to: https://ethereum-magicians.org/t/erc-ai-agent-governance-interface
status: Draft
type: Standards Track
category: ERC
created: 2026-02-24
requires: 5805, 4824
---

## Abstract

This ERC defines four Solidity interfaces that enable AI agents to participate in DAO governance transparently and accountably:

1. **`IAIAgentRegistry`** — On-chain registration of AI agents with off-chain metadata
2. **`IAIDelegation`** — Preference-based voting delegation to AI agents with expiry and escalation
3. **`IEvaluationCommitment`** — Commit-reveal scheme for tamper-proof proposal evaluations
4. **`ICredibilityRegistry`** — Cross-DAO credibility tracking based on prediction accuracy

Together, these interfaces provide the minimal on-chain primitives needed for any DAO to integrate AI agents as governance participants while preserving human oversight, transparency, and accountability.

## Motivation

### The Attention Bottleneck in DAO Governance

DAOs suffer from chronic voter apathy. Most token holders lack the time or expertise to evaluate every proposal, leading to low participation rates and governance capture by small, active minorities. AI agents can bridge this gap by analyzing proposals, providing evaluations, and voting on behalf of delegators — but only if their participation is transparent and accountable.

### Current Problems

1. **No standard identity for AI agents.** AI agents participate in governance today through regular EOAs, indistinguishable from human participants. There is no way to know if a voter is an AI, who operates it, or what model it uses.

2. **ERC-5805 delegation lacks AI-specific constraints.** `delegate(address)` is permanent and unconditional. Delegating to an AI agent requires expiry (delegation MUST NOT be permanent), preference constraints (the delegator's values and risk tolerance), and escalation (the agent should defer to the human on low-confidence decisions).

3. **No evaluation integrity guarantees.** AI agents can observe voting outcomes and retroactively fabricate evaluations that appear prescient. Without a commit-reveal mechanism, there is no way to verify that an evaluation was formed independently.

4. **No cross-DAO reputation.** An AI agent that consistently makes accurate predictions in one DAO has no portable credibility. Each DAO treats every agent as a blank slate, preventing informed delegation decisions.

### Why Now

- Vitalik Buterin proposed "AI stewards" for DAO governance (February 2026), generating significant community interest in formalizing AI governance participation.
- NEAR Foundation is actively developing AI delegate voting, signaling that cross-chain AI governance is imminent.
- AI agents are already participating in governance informally through regular addresses, making standardization urgent before fragmented approaches calcify.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Interface: `IAIAgentRegistry`

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
- `agentURI` MUST point to a JSON document conforming to the AgentProfile schema defined in this ERC.
- `isActiveAgent` MUST return `false` for unregistered agent IDs.

### Interface: `IAIDelegation`

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
    event Escalated(bytes32 indexed delegationId, uint256 indexed proposalId, string reason);

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
    function escalate(bytes32 delegationId, uint256 proposalId, string calldata reason) external;
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

### Interface: `IEvaluationCommitment`

Implements a commit-reveal scheme for AI agent evaluations.

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

interface IEvaluationCommitment {
    event EvaluationCommitted(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        bytes32 commitHash,
        uint256 timestamp
    );
    event EvaluationRevealed(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        string evaluationURI
    );

    /// @notice Commit evaluation hash before voting ends
    /// @param commitHash keccak256(abi.encodePacked(evaluationURI, salt))
    function commitEvaluation(
        bytes32 agentId,
        uint256 proposalId,
        bytes32 commitHash
    ) external;

    /// @notice Reveal evaluation after voting ends
    function revealEvaluation(
        bytes32 agentId,
        uint256 proposalId,
        string calldata evaluationURI,
        bytes32 salt
    ) external;

    /// @notice Get commitment for an agent-proposal pair
    function getCommitment(bytes32 agentId, uint256 proposalId)
        external view returns (bytes32 commitHash, uint256 timestamp);

    /// @notice Check if an evaluation has been revealed
    function isRevealed(bytes32 agentId, uint256 proposalId) external view returns (bool);
}
```

**Requirements:**

- `commitEvaluation` MUST only be callable by the agent's operator.
- `commitEvaluation` MUST revert if a commitment already exists for the same (agentId, proposalId) pair.
- `revealEvaluation` MUST verify that `keccak256(abi.encodePacked(evaluationURI, salt))` equals the committed hash.
- `revealEvaluation` MUST revert if no commitment exists or if the evaluation has already been revealed.
- Implementations SHOULD enforce that commitments are made before the proposal's voting period ends and reveals after.

### Interface: `ICredibilityRegistry`

Tracks AI agent prediction accuracy across DAOs.

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
    /// @param verdict 0=REJECT, 1=ABSTAIN, 2=NEEDS_REVIEW, 3=APPROVE
    /// @param score Confidence score 0-100
    function recordPrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 verdict,
        uint256 score
    ) external;

    /// @notice Resolve prediction against actual outcome
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
- `recordPrediction` MUST revert if `verdict > 3` or `score > 100`.
- `recordPrediction` MUST revert if a prediction already exists for the same (agentId, proposalId) pair.
- `resolvePrediction` MUST compute the credibility delta according to the following matrix:

| Confidence | Correct | Delta |
|-----------|---------|-------|
| High (score >= 70 or score <= 30) | Yes | +3 |
| Low (30 < score < 70) | Yes | +1 |
| High | No | -2 |
| Low | No | -1 |

- Verdict direction: `APPROVE` (3) and `NEEDS_REVIEW` (2) are "positive"; `REJECT` (0) and `ABSTAIN` (1) are "negative".
- A prediction is "correct" if the verdict direction matches the actual outcome direction.
- `getCredibility` MUST return cumulative scores across all resolved predictions.

### Off-Chain Metadata Schemas

The following JSON schemas define the off-chain data referenced by on-chain URIs. These follow the pattern established by ERC-4824's `daoURI`.

#### AgentProfile JSON

Referenced by `IAIAgentRegistry.agentURI()`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["name", "version", "type", "model", "operator"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Human-readable agent name"
    },
    "version": {
      "type": "string",
      "description": "Semantic version of the agent"
    },
    "type": {
      "type": "string",
      "enum": ["criterion", "meta", "delegate"],
      "description": "Agent role: criterion evaluator, meta-analyst, or delegate voter"
    },
    "criterionId": {
      "type": "string",
      "description": "For criterion agents, the criterion they evaluate"
    },
    "stakeholder": {
      "type": "object",
      "properties": {
        "type": { "type": "string" },
        "perspective": { "type": "string" }
      }
    },
    "model": {
      "type": "string",
      "description": "LLM model identifier (e.g., 'gpt-5.2', 'claude-opus-4')"
    },
    "operator": {
      "type": "string",
      "description": "Organization or individual operating this agent"
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
  "required": ["criterionWeights", "riskTolerance"],
  "properties": {
    "criterionWeights": {
      "type": "object",
      "description": "Map of criterionId → weight (0-100, sum should be 100)",
      "additionalProperties": { "type": "number" }
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

#### Evaluation JSON

Referenced by `IEvaluationCommitment.revealEvaluation()` via `evaluationURI`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["proposalId", "criterionScores", "finalScore", "verdict"],
  "properties": {
    "proposalId": { "type": "string" },
    "criterionScores": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["score", "evidence", "reasoning"],
        "properties": {
          "score": { "type": "number", "minimum": 0, "maximum": 100 },
          "evidence": { "type": "string" },
          "reasoning": { "type": "string" }
        }
      }
    },
    "lensResults": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "lensId": { "type": "string" },
          "lensName": { "type": "string" },
          "weightedScore": { "type": "number" },
          "verdict": { "type": "string", "enum": ["APPROVE", "NEEDS_REVIEW", "ABSTAIN", "REJECT"] }
        }
      }
    },
    "finalScore": { "type": "number", "minimum": 0, "maximum": 100 },
    "verdict": {
      "type": "string",
      "enum": ["APPROVE", "NEEDS_REVIEW", "ABSTAIN", "REJECT"]
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

We define `IAIDelegation` as a separate interface rather than extending `IVotes` to avoid breaking existing governor contracts. Implementations MAY bridge the two by having `delegateToAgent` internally call `delegate()`.

### Why commit-reveal for evaluations?

Without commit-reveal, an agent can:
1. Wait for the voting outcome.
2. Generate an evaluation that matches the outcome.
3. Claim prescience to build false credibility.

The commit-reveal pattern in `IEvaluationCommitment` prevents this by requiring the evaluation hash to be committed before the outcome is known. The salt prevents rainbow table attacks against the hash.

### Why an asymmetric credibility delta?

The delta matrix `(+3, +1, -2, -1)` is deliberately asymmetric:
- **High-confidence correct predictions (+3)** deserve strong reward because they demonstrate genuine analytical capability.
- **High-confidence wrong predictions (-2)** are penalized more than low-confidence wrong predictions (-1) because confident mistakes are more damaging to delegators.
- The asymmetry incentivizes agents to express honest confidence levels rather than always hedging.

This matrix is codified as a MUST in the specification to ensure cross-DAO credibility scores are comparable.

### Why `bytes32` agent IDs instead of addresses?

- **Deterministic**: `keccak256(operator, nonce)` allows offline ID computation.
- **Collision-resistant**: 256-bit space eliminates ID conflicts.
- **Separation of concerns**: The agent ID is distinct from the operator address, supporting multi-agent operators.

## Backwards Compatibility

### ERC-5805 (Voting with Delegation)

This ERC is complementary to ERC-5805, not a replacement. `IAIDelegation` operates alongside `IVotes`:
- Implementations MAY internally call `IVotes.delegate()` when `delegateToAgent()` is called, bridging AI delegation into existing governor contracts.
- Existing governor contracts continue to function without modification.

### ERC-4824 (Common Interfaces for DAOs)

This ERC follows the URI pattern established by ERC-4824:
- `agentURI` follows the same model as `daoURI`.
- Off-chain metadata schemas use JSON following the ERC-4824 convention.
- A DAO's `daoURI` MAY include references to its registered AI agents.

### ERC-1202 (Voting Interface)

`ICredibilityRegistry` does not modify the voting interface but adds a transparency layer:
- AI agents' predictions are recorded alongside their votes.
- Post-resolution, anyone can verify whether the agent's evaluation matched the outcome.

## Reference Implementation

A complete reference implementation is provided in the `contracts/src/governance/` directory:

- `AIAgentRegistry.sol` — Agent registration with deterministic IDs
- `AIDelegation.sol` — Delegation with expiry, auto-revocation, and escalation
- `EvaluationCommitment.sol` — Commit-reveal with hash verification
- `CredibilityRegistry.sol` — Prediction recording and delta computation

The off-chain components (evaluation engine, aggregation, credibility tracking) are implemented in the GovLens project as pure TypeScript functions that produce the JSON schemas defined in this ERC.

## Security Considerations

### Agent Collusion

Multiple AI agents operated by the same entity could coordinate to manipulate credibility scores or voting outcomes. Mitigations:
- The `operator` field in `IAIAgentRegistry` is publicly visible, allowing delegators to identify same-operator agents.
- Implementations SHOULD consider weighting credibility by operator diversity.
- Governance frameworks SHOULD set maximum voting power caps for AI-delegated votes.

### Oracle Manipulation

`ICredibilityRegistry.resolvePrediction()` requires an `actualOutcome` parameter. If the resolver is compromised, credibility scores become meaningless. Mitigations:
- Implementations SHOULD restrict resolution to a trusted oracle or governance multisig.
- Resolved outcomes SHOULD be verifiable against on-chain proposal state (e.g., `IGovernor.state()`).
- A time-delayed resolution with a challenge period is RECOMMENDED for high-stakes DAOs.

### Metadata Integrity

`agentURI`, `preferencesURI`, and `evaluationURI` point to off-chain data that can be modified after the on-chain reference is set. Mitigations:
- Content-addressed URIs (IPFS, Arweave) are RECOMMENDED over mutable HTTP URIs.
- `IEvaluationCommitment`'s commit-reveal ensures evaluation content is fixed at commit time.
- Implementations MAY store a content hash on-chain alongside the URI.

### Privacy Concerns

Agent evaluations may reveal proprietary analysis methods. Mitigations:
- The commit-reveal pattern delays full disclosure until after voting ends.
- Agents MAY omit internal reasoning from the evaluation JSON, including only scores and evidence summaries.
- Zero-knowledge proofs for evaluation verification are a potential future extension.

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
