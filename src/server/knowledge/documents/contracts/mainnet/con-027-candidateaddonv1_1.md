---
id: "con-027"
title: "CandidateAddOnV1_1 Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation"]
related_docs: []
source_url: "https://etherscan.io/address/0x73Bfd5cAEC63307784C7B6d2555F18ec24D96E2e"
---

# CandidateAddOnV1_1

## Overview

Candidate AddOn V1.1 implementation



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x73Bfd5cAEC63307784C7B6d2555F18ec24D96E2e` |
| **Contract Name** | CandidateAddOnV1_1 |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | implementation |


## On-Chain State

*No on-chain state available*


## Functions

### View Functions

#### `aliveImplementation`

```solidity
function aliveImplementation(address ) view returns (bool)
```

**Parameters:**
- ``: `address`

**Returns:**
- `result`: `bool`

#### `candidate`

```solidity
function candidate() view returns (address)
```

**Returns:**
- `addr`: `address`

#### `currentFork`

```solidity
function currentFork() pure returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `hasRole`

```solidity
function hasRole(bytes32 role, address account) view returns (bool)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `isCandidateContract`

```solidity
function isCandidateContract() pure returns (bool)
```

**Returns:**
- `result`: `bool`

#### `isCandidateFwContract`

```solidity
function isCandidateFwContract() pure returns (bool)
```

**Returns:**
- `result`: `bool`

#### `isLayer2`

```solidity
function isLayer2() pure returns (bool)
```

**Returns:**
- `result`: `bool`

#### `isLayer2Candidate`

```solidity
function isLayer2Candidate() view returns (bool)
```

**Returns:**
- `result`: `bool`

#### `lastEpoch`

```solidity
function lastEpoch(uint256 forkNumber) pure returns (uint256)
```

**Parameters:**
- `forkNumber`: `uint256`

**Returns:**
- `result`: `uint256`

#### `memo`

```solidity
function memo() view returns (string)
```

**Returns:**
- `result`: `string`

*...and 6 more functions*

### State-Changing Functions

#### `changeMember`

```solidity
function changeMember(uint256 _memberIndex) returns (bool)
```

**Parameters:**
- `_memberIndex`: `uint256`

**Returns:**
- `result`: `bool`

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `initialize`

```solidity
function initialize(address _operateContract, string _memo, address _committee, address _seigManager, address _ton, address _wton)
```

**Parameters:**
- `_operateContract`: `address`
- `_memo`: `string`
- `_committee`: `address`
- `_seigManager`: `address`
- `_ton`: `address`
- `_wton`: `address`

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

#### `addAdmin`

```solidity
function addAdmin(address account)
```

**Parameters:**
- `account`: `address`

#### `getRoleAdmin`

```solidity
function getRoleAdmin(bytes32 role) view returns (bytes32)
```

**Parameters:**
- `role`: `bytes32`

**Returns:**
- `result`: `bytes32`

#### `isAdmin`

```solidity
function isAdmin(address account) view returns (bool)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `isOwner`

```solidity
function isOwner() view returns (bool)
```

**Returns:**
- `result`: `bool`

#### `pauseProxy`

```solidity
function pauseProxy() view returns (bool)
```

**Returns:**
- `result`: `bool`

#### `removeAdmin`

```solidity
function removeAdmin(address account)
```

**Parameters:**
- `account`: `address`

#### `renounceOwnership`

```solidity
function renounceOwnership()
```

#### `setMemo`

```solidity
function setMemo(string _memo)
```

**Parameters:**
- `_memo`: `string`

#### `transferAdmin`

```solidity
function transferAdmin(address newAdmin)
```

**Parameters:**
- `newAdmin`: `address`

*...and 1 more functions*

### Staking Operations

#### `claimActivityReward`

```solidity
function claimActivityReward()
```

#### `seigManager`

```solidity
function seigManager() view returns (address)
```

**Returns:**
- `addr`: `address`

#### `stakedOf`

```solidity
function stakedOf(address _account) view returns (uint256)
```

**Parameters:**
- `_account`: `address`

**Returns:**
- `amount`: `uint256`

#### `totalStaked`

```solidity
function totalStaked() view returns (uint256)
```

**Returns:**
- `totalSupply`: `uint256`

#### `updateSeigniorage`

```solidity
function updateSeigniorage() returns (bool)
```

**Returns:**
- `result`: `bool`

### Governance Operations

#### `castVote`

```solidity
function castVote(uint256 _agendaID, uint256 _vote, string _comment)
```

**Parameters:**
- `_agendaID`: `uint256`
- `_vote`: `uint256`
- `_comment`: `string`

#### `committee`

```solidity
function committee() view returns (address)
```

**Returns:**
- `addr`: `address`

## Events

#### `Initialized`

```solidity
event Initialized(address _operateContract, string memo, address committee, address seigManager)
```

**Parameters:**
- `_operateContract`: `address`
- `memo`: `string`
- `committee`: `address`
- `seigManager`: `address`

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

#### `SetMemo`

```solidity
event SetMemo(string _memo)
```

**Parameters:**
- `_memo`: `string`

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0x73Bfd5cAEC63307784C7B6d2555F18ec24D96E2e",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
