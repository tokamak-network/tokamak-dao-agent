// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/// @title MockERC20Votes
/// @notice Minimal ERC20 + ERC20Votes token for governance integration testing.
/// @dev Combines ERC20, ERC20Permit, and ERC20Votes (OZ v4.9.3).
///      Uses block numbers for checkpointing (default ERC20Votes behavior).
contract MockERC20Votes is ERC20, ERC20Permit, ERC20Votes {
    constructor() ERC20("MockToken", "MTK") ERC20Permit("MockToken") {}

    /// @notice Mint tokens to any address (unrestricted for testing)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // ─── Required overrides (diamond inheritance) ───

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}
