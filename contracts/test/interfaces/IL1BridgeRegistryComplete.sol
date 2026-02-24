// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for L1BridgeRegistry at 0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4
interface IL1BridgeRegistryComplete {
    // ============================================================
    // Core Functions (onlyOwner)
    // ============================================================

    function setAddresses(address _layer2Manager, address _seigManager, address _ton) external;
    function setSeigniorageCommittee(address _seigniorageCommittee) external;

    // ============================================================
    // Seigniorage Committee Functions (onlySeigniorageCommittee)
    // ============================================================

    function rejectCandidateAddOn(address rollupConfig) external;
    function restoreCandidateAddOn(address rollupConfig, bool rejectedL2Deposit) external;

    // ============================================================
    // View Functions
    // ============================================================

    function seigniorageCommittee() external view returns (address);
    function layer2Manager() external view returns (address);
    function seigManager() external view returns (address);
    function ton() external view returns (address);
    function rollupType(address rollupConfig) external view returns (uint8);
    function rejectRollupConfig(address rollupConfig) external view returns (bool);
    function isRejectedSeigs(address rollupConfig) external view returns (bool);
    function isRejectedL2Deposit(address rollupConfig) external view returns (bool);
    function l2TON(address rollupConfig) external view returns (address);
    function getRollupInfo(address rollupConfig) external view returns (uint8 type_, address l2TON_, bool rejectedSeigs_, bool rejectedL2Deposit_, string memory name_);
    function layer2TVL(address rollupConfig) external view returns (uint256);
    function availableForRegistration(address rollupConfig, uint8 _type) external view returns (bool);
    function isAdmin(address account) external view returns (bool);
    function isManager(address account) external view returns (bool);
    function isRegistrant(address account) external view returns (bool);

    // ============================================================
    // Admin/Role Management (onlyOwner)
    // ============================================================

    function addAdmin(address account) external;
    function removeAdmin(address account) external;
    function transferAdmin(address newAdmin) external;
    function addManager(address account) external;
    function removeManager(address account) external;
    function revokeManager(address account) external;
    function revokeRegistrant(address account) external;

    // ============================================================
    // AccessControl
    // ============================================================

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

    event SetSeigniorageCommittee(address seigniorageCommittee);
    event RejectedCandidateAddOn(address rollupConfig);
    event RestoredCandidateAddOn(address rollupConfig, bool rejectedL2Deposit);
}
