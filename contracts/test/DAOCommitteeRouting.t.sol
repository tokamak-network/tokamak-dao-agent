// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title DAOCommittee Multi-Implementation Routing Fork Test
 * @notice Verifies that DAOCommitteeProxy correctly routes function calls
 *         to slot0 (DAOCommittee_V1) vs slot1 (DAOCommitteeOwner) based on
 *         selector mappings.
 *
 * Run with:
 *   FOUNDRY_PROFILE=fork forge test --match-contract DAOCommitteeRouting --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract DAOCommitteeRouting is Test {
    address constant DAO_COMMITTEE_PROXY = 0xDD9f0cCc044B0781289Ee318e5971b0139602C26;
    address constant SLOT0_IMPL = 0x9050Af1638f379A018737880aD946CdDA9101A25;
    address constant SLOT1_IMPL = 0xcb9859Dc0fBECa68eFFf2bce289150513fdF7D92;

    IDAOCommitteeProxy proxy = IDAOCommitteeProxy(DAO_COMMITTEE_PROXY);

    // ===================================================================
    // Test 1: Verify slot0 and slot1 are alive
    // ===================================================================
    function test_ImplementationsAreAlive() public view {
        address impl0 = proxy.proxyImplementation(0);
        address impl1 = proxy.proxyImplementation(1);
        bool alive0 = proxy.aliveImplementation(SLOT0_IMPL);
        bool alive1 = proxy.aliveImplementation(SLOT1_IMPL);

        console.log("=== Implementation Status ===");
        console.log("Slot0:", impl0);
        console.log("Slot0 alive:", alive0);
        console.log("Slot1:", impl1);
        console.log("Slot1 alive:", alive1);

        assertEq(impl0, SLOT0_IMPL, "Slot0 should be DAOCommittee_V1");
        assertEq(impl1, SLOT1_IMPL, "Slot1 should be DAOCommitteeOwner");
        assertTrue(alive0, "Slot0 should be alive");
        assertTrue(alive1, "Slot1 should be alive");
    }

    // ===================================================================
    // Test 2: Verify selector routing for slot1 (admin) functions
    // ===================================================================
    function test_SelectorRoutingToSlot1() public view {
        // These selectors should be explicitly mapped to slot1
        bytes4[] memory slot1Selectors = new bytes4[](10);
        slot1Selectors[0] = bytes4(keccak256("setSeigManager(address)"));
        slot1Selectors[1] = bytes4(keccak256("setDaoVault(address)"));
        slot1Selectors[2] = bytes4(keccak256("setLayer2Registry(address)"));
        slot1Selectors[3] = bytes4(keccak256("setAgendaManager(address)"));
        slot1Selectors[4] = bytes4(keccak256("setCandidateFactory(address)"));
        slot1Selectors[5] = bytes4(keccak256("setTon(address)"));
        slot1Selectors[6] = bytes4(keccak256("setWton(address)"));
        slot1Selectors[7] = bytes4(keccak256("increaseMaxMember(uint256,uint256)"));
        slot1Selectors[8] = bytes4(keccak256("setQuorum(uint256)"));
        slot1Selectors[9] = bytes4(keccak256("setCooldownTime(uint256)"));

        string[10] memory names = [
            "setSeigManager", "setDaoVault", "setLayer2Registry",
            "setAgendaManager", "setCandidateFactory", "setTon",
            "setWton", "increaseMaxMember", "setQuorum", "setCooldownTime"
        ];

        console.log("=== Slot1 Selector Routing ===");
        uint256 routedToSlot1;
        for (uint256 i = 0; i < slot1Selectors.length; i++) {
            address impl = proxy.getSelectorImplementation2(slot1Selectors[i]);
            bool isSlot1 = (impl == SLOT1_IMPL);
            console.log(names[i], "->", impl);
            if (isSlot1) routedToSlot1++;
        }

        console.log("Selectors routed to slot1:", routedToSlot1, "/ 10");
        assertGt(routedToSlot1, 0, "At least some admin functions should route to slot1");
    }

    // ===================================================================
    // Test 3: Verify slot0 (core) functions route to default
    // ===================================================================
    function test_CoreFunctionsRouteToSlot0() public view {
        // These selectors should fall back to slot0 (default)
        bytes4[] memory slot0Selectors = new bytes4[](5);
        slot0Selectors[0] = bytes4(keccak256("createCandidate(string)"));
        slot0Selectors[1] = bytes4(keccak256("castVote(uint256,uint256,string)"));
        slot0Selectors[2] = bytes4(keccak256("executeAgenda(uint256)"));
        slot0Selectors[3] = bytes4(keccak256("changeMember(uint256)"));
        slot0Selectors[4] = bytes4(keccak256("claimActivityReward(address)"));

        string[5] memory names = [
            "createCandidate", "castVote", "executeAgenda",
            "changeMember", "claimActivityReward"
        ];

        console.log("=== Slot0 Default Routing ===");
        for (uint256 i = 0; i < slot0Selectors.length; i++) {
            address impl = proxy.getSelectorImplementation2(slot0Selectors[i]);
            console.log(names[i], "->", impl);
            // Should route to slot0 (either direct mapping or default fallback)
            assertTrue(
                impl == SLOT0_IMPL || impl == proxy.proxyImplementation(0),
                "Core functions should route to slot0"
            );
        }
    }

    // ===================================================================
    // Test 4: Call slot0 and slot1 functions through proxy
    // ===================================================================
    function test_CallBothSlots() public view {
        // Call slot0 function: candidatesLength (core view)
        uint256 numCandidates = IDAOCommitteeSlot0(DAO_COMMITTEE_PROXY).candidatesLength();
        console.log("candidatesLength (slot0):", numCandidates);

        // Call slot1 getter that was set via slot1: cooldownTime
        uint256 cooldown = IDAOCommitteeSlot1(DAO_COMMITTEE_PROXY).cooldownTime();
        console.log("cooldownTime (slot1):", cooldown);

        // Call shared storage: maxMember (accessible via both)
        uint256 maxMem = IDAOCommitteeSlot0(DAO_COMMITTEE_PROXY).maxMember();
        console.log("maxMember:", maxMem);

        assertGt(numCandidates, 0, "Should have registered candidates");
        assertGt(maxMem, 0, "Should have member slots");
    }

    // ===================================================================
    // Test 5: Verify deprecated implementations are not alive
    // ===================================================================
    function test_DeprecatedImplsNotAlive() public view {
        address V1_OLD = 0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe;
        address OWNER_OLD = 0x5991Aebb5271522d33C457bf6DF26d83c0dAa221;

        bool aliveV1 = proxy.aliveImplementation(V1_OLD);
        bool aliveOwner = proxy.aliveImplementation(OWNER_OLD);

        console.log("Old V1 alive:", aliveV1);
        console.log("Old Owner alive:", aliveOwner);

        assertFalse(aliveV1, "Old V1 should not be alive");
        assertFalse(aliveOwner, "Old Owner should not be alive");
    }
}

// ===================================================================
// Interfaces
// ===================================================================

interface IDAOCommitteeProxy {
    function proxyImplementation(uint256 _index) external view returns (address);
    function aliveImplementation(address) external view returns (bool);
    function selectorImplementation(bytes4) external view returns (address);
    function getSelectorImplementation2(bytes4 _selector) external view returns (address);
}

interface IDAOCommitteeSlot0 {
    function candidatesLength() external view returns (uint256);
    function maxMember() external view returns (uint256);
    function quorum() external view returns (uint256);
    function isCandidate(address) external view returns (bool);
    function isMember(address) external view returns (bool);
}

interface IDAOCommitteeSlot1 {
    function cooldownTime() external view returns (uint256);
    function candidateAddOnFactory() external view returns (address);
    function layer2Manager() external view returns (address);
}
