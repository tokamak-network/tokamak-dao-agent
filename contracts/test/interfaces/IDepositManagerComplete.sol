// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for DepositManager at 0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e (proxy)
/// @notice Combines V1.0 (default) + V1.1 (selector-routed) functions
interface IDepositManagerComplete {
    struct WithdrawalReqeust {
        uint128 withdrawableBlockNumber;
        uint128 amount;
        bool processed;
    }

    // ============================================================
    // V1.0 Core Functions
    // ============================================================

    // -- Deposit --
    function deposit(address layer2, uint256 amount) external returns (bool);
    function onApprove(address owner, address spender, uint256 amount, bytes calldata data) external returns (bool);

    // -- Withdrawal --
    function requestWithdrawal(address layer2, uint256 amount) external returns (bool);
    function processRequest(address layer2, bool receiveTON) external returns (bool);
    function requestWithdrawalAll(address layer2) external returns (bool);
    function processRequests(address layer2, uint256 n, bool receiveTON) external returns (bool);

    // -- View Functions --
    function wton() external view returns (address);
    function registry() external view returns (address);
    function seigManager() external view returns (address);
    function globalWithdrawalDelay() external view returns (uint256);
    function accStaked(address layer2, address account) external view returns (uint256);
    function accStakedLayer2(address layer2) external view returns (uint256);
    function accStakedAccount(address account) external view returns (uint256);
    function pendingUnstaked(address layer2, address account) external view returns (uint256);
    function pendingUnstakedLayer2(address layer2) external view returns (uint256);
    function pendingUnstakedAccount(address account) external view returns (uint256);
    function accUnstaked(address layer2, address account) external view returns (uint256);
    function accUnstakedLayer2(address layer2) external view returns (uint256);
    function accUnstakedAccount(address account) external view returns (uint256);
    function withdrawalRequestIndex(address layer2, address account) external view returns (uint256);
    function withdrawalRequest(address layer2, address account, uint256 index) external view returns (uint128 withdrawableBlockNumber, uint128 amount, bool processed);
    function numRequests(address layer2, address account) external view returns (uint256);
    function numPendingRequests(address layer2, address account) external view returns (uint256);

    // ============================================================
    // V1.1 Additional Functions (selector-routed)
    // ============================================================

    function withdrawAndDepositL2(address layer2, uint256 amount) external returns (bool);

    // -- V1.1 Admin Functions --
    function setMinDepositGasLimit(uint32 gasLimit_) external;
    function setAddresses(address _l1BridgeRegistry, address _layer2Manager) external;
    function minDepositGasLimit() external view returns (uint32);

    // ============================================================
    // Proxy/Access
    // ============================================================

    // -- ProxyStorage --
    function pauseProxy() external view returns (bool);
    function proxyImplementation(uint256) external view returns (address);
    function aliveImplementation(address) external view returns (bool);
    function selectorImplementation(bytes4) external view returns (address);

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

    // -- Constants --
    function MINTER_ROLE() external view returns (bytes32);

    // ============================================================
    // Events
    // ============================================================

    event Deposited(address indexed layer2, address indexed account, uint256 amount);
    event WithdrawalRequested(address indexed layer2, address indexed account, uint256 amount);
    event WithdrawalProcessed(address indexed layer2, address indexed account, uint256 amount);
}
