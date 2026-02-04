---
id: "con-076"
title: "DAOCommitteeOwner Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "owner", "governance", "dao", "voting"]
related_docs: []
source_url: "https://etherscan.io/address/0x5991Aebb5271522d33C457bf6DF26d83c0dAa221"
---

# DAOCommitteeOwner

## Overview

DAOCommittee owner contract



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x5991Aebb5271522d33C457bf6DF26d83c0dAa221` |
| **Contract Name** | DAOCommitteeOwner |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | owner |


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

*...and 12 more functions*

### State-Changing Functions

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

#### `renounceRole`

```solidity
function renounceRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

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

#### `pauseProxy`

```solidity
function pauseProxy() view returns (bool)
```

**Returns:**
- `result`: `bool`

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

#### `setBurntAmountAtDAO`

```solidity
function setBurntAmountAtDAO(uint256 _burnAmount)
```

**Parameters:**
- `_burnAmount`: `uint256`

#### `setCandidateAddOnFactory`

```solidity
function setCandidateAddOnFactory(address _candidateAddOnFactory)
```

**Parameters:**
- `_candidateAddOnFactory`: `address`

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

*...and 24 more functions*

### Staking Operations

#### `seigManager`

```solidity
function seigManager() view returns (address)
```

**Returns:**
- `result`: `address`

### Governance Operations

#### `agendaManager`

```solidity
function agendaManager() view returns (address)
```

**Returns:**
- `result`: `address`

## Events

#### `ActivityRewardChanged`

```solidity
event ActivityRewardChanged(uint256 newReward)
```

**Parameters:**
- `newReward`: `uint256`

#### `ChangedMember`

```solidity
event ChangedMember(indexed uint256 slotIndex, address prevMember, indexed address newMember)
```

**Parameters:**
- `slotIndex`: `uint256` (indexed)
- `prevMember`: `address`
- `newMember`: `address` (indexed)

#### `ChangedSlotMaximum`

```solidity
event ChangedSlotMaximum(indexed uint256 prevSlotMax, indexed uint256 slotMax)
```

**Parameters:**
- `prevSlotMax`: `uint256` (indexed)
- `slotMax`: `uint256` (indexed)

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
  "0x5991Aebb5271522d33C457bf6DF26d83c0dAa221",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
