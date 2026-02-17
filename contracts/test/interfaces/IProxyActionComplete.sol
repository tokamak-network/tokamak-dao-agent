// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for Tokamak proxy management functions
/// @notice Covers proxy admin functions shared across all Tokamak proxy contracts
///         (DAOCommitteeProxy, SeigManagerProxy, DepositManagerProxy, etc.)
interface IProxyActionComplete {
    // ============================================================
    // Proxy Upgrade Functions
    // ============================================================

    /// @dev Set slot0 implementation (standard upgrade)
    function upgradeTo(address impl) external;

    /// @dev Set slot0 implementation (DAOCommitteeProxy2 variant, onlyOwner2)
    function upgradeTo2(address impl) external;

    // ============================================================
    // Implementation Management
    // ============================================================

    /// @dev Set implementation at arbitrary index with alive flag
    function setImplementation2(
        address newImplementation,
        uint256 _index,
        bool _alive
    ) external;

    /// @dev Set alive status of an implementation
    function setAliveImplementation2(
        address newImplementation,
        bool _alive
    ) external;

    // ============================================================
    // Selector Routing
    // ============================================================

    /// @dev Map function selectors to an implementation address
    function setSelectorImplementations2(
        bytes4[] calldata _selectors,
        address _imp
    ) external;

    /// @dev Remove selector-to-implementation mappings
    function unsetSelectorImplementations2(
        bytes4[] calldata _selectors
    ) external;

    // ============================================================
    // Pause
    // ============================================================

    /// @dev Pause or resume the proxy
    function setProxyPause(bool _pause) external;

    // ============================================================
    // View Functions
    // ============================================================

    /// @dev Get implementation address for a function selector
    function getSelectorImplementation2(bytes4 _selector) external view returns (address impl);

    /// @dev Get implementation address at index
    function implementation2(uint256 _index) external view returns (address);

    /// @dev Check if an implementation is alive
    function aliveImplementation(address _impl) external view returns (bool);

    /// @dev Get implementation at slot0 (the primary implementation)
    function implementation() external view returns (address);
}
