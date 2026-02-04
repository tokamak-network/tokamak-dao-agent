---
id: "con-034"
title: "DAOCommitteeProxy Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "proxy", "governance", "dao", "voting", "upgradeable"]
related_docs: []
source_url: "https://etherscan.io/address/0xDD9f0cCc044B0781289Ee318e5971b0139602C26"
---

# DAOCommitteeProxy

## Overview

Upgradeable proxy for DAOCommittee

This is an upgradeable proxy contract. The implementation logic is at `0x9e7f54eff4a4d35097e0acb6994a723f1a28368c`.

## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xDD9f0cCc044B0781289Ee318e5971b0139602C26` |
| **Contract Name** | DAOCommitteeProxy |
| **Compiler Version** | v0.7.6+commit.7338295f |
| **Type** | proxy (Proxy) |
| **Implementation** | `0x9e7f54eff4a4d35097e0acb6994a723f1a28368c` |


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

#### `blacklist`

```solidity
function blacklist(address ) view returns (bool)
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

#### `cooldown`

```solidity
function cooldown(address ) view returns (uint256)
```

**Parameters:**
- ``: `address`

**Returns:**
- `result`: `uint256`

#### `cooldownTime`

```solidity
function cooldownTime() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

*...and 18 more functions*

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

#### `setSelectorImplementations2`

```solidity
function setSelectorImplementations2(bytes4[] _selectors, address _imp)
```

**Parameters:**
- `_selectors`: `bytes4[]`
- `_imp`: `address`

#### `unsetSelectorImplementations2`

```solidity
function unsetSelectorImplementations2(bytes4[] _selectors, address _imp)
```

**Parameters:**
- `_selectors`: `bytes4[]`
- `_imp`: `address`

#### `upgradeTo2`

```solidity
function upgradeTo2(address impl)
```

**Parameters:**
- `impl`: `address`

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

#### `UnsetSelectorImplementations`

```solidity
event UnsetSelectorImplementations(bytes4[] _selectors)
```

**Parameters:**
- `_selectors`: `bytes4[]`

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
  "0xDD9f0cCc044B0781289Ee318e5971b0139602C26",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
