// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for SeigManager via proxy at 0x0b55a0f463b6defb81c6063973763951712d0e5f
/// @notice Combines V1_2 (default) + V1_3 (selector-routed) functions
interface ISeigManagerComplete {
    // ============================================================
    // V1_2 Functions (default slot0)
    // ============================================================

    // -- Core Staking Callbacks --
    function onDeposit(address layer2, address account, uint256 amount) external returns (bool);
    function onWithdraw(address layer2, address account, uint256 amount) external returns (bool);

    // -- Commission --
    function setCommissionRate(address layer2, uint256 commission, bool isCommissionRateNegative) external returns (bool);

    // -- Coinage --
    function deployCoinage(address layer2) external returns (bool);

    // -- Snapshot --
    function snapshot() external returns (uint256);
    function progressSnapshotId() external view returns (uint256);

    // -- Pausable --
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);

    // -- View Functions (V1_2) --
    function stakeOf(address layer2, address account) external view returns (uint256);
    function tot() external view returns (address);
    function coinages(address layer2) external view returns (address);
    function lastCommitBlock(address layer2) external view returns (uint256);
    function seigPerBlock() external view returns (uint256);
    function lastSeigBlock() external view returns (uint256);
    function pausedBlock() external view returns (uint256);
    function unpausedBlock() external view returns (uint256);
    function commissionRates(address layer2) external view returns (uint256);
    function isCommissionRateNegative(address layer2) external view returns (bool);

    // -- Storage Getters --
    function ton() external view returns (address);
    function wton() external view returns (address);
    function registry() external view returns (address);
    function depositManager() external view returns (address);
    function factory() external view returns (address);
    function dao() external view returns (address);
    function powerton() external view returns (address);
    function minimumAmount() external view returns (uint256);
    function powerTONSeigRate() external view returns (uint256);
    function daoSeigRate() external view returns (uint256);
    function relativeSeigRate() external view returns (uint256);
    function accRelativeSeig() external view returns (uint256);
    function lastSnapshotId() external view returns (uint256);

    // -- Commission Delay --
    function adjustCommissionDelay() external view returns (uint256);
    function delayedCommissionBlock(address layer2) external view returns (uint256);
    function delayedCommissionRate(address layer2) external view returns (uint256);
    function delayedCommissionRateNegative(address layer2) external view returns (bool);

    // -- V1_1 Storage --
    function seigStartBlock() external view returns (uint256);
    function initialTotalSupply() external view returns (uint256);
    function burntAmountAtDAO() external view returns (uint256);

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

    // -- AccessibleCommon --
    function addAdmin(address account) external;
    function removeAdmin(address account) external;
    function transferAdmin(address newAdmin) external;
    function isAdmin(address account) external view returns (bool);
    function isOwner() external view returns (bool);
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    // ============================================================
    // V1_3 Functions (selector-routed)
    // ============================================================

    function updateSeigniorage() external returns (bool);
    function updateSeigniorageLayer(address layer2) external returns (bool);
    function excludeFromL2Seigniorage(address layer2) external returns (bool);
    function includeFromL2Seigniorage(address layer2) external returns (bool);
    function claimableL2Seigniorage(address layer2) external view returns (uint256);

    function estimatedDistribute(
        uint256 blockNumber,
        address layer2
    ) external view returns (
        uint256 maxSeig,
        uint256 stakedSeig,
        uint256 unstakedSeig,
        uint256 powertonSeig,
        uint256 daoSeig,
        uint256 relativeSeig,
        uint256 l2TotalSeigs,
        uint256 layer2Seigs
    );

    // -- Setters (onlyOwner) --
    function setL1BridgeRegistry(address l1BridgeRegistry_) external;

    // -- V1_3 Storage --
    function l1BridgeRegistry() external view returns (address);
    function layer2Manager() external view returns (address);
    function layer2StartBlock() external view returns (uint256);
    function l2RewardPerUint() external view returns (uint256);
    function totalLayer2TVL() external view returns (uint256);

    // -- Constants --
    function RAY() external pure returns (uint256);
    function MAX_VALID_COMMISSION() external pure returns (uint256);
    function MIN_VALID_COMMISSION() external pure returns (uint256);
    function SEIG_START_MAINNET() external pure returns (uint256);
    function INITIAL_TOTAL_SUPPLY_MAINNET() external pure returns (uint256);
    function BURNT_AMOUNT_MAINNET() external pure returns (uint256);

    // ============================================================
    // Events
    // ============================================================

    event Paused(address account);
    event Unpaused(address account);
    event Comitted(address indexed layer2);
    event SeigGiven2(
        address indexed layer2,
        uint256 totalSeig,
        uint256 stakedSeig,
        uint256 unstakedSeig,
        uint256 powertonSeig,
        uint256 daoSeig,
        uint256 pseig,
        uint256 l2TotalSeigs,
        uint256 layer2Seigs
    );
    event CommitLog1(
        uint256 totalStakedAmount,
        uint256 totalSupplyOfWTON,
        uint256 prevTotalSupply,
        uint256 nextTotalSupply
    );
    event AddedSeigAtLayer(
        address layer2,
        uint256 seigs,
        uint256 operatorSeigs,
        uint256 nextTotalSupply,
        uint256 prevTotalSupply
    );
    event ExcludedFromL2Seigniorage(address layer2);
    event IncludedFromL2Seigniorage(address layer2);
}
