// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for CandidateFactory at 0x9fc7100a16407ee24a79c834a56e6eca555a5d7c (proxy)
interface ICandidateFactoryComplete {
    // -- Core Functions --
    function deploy(
        address _candidate,
        bool _isLayer2Candidate,
        string memory _memo,
        address _committee,
        address _seigManager
    ) external returns (address);

    function setAddress(
        address _depositManager,
        address _daoCommittee,
        address _candidateImp,
        address _ton,
        address _wton
    ) external;

    // -- View --
    function candidateImplementation() external view returns (address);
    function deployers(address) external view returns (bool);

    // -- AccessibleCommon --
    function addAdmin(address account) external;
    function removeAdmin(address account) external;
    function transferAdmin(address newAdmin) external;
    function transferOwnership(address newAdmin) external;
    function renounceOwnership() external;
    function isAdmin(address account) external view returns (bool);
    function isOwner() external view returns (bool);
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

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

    // -- Constants --
    function MINTER_ROLE() external view returns (bytes32);

    // -- Events --
    event CandidateDeployed(address indexed candidate, address indexed candidateContract, bool isLayer2Candidate, string memo);
}
