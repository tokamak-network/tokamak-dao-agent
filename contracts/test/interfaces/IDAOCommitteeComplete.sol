// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Complete interface for DAOCommitteeProxy + slot0 (DAOCommittee_V1) + slot1 (DAOCommitteeOwner)
/// @notice Covers all public/external functions callable via the proxy at 0xDD9f0cCc044B0781289Ee318e5971b0139602C26
interface IDAOCommitteeComplete {
    // ============================================================
    // Structs
    // ============================================================

    struct CandidateInfo {
        address candidateContract;
        uint256 indexMembers;
        uint128 memberJoinedTime;
        uint128 rewardPeriod;
        uint128 claimedTimestamp;
    }

    // ============================================================
    // Proxy functions (DAOCommitteeProxy2)
    // ============================================================

    function implementation() external view returns (address);
    function implementation2(uint256 _index) external view returns (address);
    function getSelectorImplementation2(bytes4 _selector) external view returns (address);
    function pauseProxy() external view returns (bool);
    function proxyImplementation(uint256) external view returns (address);
    function aliveImplementation(address) external view returns (bool);
    function selectorImplementation(bytes4) external view returns (address);

    // ============================================================
    // StorageStateCommittee public getters
    // ============================================================

    function ton() external view returns (address);
    function daoVault() external view returns (address);
    function agendaManager() external view returns (address);
    function candidateFactory() external view returns (address);
    function layer2Registry() external view returns (address);
    function seigManager() external view returns (address);
    function candidates(uint256) external view returns (address);
    function members(uint256) external view returns (address);
    function maxMember() external view returns (uint256);
    function quorum() external view returns (uint256);
    function activityRewardPerSecond() external view returns (uint256);
    function isMember(address _candidate) external view returns (bool);
    function candidateContract(address _candidate) external view returns (address);
    function candidateInfos(address _candidate) external view returns (CandidateInfo memory);

    // ============================================================
    // StorageStateCommitteeV2 public getters
    // ============================================================

    function wton() external view returns (address);
    function layer2Manager() external view returns (address);
    function candidateAddOnFactory() external view returns (address);
    function blacklist(address) external view returns (bool);
    function privateLayer2(address) external view returns (bool);
    function cooldown(address) external view returns (uint256);
    function cooldownTime() external view returns (uint256);

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

    // ============================================================
    // Slot0: DAOCommittee_V1 — Core DAO Logic
    // ============================================================

    // -- Candidate Management --
    function createCandidate(string calldata _memo) external;
    function createCandidateOwner(string calldata _memo, address _operatorAddress) external;
    function createCandidateAddOn(string calldata _memo, address _operatorManagerAddress) external returns (address);
    function registerLayer2CandidateByOwner(address _operator, address _layer2, string memory _memo) external;
    function removeFromBlacklist(address _candidate) external;

    // -- Member Management --
    function changeMember(uint256 _memberIndex) external returns (bool);
    function retireMember() external returns (bool);

    // -- Memo --
    function setMemoOnCandidate(address _candidate, string calldata _memo) external;
    function setMemoOnCandidateContract(address _candidateContract, string calldata _memo) external;

    // -- Agenda Management --
    function onApprove(address owner, address spender, uint256 amount, bytes calldata data) external returns (bool);
    function castVote(uint256 _agendaID, uint256 _vote, string calldata _comment) external;
    function executeAgenda(uint256 _agendaID) external;
    function setAgendaStatus(uint256 _agendaID, uint256 _status, uint256 _result) external;

    // -- Seigniorage & Rewards --
    function updateSeigniorage(address _candidate) external returns (bool);
    function claimActivityReward(address _receiver) external;

    // -- View Functions --
    function isCandidate(address _candidate) external view returns (bool);
    function totalSupplyOnCandidate(address _candidate) external view returns (uint256);
    function balanceOfOnCandidate(address _candidate, address _account) external view returns (uint256);
    function totalSupplyOnCandidateContract(address _candidateContract) external view returns (uint256);
    function balanceOfOnCandidateContract(address _candidateContract, address _account) external view returns (uint256);
    function candidatesLength() external view returns (uint256);
    function isExistCandidate(address _candidate) external view returns (bool);
    function getClaimableActivityReward(address _candidate) external view returns (uint256);
    function currentAgendaStatus(uint256 _agendaID) external view returns (uint256 agendaResult, uint256 agendaStatus);
    function operatorCheck(address candidate) external view returns (uint256);

    // ============================================================
    // Slot1: DAOCommitteeOwner — Admin Configuration
    // ============================================================

    // -- Address Setters (onlyOwner) --
    function setSeigManager(address _seigManager) external;
    function setDaoVault(address _daoVault) external;
    function setLayer2Registry(address _layer2Registry) external;
    function setAgendaManager(address _agendaManager) external;
    function setCandidateFactory(address _candidateFactory) external;
    function setTon(address _ton) external;
    function setWton(address _wton) external;
    function setCandidateAddOnFactory(address _candidateAddOnFactory) external;
    function setLayer2Manager(address _layer2Manager) external;

    // -- Governance Parameters (onlyOwner) --
    function increaseMaxMember(uint256 _newMaxMember, uint256 _quorum) external;
    function decreaseMaxMember(uint256 _reducingMemberIndex, uint256 _quorum) external;
    function setQuorum(uint256 _quorum) external;
    function setCooldownTime(uint256 _cooltime) external;
    function setActivityRewardPerSecond(uint256 _value) external;

    // -- Batch Operations (onlyOwner) --
    function setCandidatesSeigManager(address[] calldata _candidateContracts, address _seigManager) external;
    function setCandidatesCommittee(address[] calldata _candidateContracts, address _committee) external;

    // -- DAO Execution (onlyOwner) --
    function setBurntAmountAtDAO(uint256 _burnAmount) external;
    function daoExecuteTransaction(address _to, bytes memory _data) external;

    // ============================================================
    // Events
    // ============================================================

    event AgendaCreated(address indexed from, uint256 indexed id, address[] targets, uint128 noticePeriodSeconds, uint128 votingPeriodSeconds, bool atomicExecute);
    event AgendaVoteCasted(address indexed from, uint256 indexed id, uint256 voting, string comment);
    event AgendaExecuted(uint256 indexed id, address[] target);
    event CandidateContractCreated(address indexed candidate, address indexed candidateContract, string memo);
    event Layer2Registered(address indexed candidate, address indexed candidateContract, string memo);
    event ChangedMember(uint256 indexed slotIndex, address prevMember, address indexed newMember);
    event ClaimedActivityReward(address indexed candidate, address receiver, uint256 amount);
    event ChangedMemo(address candidateContract, string newMemo);
    event MemberBlacklisted(address indexed member, uint256 timestamp);

    event SetCooldownTime(uint256 cooldownTime);
    event ChangedSlotMaximum(uint256 indexed prevSlotMax, uint256 indexed slotMax);
    event QuorumChanged(uint256 newQuorum);
    event ActivityRewardChanged(uint256 newReward);
    event SetCandidateAddOnFactory(address candidateAddOnFactoryAddr);
    event SetLayer2Manager(address layer2ManagerAddr);
    event SetSeigManager(address seigManagerAddr);
    event SetDaoVault(address daoVaultAddr);
    event SetLayer2Registry(address layer2RegistryAddr);
    event SetAgendaManager(address agendaManagerAddr);
    event SetCandidateFactory(address candidateFactoryAddr);
    event SetTON(address tonAddr);
    event SetWTON(address wtonAddr);
    event DAOExecuteTransaction(address to, bytes data, bool success);
}
