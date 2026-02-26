// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentRegistry} from "../../src/governance/AgentRegistry.sol";
import {AgentDelegation} from "../../src/governance/AgentDelegation.sol";
import {RationaleCommitment} from "../../src/governance/RationaleCommitment.sol";
import {CredibilityRegistry} from "../../src/governance/CredibilityRegistry.sol";
import {MockERC20Votes} from "./mocks/MockERC20Votes.sol";
import {MockGovernor} from "./mocks/MockGovernor.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/**
 * @title IntegrationTest
 * @notice End-to-end integration tests for the ERC Agent Governance Interface.
 *         Tests all 4 contracts working together with an OZ Governor.
 *
 *         These tests serve as the "Test Cases" section required by EIP-1.
 *
 * Run with: forge test --match-contract IntegrationTest -vvv
 */
contract IntegrationTest is Test {
    // ─── Core ERC Contracts ───
    AgentRegistry public registry;
    AgentDelegation public delegation;
    RationaleCommitment public rationale;
    CredibilityRegistry public credibility;

    // ─── Governor Infrastructure ───
    MockERC20Votes public token;
    MockGovernor public governor;

    // ─── Actors ───
    address operator = makeAddr("operator");
    address delegator = makeAddr("delegator");
    address resolver = makeAddr("resolver");

    // ─── State ───
    bytes32 agentId;

    // ─── Constants ───
    uint256 constant VOTING_DELAY = 1; // 1 block
    uint256 constant VOTING_PERIOD = 100; // 100 blocks
    uint256 constant QUORUM = 1e18; // 1 token
    uint256 constant TOKEN_AMOUNT = 100e18;

    // ─── Events (for expectEmit) ───
    event Escalated(bytes32 indexed delegationId, uint256 indexed proposalId, string reasonURI);

    function setUp() public {
        // Deploy Governor infrastructure
        token = new MockERC20Votes();
        governor = new MockGovernor(IVotes(address(token)), VOTING_DELAY, VOTING_PERIOD, QUORUM);

        // Deploy ERC contracts
        registry = new AgentRegistry();
        delegation = new AgentDelegation(address(registry));
        rationale = new RationaleCommitment(address(registry));
        credibility = new CredibilityRegistry(
            address(registry),
            resolver,
            70, // highConfThreshold
            1, // verdictPositiveThreshold (1=For)
            [int8(3), int8(1), int8(-2), int8(-1)] // deltas: +3/+1/-2/-1
        );

        // Register AI agent
        vm.prank(operator);
        agentId = registry.registerAgent("ipfs://QmAgent");
        assertTrue(registry.isActiveAgent(agentId));

        // Setup delegator with tokens + self-delegation
        token.mint(delegator, TOKEN_AMOUNT);
        vm.prank(delegator);
        token.delegate(delegator);
        vm.roll(block.number + 1); // checkpoint in the past
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 1: Full Lifecycle — Register → Delegate → Commit → Vote → Reveal → Resolve
    // ═══════════════════════════════════════════════════════════════

    function test_fullLifecycle_registerDelegateCommitVoteRevealResolve() public {
        // ── Act 1: Agent already registered in setUp ──
        assertEq(registry.agentOperator(agentId), operator);

        // ── Act 2: Delegator → Agent delegation ──
        uint256 expiry = block.timestamp + 30 days;
        vm.prank(delegator);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, "ipfs://QmPrefs");
        assertTrue(delegationId != bytes32(0));

        (, bytes32 retAgent, uint256 retExpiry,) = delegation.getAgentDelegation(delegator);
        assertEq(retAgent, agentId);
        assertEq(retExpiry, expiry);

        // Bridge: delegator transfers IVotes to operator
        vm.prank(delegator);
        token.delegate(operator);
        vm.roll(block.number + 1);
        assertEq(token.getVotes(operator), TOKEN_AMOUNT);

        // ── Act 3: Create proposal + Commit rationale + Record prediction ──
        uint256 proposalId = _createProposal("Upgrade treasury allocation");

        // Commit rationale hash
        string memory rationaleURI = "ipfs://QmRationale1";
        bytes32 salt = keccak256("secret-salt-1");
        bytes32 commitHash = keccak256(abi.encodePacked(rationaleURI, salt));

        vm.prank(operator);
        rationale.commitRationale(agentId, proposalId, commitHash);

        (bytes32 storedHash, uint256 timestamp) = rationale.getCommitment(agentId, proposalId);
        assertEq(storedHash, commitHash);
        assertTrue(timestamp > 0);

        // Record prediction: For with high confidence (85)
        vm.prank(operator);
        credibility.recordPrediction(agentId, proposalId, 1, 85);

        // ── Act 4: Agent operator votes in Governor ──
        vm.roll(block.number + VOTING_DELAY + 1); // Active state

        vm.prank(operator);
        governor.castVote(proposalId, 1); // 1 = For
        assertTrue(governor.hasVoted(proposalId, operator));

        // Roll past voting period
        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Succeeded));

        // ── Act 5: Reveal rationale + Resolve credibility ──
        vm.prank(operator);
        rationale.revealRationale(agentId, proposalId, rationaleURI, salt);
        assertTrue(rationale.isRevealed(agentId, proposalId));

        // Resolve: proposal passed → positive outcome
        vm.prank(resolver);
        credibility.resolvePrediction(agentId, proposalId, 1);

        // Verify: high confidence correct → delta = +3
        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 3);
        assertEq(totalPredictions, 1);

        // Verify prediction record
        (uint8 verdict, uint8 score, bool resolved, int8 delta) = credibility.getPrediction(agentId, proposalId);
        assertEq(verdict, 1);
        assertEq(score, 85);
        assertTrue(resolved);
        assertEq(delta, 3);
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 2: Escalation Path — Agent Defers to Human
    // ═══════════════════════════════════════════════════════════════

    function test_escalationPath_agentDefersToHuman() public {
        uint256 expiry = block.timestamp + 30 days;
        vm.prank(delegator);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, "ipfs://QmPrefs");

        // Note: delegator keeps their own IVotes (self-delegated from setUp).
        // AI delegation is advisory — delegator retains voting power.
        assertTrue(delegationId != bytes32(0));

        // Create proposal
        uint256 proposalId = _createProposal("Controversial treasury change");
        vm.roll(block.number + VOTING_DELAY + 1); // Active

        // Agent decides to escalate (low confidence, controversial proposal)
        string memory reasonURI = "ipfs://QmEscalationReason";

        vm.expectEmit(true, true, false, true);
        emit Escalated(delegationId, proposalId, reasonURI);

        vm.prank(operator);
        delegation.escalate(delegationId, proposalId, reasonURI);

        // Delegator votes directly with their own voting power
        vm.prank(delegator);
        governor.castVote(proposalId, 1); // For

        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Succeeded));
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 3: Delegation Expiry — Automatic Invalidation
    // ═══════════════════════════════════════════════════════════════

    function test_delegationExpiry_automaticInvalidation() public {
        uint256 shortExpiry = block.timestamp + 1 hours;

        vm.prank(delegator);
        delegation.delegateToAgent(agentId, shortExpiry, "ipfs://QmPrefs");

        // Verify active
        (, bytes32 retAgent,,) = delegation.getAgentDelegation(delegator);
        assertEq(retAgent, agentId);

        // Warp past expiry
        vm.warp(shortExpiry + 1);

        // Delegation returns zero values (expired)
        (, retAgent,,) = delegation.getAgentDelegation(delegator);
        assertEq(retAgent, bytes32(0));

        // New delegation can be created
        vm.prank(delegator);
        uint256 newExpiry = block.timestamp + 30 days;
        delegation.delegateToAgent(agentId, newExpiry, "ipfs://QmNewPrefs");

        (, retAgent,,) = delegation.getAgentDelegation(delegator);
        assertEq(retAgent, agentId);
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 4: Multi-Agent — Two Agents on Same Proposal
    // ═══════════════════════════════════════════════════════════════

    function test_multiAgent_twoAgentsSameProposal() public {
        // Register second agent
        address operator2 = makeAddr("operator2");
        vm.prank(operator2);
        bytes32 agentId2 = registry.registerAgent("ipfs://QmAgent2");

        uint256 proposalId = 42;

        // Agent 1: predicts For with high confidence
        vm.prank(operator);
        credibility.recordPrediction(agentId, proposalId, 1, 85);

        // Agent 2: predicts Against with low confidence
        vm.prank(operator2);
        credibility.recordPrediction(agentId2, proposalId, 0, 60);

        // Both commit rationales independently
        vm.prank(operator);
        rationale.commitRationale(agentId, proposalId, keccak256(abi.encodePacked("ipfs://QmR1", bytes32("s1"))));

        vm.prank(operator2);
        rationale.commitRationale(agentId2, proposalId, keccak256(abi.encodePacked("ipfs://QmR2", bytes32("s2"))));

        // Resolve as positive outcome (proposal passed)
        vm.prank(resolver);
        credibility.resolvePrediction(agentId, proposalId, 1);

        vm.prank(resolver);
        credibility.resolvePrediction(agentId2, proposalId, 1);

        // Agent 1: high confidence, correct (For=positive, outcome=positive) → +3
        (int256 score1, uint256 count1) = credibility.getCredibility(agentId);
        assertEq(score1, 3);
        assertEq(count1, 1);

        // Agent 2: low confidence, wrong (Against=negative, outcome=positive) → -1
        (int256 score2, uint256 count2) = credibility.getCredibility(agentId2);
        assertEq(score2, -1);
        assertEq(count2, 1);
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 5: Credibility Accumulation Across Multiple Proposals
    // ═══════════════════════════════════════════════════════════════

    function test_credibilityAccumulation_acrossMultipleProposals() public {
        // Proposal 1: high confidence correct → +3
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, 1, 85);
        vm.prank(resolver);
        credibility.resolvePrediction(agentId, 1, 1);

        // Proposal 2: low confidence correct → +1
        vm.prank(operator);
        credibility.recordPrediction(agentId, 2, 1, 50);
        vm.prank(resolver);
        credibility.resolvePrediction(agentId, 2, 1);

        // Proposal 3: high confidence wrong → -2
        vm.prank(operator);
        credibility.recordPrediction(agentId, 3, 1, 90);
        vm.prank(resolver);
        credibility.resolvePrediction(agentId, 3, 0);

        // Cumulative: 3 + 1 + (-2) = 2
        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 2);
        assertEq(totalPredictions, 3);
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 6: Agent Deactivation — Prevents New Delegations
    // ═══════════════════════════════════════════════════════════════

    function test_agentDeactivation_preventsNewDelegations() public {
        // Deactivate agent
        vm.prank(operator);
        registry.deactivateAgent(agentId);
        assertFalse(registry.isActiveAgent(agentId));

        // Delegation to deactivated agent reverts
        uint256 expiry = block.timestamp + 30 days;
        vm.prank(delegator);
        vm.expectRevert(abi.encodeWithSelector(AgentDelegation.AgentNotActive.selector, agentId));
        delegation.delegateToAgent(agentId, expiry, "ipfs://QmPrefs");

        // Rationale commitment to deactivated agent reverts
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(RationaleCommitment.AgentNotActive.selector, agentId));
        rationale.commitRationale(agentId, 1, keccak256("test"));

        // Prediction recording for deactivated agent reverts
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.AgentNotActive.selector, agentId));
        credibility.recordPrediction(agentId, 1, 1, 80);
    }

    // ─── Helpers ───

    function _createProposal(string memory description) internal returns (uint256 proposalId) {
        address[] memory targets = new address[](1);
        targets[0] = address(0);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        proposalId = governor.propose(targets, values, calldatas, description);
    }
}
