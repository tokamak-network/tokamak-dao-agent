// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title TON DEX Compatibility Tests
 * @notice Fork tests to verify TON token behavior with DEX protocols
 *
 * Run with: forge test --match-contract TONCompatibility --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract TONCompatibility is Test {
    // Token addresses
    address constant TON = 0x2be5e8c109e2197D077D13A82dAead6a9b3433C5;
    address constant WTON = 0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // DEX routers
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    // Test users
    address user = address(0x1234);
    address recipient = address(0x5678);

    // Interfaces
    IERC20 ton = IERC20(TON);
    IERC20 wton = IERC20(WTON);

    function setUp() public {
        // Give user some TON for testing (using deal cheat)
        deal(TON, user, 1000 ether);
        deal(WTON, user, 1000 ether);
    }

    /**
     * @notice Test: TON transferFrom by third party (e.g., DEX router) should REVERT
     * @dev TON has a restriction: only sender or recipient can call transferFrom
     *      This is the core issue preventing DEX compatibility
     */
    function test_TON_TransferFrom_ThirdParty_Reverts() public {
        uint256 amount = 100 ether;

        // User approves router
        vm.prank(user);
        ton.approve(UNISWAP_V2_ROUTER, amount);

        // Router tries to transfer (this is what happens during a swap)
        vm.prank(UNISWAP_V2_ROUTER);
        vm.expectRevert("SeigToken: only sender or recipient can transfer");
        ton.transferFrom(user, recipient, amount);
    }

    /**
     * @notice Test: TON transferFrom by sender should SUCCEED
     */
    function test_TON_TransferFrom_BySender_Succeeds() public {
        uint256 amount = 100 ether;

        // User approves themselves (self-approval)
        vm.prank(user);
        ton.approve(user, amount);

        // User calls transferFrom (as sender)
        vm.prank(user);
        ton.transferFrom(user, recipient, amount);

        assertEq(ton.balanceOf(recipient), amount);
    }

    /**
     * @notice Test: TON transferFrom by recipient should SUCCEED
     */
    function test_TON_TransferFrom_ByRecipient_Succeeds() public {
        uint256 amount = 100 ether;

        // User approves recipient
        vm.prank(user);
        ton.approve(recipient, amount);

        // Recipient calls transferFrom (as recipient)
        vm.prank(recipient);
        ton.transferFrom(user, recipient, amount);

        assertEq(ton.balanceOf(recipient), amount);
    }

    /**
     * @notice Test: WTON transferFrom by third party should SUCCEED
     * @dev WTON uses standard ERC20, no transfer restrictions
     */
    function test_WTON_TransferFrom_ThirdParty_Succeeds() public {
        uint256 amount = 100 ether;

        // User approves router
        vm.prank(user);
        wton.approve(UNISWAP_V2_ROUTER, amount);

        // Router transfers (this works for WTON)
        vm.prank(UNISWAP_V2_ROUTER);
        wton.transferFrom(user, recipient, amount);

        assertEq(wton.balanceOf(recipient), amount);
    }

    /**
     * @notice Test: Uniswap V2 swap with TON should REVERT
     * @dev Full swap simulation - router calls transferFrom internally
     */
    function test_TON_UniswapV2_Swap_Reverts() public {
        uint256 amountIn = 10 ether;

        // User approves router
        vm.prank(user);
        ton.approve(UNISWAP_V2_ROUTER, amountIn);

        // Build swap path
        address[] memory path = new address[](2);
        path[0] = TON;
        path[1] = WETH;

        // Attempt swap - should revert due to transferFrom restriction
        vm.prank(user);
        vm.expectRevert(); // Will revert with "SeigToken: only sender or recipient can transfer"
        IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            amountIn,
            0, // Accept any amount out
            path,
            user, // Recipient
            block.timestamp + 3600
        );
    }

    /**
     * @notice Test: Sushiswap swap with TON should REVERT
     * @dev Same issue as Uniswap V2 (same router interface)
     */
    function test_TON_Sushiswap_Swap_Reverts() public {
        uint256 amountIn = 10 ether;

        vm.prank(user);
        ton.approve(SUSHISWAP_ROUTER, amountIn);

        address[] memory path = new address[](2);
        path[0] = TON;
        path[1] = WETH;

        vm.prank(user);
        vm.expectRevert();
        IUniswapV2Router(SUSHISWAP_ROUTER).swapExactTokensForTokens(
            amountIn,
            0,
            path,
            user,
            block.timestamp + 3600
        );
    }

    /**
     * @notice Test: WTON can be swapped on Uniswap V2
     * @dev WTON has no transfer restrictions, so DEX swaps work
     */
    function test_WTON_UniswapV2_SwapApprovalWorks() public {
        uint256 amountIn = 10 ether;

        // User approves router
        vm.prank(user);
        wton.approve(UNISWAP_V2_ROUTER, amountIn);

        // Verify approval succeeded
        uint256 allowance = wton.allowance(user, UNISWAP_V2_ROUTER);
        assertEq(allowance, amountIn);

        // Note: Full swap would require actual liquidity pool
        // This test just verifies the approval mechanism works
    }
}

// Minimal interfaces
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}
