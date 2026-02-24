// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "forge-std/Test.sol";
import "./interfaces/ILayer2ManagerComplete.sol";

/// @title DAO-Callable Function Verification: Layer2Manager
/// @notice Verifies all 6 governance-callable functions on Layer2Manager
contract DaoAction_Layer2Manager is Test {
    address constant DAO_COMMITTEE_PROXY = 0xDD9f0cCc044B0781289Ee318e5971b0139602C26;
    address constant LAYER2_MANAGER = 0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D;

    ILayer2ManagerComplete manager;

    modifier withSnapshot() {
        uint256 snap = vm.snapshot();
        _;
        vm.revertTo(snap);
    }

    function setUp() public {
        manager = ILayer2ManagerComplete(LAYER2_MANAGER);
    }

    // ─── Core Functions ───

    function test_daoCanCall_setAddresses_revertsAlreadyInitialized() public withSnapshot {
        // setAddresses can only be called once (initialization guard)
        vm.prank(DAO_COMMITTEE_PROXY);
        vm.expectRevert();
        manager.setAddresses(
            address(1), address(2), address(3), address(4),
            address(5), address(6), address(7), address(8)
        );
    }

    function test_daoCanCall_setOperatorManagerFactory() public withSnapshot {
        address current = manager.operatorManagerFactory();
        address newFactory = makeAddr("newFactory");
        vm.prank(DAO_COMMITTEE_PROXY);
        manager.setOperatorManagerFactory(newFactory);
        assertEq(manager.operatorManagerFactory(), newFactory);
    }

    function test_daoCanCall_setMinimumInitialDepositAmount() public withSnapshot {
        uint256 current = manager.minimumInitialDepositAmount();
        vm.prank(DAO_COMMITTEE_PROXY);
        manager.setMinimumInitialDepositAmount(current + 1);
        assertEq(manager.minimumInitialDepositAmount(), current + 1);
    }

    // ─── Admin Management ───

    function test_daoCanCall_addAdmin() public withSnapshot {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(DAO_COMMITTEE_PROXY);
        manager.addAdmin(newAdmin);
        assertTrue(manager.isAdmin(newAdmin));
    }

    function test_daoCanCall_removeAdmin() public withSnapshot {
        address tempAdmin = makeAddr("tempAdmin");
        vm.prank(DAO_COMMITTEE_PROXY);
        manager.addAdmin(tempAdmin);
        assertTrue(manager.isAdmin(tempAdmin));

        vm.prank(DAO_COMMITTEE_PROXY);
        manager.removeAdmin(tempAdmin);
        assertFalse(manager.isAdmin(tempAdmin));
    }

    function test_daoCanCall_transferAdmin() public withSnapshot {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(DAO_COMMITTEE_PROXY);
        manager.transferAdmin(newAdmin);
        assertTrue(manager.isAdmin(newAdmin));
    }

    // ─── Access Denial ───

    function test_nonOwnerCannotCall_setOperatorManagerFactory() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert();
        manager.setOperatorManagerFactory(makeAddr("evil"));
    }

    function test_nonOwnerCannotCall_addAdmin() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert();
        manager.addAdmin(makeAddr("hacker"));
    }
}
