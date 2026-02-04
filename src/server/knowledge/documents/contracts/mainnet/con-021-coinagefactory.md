---
id: "con-021"
title: "CoinageFactory Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "factory", "deployment"]
related_docs: []
source_url: "https://etherscan.io/address/0xe8fae91b80dd515c3d8b9fc02cb5b2ecfddabf43"
---

# CoinageFactory

## Overview

Factory for AutoRefactorCoinage tokens



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xe8fae91b80dd515c3d8b9fc02cb5b2ecfddabf43` |
| **Contract Name** | CoinageFactory |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | factory |


## On-Chain State

- **owner**: `0xdd9f0ccc044b0781289ee318e5971b0139602c26`


## Functions

### View Functions

#### `autoCoinageLogic`

```solidity
function autoCoinageLogic() view returns (address)
```

**Returns:**
- `result`: `address`

### State-Changing Functions

#### `deploy`

```solidity
function deploy() returns (address)
```

**Returns:**
- `result`: `address`

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

#### `setAutoCoinageLogic`

```solidity
function setAutoCoinageLogic(address newLogic)
```

**Parameters:**
- `newLogic`: `address`

#### `transferOwnership`

```solidity
function transferOwnership(address newOwner)
```

**Parameters:**
- `newOwner`: `address`

## Events

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
  "0xe8fae91b80dd515c3d8b9fc02cb5b2ecfddabf43",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
