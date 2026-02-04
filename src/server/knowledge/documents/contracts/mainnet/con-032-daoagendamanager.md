---
id: "con-032"
title: "DAOAgendaManager Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "manager", "governance", "dao", "voting"]
related_docs: []
source_url: "https://etherscan.io/address/0xcD4421d082752f363E1687544a09d5112cD4f484"
---

# DAOAgendaManager

## Overview

Manages DAO agenda proposals and voting



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xcD4421d082752f363E1687544a09d5112cD4f484` |
| **Contract Name** | DAOAgendaManager |
| **Compiler Version** | v0.7.6+commit.7338295f |
| **Type** | manager |


## On-Chain State

- **owner**: `0xdd9f0ccc044b0781289ee318e5971b0139602c26`


## Functions

### View Functions

#### `executingPeriodSeconds`

```solidity
function executingPeriodSeconds() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `getExecutionInfo`

```solidity
function getExecutionInfo(uint256 _agendaID) view returns (address[], bytes[], bool, uint256)
```

**Parameters:**
- `_agendaID`: `uint256`

**Returns:**
- `target`: `address[]`
- `functionBytecode`: `bytes[]`
- `atomicExecute`: `bool`
- `executeStartFrom`: `uint256`

#### `getStatus`

```solidity
function getStatus(uint256 _status) pure returns (uint8)
```

**Parameters:**
- `_status`: `uint256`

**Returns:**
- `emnustatus`: `uint8`

#### `getVotingCount`

```solidity
function getVotingCount(uint256 _agendaID) view returns (uint256, uint256, uint256)
```

**Parameters:**
- `_agendaID`: `uint256`

**Returns:**
- `countingYes`: `uint256`
- `countingNo`: `uint256`
- `countingAbstain`: `uint256`

#### `isVotableStatus`

```solidity
function isVotableStatus(uint256 _agendaID) view returns (bool)
```

**Parameters:**
- `_agendaID`: `uint256`

**Returns:**
- `result`: `bool`

#### `minimumNoticePeriodSeconds`

```solidity
function minimumNoticePeriodSeconds() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `minimumVotingPeriodSeconds`

```solidity
function minimumVotingPeriodSeconds() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

### Admin Functions

#### `owner`

```solidity
function owner() view returns (address)
```

**Returns:**
- `result`: `address`

#### `renounceOwnership`

```solidity
function renounceOwnership()
```

#### `setCommittee`

```solidity
function setCommittee(address _committee)
```

**Parameters:**
- `_committee`: `address`

#### `setCreateAgendaFees`

```solidity
function setCreateAgendaFees(uint256 _createAgendaFees)
```

**Parameters:**
- `_createAgendaFees`: `uint256`

#### `setExecutedAgenda`

```solidity
function setExecutedAgenda(uint256 _agendaID)
```

**Parameters:**
- `_agendaID`: `uint256`

#### `setExecutedCount`

```solidity
function setExecutedCount(uint256 _agendaID, uint256 _count)
```

**Parameters:**
- `_agendaID`: `uint256`
- `_count`: `uint256`

#### `setExecutingPeriodSeconds`

```solidity
function setExecutingPeriodSeconds(uint256 _executingPeriodSeconds)
```

**Parameters:**
- `_executingPeriodSeconds`: `uint256`

#### `setMinimumNoticePeriodSeconds`

```solidity
function setMinimumNoticePeriodSeconds(uint256 _minimumNoticePeriodSeconds)
```

**Parameters:**
- `_minimumNoticePeriodSeconds`: `uint256`

#### `setMinimumVotingPeriodSeconds`

```solidity
function setMinimumVotingPeriodSeconds(uint256 _minimumVotingPeriodSeconds)
```

**Parameters:**
- `_minimumVotingPeriodSeconds`: `uint256`

#### `setResult`

```solidity
function setResult(uint256 _agendaID, uint8 _result)
```

**Parameters:**
- `_agendaID`: `uint256`
- `_result`: `uint8`

*...and 2 more functions*

### Governance Operations

#### `agendas`

```solidity
function agendas(uint256 _index) view returns (tuple)
```

**Parameters:**
- `_index`: `uint256`

**Returns:**
- `result`: `tuple`

#### `canExecuteAgenda`

```solidity
function canExecuteAgenda(uint256 _agendaID) view returns (bool)
```

**Parameters:**
- `_agendaID`: `uint256`

**Returns:**
- `result`: `bool`

#### `castVote`

```solidity
function castVote(uint256 _agendaID, address _voter, uint256 _vote) returns (bool)
```

**Parameters:**
- `_agendaID`: `uint256`
- `_voter`: `address`
- `_vote`: `uint256`

**Returns:**
- `result`: `bool`

#### `committee`

```solidity
function committee() view returns (address)
```

**Returns:**
- `result`: `address`

#### `createAgendaFees`

```solidity
function createAgendaFees() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `endAgendaVoting`

```solidity
function endAgendaVoting(uint256 _agendaID)
```

**Parameters:**
- `_agendaID`: `uint256`

#### `getAgendaNoticeEndTimeSeconds`

```solidity
function getAgendaNoticeEndTimeSeconds(uint256 _agendaID) view returns (uint256)
```

**Parameters:**
- `_agendaID`: `uint256`

**Returns:**
- `result`: `uint256`

#### `getAgendaResult`

```solidity
function getAgendaResult(uint256 _agendaID) view returns (uint256, bool)
```

**Parameters:**
- `_agendaID`: `uint256`

**Returns:**
- `result`: `uint256`
- `executed`: `bool`

#### `getAgendaStatus`

```solidity
function getAgendaStatus(uint256 _agendaID) view returns (uint256)
```

**Parameters:**
- `_agendaID`: `uint256`

**Returns:**
- `status`: `uint256`

#### `getAgendaTimestamps`

```solidity
function getAgendaTimestamps(uint256 _agendaID) view returns (uint256, uint256, uint256, uint256, uint256)
```

**Parameters:**
- `_agendaID`: `uint256`

**Returns:**
- `createdTimestamp`: `uint256`
- `noticeEndTimestamp`: `uint256`
- `votingStartedTimestamp`: `uint256`
- `votingEndTimestamp`: `uint256`
- `executedTimestamp`: `uint256`

*...and 10 more functions*

## Events

#### `AgendaResultChanged`

```solidity
event AgendaResultChanged(indexed uint256 agendaID, uint256 result)
```

**Parameters:**
- `agendaID`: `uint256` (indexed)
- `result`: `uint256`

#### `AgendaStatusChanged`

```solidity
event AgendaStatusChanged(indexed uint256 agendaID, uint256 prevStatus, uint256 newStatus)
```

**Parameters:**
- `agendaID`: `uint256` (indexed)
- `prevStatus`: `uint256`
- `newStatus`: `uint256`

#### `CreatingAgendaFeeChanged`

```solidity
event CreatingAgendaFeeChanged(uint256 newFee)
```

**Parameters:**
- `newFee`: `uint256`

#### `ExecutingPeriodChanged`

```solidity
event ExecutingPeriodChanged(uint256 newPeriod)
```

**Parameters:**
- `newPeriod`: `uint256`

#### `MinimumNoticePeriodChanged`

```solidity
event MinimumNoticePeriodChanged(uint256 newPeriod)
```

**Parameters:**
- `newPeriod`: `uint256`

#### `MinimumVotingPeriodChanged`

```solidity
event MinimumVotingPeriodChanged(uint256 newPeriod)
```

**Parameters:**
- `newPeriod`: `uint256`

#### `OwnershipTransferred`

```solidity
event OwnershipTransferred(indexed address previousOwner, indexed address newOwner)
```

**Parameters:**
- `previousOwner`: `address` (indexed)
- `newOwner`: `address` (indexed)

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xcD4421d082752f363E1687544a09d5112cD4f484",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
