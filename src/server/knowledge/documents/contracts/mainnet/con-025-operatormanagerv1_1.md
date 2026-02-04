---
id: "con-025"
title: "OperatorManagerV1_1 Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation"]
related_docs: []
source_url: "https://etherscan.io/address/0xB5F3b31dFB4DCe9a2FA12dE50A97250d60823750"
---

# OperatorManagerV1_1

## Overview

Operator Manager V1.1 implementation



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xB5F3b31dFB4DCe9a2FA12dE50A97250d60823750` |
| **Contract Name** | OperatorManagerV1_1 |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | implementation |


## On-Chain State

- **owner**: `0x796c1f28c777b8a5851d356ebbc9dec2ee51137f`


## Functions

### View Functions

#### `checkL1Bridge`

```solidity
function checkL1Bridge() view returns (bool, address, address, address, uint8, uint8, bool, bool)
```

**Returns:**
- `result`: `bool`
- `l1Bridge`: `address`
- `portal`: `address`
- `l2Ton`: `address`
- `_type`: `uint8`
- `status`: `uint8`
- `rejectedSeigs`: `bool`
- `rejectedL2Deposit`: `bool`

#### `isOperator`

```solidity
function isOperator(address addr) view returns (bool)
```

**Parameters:**
- `addr`: `address`

**Returns:**
- `result`: `bool`

#### `layer2Manager`

```solidity
function layer2Manager() view returns (address)
```

**Returns:**
- `addr`: `address`

#### `manager`

```solidity
function manager() view returns (address)
```

**Returns:**
- `addr`: `address`

#### `operator`

```solidity
function operator() view returns (address)
```

**Returns:**
- `result`: `address`

#### `rollupConfig`

```solidity
function rollupConfig() view returns (address)
```

**Returns:**
- `addr`: `address`

#### `ton`

```solidity
function ton() view returns (address)
```

**Returns:**
- `addr`: `address`

#### `wton`

```solidity
function wton() view returns (address)
```

**Returns:**
- `addr`: `address`

### State-Changing Functions

#### `acquireManager`

```solidity
function acquireManager()
```

#### `processRequest`

```solidity
function processRequest()
```

#### `processRequests`

```solidity
function processRequests(uint256 n)
```

**Parameters:**
- `n`: `uint256`

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
function setAddresses(address _layer2Manager, address _depositManager, address _ton, address _wton)
```

**Parameters:**
- `_layer2Manager`: `address`
- `_depositManager`: `address`
- `_ton`: `address`
- `_wton`: `address`

#### `transferOwnership`

```solidity
function transferOwnership(address newOwner)
```

**Parameters:**
- `newOwner`: `address`

### Token Operations

#### `transferManager`

```solidity
function transferManager(address newManager)
```

**Parameters:**
- `newManager`: `address`

### Staking Operations

#### `claimERC20`

```solidity
function claimERC20(address token, uint256 amount)
```

**Parameters:**
- `token`: `address`
- `amount`: `uint256`

#### `claimETH`

```solidity
function claimETH()
```

#### `depositManager`

```solidity
function depositManager() view returns (address)
```

**Returns:**
- `addr`: `address`

#### `requestWithdrawal`

```solidity
function requestWithdrawal(uint256 amount)
```

**Parameters:**
- `amount`: `uint256`

## Events

#### `AddedOperator`

```solidity
event AddedOperator(address operator)
```

**Parameters:**
- `operator`: `address`

#### `Claimed`

```solidity
event Claimed(address token, address caller, address to, uint256 amount)
```

**Parameters:**
- `token`: `address`
- `caller`: `address`
- `to`: `address`
- `amount`: `uint256`

#### `DeletedOperator`

```solidity
event DeletedOperator(address operator)
```

**Parameters:**
- `operator`: `address`

#### `OwnershipTransferred`

```solidity
event OwnershipTransferred(indexed address previousOwner, indexed address newOwner)
```

**Parameters:**
- `previousOwner`: `address` (indexed)
- `newOwner`: `address` (indexed)

#### `ProcessRequest`

```solidity
event ProcessRequest(address candidate)
```

**Parameters:**
- `candidate`: `address`

#### `ProcessRequests`

```solidity
event ProcessRequests(address candidate, uint256 n)
```

**Parameters:**
- `candidate`: `address`
- `n`: `uint256`

#### `RequestWithdrawal`

```solidity
event RequestWithdrawal(address candidate, uint256 amount)
```

**Parameters:**
- `candidate`: `address`
- `amount`: `uint256`

#### `SetAdditionalNotes`

```solidity
event SetAdditionalNotes(string _additionalNotesl2Info)
```

**Parameters:**
- `_additionalNotesl2Info`: `string`

#### `SetAddresses`

```solidity
event SetAddresses(address _layer2Manager, address _depositManager, address _ton, address _wton)
```

**Parameters:**
- `_layer2Manager`: `address`
- `_depositManager`: `address`
- `_ton`: `address`
- `_wton`: `address`

#### `TransferredManager`

```solidity
event TransferredManager(address previousManager, address newManager)
```

**Parameters:**
- `previousManager`: `address`
- `newManager`: `address`

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xB5F3b31dFB4DCe9a2FA12dE50A97250d60823750",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
