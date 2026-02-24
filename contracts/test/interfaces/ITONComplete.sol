// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for TON at 0x2be5e8c109e2197D077D13A82dAead6a9b3433C5
/// @notice ERC20 with SeigToken transferFrom restriction
interface ITONComplete {
    // -- ERC20 Standard --
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    // -- approveAndCall --
    function approveAndCall(address spender, uint256 amount, bytes calldata data) external returns (bool);

    // -- ERC20Mintable --
    function mint(address account, uint256 amount) external returns (bool);
    function isMinter(address account) external view returns (bool);
    function addMinter(address account) external;
    function renounceMinter() external;

    // -- Ownable --
    function owner() external view returns (address);
    function isOwner() external view returns (bool);
    function renounceOwnership() external;
    function transferOwnership(address newOwner) external;

    // -- SeigToken --
    function seigManager() external view returns (address);
    function setSeigManager(address _seigManager) external;

    // -- Events --
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
