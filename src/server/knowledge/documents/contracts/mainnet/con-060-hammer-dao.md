---
id: "con-060"
title: "Hammer DAO Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "layer2", "governance", "dao", "voting", "proxy", "upgradeable"]
related_docs: ["con-017"]
source_url: "https://etherscan.io/address/0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2"
---

# Hammer DAO

## Overview

Hammer DAO Layer2 operator contract

This is an upgradeable proxy contract. The implementation logic is at `0x1a8f59017e0434efc27e89640ac4b7d7d194c0a3`.

## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2` |
| **Contract Name** | CandidateProxy |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | layer2 (Proxy) |
| **Implementation** | `0x1a8f59017e0434efc27e89640ac4b7d7d194c0a3` |


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
- `result`: `address`

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

*...and 4 more functions*

### State-Changing Functions

#### `changeMember`

```solidity
function changeMember(uint256 _memberIndex) returns (bool)
```

**Parameters:**
- `_memberIndex`: `uint256`

**Returns:**
- `result`: `bool`

#### `changeOperator`

```solidity
function changeOperator(address _operator)
```

**Parameters:**
- `_operator`: `address`

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `initialize`

```solidity
function initialize(address _candidate, bool _isLayer2Candidate, string _memo, address _committee, address _seigManager)
```

**Parameters:**
- `_candidate`: `address`
- `_isLayer2Candidate`: `bool`
- `_memo`: `string`
- `_committee`: `address`
- `_seigManager`: `address`

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

#### `setCommittee`

```solidity
function setCommittee(address _committee)
```

**Parameters:**
- `_committee`: `address`

#### `setMemo`

```solidity
function setMemo(string _memo)
```

**Parameters:**
- `_memo`: `string`

*...and 3 more functions*

### Token Operations

#### `MINTER_ROLE`

```solidity
function MINTER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

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
- `result`: `address`

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
- `totalsupply`: `uint256`

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
- `result`: `address`

## Events

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

#### `TransferCoinage`

```solidity
event TransferCoinage(address from, address to, uint256 amount)
```

**Parameters:**
- `from`: `address`
- `to`: `address`
- `amount`: `uint256`

## Integration

### Related Contracts

- **Candidate** (`0x1a8f59017e0434efc27e89640ac4b7d7d194c0a3`): Candidate contract implementation

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
