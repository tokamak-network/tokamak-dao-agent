// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AIAgentRegistry} from "../../src/governance/AIAgentRegistry.sol";
import {CredibilityRegistry} from "../../src/governance/CredibilityRegistry.sol";
import {GovernorAIDelegation} from "../../src/governance/examples/GovernorAIDelegation.sol";
import {GovernorResolver} from "../../src/governance/examples/GovernorResolver.sol";
import {MockERC20Votes} from "./mocks/MockERC20Votes.sol";
import {MockGovernor} from "./mocks/MockGovernor.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/**
 * @title GovernorBridgeTest
 * @notice Tests for Governor bridge examples (GovernorAIDelegation + GovernorResolver).
 *         Demonstrates the IVotes bridge pattern and automatic credibility resolution.
 * Run with: forge test --match-contract GovernorBridgeTest -vvv
 */
contract GovernorBridgeTest is Test {
    MockERC20Votes public token;
    MockGovernor public governor;
    AIAgentRegistry public registry;
    GovernorAIDelegation public delegation;
    GovernorResolver public resolverContract;
    CredibilityRegistry public credibility;

    address operator = makeAddr("operator");
    address delegator = makeAddr("delegator");

    bytes32 agentId;

    uint256 constant VOTING_DELAY = 1;
    uint256 constant VOTING_PERIOD = 100;
    uint256 constant QUORUM = 1e18;
    uint256 constant TOKEN_AMOUNT = 100e18;

    event GovernorDelegationAdvised(bytes32 indexed delegationId, address indexed delegator, address indexed operator);
    event GovernorDelegationRestoreAdvised(bytes32 indexed delegationId, address indexed delegator, address previousDelegatee);

    function setUp() public {
        token = new MockERC20Votes();
        governor = new MockGovernor(IVotes(address(token)), VOTING_DELAY, VOTING_PERIOD, QUORUM);
        registry = new AIAgentRegistry();
        delegation = new GovernorAIDelegation(address(registry), address(token));
        resolverContract = new GovernorResolver(address(governor));
        credibility = new CredibilityRegistry(
            address(registry),
            address(resolverContract),
            70,
            1,
            [int8(3), int8(1), int8(-2), int8(-1)]
        );

        vm.prank(operator);
        agentId = registry.registerAgent("ipfs://QmAgent");

        token.mint(delegator, TOKEN_AMOUNT);
        vm.prank(delegator);
        token.delegate(delegator); // self-delegate for initial checkpoint
        vm.roll(block.number + 1);
    }

    // ─── GovernorAIDelegation: IVotes Bridge ───

    function test_delegateBridge_votingPowerTransferAndRestore() public {
        uint256 expiry = block.timestamp + 30 days;

        // Delegate to agent — records previous delegatee
        vm.prank(delegator);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, "ipfs://QmPrefs");

        // Verify previous delegatee stored
        assertEq(delegation.previousDelegatee(delegationId), delegator);

        // Delegator transfers IVotes to operator (external step)
        vm.prank(delegator);
        token.delegate(operator);
        vm.roll(block.number + 1);

        // Verify operator has voting power
        assertEq(token.getVotes(operator), TOKEN_AMOUNT);
        assertEq(token.getVotes(delegator), 0);

        // Create proposal and vote
        (uint256 proposalId,) = _createProposal("Bridge Test Proposal");
        vm.roll(block.number + VOTING_DELAY + 1);

        vm.prank(operator);
        governor.castVote(proposalId, 1); // For

        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Succeeded));

        // Revoke delegation — emits restore advisory
        vm.prank(delegator);
        delegation.revokeDelegation(delegationId);

        // Restore voting power (external step)
        vm.prank(delegator);
        token.delegate(delegator);
        vm.roll(block.number + 1);

        assertEq(token.getVotes(delegator), TOKEN_AMOUNT);
        assertEq(token.getVotes(operator), 0);
    }

    function test_delegateBridge_emitsAdvisoryEvents() public {
        uint256 expiry = block.timestamp + 30 days;
        bytes32 expectedId = keccak256(abi.encodePacked(delegator, uint256(0)));

        vm.expectEmit(true, true, true, true);
        emit GovernorDelegationAdvised(expectedId, delegator, operator);

        vm.prank(delegator);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, "ipfs://QmPrefs");

        vm.expectEmit(true, true, false, true);
        emit GovernorDelegationRestoreAdvised(delegationId, delegator, delegator);

        vm.prank(delegator);
        delegation.revokeDelegation(delegationId);
    }

    // ─── GovernorResolver: Automatic Credibility Resolution ───

    function test_governorResolver_succeededProposal() public {
        // Setup: delegate IVotes to operator
        vm.prank(delegator);
        token.delegate(operator);
        vm.roll(block.number + 1);

        // Agent records prediction: For with high confidence
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, 1, 85);

        // Create proposal, vote For, pass it
        (uint256 govProposalId,) = _createProposal("Resolver Succeeded Test");
        vm.roll(block.number + VOTING_DELAY + 1);

        vm.prank(operator);
        governor.castVote(govProposalId, 1);

        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint256(governor.state(govProposalId)), uint256(IGovernor.ProposalState.Succeeded));

        // Resolve via GovernorResolver
        resolverContract.resolve(credibility, agentId, 1, govProposalId);

        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 3); // high confidence correct → +3
        assertEq(totalPredictions, 1);
    }

    function test_governorResolver_defeatedProposal() public {
        // Agent records prediction: For with high confidence
        vm.prank(operator);
        credibility.recordPrediction(agentId, 2, 1, 80);

        // Create proposal, nobody votes → Defeated
        (uint256 govProposalId,) = _createProposal("Resolver Defeated Test");
        vm.roll(block.number + VOTING_DELAY + VOTING_PERIOD + 2);
        assertEq(uint256(governor.state(govProposalId)), uint256(IGovernor.ProposalState.Defeated));

        // Resolve: agent predicted For but proposal was Defeated → negative outcome
        resolverContract.resolve(credibility, agentId, 2, govProposalId);

        (int256 totalScore,) = credibility.getCredibility(agentId);
        assertEq(totalScore, -2); // high confidence wrong → -2
    }

    function test_governorResolver_revertsOnActiveProposal() public {
        (uint256 govProposalId,) = _createProposal("Still Active");
        vm.roll(block.number + VOTING_DELAY + 1); // Active state

        vm.expectRevert(
            abi.encodeWithSelector(
                GovernorResolver.ProposalNotFinalized.selector,
                govProposalId,
                IGovernor.ProposalState.Active
            )
        );
        resolverContract.resolve(credibility, agentId, 3, govProposalId);
    }

    // ─── Helpers ───

    function _createProposal(string memory description) internal returns (uint256 proposalId, bytes32 descHash) {
        address[] memory targets = new address[](1);
        targets[0] = address(0);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        proposalId = governor.propose(targets, values, calldatas, description);
        descHash = keccak256(bytes(description));
    }
}
