// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for DAOAgendaManager at 0xcD4421d082752f363E1687544a09d5112cD4f484
interface IDAOAgendaManagerComplete {
    // ============================================================
    // Structs
    // ============================================================

    struct Agenda {
        uint256 createdTimestamp;
        uint256 noticeEndTimestamp;
        uint256 votingPeriodInSeconds;
        uint256 votingStartedTimestamp;
        uint256 votingEndTimestamp;
        uint256 executableLimitTimestamp;
        uint256 executedTimestamp;
        uint256 countingYes;
        uint256 countingNo;
        uint256 countingAbstain;
        uint256 status;
        uint256 result;
        address[] voters;
        bool executed;
    }

    struct AgendaExecutionInfo {
        address[] targets;
        bytes[] bytecodes;
        bool atomicExecute;
        uint256 executeStartFrom;
    }

    // ============================================================
    // Core Functions
    // ============================================================

    function newAgenda(
        address[] calldata _targets,
        uint128 _noticePeriodSeconds,
        uint128 _votingPeriodSeconds,
        bool _atomicExecute,
        bytes[] calldata _functionBytecodes
    ) external returns (uint256);

    function castVote(uint256 _agendaID, uint256 _voter, uint256 _vote) external returns (bool);
    function setResult(uint256 _agendaID, uint256 _result) external;
    function setStatus(uint256 _agendaID, uint256 _status) external;
    function setExecutedAgenda(uint256 _agendaID) external;

    function executeAgenda(uint256 _agendaID) external returns (bool success, address target, bytes memory returnData);

    // ============================================================
    // View Functions
    // ============================================================

    function agendas(uint256 _index) external view returns (Agenda memory);
    function executionInfos(uint256 _index) external view returns (AgendaExecutionInfo memory);
    function totalAgendas() external view returns (uint256);

    function getVoter(uint256 _agendaID, uint256 _voterIndex) external view returns (address);
    function getVotersCount(uint256 _agendaID) external view returns (uint256);
    function getStatus(uint256 _agendaID) external view returns (uint256);
    function getResult(uint256 _agendaID) external view returns (uint256);
    function isVoter(uint256 _agendaID, address _candidate) external view returns (bool);
    function hasVoted(uint256 _agendaID, address _candidate) external view returns (bool);
    function getVoteStatus(uint256 _agendaID, address _candidate) external view returns (bool hasVoted_, uint256 vote);

    // -- Configuration Getters --
    function createAgendaFees() external view returns (uint256);
    function minimumNoticePeriodSeconds() external view returns (uint256);
    function minimumVotingPeriodSeconds() external view returns (uint256);
    function executingPeriodSeconds() external view returns (uint256);

    // -- Setters (onlyOwner) --
    function setCommittee(address _committee) external;
    function setCreateAgendaFees(uint256 _fees) external;
    function setMinimumNoticePeriodSeconds(uint256 _seconds) external;
    function setMinimumVotingPeriodSeconds(uint256 _seconds) external;
    function setExecutingPeriodSeconds(uint256 _seconds) external;
    function endAgendaVoting(uint256 _agendaID) external;
    function committee() external view returns (address);

    // -- AccessibleCommon --
    function addAdmin(address account) external;
    function removeAdmin(address account) external;
    function transferAdmin(address newAdmin) external;
    function isAdmin(address account) external view returns (bool);
    function isOwner() external view returns (bool);

    // -- AccessControl --
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleMemberCount(bytes32 role) external view returns (uint256);
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;

    // ============================================================
    // Events
    // ============================================================

    event AgendaCreated(uint256 indexed id, address indexed creator);
    event StatusChanged(uint256 indexed id, uint256 prevStatus, uint256 newStatus);
    event ResultChanged(uint256 indexed id, uint256 result);
    event AgendaExecuted(uint256 indexed id, address target);
}
