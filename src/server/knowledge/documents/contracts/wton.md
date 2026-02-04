---
id: "con-002"
title: "WTON (Wrapped TON) Contract"
category: "contracts"
status: "active"
created_at: "2025-02-04"
updated_at: "2025-02-04"
version: "1.0"
tags: ["wton", "wrapped", "token", "staking", "contract"]
related_docs: ["con-001", "con-003"]
---

# WTON (Wrapped TON) Contract

## Overview

WTON is the wrapped version of TON, used for staking in the Tokamak Network.

## Contract Information

- **Network**: Ethereum Mainnet
- **Contract Address**: `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2`
- **Token Standard**: ERC-20 Compatible
- **Decimals**: 27 (ray precision)
- **Symbol**: WTON

## Conversion Rate

- 1 TON = 1 WTON (different decimal representations)
- TON uses 18 decimals, WTON uses 27 decimals (ray)

## Key Functions

### Swap TON to WTON
```solidity
function swapFromTON(uint256 tonAmount) external returns (bool)
```

### Swap WTON to TON
```solidity
function swapToTON(uint256 wtonAmount) external returns (bool)
```

## Usage

WTON is required for:
- Staking in Layer 2 operators
- Participating in governance voting
- Earning seigniorage rewards

---

*TODO: Add complete ABI and interaction examples*
