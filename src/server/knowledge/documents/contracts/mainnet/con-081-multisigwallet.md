---
id: "con-081"
title: "MultiSigWallet Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "multisig"]
related_docs: []
source_url: "https://etherscan.io/address/0xE3F72E959834d0A72aFb2ea79F5ec2b4243d2d95"
---

# MultiSigWallet

## Overview

Tokamak Network MultiSig wallet



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xE3F72E959834d0A72aFb2ea79F5ec2b4243d2d95` |
| **Contract Name** | MultiSigWallet |
| **Compiler Version** | v0.8.27+commit.40a35a09 |
| **Type** | multisig |


## On-Chain State

*No on-chain state available*


## Functions

### View Functions

#### `getTransaction`

```solidity
function getTransaction(uint256 _txIndex) view returns (address, uint256, bytes, bool, uint256)
```

**Parameters:**
- `_txIndex`: `uint256`

**Returns:**
- `to`: `address`
- `value`: `uint256`
- `data`: `bytes`
- `executed`: `bool`
- `numConfirmations`: `uint256`

#### `getTransactionCount`

```solidity
function getTransactionCount() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `isConfirmed`

```solidity
function isConfirmed(uint256 , address ) view returns (bool)
```

**Parameters:**
- ``: `uint256`
- ``: `address`

**Returns:**
- `result`: `bool`

#### `numConfirmationsRequired`

```solidity
function numConfirmationsRequired() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `transactions`

```solidity
function transactions(uint256 ) view returns (address, uint256, bytes, bool, uint256)
```

**Parameters:**
- ``: `uint256`

**Returns:**
- `to`: `address`
- `value`: `uint256`
- `data`: `bytes`
- `executed`: `bool`
- `numConfirmations`: `uint256`

### State-Changing Functions

#### `confirmTransaction`

```solidity
function confirmTransaction(uint256 _txIndex)
```

**Parameters:**
- `_txIndex`: `uint256`

#### `revokeConfirmation`

```solidity
function revokeConfirmation(uint256 _txIndex)
```

**Parameters:**
- `_txIndex`: `uint256`

#### `submitTransaction`

```solidity
function submitTransaction(address _to, uint256 _value, bytes _data)
```

**Parameters:**
- `_to`: `address`
- `_value`: `uint256`
- `_data`: `bytes`

### Admin Functions

#### `changeOwner`

```solidity
function changeOwner(uint256 _index, address _newOwner)
```

**Parameters:**
- `_index`: `uint256`
- `_newOwner`: `address`

#### `getOwners`

```solidity
function getOwners() view returns (address[])
```

**Returns:**
- `result`: `address[]`

#### `isOwner`

```solidity
function isOwner(address ) view returns (bool)
```

**Parameters:**
- ``: `address`

**Returns:**
- `result`: `bool`

#### `owners`

```solidity
function owners(uint256 ) view returns (address)
```

**Parameters:**
- ``: `uint256`

**Returns:**
- `result`: `address`

### Governance Operations

#### `executeTransaction`

```solidity
function executeTransaction(uint256 _txIndex)
```

**Parameters:**
- `_txIndex`: `uint256`

## Events

#### `ChangeOwner`

```solidity
event ChangeOwner(indexed address oldOwner, indexed uint256 ownerIndex, indexed address newOwner)
```

**Parameters:**
- `oldOwner`: `address` (indexed)
- `ownerIndex`: `uint256` (indexed)
- `newOwner`: `address` (indexed)

#### `ConfirmTransaction`

```solidity
event ConfirmTransaction(indexed address owner, indexed uint256 txIndex)
```

**Parameters:**
- `owner`: `address` (indexed)
- `txIndex`: `uint256` (indexed)

#### `ExecuteTransaction`

```solidity
event ExecuteTransaction(indexed address owner, indexed uint256 txIndex, bool success)
```

**Parameters:**
- `owner`: `address` (indexed)
- `txIndex`: `uint256` (indexed)
- `success`: `bool`

#### `RevokeConfirmation`

```solidity
event RevokeConfirmation(indexed address owner, indexed uint256 txIndex)
```

**Parameters:**
- `owner`: `address` (indexed)
- `txIndex`: `uint256` (indexed)

#### `SubmitTransaction`

```solidity
event SubmitTransaction(indexed address owner, indexed uint256 txIndex, indexed address to, uint256 value, bytes data)
```

**Parameters:**
- `owner`: `address` (indexed)
- `txIndex`: `uint256` (indexed)
- `to`: `address` (indexed)
- `value`: `uint256`
- `data`: `bytes`

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xE3F72E959834d0A72aFb2ea79F5ec2b4243d2d95",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
