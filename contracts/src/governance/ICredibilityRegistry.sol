// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/// @title ICredibilityRegistry
/// @notice On-chain tracking of AI agent prediction accuracy across DAOs.
/// @dev Enables cross-DAO credibility:
///      - Agent records prediction (verdict + score) for a proposal
///      - After outcome is known, prediction is resolved
///      - Cumulative credibility score tracks accuracy over time
///      Delta matrix: highConf+correct=+3, lowConf+correct=+1, highConf+wrong=-2, lowConf+wrong=-1
interface ICredibilityRegistry {
    /// @notice Emitted when an agent records a prediction
    event PredictionRecorded(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        uint8 verdict,
        uint256 score
    );

    /// @notice Emitted when a prediction is resolved against actual outcome
    event PredictionResolved(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        int8 delta
    );

    /// @notice Record agent's prediction for a proposal
    /// @param agentId The agent making the prediction
    /// @param proposalId The proposal being predicted
    /// @param verdict 0=REJECT, 1=ABSTAIN, 2=NEEDS_REVIEW, 3=APPROVE
    /// @param score Confidence score 0-100
    function recordPrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 verdict,
        uint256 score
    ) external;

    /// @notice Resolve prediction against actual outcome
    /// @param agentId The agent whose prediction is being resolved
    /// @param proposalId The proposal that was resolved
    /// @param actualOutcome 0=negative, 1=positive
    function resolvePrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 actualOutcome
    ) external;

    /// @notice Get agent's cumulative credibility
    /// @param agentId The agent identifier
    /// @return totalScore Cumulative credibility score (can be negative)
    /// @return totalPredictions Number of resolved predictions
    function getCredibility(bytes32 agentId)
        external view returns (int256 totalScore, uint256 totalPredictions);

    /// @notice Get a specific prediction record
    /// @param agentId The agent identifier
    /// @param proposalId The proposal identifier
    /// @return verdict The predicted verdict
    /// @return score The confidence score
    /// @return resolved Whether the prediction has been resolved
    /// @return delta The credibility delta (0 if unresolved)
    function getPrediction(bytes32 agentId, uint256 proposalId)
        external view returns (uint8 verdict, uint256 score, bool resolved, int8 delta);
}
