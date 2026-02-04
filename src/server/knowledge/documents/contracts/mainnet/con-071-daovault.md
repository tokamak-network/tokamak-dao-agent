---
id: "con-071"
title: "DAOVault Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "vault", "governance", "dao", "voting", "treasury"]
related_docs: []
source_url: "https://etherscan.io/address/0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303"
---

# DAOVault

## Overview

DAO treasury for TON/WTON and ERC-20 tokens



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303` |
| **Contract Name** | DAOVault |
| **Compiler Version** | v0.7.6+commit.7338295f |
| **Type** | vault |


## On-Chain State

- **owner**: `0xdd9f0ccc044b0781289ee318e5971b0139602c26`


## Functions

### View Functions

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

#### `setTON`

```solidity
function setTON(address _ton)
```

**Parameters:**
- `_ton`: `address`

#### `setWTON`

```solidity
function setWTON(address _wton)
```

**Parameters:**
- `_wton`: `address`

#### `transferOwnership`

```solidity
function transferOwnership(address newOwner)
```

**Parameters:**
- `newOwner`: `address`

### Token Operations

#### `approveERC20`

```solidity
function approveERC20(address _token, address _to, uint256 _amount)
```

**Parameters:**
- `_token`: `address`
- `_to`: `address`
- `_amount`: `uint256`

#### `approveTON`

```solidity
function approveTON(address _to, uint256 _amount)
```

**Parameters:**
- `_to`: `address`
- `_amount`: `uint256`

#### `approveWTON`

```solidity
function approveWTON(address _to, uint256 _amount)
```

**Parameters:**
- `_to`: `address`
- `_amount`: `uint256`

### Staking Operations

#### `claimERC20`

```solidity
function claimERC20(address _token, address _to, uint256 _amount)
```

**Parameters:**
- `_token`: `address`
- `_to`: `address`
- `_amount`: `uint256`

#### `claimTON`

```solidity
function claimTON(address _to, uint256 _amount)
```

**Parameters:**
- `_to`: `address`
- `_amount`: `uint256`

#### `claimWTON`

```solidity
function claimWTON(address _to, uint256 _amount)
```

**Parameters:**
- `_to`: `address`
- `_amount`: `uint256`

## Events

#### `Approved`

```solidity
event Approved(indexed address token, indexed address to, indexed uint256 amount)
```

**Parameters:**
- `token`: `address` (indexed)
- `to`: `address` (indexed)
- `amount`: `uint256` (indexed)

#### `Claimed`

```solidity
event Claimed(indexed address token, indexed address to, indexed uint256 amount)
```

**Parameters:**
- `token`: `address` (indexed)
- `to`: `address` (indexed)
- `amount`: `uint256` (indexed)

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
  "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
