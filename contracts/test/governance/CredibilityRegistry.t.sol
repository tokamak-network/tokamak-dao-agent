// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AIAgentRegistry} from "../../src/governance/AIAgentRegistry.sol";
import {CredibilityRegistry} from "../../src/governance/CredibilityRegistry.sol";

/**
 * @title CredibilityRegistryTest
 * @notice Tests for CredibilityRegistry reference implementation
 * Run with: forge test --match-contract CredibilityRegistryTest -vvv
 */
contract CredibilityRegistryTest is Test {
    AIAgentRegistry public agentRegistry;
    CredibilityRegistry public credibility;

    address operator = makeAddr("operator");
    address stranger = makeAddr("stranger");

    bytes32 agentId;

    // Verdict constants
    uint8 constant REJECT = 0;
    uint8 constant ABSTAIN = 1;
    uint8 constant NEEDS_REVIEW = 2;
    uint8 constant APPROVE = 3;

    // Outcome constants
    uint8 constant NEGATIVE = 0;
    uint8 constant POSITIVE = 1;

    event PredictionRecorded(bytes32 indexed agentId, uint256 indexed proposalId, uint8 verdict, uint256 score);
    event PredictionResolved(bytes32 indexed agentId, uint256 indexed proposalId, int8 delta);

    function setUp() public {
        agentRegistry = new AIAgentRegistry();
        credibility = new CredibilityRegistry(address(agentRegistry));

        vm.prank(operator);
        agentId = agentRegistry.registerAgent("ipfs://QmAgent");
    }

    // ─── Record Prediction ───

    function test_recordPrediction_success() public {
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 85);

        (uint8 verdict, uint256 score, bool resolved, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(verdict, APPROVE);
        assertEq(score, 85);
        assertFalse(resolved);
        assertEq(delta, 0);
    }

    function test_recordPrediction_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit PredictionRecorded(agentId, 1, APPROVE, 85);

        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 85);
    }

    function test_recordPrediction_revertNotOperator() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.NotAgentOperator.selector, agentId, stranger));
        credibility.recordPrediction(agentId, 1, APPROVE, 85);
    }

    function test_recordPrediction_revertInactiveAgent() public {
        vm.prank(operator);
        agentRegistry.deactivateAgent(agentId);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.AgentNotActive.selector, agentId));
        credibility.recordPrediction(agentId, 1, APPROVE, 85);
    }

    function test_recordPrediction_revertInvalidVerdict() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.InvalidVerdict.selector, 4));
        credibility.recordPrediction(agentId, 1, 4, 85);
    }

    function test_recordPrediction_revertInvalidScore() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.InvalidScore.selector, 101));
        credibility.recordPrediction(agentId, 1, APPROVE, 101);
    }

    function test_recordPrediction_revertDuplicate() public {
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 85);

        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.PredictionExists.selector, agentId, 1));
        credibility.recordPrediction(agentId, 1, REJECT, 20);
        vm.stopPrank();
    }

    // ─── Resolve Prediction — Delta Matrix ───

    function test_resolve_highConfCorrect_deltaPlus3() public {
        // APPROVE(3) with score=85 (high conf), outcome=POSITIVE → correct, high conf → +3
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 85);
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);

        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 3);
        assertEq(totalPredictions, 1);
    }

    function test_resolve_lowConfCorrect_deltaPlus1() public {
        // APPROVE(3) with score=55 (low conf), outcome=POSITIVE → correct, low conf → +1
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 55);
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 1);
    }

    function test_resolve_highConfWrong_deltaMinus2() public {
        // APPROVE(3) with score=85 (high conf), outcome=NEGATIVE → wrong, high conf → -2
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 85);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, -2);
    }

    function test_resolve_lowConfWrong_deltaMinus1() public {
        // APPROVE(3) with score=55 (low conf), outcome=NEGATIVE → wrong, low conf → -1
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 55);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, -1);
    }

    function test_resolve_rejectCorrect_highConf() public {
        // REJECT(0) with score=15 (high conf, <=30), outcome=NEGATIVE → correct → +3
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, REJECT, 15);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);
    }

    function test_resolve_abstainWrong_lowConf() public {
        // ABSTAIN(1) with score=50 (low conf), outcome=POSITIVE → wrong (ABSTAIN→negative) → -1
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, ABSTAIN, 50);
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, -1);
    }

    function test_resolve_needsReviewCorrect_highConf() public {
        // NEEDS_REVIEW(2) with score=75 (high conf), outcome=POSITIVE → correct (positive) → +3
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, NEEDS_REVIEW, 75);
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);
    }

    // ─── Resolve errors ───

    function test_resolve_revertNotFound() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.PredictionNotFound.selector, agentId, 1));
        credibility.resolvePrediction(agentId, 1, POSITIVE);
    }

    function test_resolve_revertAlreadyResolved() public {
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 85);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.AlreadyResolved.selector, agentId, 1));
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        vm.stopPrank();
    }

    function test_resolve_revertInvalidOutcome() public {
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 85);

        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.InvalidOutcome.selector, 2));
        credibility.resolvePrediction(agentId, 1, 2);
        vm.stopPrank();
    }

    // ─── Cumulative credibility ───

    function test_cumulativeCredibility_multipleProposals() public {
        vm.startPrank(operator);

        // Proposal 1: high conf correct → +3
        credibility.recordPrediction(agentId, 1, APPROVE, 85);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        // Proposal 2: high conf wrong → -2
        credibility.recordPrediction(agentId, 2, APPROVE, 90);
        credibility.resolvePrediction(agentId, 2, NEGATIVE);

        // Proposal 3: low conf correct → +1
        credibility.recordPrediction(agentId, 3, REJECT, 45);
        credibility.resolvePrediction(agentId, 3, NEGATIVE);

        vm.stopPrank();

        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 2); // +3 - 2 + 1
        assertEq(totalPredictions, 3);
    }

    // ─── Edge cases ───

    function test_score_boundary_30_isHighConf() public {
        // score=30 → high confidence (<=30)
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, REJECT, 30);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3); // high conf + correct
    }

    function test_score_boundary_70_isHighConf() public {
        // score=70 → high confidence (>=70)
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 70);
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3); // high conf + correct
    }

    function test_score_boundary_31_isLowConf() public {
        // score=31 → low confidence (30 < 31 < 70)
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, REJECT, 31);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 1); // low conf + correct
    }

    function test_score_zero_isHighConf() public {
        // score=0 → high confidence (<=30)
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, REJECT, 0);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);
    }

    function test_score_100_isHighConf() public {
        // score=100 → high confidence (>=70)
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, APPROVE, 100);
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        vm.stopPrank();

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);
    }

    function test_getCredibility_defaultZero() public view {
        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 0);
        assertEq(totalPredictions, 0);
    }
}
