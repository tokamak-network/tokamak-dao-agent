// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for DAOVault at 0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303
interface IDAOVaultComplete {
    // -- Core Functions --
    function claimTON(address _to, uint256 _amount) external;
    function claimWTON(address _to, uint256 _amount) external;
    function claimERC20(address _token, address _to, uint256 _amount) external;
    function setTON(address _ton) external;
    function setWTON(address _wton) external;
    function approveTON(address _to, uint256 _amount) external;
    function approveWTON(address _to, uint256 _amount) external;
    function approveERC20(address _token, address _to, uint256 _amount) external;

    // -- View/State --
    function ton() external view returns (address);
    function wton() external view returns (address);

    // -- AccessibleCommon --
    function addAdmin(address account) external;
    function removeAdmin(address account) external;
    function transferAdmin(address newAdmin) external;
    function transferOwnership(address newAdmin) external;
    function renounceOwnership() external;
    function isAdmin(address account) external view returns (bool);
    function isOwner() external view returns (bool);
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    // -- AccessControl --
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleMemberCount(bytes32 role) external view returns (uint256);
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;

    // -- Events --
    event ClaimedTON(address indexed to, uint256 amount);
    event ClaimedWTON(address indexed to, uint256 amount);
    event ClaimedERC20(address indexed token, address indexed to, uint256 amount);
}
