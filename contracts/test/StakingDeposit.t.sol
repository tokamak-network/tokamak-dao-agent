// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title Staking Deposit Fork Tests
 * @notice Tests WTON deposit flow via DepositManager and TON approveAndCall
 *
 * Run with: FOUNDRY_PROFILE=fork forge test --match-contract StakingDeposit --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract StakingDeposit is Test {
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
    ITON ton = ITON(TON);
    IDepositManager depositManager = IDepositManager(DEPOSIT_MANAGER);

    // Known WTON whale (DepositManager itself holds WTON from stakers)
    address constant WTON_WHALE = 0x0b58ca72b12F01FC05F8f252e226f3E2089BD00E;

    function setUp() public {
        // Give user TON via deal (TON is standard enough for deal to work)
        deal(TON, user, 1000 ether);

        // For WTON, try deal first. WTON uses standard ERC20 storage layout.
        deal(WTON, user, 1000 * RAY);
    }

    /**
     * @notice Test: Direct WTON deposit to Layer2 via DepositManager.deposit
     * @dev Flow: user approves DepositManager -> calls deposit(layer2, amount) -> accStaked increases
     */
    function test_Deposit_WTON_ToLayer2() public {
        uint256 depositAmount = 100 * RAY; // 100 WTON in RAY

        // Verify user has WTON
        uint256 wtonBefore = wton.balanceOf(user);
        assertGe(wtonBefore, depositAmount, "User should have enough WTON");

        // Record accStaked before deposit
        uint256 accStakedBefore = depositManager.accStaked(TOKAMAK1, user);

        // User approves DepositManager to spend WTON
        vm.startPrank(user);
        wton.approve(DEPOSIT_MANAGER, depositAmount);

        // User deposits WTON to TOKAMAK1
        depositManager.deposit(TOKAMAK1, depositAmount);
        vm.stopPrank();

        // Verify accStaked increased
        uint256 accStakedAfter = depositManager.accStaked(TOKAMAK1, user);
        assertEq(accStakedAfter - accStakedBefore, depositAmount, "accStaked should increase by deposit amount");

        // Verify user's WTON balance decreased
        uint256 wtonAfter = wton.balanceOf(user);
        assertEq(wtonBefore - wtonAfter, depositAmount, "User WTON should decrease by deposit amount");
    }

    /**
     * @notice Test: Deposit via TON.approveAndCall through WTON callback chain
     * @dev Flow: TON.approveAndCall(WTON, amount, [depositManager, layer2])
     *      -> WTON.onApprove swaps TON->WTON, approves DepositManager, calls DepositManager.onApprove
     *      -> DepositManager records deposit
     *
     * Data format: abi.encode(depositManager, layer2) = 64 bytes of two left-padded addresses
     */
    function test_Deposit_ViaApproveAndCall() public {
        uint256 tonAmount = 100 ether; // 100 TON (18 decimals)
        uint256 expectedWtonAmount = tonAmount * (10 ** 9); // Convert to RAY (27 decimals)

        // Record state before
        uint256 tonBefore = IERC20(TON).balanceOf(user);
        uint256 accStakedBefore = depositManager.accStaked(TOKAMAK1, user);

        // Build approveAndCall data: abi.encode(depositManager, layer2)
        bytes memory data = abi.encode(DEPOSIT_MANAGER, TOKAMAK1);

        // User calls TON.approveAndCall(WTON, amount, data)
        vm.prank(user);
        ton.approveAndCall(WTON, tonAmount, data);

        // Verify TON balance decreased
        uint256 tonAfter = IERC20(TON).balanceOf(user);
        assertEq(tonBefore - tonAfter, tonAmount, "User TON should decrease by deposit amount");

        // Verify accStaked increased by equivalent WTON amount
        uint256 accStakedAfter = depositManager.accStaked(TOKAMAK1, user);
        assertEq(accStakedAfter - accStakedBefore, expectedWtonAmount, "accStaked should increase by WTON equivalent");
    }

    /**
     * @notice Test: Deposit to unregistered Layer2 should revert
     * @dev DepositManager requires layer2 to be registered in Layer2Registry
     */
    function test_Deposit_ToUnregisteredLayer2_Reverts() public {
        uint256 depositAmount = 100 * RAY;
        address fakeLayer2 = address(0xDEAD);

        vm.startPrank(user);
        wton.approve(DEPOSIT_MANAGER, depositAmount);

        // Should revert because fakeLayer2 is not registered
        vm.expectRevert();
        depositManager.deposit(fakeLayer2, depositAmount);
        vm.stopPrank();
    }
}

// Minimal interfaces
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface ITON {
    function approveAndCall(address spender, uint256 amount, bytes calldata data) external returns (bool);
}

interface IDepositManager {
    function deposit(address layer2, uint256 amount) external returns (bool);
    function accStaked(address layer2, address account) external view returns (uint256);
    function pendingUnstaked(address layer2, address account) external view returns (uint256);
}
