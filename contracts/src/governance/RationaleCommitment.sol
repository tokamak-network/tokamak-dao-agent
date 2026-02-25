// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IRationaleCommitment} from "./IRationaleCommitment.sol";
import {IAgentRegistry} from "./IAgentRegistry.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title RationaleCommitment
/// @notice Reference implementation of IRationaleCommitment.
/// @dev Commit-reveal prevents post-hoc rationale manipulation:
///      1. Agent commits keccak256(rationaleURI, salt) during voting
///      2. Agent reveals rationaleURI + salt after voting ends
///      3. Contract verifies hash match
contract RationaleCommitment is IRationaleCommitment, ERC165 {
    struct Commitment {
        bytes32 commitHash;
        uint256 timestamp;
        bool revealed;
        string rationaleURI;
    }

    IAgentRegistry public immutable registry;

    /// @notice (agentId, proposalId) → Commitment
    mapping(bytes32 => mapping(uint256 => Commitment)) internal _commitments;

    error AgentNotActive(bytes32 agentId);
    error NotAgentOperator(bytes32 agentId, address caller);
    error AlreadyCommitted(bytes32 agentId, uint256 proposalId);
    error NoCommitment(bytes32 agentId, uint256 proposalId);
    error AlreadyRevealed(bytes32 agentId, uint256 proposalId);
    error HashMismatch(bytes32 expected, bytes32 actual);

    constructor(address _registry) {
        registry = IAgentRegistry(_registry);
    }

    modifier onlyAgentOperator(bytes32 agentId) {
        address operator = registry.agentOperator(agentId);
        if (msg.sender != operator) revert NotAgentOperator(agentId, msg.sender);
        _;
    }

    /// @inheritdoc IRationaleCommitment
    function commitRationale(
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
            rationaleURI: ""
        });

        emit RationaleCommitted(agentId, proposalId, commitHash, block.timestamp);
    }

    /// @inheritdoc IRationaleCommitment
    function revealRationale(
        bytes32 agentId,
        uint256 proposalId,
        string calldata rationaleURI,
        bytes32 salt
    ) external onlyAgentOperator(agentId) {
        Commitment storage c = _commitments[agentId][proposalId];
        if (c.timestamp == 0) revert NoCommitment(agentId, proposalId);
        if (c.revealed) revert AlreadyRevealed(agentId, proposalId);

        bytes32 computedHash = keccak256(abi.encodePacked(rationaleURI, salt));
        if (computedHash != c.commitHash) revert HashMismatch(c.commitHash, computedHash);

        c.revealed = true;
        c.rationaleURI = rationaleURI;

        emit RationaleRevealed(agentId, proposalId, rationaleURI);
    }

    /// @inheritdoc IRationaleCommitment
    function getCommitment(bytes32 agentId, uint256 proposalId)
        external view returns (bytes32 commitHash, uint256 timestamp)
    {
        Commitment storage c = _commitments[agentId][proposalId];
        return (c.commitHash, c.timestamp);
    }

    /// @inheritdoc IRationaleCommitment
    function isRevealed(bytes32 agentId, uint256 proposalId) external view returns (bool) {
        return _commitments[agentId][proposalId].revealed;
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IRationaleCommitment).interfaceId || super.supportsInterface(interfaceId);
    }
}
