// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IAIDelegation} from "./IAIDelegation.sol";
import {IAIAgentRegistry} from "./IAIAgentRegistry.sol";

/// @title AIDelegation
/// @notice Reference implementation of IAIDelegation.
/// @dev Each account can have at most one active AI delegation at a time.
///      Delegations expire automatically and can be revoked by the delegator.
///      Only the agent's operator can call escalate().
contract AIDelegation is IAIDelegation {
    struct Delegation {
        address delegator;
        bytes32 agentId;
        uint256 expiry;
        string preferencesURI;
        bool active;
    }

    IAIAgentRegistry public immutable registry;

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
        registry = IAIAgentRegistry(_registry);
    }

    /// @inheritdoc IAIDelegation
    function delegateToAgent(
        bytes32 agentId,
        uint256 expiry,
        string calldata preferencesURI
    ) external returns (bytes32 delegationId) {
        if (!registry.isActiveAgent(agentId)) revert AgentNotActive(agentId);
        if (expiry <= block.timestamp) revert ExpiryInPast(expiry);

        // Revoke existing delegation if any
        bytes32 existing = activeDelegation[msg.sender];
        if (existing != bytes32(0) && _delegations[existing].active) {
            _delegations[existing].active = false;
            emit AIDelegationRevoked(existing);
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

        emit AIDelegationCreated(msg.sender, agentId, delegationId, expiry);
    }

    /// @inheritdoc IAIDelegation
    function revokeDelegation(bytes32 delegationId) external {
        Delegation storage d = _delegations[delegationId];
        if (d.delegator == address(0)) revert DelegationNotFound(delegationId);
        if (d.delegator != msg.sender) revert NotDelegator(delegationId, msg.sender);

        d.active = false;
        if (activeDelegation[msg.sender] == delegationId) {
            activeDelegation[msg.sender] = bytes32(0);
        }

        emit AIDelegationRevoked(delegationId);
    }

    /// @inheritdoc IAIDelegation
    function getAIDelegation(address account) external view returns (
        bytes32 agentId,
        uint256 expiry,
        string memory preferencesURI
    ) {
        bytes32 delegationId = activeDelegation[account];
        if (delegationId == bytes32(0)) return (bytes32(0), 0, "");

        Delegation storage d = _delegations[delegationId];
        if (!d.active || d.expiry <= block.timestamp) return (bytes32(0), 0, "");

        return (d.agentId, d.expiry, d.preferencesURI);
    }

    /// @inheritdoc IAIDelegation
    function escalate(bytes32 delegationId, uint256 proposalId, string calldata reason) external {
        Delegation storage d = _delegations[delegationId];
        if (d.delegator == address(0)) revert DelegationNotFound(delegationId);
        if (!d.active || d.expiry <= block.timestamp) revert DelegationExpired(delegationId);

        // Only the agent's operator can escalate
        address operator = registry.agentOperator(d.agentId);
        if (msg.sender != operator) revert NotAgentOperator(delegationId, msg.sender);

        emit Escalated(delegationId, proposalId, reason);
    }
}
