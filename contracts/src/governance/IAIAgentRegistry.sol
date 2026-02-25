// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title IAIAgentRegistry
/// @notice On-chain registry for AI agents participating in DAO governance.
/// @dev Each agent is identified by a deterministic bytes32 ID derived from operator + nonce.
///      The metadataURI points to an off-chain AgentProfile JSON (model, criteria, stakeholder type).
interface IAIAgentRegistry is IERC165 {
    /// @notice Emitted when a new agent is registered
    event AgentRegistered(bytes32 indexed agentId, address indexed operator, string metadataURI);

    /// @notice Emitted when an agent's metadata URI is updated
    event AgentUpdated(bytes32 indexed agentId, string metadataURI);

    /// @notice Emitted when an agent is deactivated
    event AgentDeactivated(bytes32 indexed agentId);

    /// @notice Register an AI agent with metadata URI
    /// @param metadataURI URI pointing to AgentProfile JSON
    /// @return agentId Unique agent identifier
    function registerAgent(string calldata metadataURI) external returns (bytes32 agentId);

    /// @notice Update an existing agent's metadata URI
    /// @param agentId The agent to update
    /// @param metadataURI New metadata URI
    function updateAgent(bytes32 agentId, string calldata metadataURI) external;

    /// @notice Deactivate an agent
    /// @param agentId The agent to deactivate
    function deactivateAgent(bytes32 agentId) external;

    /// @notice Get agent metadata URI
    /// @param agentId The agent identifier
    /// @return The metadata URI string
    function agentURI(bytes32 agentId) external view returns (string memory);

    /// @notice Get agent operator address
    /// @param agentId The agent identifier
    /// @return The operator address
    function agentOperator(bytes32 agentId) external view returns (address);

    /// @notice Check if agent is active
    /// @param agentId The agent identifier
    /// @return True if the agent is registered and active
    function isActiveAgent(bytes32 agentId) external view returns (bool);
}
