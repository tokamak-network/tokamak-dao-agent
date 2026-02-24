// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/// @title ICredibilityRegistry
/// @notice On-chain tracking of AI agent prediction accuracy across DAOs.
/// @dev Enables cross-DAO credibility:
///      - Agent operator records prediction (verdict + confidence score) for a proposal
///      - A designated resolver determines actual outcome and resolves the prediction
///      - Cumulative credibility score tracks accuracy over time
///
///      Implementations SHOULD satisfy these behavioral properties:
///      - High-confidence correct predictions yield greater reward than low-confidence correct
///      - High-confidence incorrect predictions yield greater penalty than low-confidence incorrect
///
///      Verdict values are application-defined. Implementations following Governor conventions
///      SHOULD use: 0=Against, 1=For, 2=Abstain (matching IGovernor.VoteType).
///      Implementations MAY define additional verdict values.
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
