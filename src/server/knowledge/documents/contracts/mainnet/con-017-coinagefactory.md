---
id: "con-017"
title: "CoinageFactory Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "factory", "deployment"]
related_docs: []
source_url: "https://etherscan.io/address/0x5b40841eeCfB429452AB25216Afc1e1650C07747"
---

# CoinageFactory

## Overview

Factory for AutoRefactorCoinage tokens



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x5b40841eeCfB429452AB25216Afc1e1650C07747` |
| **Contract Name** | CoinageFactory |
| **Compiler Version** | v0.5.12+commit.7709ece9 |
| **Type** | factory |


## On-Chain State

*No on-chain state available*


## Functions

### View Functions

#### `RAY`

```solidity
function RAY() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

### State-Changing Functions

#### `deploy`

```solidity
function deploy() returns (address)
```

**Returns:**
- `result`: `address`

## Integration

### Related Contracts

*No directly related contracts identified*

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0x5b40841eeCfB429452AB25216Afc1e1650C07747",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
