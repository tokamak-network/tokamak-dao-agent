// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AIAgentRegistry} from "../../src/governance/AIAgentRegistry.sol";
import {IAIAgentRegistry} from "../../src/governance/IAIAgentRegistry.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title AIAgentRegistryTest
 * @notice Tests for AIAgentRegistry reference implementation
 * Run with: forge test --match-contract AIAgentRegistryTest -vvv
 */
contract AIAgentRegistryTest is Test {
    AIAgentRegistry public registry;

    address operator1 = makeAddr("operator1");
    address operator2 = makeAddr("operator2");
    address stranger = makeAddr("stranger");

    string constant URI_1 = "ipfs://QmAgent1Profile";
    string constant URI_2 = "ipfs://QmAgent2Profile";
    string constant URI_UPDATED = "ipfs://QmAgent1ProfileV2";

    event AgentRegistered(bytes32 indexed agentId, address indexed operator, string metadataURI);
    event AgentUpdated(bytes32 indexed agentId, string metadataURI);
    event AgentDeactivated(bytes32 indexed agentId);

    function setUp() public {
        registry = new AIAgentRegistry();
    }

    // ─── Registration ───

    function test_registerAgent_success() public {
        vm.prank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);

        assertEq(registry.agentURI(agentId), URI_1);
        assertEq(registry.agentOperator(agentId), operator1);
        assertTrue(registry.isActiveAgent(agentId));
    }

    function test_registerAgent_emitsEvent() public {
        bytes32 expectedId = keccak256(abi.encodePacked(operator1, uint256(0)));

        vm.expectEmit(true, true, false, true);
        emit AgentRegistered(expectedId, operator1, URI_1);

        vm.prank(operator1);
        registry.registerAgent(URI_1);
    }

    function test_registerAgent_deterministicId() public {
        bytes32 expectedId = keccak256(abi.encodePacked(operator1, uint256(0)));

        vm.prank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);

        assertEq(agentId, expectedId);
    }

    function test_registerAgent_incrementsNonce() public {
        vm.startPrank(operator1);
        bytes32 id1 = registry.registerAgent(URI_1);
        bytes32 id2 = registry.registerAgent(URI_2);
        vm.stopPrank();

        assertTrue(id1 != id2);
        assertEq(registry.operatorNonce(operator1), 2);
    }

    function test_registerAgent_revertEmptyURI() public {
        vm.prank(operator1);
        vm.expectRevert(AIAgentRegistry.EmptyURI.selector);
        registry.registerAgent("");
    }

    // ─── Update ───

    function test_updateAgent_success() public {
        vm.startPrank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);
        registry.updateAgent(agentId, URI_UPDATED);
        vm.stopPrank();

        assertEq(registry.agentURI(agentId), URI_UPDATED);
    }

    function test_updateAgent_emitsEvent() public {
        vm.prank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);

        vm.expectEmit(true, false, false, true);
        emit AgentUpdated(agentId, URI_UPDATED);

        vm.prank(operator1);
        registry.updateAgent(agentId, URI_UPDATED);
    }

    function test_updateAgent_revertNotOperator() public {
        vm.prank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AIAgentRegistry.NotOperator.selector, agentId, stranger));
        registry.updateAgent(agentId, URI_UPDATED);
    }

    function test_updateAgent_revertEmptyURI() public {
        vm.prank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);

        vm.prank(operator1);
        vm.expectRevert(AIAgentRegistry.EmptyURI.selector);
        registry.updateAgent(agentId, "");
    }

    function test_updateAgent_revertDeactivated() public {
        vm.startPrank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);
        registry.deactivateAgent(agentId);

        vm.expectRevert(abi.encodeWithSelector(AIAgentRegistry.AgentNotFound.selector, agentId));
        registry.updateAgent(agentId, URI_UPDATED);
        vm.stopPrank();
    }

    // ─── Deactivation ───

    function test_deactivateAgent_success() public {
        vm.startPrank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);
        registry.deactivateAgent(agentId);
        vm.stopPrank();

        assertFalse(registry.isActiveAgent(agentId));
    }

    function test_deactivateAgent_emitsEvent() public {
        vm.prank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);

        vm.expectEmit(true, false, false, false);
        emit AgentDeactivated(agentId);

        vm.prank(operator1);
        registry.deactivateAgent(agentId);
    }

    function test_deactivateAgent_revertNotOperator() public {
        vm.prank(operator1);
        bytes32 agentId = registry.registerAgent(URI_1);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AIAgentRegistry.NotOperator.selector, agentId, stranger));
        registry.deactivateAgent(agentId);
    }

    // ─── View Functions ───

    function test_agentURI_revertNotFound() public {
        bytes32 fakeId = keccak256("nonexistent");
        vm.expectRevert(abi.encodeWithSelector(AIAgentRegistry.AgentNotFound.selector, fakeId));
        registry.agentURI(fakeId);
    }

    function test_agentOperator_revertNotFound() public {
        bytes32 fakeId = keccak256("nonexistent");
        vm.expectRevert(abi.encodeWithSelector(AIAgentRegistry.AgentNotFound.selector, fakeId));
        registry.agentOperator(fakeId);
    }

    function test_isActiveAgent_returnsFalseForUnknown() public view {
        bytes32 fakeId = keccak256("nonexistent");
        assertFalse(registry.isActiveAgent(fakeId));
    }

    // ─── Multiple operators ───

    function test_multipleOperators_independentAgents() public {
        vm.prank(operator1);
        bytes32 agent1 = registry.registerAgent(URI_1);

        vm.prank(operator2);
        bytes32 agent2 = registry.registerAgent(URI_2);

        assertTrue(agent1 != agent2);
        assertEq(registry.agentOperator(agent1), operator1);
        assertEq(registry.agentOperator(agent2), operator2);
    }

    // ─── ERC-165 ───

    function test_supportsInterface_ownInterface() public view {
        assertTrue(registry.supportsInterface(type(IAIAgentRegistry).interfaceId));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(registry.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_returnsFalseForRandom() public view {
        assertFalse(registry.supportsInterface(0xdeadbeef));
    }
}
