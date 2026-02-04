---
id: "con-033"
title: "DAOCommittee Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation", "governance", "dao", "voting"]
related_docs: []
source_url: "https://etherscan.io/address/0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb"
---

# DAOCommittee

## Overview

Core DAO governance logic



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb` |
| **Contract Name** | DAOCommittee |
| **Compiler Version** | v0.7.6+commit.7338295f |
| **Type** | implementation |


## On-Chain State

*No on-chain state available*


## Functions

### View Functions

#### `activityRewardPerSecond`

```solidity
function activityRewardPerSecond() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `balanceOfOnCandidate`

```solidity
function balanceOfOnCandidate(address _candidate, address _account) view returns (uint256)
```

**Parameters:**
- `_candidate`: `address`
- `_account`: `address`

**Returns:**
- `amount`: `uint256`

#### `balanceOfOnCandidateContract`

```solidity
function balanceOfOnCandidateContract(address _candidateContract, address _account) view returns (uint256)
```

**Parameters:**
- `_candidateContract`: `address`
- `_account`: `address`

**Returns:**
- `amount`: `uint256`

#### `candidateContract`

```solidity
function candidateContract(address _candidate) view returns (address)
```

**Parameters:**
- `_candidate`: `address`

**Returns:**
- `result`: `address`

#### `candidateFactory`

```solidity
function candidateFactory() view returns (address)
```

**Returns:**
- `result`: `address`

#### `candidates`

```solidity
function candidates(uint256 ) view returns (address)
```

**Parameters:**
- ``: `uint256`

**Returns:**
- `result`: `address`

#### `candidatesLength`

```solidity
function candidatesLength() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `daoVault`

```solidity
function daoVault() view returns (address)
```

**Returns:**
- `result`: `address`

#### `getRoleMember`

```solidity
function getRoleMember(bytes32 role, uint256 index) view returns (address)
```

**Parameters:**
- `role`: `bytes32`
- `index`: `uint256`

**Returns:**
- `result`: `address`

#### `getRoleMemberCount`

```solidity
function getRoleMemberCount(bytes32 role) view returns (uint256)
```

**Parameters:**
- `role`: `bytes32`

**Returns:**
- `result`: `uint256`

*...and 11 more functions*

### State-Changing Functions

#### `candidateInfos`

```solidity
function candidateInfos(address _candidate) returns (tuple)
```

**Parameters:**
- `_candidate`: `address`

**Returns:**
- `result`: `tuple`

#### `changeMember`

```solidity
function changeMember(uint256 _memberIndex) returns (bool)
```

**Parameters:**
- `_memberIndex`: `uint256`

**Returns:**
- `result`: `bool`

#### `createCandidate`

```solidity
function createCandidate(string _memo)
```

**Parameters:**
- `_memo`: `string`

#### `decreaseMaxMember`

```solidity
function decreaseMaxMember(uint256 _reducingMemberIndex, uint256 _quorum)
```

**Parameters:**
- `_reducingMemberIndex`: `uint256`
- `_quorum`: `uint256`

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `increaseMaxMember`

```solidity
function increaseMaxMember(uint256 _newMaxMember, uint256 _quorum)
```

**Parameters:**
- `_newMaxMember`: `uint256`
- `_quorum`: `uint256`

#### `registerLayer2Candidate`

```solidity
function registerLayer2Candidate(address _layer2, string _memo)
```

**Parameters:**
- `_layer2`: `address`
- `_memo`: `string`

#### `renounceRole`

```solidity
function renounceRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `retireMember`

```solidity
function retireMember() returns (bool)
```

**Returns:**
- `result`: `bool`

#### `revokeRole`

```solidity
function revokeRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

### Admin Functions

#### `DEFAULT_ADMIN_ROLE`

```solidity
function DEFAULT_ADMIN_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `getRoleAdmin`

```solidity
function getRoleAdmin(bytes32 role) view returns (bytes32)
```

**Parameters:**
- `role`: `bytes32`

**Returns:**
- `result`: `bytes32`

#### `registerLayer2CandidateByOwner`

```solidity
function registerLayer2CandidateByOwner(address _operator, address _layer2, string _memo)
```

**Parameters:**
- `_operator`: `address`
- `_layer2`: `address`
- `_memo`: `string`

#### `setActivityRewardPerSecond`

```solidity
function setActivityRewardPerSecond(uint256 _value)
```

**Parameters:**
- `_value`: `uint256`

#### `setAgendaManager`

```solidity
function setAgendaManager(address _agendaManager)
```

**Parameters:**
- `_agendaManager`: `address`

#### `setAgendaStatus`

```solidity
function setAgendaStatus(uint256 _agendaID, uint256 _status, uint256 _result)
```

**Parameters:**
- `_agendaID`: `uint256`
- `_status`: `uint256`
- `_result`: `uint256`

#### `setCandidateFactory`

```solidity
function setCandidateFactory(address _candidateFactory)
```

**Parameters:**
- `_candidateFactory`: `address`

#### `setCandidatesCommittee`

```solidity
function setCandidatesCommittee(address[] _candidateContracts, address _committee)
```

**Parameters:**
- `_candidateContracts`: `address[]`
- `_committee`: `address`

#### `setCandidatesSeigManager`

```solidity
function setCandidatesSeigManager(address[] _candidateContracts, address _seigManager)
```

**Parameters:**
- `_candidateContracts`: `address[]`
- `_seigManager`: `address`

#### `setCreateAgendaFees`

```solidity
function setCreateAgendaFees(uint256 _fees)
```

**Parameters:**
- `_fees`: `uint256`

*...and 10 more functions*

### Token Operations

#### `onApprove`

```solidity
function onApprove(address owner, address spender, uint256 tonAmount, bytes data) returns (bool)
```

**Parameters:**
- `owner`: `address`
- `spender`: `address`
- `tonAmount`: `uint256`
- `data`: `bytes`

**Returns:**
- `result`: `bool`

### Staking Operations

#### `claimActivityReward`

```solidity
function claimActivityReward(address _receiver)
```

**Parameters:**
- `_receiver`: `address`

#### `getClaimableActivityReward`

```solidity
function getClaimableActivityReward(address _candidate) view returns (uint256)
```

**Parameters:**
- `_candidate`: `address`

**Returns:**
- `result`: `uint256`

#### `seigManager`

```solidity
function seigManager() view returns (address)
```

**Returns:**
- `result`: `address`

#### `updateSeigniorage`

```solidity
function updateSeigniorage(address _candidate) returns (bool)
```

**Parameters:**
- `_candidate`: `address`

**Returns:**
- `result`: `bool`

#### `updateSeigniorages`

```solidity
function updateSeigniorages(address[] _candidates) returns (bool)
```

**Parameters:**
- `_candidates`: `address[]`

**Returns:**
- `result`: `bool`

### Governance Operations

#### `agendaManager`

```solidity
function agendaManager() view returns (address)
```

**Returns:**
- `result`: `address`

#### `castVote`

```solidity
function castVote(uint256 _agendaID, uint256 _vote, string _comment)
```

**Parameters:**
- `_agendaID`: `uint256`
- `_vote`: `uint256`
- `_comment`: `string`

#### `endAgendaVoting`

```solidity
function endAgendaVoting(uint256 _agendaID)
```

**Parameters:**
- `_agendaID`: `uint256`

#### `executeAgenda`

```solidity
function executeAgenda(uint256 _agendaID)
```

**Parameters:**
- `_agendaID`: `uint256`

## Events

#### `ActivityRewardChanged`

```solidity
event ActivityRewardChanged(uint256 newReward)
```

**Parameters:**
- `newReward`: `uint256`

#### `AgendaCreated`

```solidity
event AgendaCreated(indexed address from, indexed uint256 id, address[] targets, uint128 noticePeriodSeconds, uint128 votingPeriodSeconds, bool atomicExecute)
```

**Parameters:**
- `from`: `address` (indexed)
- `id`: `uint256` (indexed)
- `targets`: `address[]`
- `noticePeriodSeconds`: `uint128`
- `votingPeriodSeconds`: `uint128`
- `atomicExecute`: `bool`

#### `AgendaExecuted`

```solidity
event AgendaExecuted(indexed uint256 id, address[] target)
```

**Parameters:**
- `id`: `uint256` (indexed)
- `target`: `address[]`

#### `AgendaVoteCasted`

```solidity
event AgendaVoteCasted(indexed address from, indexed uint256 id, uint256 voting, string comment)
```

**Parameters:**
- `from`: `address` (indexed)
- `id`: `uint256` (indexed)
- `voting`: `uint256`
- `comment`: `string`

#### `CandidateContractCreated`

```solidity
event CandidateContractCreated(indexed address candidate, indexed address candidateContract, string memo)
```

**Parameters:**
- `candidate`: `address` (indexed)
- `candidateContract`: `address` (indexed)
- `memo`: `string`

#### `ChangedMember`

```solidity
event ChangedMember(indexed uint256 slotIndex, address prevMember, indexed address newMember)
```

**Parameters:**
- `slotIndex`: `uint256` (indexed)
- `prevMember`: `address`
- `newMember`: `address` (indexed)

#### `ChangedMemo`

```solidity
event ChangedMemo(address candidate, string newMemo)
```

**Parameters:**
- `candidate`: `address`
- `newMemo`: `string`

#### `ChangedSlotMaximum`

```solidity
event ChangedSlotMaximum(indexed uint256 prevSlotMax, indexed uint256 slotMax)
```

**Parameters:**
- `prevSlotMax`: `uint256` (indexed)
- `slotMax`: `uint256` (indexed)

#### `ClaimedActivityReward`

```solidity
event ClaimedActivityReward(indexed address candidate, address receiver, uint256 amount)
```

**Parameters:**
- `candidate`: `address` (indexed)
- `receiver`: `address`
- `amount`: `uint256`

#### `Layer2Registered`

```solidity
event Layer2Registered(indexed address candidate, indexed address candidateContract, string memo)
```

**Parameters:**
- `candidate`: `address` (indexed)
- `candidateContract`: `address` (indexed)
- `memo`: `string`

#### `QuorumChanged`

```solidity
event QuorumChanged(uint256 newQuorum)
```

**Parameters:**
- `newQuorum`: `uint256`

#### `RoleAdminChanged`

```solidity
event RoleAdminChanged(indexed bytes32 role, indexed bytes32 previousAdminRole, indexed bytes32 newAdminRole)
```

**Parameters:**
- `role`: `bytes32` (indexed)
- `previousAdminRole`: `bytes32` (indexed)
- `newAdminRole`: `bytes32` (indexed)

#### `RoleGranted`

```solidity
event RoleGranted(indexed bytes32 role, indexed address account, indexed address sender)
```

**Parameters:**
- `role`: `bytes32` (indexed)
- `account`: `address` (indexed)
- `sender`: `address` (indexed)

#### `RoleRevoked`

```solidity
event RoleRevoked(indexed bytes32 role, indexed address account, indexed address sender)
```

**Parameters:**
- `role`: `bytes32` (indexed)
- `account`: `address` (indexed)
- `sender`: `address` (indexed)

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
