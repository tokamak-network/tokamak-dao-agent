// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for Layer2Registry at 0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b (proxy)
interface ILayer2RegistryComplete {
    // -- Core Functions --
    function register(address layer2) external returns (bool);
    function registerAndDeployCoinage(address layer2, address seigManager) external returns (bool);
    function unregister(address layer2) external returns (bool);
    function deployCoinage(address layer2, address seigManager) external returns (bool);

    // -- View Functions --
    function layer2s(address) external view returns (bool);
    function numLayer2s() external view returns (uint256);
    function layer2ByIndex(uint256 index) external view returns (address);

    // -- AccessibleCommon --
    function addAdmin(address account) external;
    function removeAdmin(address account) external;
    function transferAdmin(address newAdmin) external;
    function transferOwnership(address newAdmin) external;
    function renounceOwnership() external;
    function isAdmin(address account) external view returns (bool);
    function isOwner() external view returns (bool);
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    // -- Role Management --
    function addMinter(address account) external;
    function removeMinter(address account) external;
    function addOperator(address account) external;
    function removeOperator(address account) external;

    // -- ProxyStorage --
    function pauseProxy() external view returns (bool);
    function proxyImplementation(uint256) external view returns (address);
    function aliveImplementation(address) external view returns (bool);
    function selectorImplementation(bytes4) external view returns (address);

    // -- AccessControl --
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleMemberCount(bytes32 role) external view returns (uint256);
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;

    // -- Events --
    event Layer2Registered(address indexed layer2);
    event Layer2Unregistered(address indexed layer2);
}
