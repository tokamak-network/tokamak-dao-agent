// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";

/// @title MockGovernor
/// @notice Minimal OZ Governor for integration testing.
/// @dev Combines Governor + CountingSimple + Votes + Settings (OZ v4.9.3).
///      Uses block numbers for timekeeping (default behavior).
contract MockGovernor is Governor, GovernorCountingSimple, GovernorVotes, GovernorSettings {
    uint256 private _quorum;

    constructor(
        IVotes _token,
        uint256 initialVotingDelay,
        uint256 initialVotingPeriod,
        uint256 quorumValue
    )
        Governor("MockGovernor")
        GovernorVotes(_token)
        GovernorSettings(initialVotingDelay, initialVotingPeriod, 0)
    {
        _quorum = quorumValue;
    }

    function quorum(uint256) public view override returns (uint256) {
        return _quorum;
    }

    // ─── Required overrides (diamond inheritance) ───

    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }
}
