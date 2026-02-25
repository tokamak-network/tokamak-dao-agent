// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {ICredibilityRegistry} from "../ICredibilityRegistry.sol";

/// @title GovernorResolver — Automatic Credibility Resolution Example
/// @author Thomas Shin
/// @notice INFORMATIVE EXAMPLE — NOT part of the ERC specification.
///
/// @dev Reads IGovernor.state() to determine proposal outcome and resolves
///      credibility predictions automatically. Deploy this contract and pass
///      its address as the `resolver` to CredibilityRegistry.
///
///      Outcome mapping:
///        - Executed / Succeeded → positive (1)
///        - Defeated / Canceled / Expired → negative (0)
///        - Pending / Active / Queued → reverts (not finalized)
///
///      Security note: Anyone can call resolve() because the outcome is
///      deterministic (based on immutable governor state). There is no
///      attack vector — the resolver merely reads on-chain truth.
contract GovernorResolver {
    IGovernor public immutable governor;

    error ProposalNotFinalized(uint256 governorProposalId, IGovernor.ProposalState currentState);

    constructor(address _governor) {
        governor = IGovernor(_governor);
    }

    /// @notice Resolve a credibility prediction using the governor's proposal state
    /// @param credibility The CredibilityRegistry where the prediction was recorded
    /// @param agentId The agent whose prediction is being resolved
    /// @param proposalId The proposalId used in the CredibilityRegistry
    /// @param governorProposalId The proposalId in the Governor contract
    function resolve(
        ICredibilityRegistry credibility,
        bytes32 agentId,
        uint256 proposalId,
        uint256 governorProposalId
    ) external {
        IGovernor.ProposalState s = governor.state(governorProposalId);

        uint8 outcome;
        if (s == IGovernor.ProposalState.Executed || s == IGovernor.ProposalState.Succeeded) {
            outcome = 1; // positive
        } else if (
            s == IGovernor.ProposalState.Defeated
                || s == IGovernor.ProposalState.Canceled
                || s == IGovernor.ProposalState.Expired
        ) {
            outcome = 0; // negative
        } else {
            revert ProposalNotFinalized(governorProposalId, s);
        }

        credibility.resolvePrediction(agentId, proposalId, outcome);
    }
}
