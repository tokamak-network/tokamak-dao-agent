// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/// @title IEvaluationCommitment
/// @notice Commit-reveal scheme for AI agent proposal evaluations.
/// @dev Prevents post-hoc evaluation manipulation:
///      1. Agent commits hash of evaluation BEFORE voting ends
///      2. Agent reveals full evaluation AFTER voting ends
///      3. Anyone can verify the reveal matches the commitment
interface IEvaluationCommitment {
    /// @notice Emitted when an evaluation hash is committed
    event EvaluationCommitted(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        bytes32 commitHash,
        uint256 timestamp
    );

    /// @notice Emitted when an evaluation is revealed
    event EvaluationRevealed(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        string evaluationURI
    );

    /// @notice Commit evaluation hash before voting ends
    /// @param agentId The agent committing the evaluation
    /// @param proposalId The proposal being evaluated
    /// @param commitHash keccak256(abi.encodePacked(evaluationURI, salt))
    function commitEvaluation(
        bytes32 agentId,
        uint256 proposalId,
        bytes32 commitHash
    ) external;

    /// @notice Reveal evaluation after voting ends
    /// @param agentId The agent revealing the evaluation
    /// @param proposalId The proposal that was evaluated
    /// @param evaluationURI URI to the full Evaluation JSON
    /// @param salt Salt used in the commitment
    function revealEvaluation(
        bytes32 agentId,
        uint256 proposalId,
        string calldata evaluationURI,
        bytes32 salt
    ) external;

    /// @notice Get commitment for an agent-proposal pair
    /// @param agentId The agent identifier
    /// @param proposalId The proposal identifier
    /// @return commitHash The committed hash
    /// @return timestamp When the commitment was made
    function getCommitment(bytes32 agentId, uint256 proposalId)
        external view returns (bytes32 commitHash, uint256 timestamp);

    /// @notice Check if an evaluation has been revealed
    /// @param agentId The agent identifier
    /// @param proposalId The proposal identifier
    /// @return True if revealed
    function isRevealed(bytes32 agentId, uint256 proposalId) external view returns (bool);
}
