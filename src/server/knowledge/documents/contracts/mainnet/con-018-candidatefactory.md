---
id: "con-018"
title: "CandidateFactory Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "factory", "deployment"]
related_docs: []
source_url: "https://etherscan.io/address/0xc5eb1c5ce7196bdb49ea7500ca18a1b9f1fa3ffb"
---

# CandidateFactory

## Overview

Factory for creating Candidate contracts



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xc5eb1c5ce7196bdb49ea7500ca18a1b9f1fa3ffb` |
| **Contract Name** | CandidateFactory |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | factory |


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

#### `candidateImp`

```solidity
function candidateImp() view returns (address)
```

**Returns:**
- `result`: `address`

#### `hasRole`

```solidity
function hasRole(bytes32 role, address account) view returns (bool)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `proxyImplementation`

```solidity
function proxyImplementation(uint256 ) view returns (address)
```

**Parameters:**
- ``: `uint256`

**Returns:**
- `result`: `address`

#### `selectorImplementation`

```solidity
function selectorImplementation(bytes4 ) view returns (address)
```

**Parameters:**
- ``: `bytes4`

**Returns:**
- `result`: `address`

#### `supportsInterface`

```solidity
function supportsInterface(bytes4 interfaceId) view returns (bool)
```

**Parameters:**
- `interfaceId`: `bytes4`

**Returns:**
- `result`: `bool`

#### `ton`

```solidity
function ton() view returns (address)
```

**Returns:**
- `result`: `address`

#### `wton`

```solidity
function wton() view returns (address)
```

**Returns:**
- `result`: `address`

### State-Changing Functions

#### `deploy`

```solidity
function deploy(address _sender, bool _isLayer2Candidate, string _name, address _committee, address _seigManager) returns (address)
```

**Parameters:**
- `_sender`: `address`
- `_isLayer2Candidate`: `bool`
- `_name`: `string`
- `_committee`: `address`
- `_seigManager`: `address`

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

#### `setAddress`

```solidity
function setAddress(address _depositManager, address _daoCommittee, address _candidateImp, address _ton, address _wton)
```

**Parameters:**
- `_depositManager`: `address`
- `_daoCommittee`: `address`
- `_candidateImp`: `address`
- `_ton`: `address`
- `_wton`: `address`

#### `transferAdmin`

```solidity
function transferAdmin(address newAdmin)
```

**Parameters:**
- `newAdmin`: `address`

*...and 1 more functions*

### Token Operations

#### `MINTER_ROLE`

```solidity
function MINTER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

### Staking Operations

#### `depositManager`

```solidity
function depositManager() view returns (address)
```

**Returns:**
- `result`: `address`

### Governance Operations

#### `daoCommittee`

```solidity
function daoCommittee() view returns (address)
```

**Returns:**
- `result`: `address`

## Events

#### `DeployedCandidate`

```solidity
event DeployedCandidate(address sender, address layer2, address operator, bool isLayer2Candidate, string name, address committee, address seigManager)
```

**Parameters:**
- `sender`: `address`
- `layer2`: `address`
- `operator`: `address`
- `isLayer2Candidate`: `bool`
- `name`: `string`
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

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xc5eb1c5ce7196bdb49ea7500ca18a1b9f1fa3ffb",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
