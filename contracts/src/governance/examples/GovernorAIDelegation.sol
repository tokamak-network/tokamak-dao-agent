// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {AIDelegation} from "../AIDelegation.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @title GovernorAIDelegation — IVotes Bridge Example
/// @author Tokamak Network
/// @notice INFORMATIVE EXAMPLE — NOT part of the ERC specification.
///
/// @dev Extends AIDelegation to bridge AI delegation with ERC-5805 (IVotes).
///      When a delegator creates an AI delegation, this contract:
///        1. Records the delegator's current IVotes delegatee (for restoration)
///        2. Emits an advisory event recommending the delegator call token.delegate(operator)
///
///      The actual IVotes.delegate() call MUST be performed by the delegator externally
///      because delegate() uses msg.sender for the delegator identity.
///
///      Pattern for integrating DAOs:
///        1. delegator calls governorAIDelegation.delegateToAgent(...)
///        2. delegator calls token.delegate(operator)  ← external step
///        3. agent's operator can now vote in Governor with delegator's voting power
///        4. on revocation: delegator calls token.delegate(previousDelegatee) to restore
contract GovernorAIDelegation is AIDelegation {
    IVotes public immutable votingToken;

    /// @notice delegationId → previous IVotes delegatee (stored for restoration on revocation)
    mapping(bytes32 => address) public previousDelegatee;

    /// @notice Emitted to advise the delegator to delegate IVotes to the agent's operator
    event GovernorDelegationAdvised(
        bytes32 indexed delegationId,
        address indexed delegator,
        address indexed operator
    );

    /// @notice Emitted to advise the delegator to restore IVotes delegation to the previous delegatee
    event GovernorDelegationRestoreAdvised(
        bytes32 indexed delegationId,
        address indexed delegator,
        address previousDelegatee
    );

    constructor(address _registry, address _votingToken) AIDelegation(_registry) {
        votingToken = IVotes(_votingToken);
    }

    /// @inheritdoc AIDelegation
    /// @dev Records the delegator's current IVotes delegatee before creating the AI delegation.
    function delegateToAgent(
        bytes32 agentId,
        uint256 expiry,
        string calldata preferencesURI
    ) public override returns (bytes32 delegationId) {
        address operator = registry.agentOperator(agentId);
        address prevDelegatee = votingToken.delegates(msg.sender);

        delegationId = super.delegateToAgent(agentId, expiry, preferencesURI);

        previousDelegatee[delegationId] = prevDelegatee;

        emit GovernorDelegationAdvised(delegationId, msg.sender, operator);
    }

    /// @inheritdoc AIDelegation
    /// @dev Emits advisory event with the previous delegatee address for restoration.
    function revokeDelegation(bytes32 delegationId) public override {
        address prevDelegatee = previousDelegatee[delegationId];

        super.revokeDelegation(delegationId);

        emit GovernorDelegationRestoreAdvised(delegationId, msg.sender, prevDelegatee);
    }
}
