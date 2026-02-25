// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IAgentDelegation} from "./IAgentDelegation.sol";
import {IAgentRegistry} from "./IAgentRegistry.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title AgentDelegation
/// @notice Reference implementation of IAgentDelegation.
/// @dev Each account can have at most one active AI delegation at a time.
///      Delegations expire automatically and can be revoked by the delegator.
///      Only the agent's operator can call escalate().
contract AgentDelegation is IAgentDelegation, ERC165 {
    struct Delegation {
        address delegator;
        bytes32 agentId;
        uint256 expiry;
        string preferencesURI;
        bool active;
    }

    IAgentRegistry public immutable registry;

    /// @notice Delegation ID → Delegation data
    mapping(bytes32 => Delegation) internal _delegations;

    /// @notice Delegator address → active delegation ID (zero if none)
    mapping(address => bytes32) public activeDelegation;

    /// @notice Delegator nonce for deterministic delegation IDs
    mapping(address => uint256) public delegatorNonce;

    error AgentNotActive(bytes32 agentId);
    error ExpiryInPast(uint256 expiry);
    error DelegationNotFound(bytes32 delegationId);
    error NotDelegator(bytes32 delegationId, address caller);
    error NotAgentOperator(bytes32 delegationId, address caller);
    error AlreadyDelegated(address delegator);
    error DelegationExpired(bytes32 delegationId);

    constructor(address _registry) {
        registry = IAgentRegistry(_registry);
    }

    /// @inheritdoc IAgentDelegation
    function delegateToAgent(
        bytes32 agentId,
        uint256 expiry,
        string calldata preferencesURI
    ) public virtual returns (bytes32 delegationId) {
        if (!registry.isActiveAgent(agentId)) revert AgentNotActive(agentId);
        if (expiry <= block.timestamp) revert ExpiryInPast(expiry);

        // Revoke existing delegation if any
        bytes32 existing = activeDelegation[msg.sender];
        if (existing != bytes32(0) && _delegations[existing].active) {
            _delegations[existing].active = false;
            emit AgentDelegationRevoked(existing);
        }

        uint256 nonce = delegatorNonce[msg.sender]++;
        delegationId = keccak256(abi.encodePacked(msg.sender, nonce));

        _delegations[delegationId] = Delegation({
            delegator: msg.sender,
            agentId: agentId,
            expiry: expiry,
            preferencesURI: preferencesURI,
            active: true
        });
        activeDelegation[msg.sender] = delegationId;

        emit AgentDelegationCreated(msg.sender, agentId, delegationId, expiry);
    }

    /// @inheritdoc IAgentDelegation
    function revokeDelegation(bytes32 delegationId) public virtual {
        Delegation storage d = _delegations[delegationId];
        if (d.delegator == address(0)) revert DelegationNotFound(delegationId);
        if (d.delegator != msg.sender) revert NotDelegator(delegationId, msg.sender);

        d.active = false;
        if (activeDelegation[msg.sender] == delegationId) {
            activeDelegation[msg.sender] = bytes32(0);
        }

        emit AgentDelegationRevoked(delegationId);
    }

    /// @inheritdoc IAgentDelegation
    function getAgentDelegation(address account) external view returns (
        bytes32 delegationId,
        bytes32 agentId,
        uint256 expiry,
        string memory preferencesURI
    ) {
        delegationId = activeDelegation[account];
        if (delegationId == bytes32(0)) return (bytes32(0), bytes32(0), 0, "");

        Delegation storage d = _delegations[delegationId];
        if (!d.active || d.expiry <= block.timestamp) return (bytes32(0), bytes32(0), 0, "");

        return (delegationId, d.agentId, d.expiry, d.preferencesURI);
    }

    /// @inheritdoc IAgentDelegation
    function escalate(bytes32 delegationId, uint256 proposalId, string calldata reasonURI) public virtual {
        Delegation storage d = _delegations[delegationId];
        if (d.delegator == address(0)) revert DelegationNotFound(delegationId);
        if (!d.active || d.expiry <= block.timestamp) revert DelegationExpired(delegationId);

        // Only the agent's operator can escalate
        address operator = registry.agentOperator(d.agentId);
        if (msg.sender != operator) revert NotAgentOperator(delegationId, msg.sender);

        emit Escalated(delegationId, proposalId, reasonURI);
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IAgentDelegation).interfaceId || super.supportsInterface(interfaceId);
    }
}
