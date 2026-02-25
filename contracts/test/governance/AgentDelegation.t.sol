// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentRegistry} from "../../src/governance/AgentRegistry.sol";
import {AgentDelegation} from "../../src/governance/AgentDelegation.sol";
import {IAgentDelegation} from "../../src/governance/IAgentDelegation.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title AgentDelegationTest
 * @notice Tests for AgentDelegation reference implementation
 * Run with: forge test --match-contract AgentDelegationTest -vvv
 */
contract AgentDelegationTest is Test {
    AgentRegistry public registry;
    AgentDelegation public delegation;

    address operator = makeAddr("operator");
    address delegator1 = makeAddr("delegator1");
    address delegator2 = makeAddr("delegator2");
    address stranger = makeAddr("stranger");

    bytes32 agentId;
    uint256 expiry;

    string constant PREFS_URI = "ipfs://QmPreferences1";
    string constant AGENT_URI = "ipfs://QmAgent1";

    event AgentDelegationCreated(address indexed delegator, bytes32 indexed agentId, bytes32 delegationId, uint256 expiry);
    event AgentDelegationRevoked(bytes32 indexed delegationId);
    event Escalated(bytes32 indexed delegationId, uint256 indexed proposalId, string reasonURI);

    function setUp() public {
        registry = new AgentRegistry();
        delegation = new AgentDelegation(address(registry));

        vm.prank(operator);
        agentId = registry.registerAgent(AGENT_URI);

        expiry = block.timestamp + 30 days;
    }

    // ─── Delegation Creation ───

    function test_delegateToAgent_success() public {
        vm.prank(delegator1);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        (bytes32 retDelegationId, bytes32 retAgent, uint256 retExpiry, string memory retPrefs) = delegation.getAgentDelegation(delegator1);
        assertEq(retDelegationId, delegationId);
        assertEq(retAgent, agentId);
        assertEq(retExpiry, expiry);
        assertEq(retPrefs, PREFS_URI);
        assertEq(delegation.activeDelegation(delegator1), delegationId);
    }

    function test_delegateToAgent_emitsEvent() public {
        bytes32 expectedId = keccak256(abi.encodePacked(delegator1, uint256(0)));

        vm.expectEmit(true, true, false, true);
        emit AgentDelegationCreated(delegator1, agentId, expectedId, expiry);

        vm.prank(delegator1);
        delegation.delegateToAgent(agentId, expiry, PREFS_URI);
    }

    function test_delegateToAgent_revertInactiveAgent() public {
        vm.prank(operator);
        registry.deactivateAgent(agentId);

        vm.prank(delegator1);
        vm.expectRevert(abi.encodeWithSelector(AgentDelegation.AgentNotActive.selector, agentId));
        delegation.delegateToAgent(agentId, expiry, PREFS_URI);
    }

    function test_delegateToAgent_revertExpiryInPast() public {
        vm.prank(delegator1);
        vm.expectRevert(abi.encodeWithSelector(AgentDelegation.ExpiryInPast.selector, block.timestamp - 1));
        delegation.delegateToAgent(agentId, block.timestamp - 1, PREFS_URI);
    }

    function test_delegateToAgent_replacesExisting() public {
        vm.startPrank(delegator1);
        bytes32 id1 = delegation.delegateToAgent(agentId, expiry, PREFS_URI);
        bytes32 id2 = delegation.delegateToAgent(agentId, expiry + 1 days, "ipfs://QmPrefs2");
        vm.stopPrank();

        assertTrue(id1 != id2);
        assertEq(delegation.activeDelegation(delegator1), id2);

        (, bytes32 retAgent,, string memory retPrefs) = delegation.getAgentDelegation(delegator1);
        assertEq(retAgent, agentId);
        assertEq(retPrefs, "ipfs://QmPrefs2");
    }

    // ─── Revocation ───

    function test_revokeDelegation_success() public {
        vm.prank(delegator1);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        vm.prank(delegator1);
        delegation.revokeDelegation(delegationId);

        assertEq(delegation.activeDelegation(delegator1), bytes32(0));

        (, bytes32 retAgent,,) = delegation.getAgentDelegation(delegator1);
        assertEq(retAgent, bytes32(0));
    }

    function test_revokeDelegation_emitsEvent() public {
        vm.prank(delegator1);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        vm.expectEmit(true, false, false, false);
        emit AgentDelegationRevoked(delegationId);

        vm.prank(delegator1);
        delegation.revokeDelegation(delegationId);
    }

    function test_revokeDelegation_revertNotDelegator() public {
        vm.prank(delegator1);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AgentDelegation.NotDelegator.selector, delegationId, stranger));
        delegation.revokeDelegation(delegationId);
    }

    function test_revokeDelegation_revertNotFound() public {
        bytes32 fakeId = keccak256("nonexistent");
        vm.prank(delegator1);
        vm.expectRevert(abi.encodeWithSelector(AgentDelegation.DelegationNotFound.selector, fakeId));
        delegation.revokeDelegation(fakeId);
    }

    // ─── Expiry ───

    function test_getAgentDelegation_returnsEmptyAfterExpiry() public {
        vm.prank(delegator1);
        delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        // Warp past expiry
        vm.warp(expiry + 1);

        (, bytes32 retAgent,,) = delegation.getAgentDelegation(delegator1);
        assertEq(retAgent, bytes32(0));
    }

    // ─── Escalation (now uses reasonURI) ───

    function test_escalate_success() public {
        vm.prank(delegator1);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        string memory reasonURI = "ipfs://QmEscalationReason1";

        vm.expectEmit(true, true, false, true);
        emit Escalated(delegationId, 42, reasonURI);

        vm.prank(operator);
        delegation.escalate(delegationId, 42, reasonURI);
    }

    function test_escalate_revertNotOperator() public {
        vm.prank(delegator1);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AgentDelegation.NotAgentOperator.selector, delegationId, stranger));
        delegation.escalate(delegationId, 42, "ipfs://QmReason");
    }

    function test_escalate_revertExpired() public {
        vm.prank(delegator1);
        bytes32 delegationId = delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        vm.warp(expiry + 1);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(AgentDelegation.DelegationExpired.selector, delegationId));
        delegation.escalate(delegationId, 42, "ipfs://QmReason");
    }

    // ─── Multiple delegators ───

    function test_multipleDelegators_independent() public {
        vm.prank(delegator1);
        bytes32 id1 = delegation.delegateToAgent(agentId, expiry, PREFS_URI);

        vm.prank(delegator2);
        bytes32 id2 = delegation.delegateToAgent(agentId, expiry, "ipfs://QmPrefs2");

        assertTrue(id1 != id2);

        (, bytes32 agent1,,) = delegation.getAgentDelegation(delegator1);
        (, bytes32 agent2,,) = delegation.getAgentDelegation(delegator2);
        assertEq(agent1, agentId);
        assertEq(agent2, agentId);
    }

    // ─── View functions ───

    function test_registry_returnsCorrectAddress() public view {
        assertEq(address(delegation.registry()), address(registry));
    }

    // ─── ERC-165 ───

    function test_supportsInterface_ownInterface() public view {
        assertTrue(delegation.supportsInterface(type(IAgentDelegation).interfaceId));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(delegation.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_returnsFalseForRandom() public view {
        assertFalse(delegation.supportsInterface(0xdeadbeef));
    }
}
