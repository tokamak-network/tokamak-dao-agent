---
id: "con-020"
title: "RefactorCoinageSnapshot Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation"]
related_docs: []
source_url: "https://etherscan.io/address/0xef12310ff8a6e96357b7d2c4a759b19ce94f7dfb"
---

# RefactorCoinageSnapshot

## Overview

Refactored coinage snapshot contract



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xef12310ff8a6e96357b7d2c4a759b19ce94f7dfb` |
| **Contract Name** | RefactorCoinageSnapshot |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | implementation |


## On-Chain State

*No on-chain state available*


## Functions

### View Functions

#### `OPERATOR_ROLE`

```solidity
function OPERATOR_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `REFACTOR_BOUNDARY`

```solidity
function REFACTOR_BOUNDARY() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `REFACTOR_DIVIDER`

```solidity
function REFACTOR_DIVIDER() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `accountBalanceIds`

```solidity
function accountBalanceIds(address , uint256 ) view returns (uint256)
```

**Parameters:**
- ``: `address`
- ``: `uint256`

**Returns:**
- `result`: `uint256`

#### `accountBalanceSnapshots`

```solidity
function accountBalanceSnapshots(address , uint256 ) view returns (uint256, uint256)
```

**Parameters:**
- ``: `address`
- ``: `uint256`

**Returns:**
- `balance`: `uint256`
- `refactoredCount`: `uint256`

#### `aliveImplementation`

```solidity
function aliveImplementation(address ) view returns (bool)
```

**Parameters:**
- ``: `address`

**Returns:**
- `result`: `bool`

#### `applyFactor`

```solidity
function applyFactor(tuple _balance) view returns (uint256)
```

**Parameters:**
- `_balance`: `tuple`

**Returns:**
- `amount`: `uint256`

#### `balanceOf`

```solidity
function balanceOf(address account) view returns (uint256)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `amount`: `uint256`

#### `balanceOfAt`

```solidity
function balanceOfAt(address account, uint256 snapshotId) view returns (uint256)
```

**Parameters:**
- `account`: `address`
- `snapshotId`: `uint256`

**Returns:**
- `amount`: `uint256`

#### `decimals`

```solidity
function decimals() pure returns (uint8)
```

**Returns:**
- `result`: `uint8`

*...and 20 more functions*

### State-Changing Functions

#### `addOperator`

```solidity
function addOperator(address account)
```

**Parameters:**
- `account`: `address`

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `initialize`

```solidity
function initialize(string name_, string symbol_, uint256 factor_, address seigManager_)
```

**Parameters:**
- `name_`: `string`
- `symbol_`: `string`
- `factor_`: `uint256`
- `seigManager_`: `address`

#### `removeOperator`

```solidity
function removeOperator(address account)
```

**Parameters:**
- `account`: `address`

#### `renounceOperator`

```solidity
function renounceOperator()
```

#### `renounceRole`

```solidity
function renounceRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `revokeOperator`

```solidity
function revokeOperator(address account)
```

**Parameters:**
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

#### `setFactor`

```solidity
function setFactor(uint256 factor_) returns (bool)
```

**Parameters:**
- `factor_`: `uint256`

**Returns:**
- `result`: `bool`

#### `setSeigManager`

```solidity
function setSeigManager(address _seigManager)
```

**Parameters:**
- `_seigManager`: `address`

*...and 2 more functions*

### Token Operations

#### `MINTER_ROLE`

```solidity
function MINTER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `addMinter`

```solidity
function addMinter(address account)
```

**Parameters:**
- `account`: `address`

#### `burn`

```solidity
function burn(uint256 amount)
```

**Parameters:**
- `amount`: `uint256`

#### `burnFrom`

```solidity
function burnFrom(address account, uint256 amount)
```

**Parameters:**
- `account`: `address`
- `amount`: `uint256`

#### `isMinter`

```solidity
function isMinter(address account) view returns (bool)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `mint`

```solidity
function mint(address account, uint256 amount) returns (bool)
```

**Parameters:**
- `account`: `address`
- `amount`: `uint256`

**Returns:**
- `result`: `bool`

#### `removeMinter`

```solidity
function removeMinter(address account)
```

**Parameters:**
- `account`: `address`

#### `renounceMinter`

```solidity
function renounceMinter()
```

#### `revokeMinter`

```solidity
function revokeMinter(address account)
```

**Parameters:**
- `account`: `address`

### Staking Operations

#### `seigManager`

```solidity
function seigManager() view returns (address)
```

**Returns:**
- `result`: `address`

## Events

#### `ChangedBalance`

```solidity
event ChangedBalance(indexed address account, tuple oldBalance, tuple newBalance, tuple oldTotalBalance, tuple newTotalBalance)
```

**Parameters:**
- `account`: `address` (indexed)
- `oldBalance`: `tuple`
- `newBalance`: `tuple`
- `oldTotalBalance`: `tuple`
- `newTotalBalance`: `tuple`

#### `ChangedFactor`

```solidity
event ChangedFactor(tuple previous, tuple next)
```

**Parameters:**
- `previous`: `tuple`
- `next`: `tuple`

#### `FactorSet`

```solidity
event FactorSet(uint256 previous, uint256 current, uint256 shiftCount)
```

**Parameters:**
- `previous`: `uint256`
- `current`: `uint256`
- `shiftCount`: `uint256`

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

#### `Transfer`

```solidity
event Transfer(indexed address from, indexed address to, uint256 value)
```

**Parameters:**
- `from`: `address` (indexed)
- `to`: `address` (indexed)
- `value`: `uint256`

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xef12310ff8a6e96357b7d2c4a759b19ce94f7dfb",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
