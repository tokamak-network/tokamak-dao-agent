// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {ICredibilityRegistry} from "./ICredibilityRegistry.sol";
import {IAIAgentRegistry} from "./IAIAgentRegistry.sol";

/// @title CredibilityRegistry
/// @notice Reference implementation of ICredibilityRegistry.
/// @dev Credibility delta matrix (mirrors GovLens off-chain logic):
///      - High confidence (score >= 70 or <= 30) + correct = +3
///      - Low confidence  (30 < score < 70)      + correct = +1
///      - High confidence + wrong = -2
///      - Low confidence  + wrong = -1
///      Verdict direction: APPROVE/NEEDS_REVIEW → positive, REJECT/ABSTAIN → negative
contract CredibilityRegistry is ICredibilityRegistry {
    struct Prediction {
        uint8 verdict;      // 0=REJECT, 1=ABSTAIN, 2=NEEDS_REVIEW, 3=APPROVE
        uint256 score;      // 0-100
        bool exists;
        bool resolved;
        int8 delta;
    }

    struct AgentCredibility {
        int256 totalScore;
        uint256 totalPredictions;
    }

    IAIAgentRegistry public immutable registry;

    /// @notice (agentId, proposalId) → Prediction
    mapping(bytes32 => mapping(uint256 => Prediction)) internal _predictions;

    /// @notice agentId → cumulative credibility
    mapping(bytes32 => AgentCredibility) internal _credibility;

    error NotAgentOperator(bytes32 agentId, address caller);
    error AgentNotActive(bytes32 agentId);
    error PredictionExists(bytes32 agentId, uint256 proposalId);
    error PredictionNotFound(bytes32 agentId, uint256 proposalId);
    error AlreadyResolved(bytes32 agentId, uint256 proposalId);
    error InvalidVerdict(uint8 verdict);
    error InvalidScore(uint256 score);
    error InvalidOutcome(uint8 outcome);

    constructor(address _registry) {
        registry = IAIAgentRegistry(_registry);
    }

    modifier onlyAgentOperator(bytes32 agentId) {
        address operator = registry.agentOperator(agentId);
        if (msg.sender != operator) revert NotAgentOperator(agentId, msg.sender);
        _;
    }

    /// @inheritdoc ICredibilityRegistry
    function recordPrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 verdict,
        uint256 score
    ) external onlyAgentOperator(agentId) {
        if (!registry.isActiveAgent(agentId)) revert AgentNotActive(agentId);
        if (verdict > 3) revert InvalidVerdict(verdict);
        if (score > 100) revert InvalidScore(score);
        if (_predictions[agentId][proposalId].exists) revert PredictionExists(agentId, proposalId);

        _predictions[agentId][proposalId] = Prediction({
            verdict: verdict,
            score: score,
            exists: true,
            resolved: false,
            delta: 0
        });

        emit PredictionRecorded(agentId, proposalId, verdict, score);
    }

    /// @inheritdoc ICredibilityRegistry
    function resolvePrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 actualOutcome
    ) external onlyAgentOperator(agentId) {
        if (actualOutcome > 1) revert InvalidOutcome(actualOutcome);

        Prediction storage p = _predictions[agentId][proposalId];
        if (!p.exists) revert PredictionNotFound(agentId, proposalId);
        if (p.resolved) revert AlreadyResolved(agentId, proposalId);

        int8 delta = _computeDelta(p.verdict, p.score, actualOutcome);

        p.resolved = true;
        p.delta = delta;

        _credibility[agentId].totalScore += int256(delta);
        _credibility[agentId].totalPredictions += 1;

        emit PredictionResolved(agentId, proposalId, delta);
    }

    /// @inheritdoc ICredibilityRegistry
    function getCredibility(bytes32 agentId)
        external view returns (int256 totalScore, uint256 totalPredictions)
    {
        AgentCredibility storage c = _credibility[agentId];
        return (c.totalScore, c.totalPredictions);
    }

    /// @inheritdoc ICredibilityRegistry
    function getPrediction(bytes32 agentId, uint256 proposalId)
        external view returns (uint8 verdict, uint256 score, bool resolved, int8 delta)
    {
        Prediction storage p = _predictions[agentId][proposalId];
        return (p.verdict, p.score, p.resolved, p.delta);
    }

    /// @dev Compute credibility delta matching GovLens off-chain logic
    ///      High confidence: score >= 70 OR score <= 30
    ///      Verdict direction: APPROVE(3)/NEEDS_REVIEW(2) → positive, others → negative
    function _computeDelta(uint8 verdict, uint256 score, uint8 actualOutcome) internal pure returns (int8) {
        bool highConf = score >= 70 || score <= 30;

        // Verdict direction: APPROVE(3) and NEEDS_REVIEW(2) are "positive"
        bool predictedPositive = verdict >= 2;

        // Actual outcome: 1 = positive, 0 = negative
        bool actualPositive = actualOutcome == 1;

        bool correct = predictedPositive == actualPositive;

        if (correct && highConf) return 3;
        if (correct && !highConf) return 1;
        if (!correct && highConf) return -2;
        return -1;
    }
}
