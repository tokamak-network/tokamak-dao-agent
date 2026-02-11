// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title ApproveAndCall Full Chain Fork Tests
 * @notice Tests the complete TON -> WTON -> DepositManager staking callback chain
 *
 * This is the most important test because it validates the actual user-facing staking flow:
 *   TON.approveAndCall(WTON, amount, abi.encode(DEPOSIT_MANAGER, TOKAMAK1))
 *     -> TON approves WTON for amount
 *     -> WTON.onApprove: swaps TON to WTON, approves DepositManager, calls DepositManager.onApprove
 *     -> DepositManager.onApprove: deposits WTON into Layer2
 *
 * Data format: abi.encode(depositManager, layer2) = 64 bytes of two left-padded 32-byte addresses
 * (NOT abi.encodePacked which would produce 40 bytes)
 *
 * Run with: FOUNDRY_PROFILE=fork forge test --match-contract ApproveAndCall --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract ApproveAndCall is Test {
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
    IERC20 tonToken = IERC20(TON);
    IERC20 wtonToken = IERC20(WTON);
    ITON ton = ITON(TON);
    IDepositManager depositManager = IDepositManager(DEPOSIT_MANAGER);
    ISeigManager seigManager = ISeigManager(SEIG_MANAGER);

    function setUp() public {
        // Give user TON tokens (18 decimals)
        deal(TON, user, 1000 ether);
    }

    /**
     * @notice Test: Full approveAndCall chain - TON -> WTON -> DepositManager -> Layer2 staking
     * @dev This is the primary user-facing staking flow in the Tokamak Network.
     *      A single transaction converts TON to WTON and deposits it for staking.
     *
     *      Chain of calls:
     *      1. user calls TON.approveAndCall(WTON, tonAmount, abi.encode(DEPOSIT_MANAGER, TOKAMAK1))
     *      2. TON.approve(WTON, tonAmount) is called internally
     *      3. TON._callOnApprove -> WTON.onApprove(owner, spender, tonAmount, data)
     *      4. WTON.onApprove:
     *         a. _swapFromTON(owner, owner, tonAmount) -- mints WTON, takes TON
     *         b. _approve(owner, depositManager, wtonAmount)
     *         c. _callOnApprove(owner, depositManager, wtonAmount, abi.encode(layer2))
     *      5. DepositManager.onApprove:
     *         a. decodes layer2 from data
     *         b. calls _deposit(layer2, owner, wtonAmount, owner)
     *         c. transfers WTON from owner to DepositManager
     *         d. calls SeigManager.onDeposit to mint coinage
     */
    function test_ApproveAndCall_FullChain() public {
        uint256 tonAmount = 100 ether; // 100 TON (18 decimals)
        uint256 expectedWtonAmount = tonAmount * (10 ** 9); // 100 * 10^27 in RAY

        // Record state before
        uint256 tonBefore = tonToken.balanceOf(user);
        uint256 accStakedBefore = depositManager.accStaked(TOKAMAK1, user);

        // Read coinage address and check stakeOf before
        address coinageAddr = seigManager.coinages(TOKAMAK1);
        require(coinageAddr != address(0), "Coinage should exist for TOKAMAK1");
        uint256 stakeOfBefore = seigManager.stakeOf(TOKAMAK1, user);

        // Build data: abi.encode(depositManager, layer2)
        // This is two 32-byte left-padded addresses = 64 bytes total
        bytes memory data = abi.encode(DEPOSIT_MANAGER, TOKAMAK1);
        assertEq(data.length, 64, "Data should be 64 bytes (two abi-encoded addresses)");

        // Execute the full approveAndCall chain
        vm.prank(user);
        ton.approveAndCall(WTON, tonAmount, data);

        // === Verify Results ===

        // 1. TON balance should decrease by tonAmount
        uint256 tonAfter = tonToken.balanceOf(user);
        assertEq(tonBefore - tonAfter, tonAmount, "User TON should decrease by deposit amount");

        // 2. User should NOT hold WTON (it was deposited, not kept)
        uint256 userWtonAfter = wtonToken.balanceOf(user);
        assertEq(userWtonAfter, 0, "User should not hold WTON after deposit (all deposited)");

        // 3. accStaked in DepositManager should increase by WTON equivalent
        uint256 accStakedAfter = depositManager.accStaked(TOKAMAK1, user);
        assertEq(
            accStakedAfter - accStakedBefore,
            expectedWtonAmount,
            "accStaked should increase by WTON equivalent of TON deposited"
        );

        // 4. stakeOf in SeigManager should increase (coinage was minted)
        //    Note: The coinage system uses factor-based math (rmul/rdiv) which can introduce
        //    tiny rounding errors (a few wei in 27-decimal precision). Use approximate comparison.
        uint256 stakeOfAfter = seigManager.stakeOf(TOKAMAK1, user);
        uint256 stakeIncrease = stakeOfAfter - stakeOfBefore;
        assertApproxEqAbs(
            stakeIncrease,
            expectedWtonAmount,
            10, // Allow up to 10 wei rounding error in 27-decimal precision
            "stakeOf should increase by approximately deposited WTON amount"
        );
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

interface ISeigManager {
    function stakeOf(address layer2, address account) external view returns (uint256);
    function coinages(address layer2) external view returns (address);
}
