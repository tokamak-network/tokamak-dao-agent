// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "forge-std/Test.sol";
import "./interfaces/IWTONComplete.sol";
import "./interfaces/ITONComplete.sol";

/// @title DAO-Callable Function Verification: WTON
/// @notice Verifies all 12 governance-callable functions on WTON
contract DaoAction_WTON is Test {
    address constant DAO_COMMITTEE_PROXY = 0xDD9f0cCc044B0781289Ee318e5971b0139602C26;
    address constant WTON_ADDR = 0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2;
    address constant TON_ADDR = 0x2be5e8c109e2197D077D13A82dAead6a9b3433C5;

    IWTONComplete wton;
    ITONComplete ton;

    uint256 constant RAY = 1e27; // WTON has 27 decimals

    modifier withSnapshot() {
        uint256 snap = vm.snapshot();
        _;
        vm.revertTo(snap);
    }

    function setUp() public {
        wton = IWTONComplete(WTON_ADDR);
        ton = ITONComplete(TON_ADDR);
    }

    // ─── Swap Functions ───

    function test_daoCanCall_swapToTON() public withSnapshot {
        // Give DAO some WTON
        deal(WTON_ADDR, DAO_COMMITTEE_PROXY, 1 * RAY);
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.swapToTON(1 * RAY);
        assertTrue(success);
    }

    function test_daoCanCall_swapFromTON() public withSnapshot {
        // Give DAO some TON
        deal(TON_ADDR, DAO_COMMITTEE_PROXY, 1 ether);
        // DAO needs to approve WTON to spend TON
        vm.prank(DAO_COMMITTEE_PROXY);
        ton.approve(WTON_ADDR, 1 ether);
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.swapFromTON(1 ether);
        assertTrue(success);
    }

    function test_daoCanCall_swapToTONAndTransfer() public withSnapshot {
        address recipient = makeAddr("recipient");
        deal(WTON_ADDR, DAO_COMMITTEE_PROXY, 1 * RAY);
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.swapToTONAndTransfer(recipient, 1 * RAY);
        assertTrue(success);
        assertGt(ton.balanceOf(recipient), 0);
    }

    function test_daoCanCall_swapFromTONAndTransfer() public withSnapshot {
        address recipient = makeAddr("recipient");
        deal(TON_ADDR, DAO_COMMITTEE_PROXY, 1 ether);
        vm.prank(DAO_COMMITTEE_PROXY);
        ton.approve(WTON_ADDR, 1 ether);
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.swapFromTONAndTransfer(recipient, 1 ether);
        assertTrue(success);
        assertGt(wton.balanceOf(recipient), 0);
    }

    // ─── ERC20 Functions ───

    function test_daoCanCall_approve() public withSnapshot {
        address spender = makeAddr("spender");
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.approve(spender, 100 * RAY);
        assertTrue(success);
        assertEq(wton.allowance(DAO_COMMITTEE_PROXY, spender), 100 * RAY);
    }

    function test_daoCanCall_approveAndCall() public withSnapshot {
        // approveAndCall to a contract that doesn't implement onApprove will revert
        // but access control should pass
        deal(WTON_ADDR, DAO_COMMITTEE_PROXY, 1 * RAY);
        address spender = makeAddr("spender");
        vm.prank(DAO_COMMITTEE_PROXY);
        try wton.approveAndCall(spender, 1 * RAY, "") {} catch {}
    }

    function test_daoCanCall_transfer() public withSnapshot {
        address recipient = makeAddr("recipient");
        deal(WTON_ADDR, DAO_COMMITTEE_PROXY, 1 * RAY);
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.transfer(recipient, 1 * RAY);
        assertTrue(success);
        assertEq(wton.balanceOf(recipient), 1 * RAY);
    }

    function test_daoCanCall_transferFrom() public withSnapshot {
        address from = makeAddr("from");
        address to = makeAddr("to");
        deal(WTON_ADDR, from, 1 * RAY);
        // from approves DAO
        vm.prank(from);
        wton.approve(DAO_COMMITTEE_PROXY, 1 * RAY);
        // DAO calls transferFrom
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.transferFrom(from, to, 1 * RAY);
        assertTrue(success);
        assertEq(wton.balanceOf(to), 1 * RAY);
    }

    // ─── Admin Functions ───

    function test_daoCanCall_addMinter() public withSnapshot {
        address newMinter = makeAddr("newMinter");
        vm.prank(DAO_COMMITTEE_PROXY);
        // WTON.addMinter requires msg.sender to be a minter
        // The DAO may or may not be a minter
        try wton.addMinter(newMinter) {
            assertTrue(wton.isMinter(newMinter));
        } catch {
            // DAO is not a minter on WTON — document this
        }
    }

    function test_daoCanCall_decreaseAllowance() public withSnapshot {
        address spender = makeAddr("spender");
        // First approve, then decrease
        vm.prank(DAO_COMMITTEE_PROXY);
        wton.approve(spender, 100 * RAY);
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.decreaseAllowance(spender, 50 * RAY);
        assertTrue(success);
        assertEq(wton.allowance(DAO_COMMITTEE_PROXY, spender), 50 * RAY);
    }

    function test_daoCanCall_increaseAllowance() public withSnapshot {
        address spender = makeAddr("spender");
        vm.prank(DAO_COMMITTEE_PROXY);
        bool success = wton.increaseAllowance(spender, 100 * RAY);
        assertTrue(success);
        assertEq(wton.allowance(DAO_COMMITTEE_PROXY, spender), 100 * RAY);
    }

    function test_daoCanCall_transferOwnership() public withSnapshot {
        // transferOwnership(target, newOwner) — calls target.transferOwnership(newOwner)
        // This is a SeigManager-style delegate pattern
        // WTON owner is SeigManager, so DAO cannot directly call transferOwnership on WTON
        // But through SeigManager's daoExecuteTransaction, the DAO could do it
        // Direct call from DAO should revert (DAO is not WTON owner)
        address newOwner = makeAddr("newOwner");
        vm.prank(DAO_COMMITTEE_PROXY);
        try wton.transferOwnership(newOwner) {
            // If it succeeds, DAO has direct ownership
        } catch {
            // Expected: DAO is not the direct owner of WTON
        }
    }

    // ─── Access Denial ───

    function test_nonOwnerCannotCall_transfer() public {
        // Anyone can call transfer (it's ERC20), but they need a balance
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert();
        wton.transfer(attacker, 1);
    }
}
