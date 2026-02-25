// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AIAgentRegistry} from "../../src/governance/AIAgentRegistry.sol";
import {RationaleCommitment} from "../../src/governance/RationaleCommitment.sol";
import {IRationaleCommitment} from "../../src/governance/IRationaleCommitment.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title RationaleCommitmentTest
 * @notice Tests for RationaleCommitment reference implementation
 * Run with: forge test --match-contract RationaleCommitmentTest -vvv
 */
contract RationaleCommitmentTest is Test {
    AIAgentRegistry public registry;
    RationaleCommitment public commitment;

    address operator = makeAddr("operator");
    address stranger = makeAddr("stranger");

    bytes32 agentId;
    uint256 constant PROPOSAL_ID = 1;
    string constant RATIONALE_URI = "ipfs://QmRationale1";
    bytes32 constant SALT = keccak256("secret-salt");

    event RationaleCommitted(bytes32 indexed agentId, uint256 indexed proposalId, bytes32 commitHash, uint256 timestamp);
    event RationaleRevealed(bytes32 indexed agentId, uint256 indexed proposalId, string rationaleURI);

    function setUp() public {
        registry = new AIAgentRegistry();
        commitment = new RationaleCommitment(address(registry));

        vm.prank(operator);
        agentId = registry.registerAgent("ipfs://QmAgent");
    }

    function _computeHash(string memory uri, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(uri, salt));
    }

    // ─── Commit ───

    function test_commitRationale_success() public {
        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.prank(operator);
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);

        (bytes32 retHash, uint256 retTimestamp) = commitment.getCommitment(agentId, PROPOSAL_ID);
        assertEq(retHash, hash);
        assertEq(retTimestamp, block.timestamp);
        assertFalse(commitment.isRevealed(agentId, PROPOSAL_ID));
    }

    function test_commitRationale_emitsEvent() public {
        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.expectEmit(true, true, false, true);
        emit RationaleCommitted(agentId, PROPOSAL_ID, hash, block.timestamp);

        vm.prank(operator);
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);
    }

    function test_commitRationale_revertNotOperator() public {
        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(RationaleCommitment.NotAgentOperator.selector, agentId, stranger));
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);
    }

    function test_commitRationale_revertInactiveAgent() public {
        vm.prank(operator);
        registry.deactivateAgent(agentId);

        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(RationaleCommitment.AgentNotActive.selector, agentId));
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);
    }

    function test_commitRationale_revertAlreadyCommitted() public {
        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.startPrank(operator);
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);

        vm.expectRevert(abi.encodeWithSelector(RationaleCommitment.AlreadyCommitted.selector, agentId, PROPOSAL_ID));
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);
        vm.stopPrank();
    }

    // ─── Reveal ───

    function test_revealRationale_success() public {
        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.startPrank(operator);
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);
        commitment.revealRationale(agentId, PROPOSAL_ID, RATIONALE_URI, SALT);
        vm.stopPrank();

        assertTrue(commitment.isRevealed(agentId, PROPOSAL_ID));
    }

    function test_revealRationale_emitsEvent() public {
        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.startPrank(operator);
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);

        vm.expectEmit(true, true, false, true);
        emit RationaleRevealed(agentId, PROPOSAL_ID, RATIONALE_URI);

        commitment.revealRationale(agentId, PROPOSAL_ID, RATIONALE_URI, SALT);
        vm.stopPrank();
    }

    function test_revealRationale_revertNoCommitment() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(RationaleCommitment.NoCommitment.selector, agentId, PROPOSAL_ID));
        commitment.revealRationale(agentId, PROPOSAL_ID, RATIONALE_URI, SALT);
    }

    function test_revealRationale_revertHashMismatch() public {
        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.startPrank(operator);
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);

        bytes32 wrongSalt = keccak256("wrong-salt");
        bytes32 wrongHash = _computeHash(RATIONALE_URI, wrongSalt);

        vm.expectRevert(abi.encodeWithSelector(RationaleCommitment.HashMismatch.selector, hash, wrongHash));
        commitment.revealRationale(agentId, PROPOSAL_ID, RATIONALE_URI, wrongSalt);
        vm.stopPrank();
    }

    function test_revealRationale_revertAlreadyRevealed() public {
        bytes32 hash = _computeHash(RATIONALE_URI, SALT);

        vm.startPrank(operator);
        commitment.commitRationale(agentId, PROPOSAL_ID, hash);
        commitment.revealRationale(agentId, PROPOSAL_ID, RATIONALE_URI, SALT);

        vm.expectRevert(abi.encodeWithSelector(RationaleCommitment.AlreadyRevealed.selector, agentId, PROPOSAL_ID));
        commitment.revealRationale(agentId, PROPOSAL_ID, RATIONALE_URI, SALT);
        vm.stopPrank();
    }

    // ─── View functions ───

    function test_getCommitment_returnsZeroForUnknown() public view {
        (bytes32 retHash, uint256 retTimestamp) = commitment.getCommitment(agentId, 999);
        assertEq(retHash, bytes32(0));
        assertEq(retTimestamp, 0);
    }

    function test_registry_returnsCorrectAddress() public view {
        assertEq(address(commitment.registry()), address(registry));
    }

    // ─── Multiple proposals ───

    function test_multipleProposals_independent() public {
        bytes32 hash1 = _computeHash("ipfs://rationale1", SALT);
        bytes32 hash2 = _computeHash("ipfs://rationale2", SALT);

        vm.startPrank(operator);
        commitment.commitRationale(agentId, 1, hash1);
        commitment.commitRationale(agentId, 2, hash2);
        vm.stopPrank();

        (bytes32 retHash1,) = commitment.getCommitment(agentId, 1);
        (bytes32 retHash2,) = commitment.getCommitment(agentId, 2);
        assertEq(retHash1, hash1);
        assertEq(retHash2, hash2);
    }

    // ─── ERC-165 ───

    function test_supportsInterface_ownInterface() public view {
        assertTrue(commitment.supportsInterface(type(IRationaleCommitment).interfaceId));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(commitment.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_returnsFalseForRandom() public view {
        assertFalse(commitment.supportsInterface(0xdeadbeef));
    }
}
