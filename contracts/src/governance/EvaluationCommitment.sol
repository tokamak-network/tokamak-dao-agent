// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IEvaluationCommitment} from "./IEvaluationCommitment.sol";
import {IAIAgentRegistry} from "./IAIAgentRegistry.sol";

/// @title EvaluationCommitment
/// @notice Reference implementation of IEvaluationCommitment.
/// @dev Commit-reveal prevents post-hoc evaluation manipulation:
///      1. Agent commits keccak256(evaluationURI, salt) during voting
///      2. Agent reveals evaluationURI + salt after voting ends
///      3. Contract verifies hash match
contract EvaluationCommitment is IEvaluationCommitment {
    struct Commitment {
        bytes32 commitHash;
        uint256 timestamp;
        bool revealed;
        string evaluationURI;
    }

    IAIAgentRegistry public immutable registry;

    /// @notice (agentId, proposalId) → Commitment
    mapping(bytes32 => mapping(uint256 => Commitment)) internal _commitments;

    error AgentNotActive(bytes32 agentId);
    error NotAgentOperator(bytes32 agentId, address caller);
    error AlreadyCommitted(bytes32 agentId, uint256 proposalId);
    error NoCommitment(bytes32 agentId, uint256 proposalId);
    error AlreadyRevealed(bytes32 agentId, uint256 proposalId);
    error HashMismatch(bytes32 expected, bytes32 actual);

    constructor(address _registry) {
        registry = IAIAgentRegistry(_registry);
    }

    modifier onlyAgentOperator(bytes32 agentId) {
        address operator = registry.agentOperator(agentId);
        if (msg.sender != operator) revert NotAgentOperator(agentId, msg.sender);
        _;
    }

    /// @inheritdoc IEvaluationCommitment
    function commitEvaluation(
        bytes32 agentId,
        uint256 proposalId,
        bytes32 commitHash
    ) external onlyAgentOperator(agentId) {
        if (!registry.isActiveAgent(agentId)) revert AgentNotActive(agentId);
        if (_commitments[agentId][proposalId].timestamp != 0) {
            revert AlreadyCommitted(agentId, proposalId);
        }

        _commitments[agentId][proposalId] = Commitment({
            commitHash: commitHash,
            timestamp: block.timestamp,
            revealed: false,
            evaluationURI: ""
        });

        emit EvaluationCommitted(agentId, proposalId, commitHash, block.timestamp);
    }

    /// @inheritdoc IEvaluationCommitment
    function revealEvaluation(
        bytes32 agentId,
        uint256 proposalId,
        string calldata evaluationURI,
        bytes32 salt
    ) external onlyAgentOperator(agentId) {
        Commitment storage c = _commitments[agentId][proposalId];
        if (c.timestamp == 0) revert NoCommitment(agentId, proposalId);
        if (c.revealed) revert AlreadyRevealed(agentId, proposalId);

        bytes32 computedHash = keccak256(abi.encodePacked(evaluationURI, salt));
        if (computedHash != c.commitHash) revert HashMismatch(c.commitHash, computedHash);

        c.revealed = true;
        c.evaluationURI = evaluationURI;

        emit EvaluationRevealed(agentId, proposalId, evaluationURI);
    }

    /// @inheritdoc IEvaluationCommitment
    function getCommitment(bytes32 agentId, uint256 proposalId)
        external view returns (bytes32 commitHash, uint256 timestamp)
    {
        Commitment storage c = _commitments[agentId][proposalId];
        return (c.commitHash, c.timestamp);
    }

    /// @inheritdoc IEvaluationCommitment
    function isRevealed(bytes32 agentId, uint256 proposalId) external view returns (bool) {
        return _commitments[agentId][proposalId].revealed;
    }
}
