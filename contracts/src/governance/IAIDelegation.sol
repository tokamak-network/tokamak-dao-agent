// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/// @title IAIDelegation
/// @notice Preference-based delegation of voting power to AI agents.
/// @dev Extends the concept of ERC-5805 delegation with:
///      - Expiry timestamps (delegations MUST NOT be permanent)
///      - Preference constraints via off-chain JSON URI
///      - Escalation mechanism for low-confidence decisions
///
///      Integration with ERC-5805:
///      - Implementations MAY bridge to IVotes.delegate() internally
///      - The agent's operator address SHOULD be usable as an IVotes delegatee
///      - Existing Governor contracts require no modification
interface IAIDelegation {
    /// @notice Emitted when a delegation to an AI agent is created
    event AIDelegationCreated(
        address indexed delegator,
        bytes32 indexed agentId,
        bytes32 delegationId,
        uint256 expiry
    );

    /// @notice Emitted when a delegation is revoked
    event AIDelegationRevoked(bytes32 indexed delegationId);

    /// @notice Emitted when an agent escalates a decision to the human delegator
    /// @dev The reasonURI points to a JSON document explaining the escalation.
    ///      Escalation signals that the agent declines to vote on this proposal
    ///      and returns the decision to the delegator. It does NOT cancel any
    ///      previously cast vote. Off-chain systems SHOULD notify the delegator.
    event Escalated(bytes32 indexed delegationId, uint256 indexed proposalId, string reasonURI);

    /// @notice Delegate voting power to an AI agent with constraints
    /// @param agentId Registered agent from IAIAgentRegistry
    /// @param expiry Delegation expiry timestamp (MUST be > block.timestamp)
    /// @param preferencesURI URI to DelegationPreferences JSON
    /// @return delegationId Unique delegation identifier
    function delegateToAgent(
        bytes32 agentId,
        uint256 expiry,
        string calldata preferencesURI
    ) external returns (bytes32 delegationId);

    /// @notice Revoke an active delegation
    /// @param delegationId The delegation to revoke
    function revokeDelegation(bytes32 delegationId) external;

    /// @notice Get active delegation for an account
    /// @param account The delegator address
    /// @return agentId The delegated agent
    /// @return expiry Delegation expiry timestamp
    /// @return preferencesURI URI to preferences JSON
    function getAIDelegation(address account) external view returns (
        bytes32 agentId,
        uint256 expiry,
        string memory preferencesURI
    );

    /// @notice Agent escalates a decision to the human delegator
    /// @dev Only callable by the agent's operator.
    ///      Escalation indicates the agent declines to vote on the given proposal
    ///      and defers the decision back to the human delegator.
    /// @param delegationId The delegation under which this escalation occurs
    /// @param proposalId The proposal being escalated
    /// @param reasonURI URI to a JSON document explaining the escalation reason (ERC-4824 pattern)
    function escalate(bytes32 delegationId, uint256 proposalId, string calldata reasonURI) external;
}
