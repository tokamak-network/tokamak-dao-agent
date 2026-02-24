// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for Layer2Manager at 0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D
interface ILayer2ManagerComplete {
    // ============================================================
    // Core Functions (onlyOwner)
    // ============================================================

    function setAddresses(
        address _l1BridgeRegistry,
        address _operatorManagerFactory,
        address _ton,
        address _wton,
        address _dao,
        address _depositManager,
        address _seigManager,
        address _swapProxy
    ) external;

    function setOperatorManagerFactory(address _operatorManagerFactory) external;
    function setMinimumInitialDepositAmount(uint256 _minimumInitialDepositAmount) external;

    // ============================================================
    // View Functions
    // ============================================================

    function l1BridgeRegistry() external view returns (address);
    function operatorManagerFactory() external view returns (address);
    function ton() external view returns (address);
    function wton() external view returns (address);
    function dao() external view returns (address);
    function depositManager() external view returns (address);
    function seigManager() external view returns (address);
    function swapProxy() external view returns (address);
    function minimumInitialDepositAmount() external view returns (uint256);
    function isAdmin(address account) external view returns (bool);
    function rollupConfigOfOperator(address _oper) external view returns (address);
    function operatorOfRollupConfig(address _rollupConfig) external view returns (address);
    function candidateAddOnOfOperator(address _oper) external view returns (address);
    function statusLayer2(address _rollupConfig) external view returns (uint8);
    function availableRegister(address _rollupConfig) external view returns (bool);

    // ============================================================
    // Admin Role Management
    // ============================================================

    function addAdmin(address account) external;
    function removeAdmin(address account) external;
    function transferAdmin(address newAdmin) external;

    // -- AccessControl --
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleMemberCount(bytes32 role) external view returns (uint256);
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;

    // -- ProxyStorage --
    function pauseProxy() external view returns (bool);
    function proxyImplementation(uint256) external view returns (address);
    function aliveImplementation(address) external view returns (bool);
    function selectorImplementation(bytes4) external view returns (address);

    // ============================================================
    // Events
    // ============================================================

    event SetOperatorManagerFactory(address operatorManagerFactory);
    event SetMinimumInitialDepositAmount(uint256 minimumInitialDepositAmount);
}
