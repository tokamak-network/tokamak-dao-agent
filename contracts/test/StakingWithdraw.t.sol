// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title Staking Withdrawal Fork Tests
 * @notice Tests WTON withdrawal flow: requestWithdrawal, processRequest with delay
 *
 * Run with: FOUNDRY_PROFILE=fork forge test --match-contract StakingWithdraw --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract StakingWithdraw is Test {
    // Token addresses
    address constant TON = 0x2be5e8c109e2197D077D13A82dAead6a9b3433C5;
    address constant WTON = 0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2;

    // Staking infrastructure
    address constant DEPOSIT_MANAGER = 0x0b58ca72b12F01FC05F8f252e226f3E2089BD00E;
    address constant SEIG_MANAGER = 0x0b55a0f463b6DEFb81c6063973763951712D0E5F;
    address constant LAYER2_REGISTRY = 0x7846c2248A7B4dE77E9C2Bae7FBB93bfC286837B;
    address constant TOKAMAK1 = 0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF;

    // WTON has 27 decimals (RAY precision)
    uint256 constant RAY = 10 ** 27;

    // Test user
    address user = address(0xBEEF);

    // Interfaces
    IERC20 wton = IERC20(WTON);
    IDepositManager depositManager = IDepositManager(DEPOSIT_MANAGER);

    function setUp() public {
        // Give user WTON via deal
        deal(WTON, user, 1000 * RAY);

        // Deposit first so we have something to withdraw
        uint256 depositAmount = 500 * RAY;
        vm.startPrank(user);
        wton.approve(DEPOSIT_MANAGER, depositAmount);
        depositManager.deposit(TOKAMAK1, depositAmount);
        vm.stopPrank();
    }

    /**
     * @notice Test: Request withdrawal creates a pending request
     * @dev After deposit, requestWithdrawal should increase pendingUnstaked and numPendingRequests
     */
    function test_RequestWithdrawal() public {
        uint256 withdrawAmount = 100 * RAY;

        // Record state before
        uint256 pendingBefore = depositManager.pendingUnstaked(TOKAMAK1, user);
        uint256 numPendingBefore = depositManager.numPendingRequests(TOKAMAK1, user);

        // Request withdrawal
        vm.prank(user);
        depositManager.requestWithdrawal(TOKAMAK1, withdrawAmount);

        // Verify pending amount increased
        uint256 pendingAfter = depositManager.pendingUnstaked(TOKAMAK1, user);
        assertEq(pendingAfter - pendingBefore, withdrawAmount, "pendingUnstaked should increase by withdrawal amount");

        // Verify number of pending requests increased
        uint256 numPendingAfter = depositManager.numPendingRequests(TOKAMAK1, user);
        assertEq(numPendingAfter, numPendingBefore + 1, "numPendingRequests should increase by 1");
    }

    /**
     * @notice Test: Process withdrawal request after delay period passes
     * @dev Uses vm.roll to advance past globalWithdrawalDelay (block-based delay)
     */
    function test_ProcessRequest_AfterDelay() public {
        uint256 withdrawAmount = 100 * RAY;

        // Request withdrawal
        vm.prank(user);
        depositManager.requestWithdrawal(TOKAMAK1, withdrawAmount);

        // Read the withdrawal delay (in blocks)
        uint256 delay = depositManager.getDelayBlocks(TOKAMAK1);

        // Fast-forward past the delay (block-based, not timestamp-based)
        vm.roll(block.number + delay + 1);

        // Record WTON balance before processing
        uint256 wtonBefore = wton.balanceOf(user);

        // Process the withdrawal request (receive as WTON, not TON)
        vm.prank(user);
        depositManager.processRequest(TOKAMAK1, false);

        // Verify WTON was received
        uint256 wtonAfter = wton.balanceOf(user);
        assertEq(wtonAfter - wtonBefore, withdrawAmount, "User should receive WTON back after processing");
    }

    /**
     * @notice Test: Process withdrawal request before delay should revert
     * @dev DepositManager checks withdrawableBlockNumber <= block.number
     */
    function test_ProcessRequest_BeforeDelay_Reverts() public {
        uint256 withdrawAmount = 100 * RAY;

        // Request withdrawal
        vm.prank(user);
        depositManager.requestWithdrawal(TOKAMAK1, withdrawAmount);

        // Do NOT advance blocks -- try to process immediately
        // Should revert with "DepositManager: wait for withdrawal delay"
        vm.prank(user);
        vm.expectRevert("DepositManager: wait for withdrawal delay");
        depositManager.processRequest(TOKAMAK1, false);
    }
}

// Minimal interfaces
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IDepositManager {
    function deposit(address layer2, uint256 amount) external returns (bool);
    function accStaked(address layer2, address account) external view returns (uint256);
    function pendingUnstaked(address layer2, address account) external view returns (uint256);
    function requestWithdrawal(address layer2, uint256 amount) external returns (bool);
    function processRequest(address layer2, bool receiveTON) external returns (bool);
    function globalWithdrawalDelay() external view returns (uint256);
    function getDelayBlocks(address layer2) external view returns (uint256);
    function numPendingRequests(address layer2, address account) external view returns (uint256);
}
