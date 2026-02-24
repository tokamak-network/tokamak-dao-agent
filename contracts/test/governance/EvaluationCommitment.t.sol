// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AIAgentRegistry} from "../../src/governance/AIAgentRegistry.sol";
import {EvaluationCommitment} from "../../src/governance/EvaluationCommitment.sol";

/**
 * @title EvaluationCommitmentTest
 * @notice Tests for EvaluationCommitment reference implementation
 * Run with: forge test --match-contract EvaluationCommitmentTest -vvv
 */
contract EvaluationCommitmentTest is Test {
    AIAgentRegistry public registry;
    EvaluationCommitment public commitment;

    address operator = makeAddr("operator");
    address stranger = makeAddr("stranger");

    bytes32 agentId;
    uint256 constant PROPOSAL_ID = 1;
    string constant EVAL_URI = "ipfs://QmEvaluation1";
    bytes32 constant SALT = keccak256("secret-salt");

    event EvaluationCommitted(bytes32 indexed agentId, uint256 indexed proposalId, bytes32 commitHash, uint256 timestamp);
    event EvaluationRevealed(bytes32 indexed agentId, uint256 indexed proposalId, string evaluationURI);

    function setUp() public {
        registry = new AIAgentRegistry();
        commitment = new EvaluationCommitment(address(registry));

        vm.prank(operator);
        agentId = registry.registerAgent("ipfs://QmAgent");
    }

    function _computeHash(string memory uri, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(uri, salt));
    }

    // ─── Commit ───

    function test_commitEvaluation_success() public {
        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.prank(operator);
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);

        (bytes32 retHash, uint256 retTimestamp) = commitment.getCommitment(agentId, PROPOSAL_ID);
        assertEq(retHash, hash);
        assertEq(retTimestamp, block.timestamp);
        assertFalse(commitment.isRevealed(agentId, PROPOSAL_ID));
    }

    function test_commitEvaluation_emitsEvent() public {
        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.expectEmit(true, true, false, true);
        emit EvaluationCommitted(agentId, PROPOSAL_ID, hash, block.timestamp);

        vm.prank(operator);
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);
    }

    function test_commitEvaluation_revertNotOperator() public {
        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(EvaluationCommitment.NotAgentOperator.selector, agentId, stranger));
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);
    }

    function test_commitEvaluation_revertInactiveAgent() public {
        vm.prank(operator);
        registry.deactivateAgent(agentId);

        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(EvaluationCommitment.AgentNotActive.selector, agentId));
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);
    }

    function test_commitEvaluation_revertAlreadyCommitted() public {
        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.startPrank(operator);
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);

        vm.expectRevert(abi.encodeWithSelector(EvaluationCommitment.AlreadyCommitted.selector, agentId, PROPOSAL_ID));
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);
        vm.stopPrank();
    }

    // ─── Reveal ───

    function test_revealEvaluation_success() public {
        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.startPrank(operator);
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);
        commitment.revealEvaluation(agentId, PROPOSAL_ID, EVAL_URI, SALT);
        vm.stopPrank();

        assertTrue(commitment.isRevealed(agentId, PROPOSAL_ID));
    }

    function test_revealEvaluation_emitsEvent() public {
        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.startPrank(operator);
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);

        vm.expectEmit(true, true, false, true);
        emit EvaluationRevealed(agentId, PROPOSAL_ID, EVAL_URI);

        commitment.revealEvaluation(agentId, PROPOSAL_ID, EVAL_URI, SALT);
        vm.stopPrank();
    }

    function test_revealEvaluation_revertNoCommitment() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(EvaluationCommitment.NoCommitment.selector, agentId, PROPOSAL_ID));
        commitment.revealEvaluation(agentId, PROPOSAL_ID, EVAL_URI, SALT);
    }

    function test_revealEvaluation_revertHashMismatch() public {
        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.startPrank(operator);
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);

        bytes32 wrongSalt = keccak256("wrong-salt");
        bytes32 wrongHash = _computeHash(EVAL_URI, wrongSalt);

        vm.expectRevert(abi.encodeWithSelector(EvaluationCommitment.HashMismatch.selector, hash, wrongHash));
        commitment.revealEvaluation(agentId, PROPOSAL_ID, EVAL_URI, wrongSalt);
        vm.stopPrank();
    }

    function test_revealEvaluation_revertAlreadyRevealed() public {
        bytes32 hash = _computeHash(EVAL_URI, SALT);

        vm.startPrank(operator);
        commitment.commitEvaluation(agentId, PROPOSAL_ID, hash);
        commitment.revealEvaluation(agentId, PROPOSAL_ID, EVAL_URI, SALT);

        vm.expectRevert(abi.encodeWithSelector(EvaluationCommitment.AlreadyRevealed.selector, agentId, PROPOSAL_ID));
        commitment.revealEvaluation(agentId, PROPOSAL_ID, EVAL_URI, SALT);
        vm.stopPrank();
    }

    // ─── View functions ───

    function test_getCommitment_returnsZeroForUnknown() public view {
        (bytes32 retHash, uint256 retTimestamp) = commitment.getCommitment(agentId, 999);
        assertEq(retHash, bytes32(0));
        assertEq(retTimestamp, 0);
    }

    // ─── Multiple proposals ───

    function test_multipleProposals_independent() public {
        bytes32 hash1 = _computeHash("ipfs://eval1", SALT);
        bytes32 hash2 = _computeHash("ipfs://eval2", SALT);

        vm.startPrank(operator);
        commitment.commitEvaluation(agentId, 1, hash1);
        commitment.commitEvaluation(agentId, 2, hash2);
        vm.stopPrank();

        (bytes32 retHash1,) = commitment.getCommitment(agentId, 1);
        (bytes32 retHash2,) = commitment.getCommitment(agentId, 2);
        assertEq(retHash1, hash1);
        assertEq(retHash2, hash2);
    }
}
