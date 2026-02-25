// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IAIAgentRegistry} from "./IAIAgentRegistry.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title AIAgentRegistry
/// @notice Reference implementation of IAIAgentRegistry.
/// @dev Agent IDs are deterministic: keccak256(abi.encodePacked(operator, nonce)).
///      Only the operator can update or deactivate their agent.
contract AIAgentRegistry is IAIAgentRegistry, ERC165 {
    struct Agent {
        address operator;
        string metadataURI;
        bool active;
    }

    /// @notice Operator address → registration nonce (for deterministic agent IDs)
    mapping(address => uint256) public operatorNonce;

    /// @notice Agent ID → Agent data
    mapping(bytes32 => Agent) internal _agents;

    error AgentNotFound(bytes32 agentId);
    error NotOperator(bytes32 agentId, address caller);
    error EmptyURI();

    modifier onlyOperator(bytes32 agentId) {
        if (_agents[agentId].operator != msg.sender) {
            revert NotOperator(agentId, msg.sender);
        }
        _;
    }

    /// @inheritdoc IAIAgentRegistry
    function registerAgent(string calldata metadataURI) external returns (bytes32 agentId) {
        if (bytes(metadataURI).length == 0) revert EmptyURI();

        uint256 nonce = operatorNonce[msg.sender]++;
        agentId = keccak256(abi.encodePacked(msg.sender, nonce));

        _agents[agentId] = Agent({
            operator: msg.sender,
            metadataURI: metadataURI,
            active: true
        });

        emit AgentRegistered(agentId, msg.sender, metadataURI);
    }

    /// @inheritdoc IAIAgentRegistry
    function updateAgent(bytes32 agentId, string calldata metadataURI) external onlyOperator(agentId) {
        if (bytes(metadataURI).length == 0) revert EmptyURI();
        if (!_agents[agentId].active) revert AgentNotFound(agentId);

        _agents[agentId].metadataURI = metadataURI;

        emit AgentUpdated(agentId, metadataURI);
    }

    /// @inheritdoc IAIAgentRegistry
    function deactivateAgent(bytes32 agentId) external onlyOperator(agentId) {
        if (!_agents[agentId].active) revert AgentNotFound(agentId);

        _agents[agentId].active = false;

        emit AgentDeactivated(agentId);
    }

    /// @inheritdoc IAIAgentRegistry
    function agentURI(bytes32 agentId) external view returns (string memory) {
        if (_agents[agentId].operator == address(0)) revert AgentNotFound(agentId);
        return _agents[agentId].metadataURI;
    }

    /// @inheritdoc IAIAgentRegistry
    function agentOperator(bytes32 agentId) external view returns (address) {
        if (_agents[agentId].operator == address(0)) revert AgentNotFound(agentId);
        return _agents[agentId].operator;
    }

    /// @inheritdoc IAIAgentRegistry
    function isActiveAgent(bytes32 agentId) external view returns (bool) {
        return _agents[agentId].active;
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IAIAgentRegistry).interfaceId || super.supportsInterface(interfaceId);
    }
}
