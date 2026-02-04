---
id: "con-019"
title: "CandidateFactoryProxy Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "proxy", "factory", "deployment", "upgradeable"]
related_docs: []
source_url: "https://etherscan.io/address/0x9fc7100a16407ee24a79c834a56e6eca555a5d7c"
---

# CandidateFactoryProxy

## Overview

Upgradeable proxy for CandidateFactory

This is an upgradeable proxy contract. The implementation logic is at `undefined`.

## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x9fc7100a16407ee24a79c834a56e6eca555a5d7c` |
| **Contract Name** | CandidateFactoryProxy |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | proxy (Proxy) |


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

#### `getSelectorImplementation2`

```solidity
function getSelectorImplementation2(bytes4 _selector) view returns (address)
```

**Parameters:**
- `_selector`: `bytes4`

**Returns:**
- `impl`: `address`

#### `hasRole`

```solidity
function hasRole(bytes32 role, address account) view returns (bool)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `implementation`

```solidity
function implementation() view returns (address)
```

**Returns:**
- `result`: `address`

#### `implementation2`

```solidity
function implementation2(uint256 _index) view returns (address)
```

**Parameters:**
- `_index`: `uint256`

**Returns:**
- `result`: `address`

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

*...and 1 more functions*

### State-Changing Functions

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

#### `setAliveImplementation2`

```solidity
function setAliveImplementation2(address newImplementation, bool _alive)
```

**Parameters:**
- `newImplementation`: `address`
- `_alive`: `bool`

#### `setImplementation2`

```solidity
function setImplementation2(address newImplementation, uint256 _index, bool _alive)
```

**Parameters:**
- `newImplementation`: `address`
- `_index`: `uint256`
- `_alive`: `bool`

*...and 5 more functions*

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

#### `SetAliveImplementation`

```solidity
event SetAliveImplementation(indexed address impl, bool alive)
```

**Parameters:**
- `impl`: `address` (indexed)
- `alive`: `bool`

#### `SetSelectorImplementation`

```solidity
event SetSelectorImplementation(indexed bytes4 selector, indexed address impl)
```

**Parameters:**
- `selector`: `bytes4` (indexed)
- `impl`: `address` (indexed)

#### `Upgraded`

```solidity
event Upgraded(indexed address implementation)
```

**Parameters:**
- `implementation`: `address` (indexed)

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0x9fc7100a16407ee24a79c834a56e6eca555a5d7c",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
