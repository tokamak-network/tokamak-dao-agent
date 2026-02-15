// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for WTON at 0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2
/// @notice Solidity 0.5.12 contract, RAY precision (27 decimals)
interface IWTONComplete {
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

    // -- SeigToken (inherited) --
    function seigManager() external view returns (address);
    function setSeigManager(address _seigManager) external;

    // -- WTON-specific --
    function swapToTON(uint256 wtonAmount) external returns (bool);
    function swapFromTON(uint256 tonAmount) external returns (bool);
    function swapToTONAndTransfer(address to, uint256 wtonAmount) external returns (bool);
    function swapFromTONAndTransfer(address to, uint256 tonAmount) external returns (bool);

    // -- approveAndCall callback --
    function onApprove(address owner, address spender, uint256 tonAmount, bytes calldata data) external returns (bool);

    // -- Callback control --
    function callbackEnabled() external view returns (bool);
    function enableCallback(bool _callbackEnabled) external;

    // -- TON reference --
    function ton() external view returns (address);

    // -- Events --
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
}
