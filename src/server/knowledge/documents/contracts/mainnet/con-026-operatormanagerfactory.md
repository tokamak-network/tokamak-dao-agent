---
id: "con-026"
title: "OperatorManagerFactory Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "factory", "deployment"]
related_docs: []
source_url: "https://etherscan.io/address/0xAf86b21edDdC78ea27E23A7F2151d60d4e069450"
---

# OperatorManagerFactory

## Overview

Factory for OperatorManager contracts



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xAf86b21edDdC78ea27E23A7F2151d60d4e069450` |
| **Contract Name** | OperatorManagerFactory |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | factory |


## On-Chain State

- **owner**: `0xdd9f0ccc044b0781289ee318e5971b0139602c26`


## Functions

### View Functions

#### `getAddress`

```solidity
function getAddress(address rollupConfig) view returns (address)
```

**Parameters:**
- `rollupConfig`: `address`

**Returns:**
- `result`: `address`

#### `layer2Manager`

```solidity
function layer2Manager() view returns (address)
```

**Returns:**
- `result`: `address`

#### `operatorManagerImp`

```solidity
function operatorManagerImp() view returns (address)
```

**Returns:**
- `result`: `address`

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

#### `changeOperatorManagerImp`

```solidity
function changeOperatorManagerImp(address newOperatorManagerImp)
```

**Parameters:**
- `newOperatorManagerImp`: `address`

#### `createOperatorManager`

```solidity
function createOperatorManager(address rollupConfig) returns (address)
```

**Parameters:**
- `rollupConfig`: `address`

**Returns:**
- `operatorManager`: `address`

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

#### `setAddresses`

```solidity
function setAddresses(address _depositManager, address _ton, address _wton, address _layer2Manager)
```

**Parameters:**
- `_depositManager`: `address`
- `_ton`: `address`
- `_wton`: `address`
- `_layer2Manager`: `address`

#### `transferOwnership`

```solidity
function transferOwnership(address newOwner)
```

**Parameters:**
- `newOwner`: `address`

### Staking Operations

#### `depositManager`

```solidity
function depositManager() view returns (address)
```

**Returns:**
- `result`: `address`

## Events

#### `ChangedOperatorManagerImp`

```solidity
event ChangedOperatorManagerImp(address newOperatorManagerImp)
```

**Parameters:**
- `newOperatorManagerImp`: `address`

#### `CreatedOperatorManager`

```solidity
event CreatedOperatorManager(address rollupConfig, address owner, address manager, address operatorManager)
```

**Parameters:**
- `rollupConfig`: `address`
- `owner`: `address`
- `manager`: `address`
- `operatorManager`: `address`

#### `OwnershipTransferred`

```solidity
event OwnershipTransferred(indexed address previousOwner, indexed address newOwner)
```

**Parameters:**
- `previousOwner`: `address` (indexed)
- `newOwner`: `address` (indexed)

#### `SetAddresses`

```solidity
event SetAddresses(address depositManager, address ton, address wton, address layer2Manager)
```

**Parameters:**
- `depositManager`: `address`
- `ton`: `address`
- `wton`: `address`
- `layer2Manager`: `address`

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xAf86b21edDdC78ea27E23A7F2151d60d4e069450",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
