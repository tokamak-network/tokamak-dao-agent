---
id: "con-001"
title: "TON Token Contract"
category: "contracts"
status: "active"
created_at: "2025-02-04"
updated_at: "2025-02-04"
version: "1.0"
tags: ["ton", "token", "contract", "erc20"]
related_docs: ["con-002", "tok-001"]
---

# TON Token Contract

## Overview

TON (Tokamak Network Token) is the native utility token of the Tokamak Network ecosystem.

## Contract Information

- **Network**: Ethereum Mainnet
- **Contract Address**: `0x2be5e8c109e2197D077D13A82dAead6a9b3433C5`
- **Token Standard**: ERC-20
- **Decimals**: 18
- **Symbol**: TON

## Key Functions

### Transfer
```solidity
function transfer(address to, uint256 amount) external returns (bool)
```

### Approve
```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

### Balance Query
```solidity
function balanceOf(address account) external view returns (uint256)
```

---

*TODO: Add ABI and detailed function documentation*
