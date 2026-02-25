// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IAIAgentRegistry} from "./IAIAgentRegistry.sol";

/// @title IRationaleCommitment
/// @notice Commit-reveal scheme for AI agent proposal rationales.
/// @dev Prevents post-hoc rationale manipulation:
///      1. Agent commits hash of rationale BEFORE voting ends
///      2. Agent reveals full rationale AFTER voting ends
///      3. Anyone can verify the reveal matches the commitment
interface IRationaleCommitment is IERC165 {
    /// @notice Emitted when a rationale hash is committed
    event RationaleCommitted(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        bytes32 commitHash,
        uint256 timestamp
    );

    /// @notice Emitted when a rationale is revealed
    event RationaleRevealed(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        string rationaleURI
    );

    /// @notice Get the registry contract
    /// @return The IAIAgentRegistry contract
    function registry() external view returns (IAIAgentRegistry);

    /// @notice Commit rationale hash before voting ends
    /// @param agentId The agent committing the rationale
    /// @param proposalId The proposal being evaluated
    /// @param commitHash keccak256(abi.encodePacked(rationaleURI, salt))
    function commitRationale(
        bytes32 agentId,
        uint256 proposalId,
        bytes32 commitHash
    ) external;

    /// @notice Reveal rationale after voting ends
    /// @param agentId The agent revealing the rationale
    /// @param proposalId The proposal that was evaluated
    /// @param rationaleURI URI to the full Rationale JSON
    /// @param salt Salt used in the commitment
    function revealRationale(
        bytes32 agentId,
        uint256 proposalId,
        string calldata rationaleURI,
        bytes32 salt
    ) external;

    /// @notice Get commitment for an agent-proposal pair
    /// @param agentId The agent identifier
    /// @param proposalId The proposal identifier
    /// @return commitHash The committed hash
    /// @return timestamp When the commitment was made
    function getCommitment(bytes32 agentId, uint256 proposalId)
        external view returns (bytes32 commitHash, uint256 timestamp);

    /// @notice Check if a rationale has been revealed
    /// @param agentId The agent identifier
    /// @param proposalId The proposal identifier
    /// @return True if revealed
    function isRevealed(bytes32 agentId, uint256 proposalId) external view returns (bool);
}
