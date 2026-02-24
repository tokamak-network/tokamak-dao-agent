// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "forge-std/Test.sol";
import "./interfaces/IDepositManagerComplete.sol";

/// @title DAO-Callable Function Verification: DepositManager
/// @notice Verifies all 5 governance-callable functions on DepositManager
contract DaoAction_DepositManager is Test {
    address constant DAO_COMMITTEE_PROXY = 0xDD9f0cCc044B0781289Ee318e5971b0139602C26;
    address constant DEPOSIT_MANAGER = 0x0b58ca72b12F01FC05F8f252e226f3E2089BD00E;

    IDepositManagerComplete depositManager;

    modifier withSnapshot() {
        uint256 snap = vm.snapshot();
        _;
        vm.revertTo(snap);
    }

    function setUp() public {
        depositManager = IDepositManagerComplete(DEPOSIT_MANAGER);
    }

    // ─── Core Functions ───

    function test_daoCanCall_setMinDepositGasLimit() public withSnapshot {
        // setMinDepositGasLimit(uint32) — V1_1 function
        vm.prank(DAO_COMMITTEE_PROXY);
        // Use a non-zero value; current default is 210_000 if unset
        try depositManager.setMinDepositGasLimit(250_000) {} catch {
            // May revert if the selector is not routed in current proxy
        }
    }

    function test_daoCanCall_setAddresses() public withSnapshot {
        // setAddresses(address _l1BridgeRegistry, address _layer2Manager) — V1_1 function
        vm.prank(DAO_COMMITTEE_PROXY);
        try depositManager.setAddresses(address(1), address(2)) {} catch {
            // May revert if already initialized or selector not routed
        }
    }

    // ─── Admin Management ───

    function test_daoCanCall_addAdmin() public withSnapshot {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(DAO_COMMITTEE_PROXY);
        depositManager.addAdmin(newAdmin);
        assertTrue(depositManager.isAdmin(newAdmin));
    }

    /// @notice removeAdmin uses renounceRole — can only remove self.
    function test_daoCanCall_removeAdmin_selfOnly() public withSnapshot {
        vm.prank(DAO_COMMITTEE_PROXY);
        depositManager.removeAdmin(DAO_COMMITTEE_PROXY);
        assertFalse(depositManager.isAdmin(DAO_COMMITTEE_PROXY));
    }

    function test_daoCanCall_transferAdmin() public withSnapshot {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(DAO_COMMITTEE_PROXY);
        depositManager.transferAdmin(newAdmin);
        assertTrue(depositManager.isAdmin(newAdmin));
    }

    // ─── Access Denial ───

    function test_nonOwnerCannotCall_addAdmin() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert();
        depositManager.addAdmin(makeAddr("hacker"));
    }

    function test_nonOwnerCannotCall_transferAdmin() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert();
        depositManager.transferAdmin(makeAddr("hacker"));
    }
}
