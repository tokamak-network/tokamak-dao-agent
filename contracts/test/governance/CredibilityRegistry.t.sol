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
    address resolverAddr = makeAddr("resolver");
    address stranger = makeAddr("stranger");

    bytes32 agentId;

    // Default verdict values (Governor-compatible: 0=Against, 1=For, 2=Abstain)
    uint8 constant AGAINST = 0;
    uint8 constant FOR = 1;
    uint8 constant ABSTAIN = 2;

    // Outcome constants
    uint8 constant NEGATIVE = 0;
    uint8 constant POSITIVE = 1;

    // Default delta config: [+3, +1, -2, -1]
    int8[4] defaultDeltas = [int8(3), int8(1), int8(-2), int8(-1)];

    event PredictionRecorded(bytes32 indexed agentId, uint256 indexed proposalId, uint8 verdict, uint256 score);
    event PredictionResolved(bytes32 indexed agentId, uint256 indexed proposalId, int8 delta);

    function setUp() public {
        agentRegistry = new AIAgentRegistry();
        // highConfThreshold=70, verdictPositiveThreshold=1 (FOR and above are positive)
        credibility = new CredibilityRegistry(
            address(agentRegistry),
            resolverAddr,
            70,
            1,
            defaultDeltas
        );

        vm.prank(operator);
        agentId = agentRegistry.registerAgent("ipfs://QmAgent");
    }

    // ─── Record Prediction ───

    function test_recordPrediction_success() public {
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 85);

        (uint8 verdict, uint256 score, bool resolved, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(verdict, FOR);
        assertEq(score, 85);
        assertFalse(resolved);
        assertEq(delta, 0);
    }

    function test_recordPrediction_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit PredictionRecorded(agentId, 1, FOR, 85);

        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 85);
    }

    function test_recordPrediction_revertNotOperator() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.NotAgentOperator.selector, agentId, stranger));
        credibility.recordPrediction(agentId, 1, FOR, 85);
    }

    function test_recordPrediction_revertInactiveAgent() public {
        vm.prank(operator);
        agentRegistry.deactivateAgent(agentId);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.AgentNotActive.selector, agentId));
        credibility.recordPrediction(agentId, 1, FOR, 85);
    }

    function test_recordPrediction_allowsAnyVerdictValue() public {
        // Verdict is not restricted — any uint8 value is valid
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, 255, 85);

        (uint8 verdict,,,) = credibility.getPrediction(agentId, 1);
        assertEq(verdict, 255);
    }

    function test_recordPrediction_revertInvalidScore() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.InvalidScore.selector, 101));
        credibility.recordPrediction(agentId, 1, FOR, 101);
    }

    function test_recordPrediction_revertDuplicate() public {
        vm.startPrank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 85);

        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.PredictionExists.selector, agentId, 1));
        credibility.recordPrediction(agentId, 1, AGAINST, 20);
        vm.stopPrank();
    }

    // ─── Resolver Access Control ───

    function test_resolve_onlyResolver() public {
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 85);

        // Operator cannot resolve
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.NotResolver.selector, operator));
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        // Stranger cannot resolve
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.NotResolver.selector, stranger));
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        // Resolver can resolve
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        (,,bool resolved,) = credibility.getPrediction(agentId, 1);
        assertTrue(resolved);
    }

    // ─── Resolve Prediction — Delta Matrix ───

    function test_resolve_highConfCorrect_deltaPlus3() public {
        // FOR(1) with score=85 (high conf), outcome=POSITIVE → correct, high conf → +3
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 85);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);

        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 3);
        assertEq(totalPredictions, 1);
    }

    function test_resolve_lowConfCorrect_deltaPlus1() public {
        // FOR(1) with score=55 (low conf), outcome=POSITIVE → correct, low conf → +1
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 55);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 1);
    }

    function test_resolve_highConfWrong_deltaMinus2() public {
        // FOR(1) with score=85 (high conf), outcome=NEGATIVE → wrong, high conf → -2
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 85);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, -2);
    }

    function test_resolve_lowConfWrong_deltaMinus1() public {
        // FOR(1) with score=55 (low conf), outcome=NEGATIVE → wrong, low conf → -1
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 55);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, -1);
    }

    function test_resolve_againstCorrect_highConf() public {
        // AGAINST(0) with score=15 (high conf, <=30), outcome=NEGATIVE → correct → +3
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, AGAINST, 15);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);
    }

    function test_resolve_abstainWrong_lowConf() public {
        // ABSTAIN(2) with score=50 (low conf), outcome=NEGATIVE → wrong
        // ABSTAIN(2) >= verdictPositiveThreshold(1) → predicted positive, actual negative → wrong → -1
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, ABSTAIN, 50);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, -1);
    }

    function test_resolve_forCorrect_highConf() public {
        // FOR(1) with score=75 (high conf), outcome=POSITIVE → correct (positive) → +3
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 75);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);
    }

    // ─── Resolve errors ───

    function test_resolve_revertNotFound() public {
        vm.prank(resolverAddr);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.PredictionNotFound.selector, agentId, 1));
        credibility.resolvePrediction(agentId, 1, POSITIVE);
    }

    function test_resolve_revertAlreadyResolved() public {
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 85);

        vm.startPrank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.AlreadyResolved.selector, agentId, 1));
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        vm.stopPrank();
    }

    function test_resolve_revertInvalidOutcome() public {
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 85);

        vm.prank(resolverAddr);
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.InvalidOutcome.selector, 2));
        credibility.resolvePrediction(agentId, 1, 2);
    }

    // ─── Cumulative credibility ───

    function test_cumulativeCredibility_multipleProposals() public {
        vm.startPrank(operator);
        // Proposal 1: high conf correct → +3
        credibility.recordPrediction(agentId, 1, FOR, 85);
        // Proposal 2: high conf wrong → -2
        credibility.recordPrediction(agentId, 2, FOR, 90);
        // Proposal 3: low conf correct → +1
        credibility.recordPrediction(agentId, 3, AGAINST, 45);
        vm.stopPrank();

        vm.startPrank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, POSITIVE);
        credibility.resolvePrediction(agentId, 2, NEGATIVE);
        credibility.resolvePrediction(agentId, 3, NEGATIVE);
        vm.stopPrank();

        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 2); // +3 - 2 + 1
        assertEq(totalPredictions, 3);
    }

    // ─── Edge cases ───

    function test_score_boundary_30_isHighConf() public {
        // score=30 → high confidence (<=30, i.e. <= 100-70)
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, AGAINST, 30);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3); // high conf + correct
    }

    function test_score_boundary_70_isHighConf() public {
        // score=70 → high confidence (>=70)
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 70);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3); // high conf + correct
    }

    function test_score_boundary_31_isLowConf() public {
        // score=31 → low confidence (30 < 31 < 70)
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, AGAINST, 31);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 1); // low conf + correct
    }

    function test_score_zero_isHighConf() public {
        // score=0 → high confidence (<=30)
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, AGAINST, 0);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, NEGATIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);
    }

    function test_score_100_isHighConf() public {
        // score=100 → high confidence (>=70)
        vm.prank(operator);
        credibility.recordPrediction(agentId, 1, FOR, 100);
        vm.prank(resolverAddr);
        credibility.resolvePrediction(agentId, 1, POSITIVE);

        (,,, int8 delta) = credibility.getPrediction(agentId, 1);
        assertEq(delta, 3);
    }

    function test_getCredibility_defaultZero() public view {
        (int256 totalScore, uint256 totalPredictions) = credibility.getCredibility(agentId);
        assertEq(totalScore, 0);
        assertEq(totalPredictions, 0);
    }

    // ─── Configurable Deltas ───

    function test_customDeltas() public {
        // Deploy with custom deltas: [+5, +2, -3, -1]
        int8[4] memory customDeltas = [int8(5), int8(2), int8(-3), int8(-1)];
        CredibilityRegistry custom = new CredibilityRegistry(
            address(agentRegistry),
            resolverAddr,
            70,
            1,
            customDeltas
        );

        vm.prank(operator);
        custom.recordPrediction(agentId, 1, FOR, 85);
        vm.prank(resolverAddr);
        custom.resolvePrediction(agentId, 1, POSITIVE);

        (,,, int8 delta) = custom.getPrediction(agentId, 1);
        assertEq(delta, 5); // custom highConfCorrect
    }

    function test_customVerdictThreshold() public {
        // Deploy with verdictPositiveThreshold=2 (only verdict >= 2 is positive)
        CredibilityRegistry custom = new CredibilityRegistry(
            address(agentRegistry),
            resolverAddr,
            70,
            2,
            defaultDeltas
        );

        // FOR(1) with threshold=2 → predicted negative
        vm.prank(operator);
        custom.recordPrediction(agentId, 1, FOR, 85);
        vm.prank(resolverAddr);
        custom.resolvePrediction(agentId, 1, NEGATIVE);

        (,,, int8 delta) = custom.getPrediction(agentId, 1);
        assertEq(delta, 3); // FOR(1) < threshold(2) → negative direction → matches NEGATIVE → correct + high conf
    }

    function test_invalidDeltaConfig_revert() public {
        // highConfCorrect must be > lowConfCorrect
        int8[4] memory badDeltas = [int8(1), int8(1), int8(-2), int8(-1)];
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.InvalidDeltaConfig.selector));
        new CredibilityRegistry(address(agentRegistry), resolverAddr, 70, 1, badDeltas);

        // highConfWrong must be <= lowConfWrong (more negative = harsher)
        int8[4] memory badDeltas2 = [int8(3), int8(1), int8(0), int8(-1)];
        vm.expectRevert(abi.encodeWithSelector(CredibilityRegistry.InvalidDeltaConfig.selector));
        new CredibilityRegistry(address(agentRegistry), resolverAddr, 70, 1, badDeltas2);
    }
}
