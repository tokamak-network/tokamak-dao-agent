---
id: "con-075"
title: "DAOCommittee_V1 Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation", "governance", "dao", "voting"]
related_docs: []
source_url: "https://etherscan.io/address/0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe"
---

# DAOCommittee_V1

## Overview

DAOCommittee V1 implementation



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe` |
| **Contract Name** | DAOCommittee_V1 |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
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

#### `aliveImplementation`

```solidity
function aliveImplementation(address ) view returns (bool)
```

**Parameters:**
- ``: `address`

**Returns:**
- `result`: `bool`

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

#### `candidateAddOnFactory`

```solidity
function candidateAddOnFactory() view returns (address)
```

**Returns:**
- `result`: `address`

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

#### `candidateInfos`

```solidity
function candidateInfos(address _candidate) view returns (tuple)
```

**Parameters:**
- `_candidate`: `address`

**Returns:**
- `result`: `tuple`

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

*...and 21 more functions*

### State-Changing Functions

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

#### `createCandidateAddOn`

```solidity
function createCandidateAddOn(string _memo, address _operatorManagerAddress) returns (address)
```

**Parameters:**
- `_memo`: `string`
- `_operatorManagerAddress`: `address`

**Returns:**
- `result`: `address`

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

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

#### `createCandidateOwner`

```solidity
function createCandidateOwner(string _memo, address _operatorAddress)
```

**Parameters:**
- `_memo`: `string`
- `_operatorAddress`: `address`

#### `getRoleAdmin`

```solidity
function getRoleAdmin(bytes32 role) view returns (bytes32)
```

**Parameters:**
- `role`: `bytes32`

**Returns:**
- `result`: `bytes32`

#### `pauseProxy`

```solidity
function pauseProxy() view returns (bool)
```

**Returns:**
- `result`: `bool`

#### `registerLayer2CandidateByOwner`

```solidity
function registerLayer2CandidateByOwner(address _operator, address _layer2, string _memo)
```

**Parameters:**
- `_operator`: `address`
- `_layer2`: `address`
- `_memo`: `string`

#### `setAgendaStatus`

```solidity
function setAgendaStatus(uint256 _agendaID, uint256 _status, uint256 _result)
```

**Parameters:**
- `_agendaID`: `uint256`
- `_status`: `uint256`
- `_result`: `uint256`

#### `setMemoOnCandidate`

```solidity
function setMemoOnCandidate(address _candidate, string _memo)
```

**Parameters:**
- `_candidate`: `address`
- `_memo`: `string`

#### `setMemoOnCandidateContract`

```solidity
function setMemoOnCandidateContract(address _candidateContract, string _memo)
```

**Parameters:**
- `_candidateContract`: `address`
- `_memo`: `string`

### Token Operations

#### `onApprove`

```solidity
function onApprove(address owner, address , uint256 , bytes data) returns (bool)
```

**Parameters:**
- `owner`: `address`
- ``: `address`
- ``: `uint256`
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
event ChangedMemo(address candidateContract, string newMemo)
```

**Parameters:**
- `candidateContract`: `address`
- `newMemo`: `string`

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
  "0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
