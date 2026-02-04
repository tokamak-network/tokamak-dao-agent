---
id: "con-002"
title: "WTON Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "token", "erc20"]
related_docs: ["con-012", "con-013", "con-014", "con-032", "con-011"]
source_url: "https://etherscan.io/address/0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2"
---

# WTON

## Overview

Wrapped TON for staking with RAY precision (27 decimals)



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` |
| **Contract Name** | WTON |
| **Compiler Version** | v0.5.12+commit.7709ece9 |
| **Type** | token |


## On-Chain State

- **name**: `Wrapped TON`
- **symbol**: `WTON`
- **decimals**: `27`
- **totalSupply**: `50,561,974,057,386,740,877,224,090,922,312,348 (50561974057386740877224090922312348)`
- **owner**: `0xdd9f0ccc044b0781289ee318e5971b0139602c26`


## Functions

### View Functions

#### `balanceOf`

```solidity
function balanceOf(address account) view returns (uint256)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `result`: `uint256`

#### `callbackEnabled`

```solidity
function callbackEnabled() view returns (bool)
```

**Returns:**
- `result`: `bool`

#### `decimals`

```solidity
function decimals() view returns (uint8)
```

**Returns:**
- `result`: `uint8`

#### `name`

```solidity
function name() view returns (string)
```

**Returns:**
- `result`: `string`

#### `supportsInterface`

```solidity
function supportsInterface(bytes4 interfaceId) view returns (bool)
```

**Parameters:**
- `interfaceId`: `bytes4`

**Returns:**
- `result`: `bool`

#### `symbol`

```solidity
function symbol() view returns (string)
```

**Returns:**
- `result`: `string`

#### `ton`

```solidity
function ton() view returns (address)
```

**Returns:**
- `result`: `address`

#### `totalSupply`

```solidity
function totalSupply() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

### State-Changing Functions

#### `enableCallback`

```solidity
function enableCallback(bool _callbackEnabled)
```

**Parameters:**
- `_callbackEnabled`: `bool`

#### `swapFromTON`

```solidity
function swapFromTON(uint256 tonAmount) returns (bool)
```

**Parameters:**
- `tonAmount`: `uint256`

**Returns:**
- `result`: `bool`

#### `swapToTON`

```solidity
function swapToTON(uint256 wtonAmount) returns (bool)
```

**Parameters:**
- `wtonAmount`: `uint256`

**Returns:**
- `result`: `bool`

### Admin Functions

#### `isOwner`

```solidity
function isOwner() view returns (bool)
```

**Returns:**
- `result`: `bool`

#### `owner`

```solidity
function owner() view returns (address)
```

**Returns:**
- `result`: `address`

#### `renounceOwnership`

```solidity
function renounceOwnership(address target)
```

**Parameters:**
- `target`: `address`

#### `renounceOwnership`

```solidity
function renounceOwnership()
```

#### `renouncePauser`

```solidity
function renouncePauser(address target)
```

**Parameters:**
- `target`: `address`

#### `setSeigManager`

```solidity
function setSeigManager(address _seigManager)
```

**Parameters:**
- `_seigManager`: `address`

#### `transferOwnership`

```solidity
function transferOwnership(address target, address newOwner)
```

**Parameters:**
- `target`: `address`
- `newOwner`: `address`

#### `transferOwnership`

```solidity
function transferOwnership(address newOwner)
```

**Parameters:**
- `newOwner`: `address`

### Token Operations

#### `addMinter`

```solidity
function addMinter(address account)
```

**Parameters:**
- `account`: `address`

#### `allowance`

```solidity
function allowance(address owner, address spender) view returns (uint256)
```

**Parameters:**
- `owner`: `address`
- `spender`: `address`

**Returns:**
- `result`: `uint256`

#### `approve`

```solidity
function approve(address spender, uint256 amount) returns (bool)
```

**Parameters:**
- `spender`: `address`
- `amount`: `uint256`

**Returns:**
- `result`: `bool`

#### `approveAndCall`

```solidity
function approveAndCall(address spender, uint256 amount, bytes data) returns (bool)
```

**Parameters:**
- `spender`: `address`
- `amount`: `uint256`
- `data`: `bytes`

**Returns:**
- `result`: `bool`

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

#### `decreaseAllowance`

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) returns (bool)
```

**Parameters:**
- `spender`: `address`
- `subtractedValue`: `uint256`

**Returns:**
- `result`: `bool`

#### `increaseAllowance`

```solidity
function increaseAllowance(address spender, uint256 addedValue) returns (bool)
```

**Parameters:**
- `spender`: `address`
- `addedValue`: `uint256`

**Returns:**
- `result`: `bool`

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

*...and 8 more functions*

### Staking Operations

#### `seigManager`

```solidity
function seigManager() view returns (address)
```

**Returns:**
- `result`: `address`

## Events

#### `Approval`

```solidity
event Approval(indexed address owner, indexed address spender, uint256 value)
```

**Parameters:**
- `owner`: `address` (indexed)
- `spender`: `address` (indexed)
- `value`: `uint256`

#### `MinterAdded`

```solidity
event MinterAdded(indexed address account)
```

**Parameters:**
- `account`: `address` (indexed)

#### `MinterRemoved`

```solidity
event MinterRemoved(indexed address account)
```

**Parameters:**
- `account`: `address` (indexed)

#### `OwnershipTransferred`

```solidity
event OwnershipTransferred(indexed address previousOwner, indexed address newOwner)
```

**Parameters:**
- `previousOwner`: `address` (indexed)
- `newOwner`: `address` (indexed)

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

- **SeigManagerProxy** (`0x0b55a0f463b6defb81c6063973763951712d0e5f`): Upgradeable proxy for SeigManager
- **DepositManager** (`0x76c01207959df1242c2824b4445cde48eb55d2f1`): WTON deposit and withdrawal logic
- **DepositManagerProxy** (`0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e`): Upgradeable proxy for DepositManager
- **DAOAgendaManager** (`0xcD4421d082752f363E1687544a09d5112cD4f484`): Manages DAO agenda proposals and voting
- **SeigManager** (`0x3b1e59c2ff4b850d78ab50cb13a4a482101681b6`): Seigniorage calculation and distribution logic

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
