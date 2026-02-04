---
id: "con-013"
title: "DepositManager Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation", "deposit", "withdrawal", "staking"]
related_docs: ["con-014", "con-034", "con-075", "con-074", "con-073"]
source_url: "https://etherscan.io/address/0x76c01207959df1242c2824b4445cde48eb55d2f1"
---

# DepositManager

## Overview

WTON deposit and withdrawal logic



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x76c01207959df1242c2824b4445cde48eb55d2f1` |
| **Contract Name** | DepositManager |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | implementation |


## On-Chain State

*No on-chain state available*


## Functions

### View Functions

#### `aliveImplementation`

```solidity
function aliveImplementation(address ) view returns (bool)
```

**Parameters:**
- ``: `address`

**Returns:**
- `result`: `bool`

#### `getDelayBlocks`

```solidity
function getDelayBlocks(address layer2) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `result`: `uint256`

#### `hasRole`

```solidity
function hasRole(bytes32 role, address account) view returns (bool)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `numPendingRequests`

```solidity
function numPendingRequests(address layer2, address account) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`
- `account`: `address`

**Returns:**
- `result`: `uint256`

#### `numRequests`

```solidity
function numRequests(address layer2, address account) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`
- `account`: `address`

**Returns:**
- `result`: `uint256`

#### `proxyImplementation`

```solidity
function proxyImplementation(uint256 ) view returns (address)
```

**Parameters:**
- ``: `uint256`

**Returns:**
- `result`: `address`

#### `registry`

```solidity
function registry() view returns (address)
```

**Returns:**
- `result`: `address`

#### `selectorImplementation`

```solidity
function selectorImplementation(bytes4 ) view returns (address)
```

**Parameters:**
- ``: `bytes4`

**Returns:**
- `result`: `address`

#### `supportsInterface`

```solidity
function supportsInterface(bytes4 interfaceId) view returns (bool)
```

**Parameters:**
- `interfaceId`: `bytes4`

**Returns:**
- `result`: `bool`

#### `wton`

```solidity
function wton() view returns (address)
```

**Returns:**
- `result`: `address`

### State-Changing Functions

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `initialize`

```solidity
function initialize(address wton_, address registry_, address seigManager_, uint256 globalWithdrawalDelay_, address oldDepositManager_)
```

**Parameters:**
- `wton_`: `address`
- `registry_`: `address`
- `seigManager_`: `address`
- `globalWithdrawalDelay_`: `uint256`
- `oldDepositManager_`: `address`

#### `processRequest`

```solidity
function processRequest(address layer2, bool receiveTON) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `receiveTON`: `bool`

**Returns:**
- `result`: `bool`

#### `processRequests`

```solidity
function processRequests(address layer2, uint256 n, bool receiveTON) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `n`: `uint256`
- `receiveTON`: `bool`

**Returns:**
- `result`: `bool`

#### `renounceRole`

```solidity
function renounceRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `revokeRole`

```solidity
function revokeRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `slash`

```solidity
function slash(address layer2, address recipient, uint256 amount) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `recipient`: `address`
- `amount`: `uint256`

**Returns:**
- `result`: `bool`

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

#### `setGlobalWithdrawalDelay`

```solidity
function setGlobalWithdrawalDelay(uint256 globalWithdrawalDelay_)
```

**Parameters:**
- `globalWithdrawalDelay_`: `uint256`

#### `setSeigManager`

```solidity
function setSeigManager(address seigManager_)
```

**Parameters:**
- `seigManager_`: `address`

*...and 3 more functions*

### Token Operations

#### `MINTER_ROLE`

```solidity
function MINTER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `onApprove`

```solidity
function onApprove(address owner, address spender, uint256 amount, bytes data) returns (bool)
```

**Parameters:**
- `owner`: `address`
- `spender`: `address`
- `amount`: `uint256`
- `data`: `bytes`

**Returns:**
- `result`: `bool`

### Staking Operations

#### `accStaked`

```solidity
function accStaked(address layer2, address account) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`
- `account`: `address`

**Returns:**
- `wtonAmount`: `uint256`

#### `accStakedAccount`

```solidity
function accStakedAccount(address account) view returns (uint256)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `wtonAmount`: `uint256`

#### `accStakedLayer2`

```solidity
function accStakedLayer2(address layer2) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `wtonAmount`: `uint256`

#### `accUnstaked`

```solidity
function accUnstaked(address layer2, address account) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`
- `account`: `address`

**Returns:**
- `wtonAmount`: `uint256`

#### `accUnstakedAccount`

```solidity
function accUnstakedAccount(address account) view returns (uint256)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `wtonAmount`: `uint256`

#### `accUnstakedLayer2`

```solidity
function accUnstakedLayer2(address layer2) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `wtonAmount`: `uint256`

#### `deposit`

```solidity
function deposit(address layer2, uint256 amount) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `amount`: `uint256`

**Returns:**
- `result`: `bool`

#### `deposit`

```solidity
function deposit(address layer2, address[] accounts, uint256[] amounts) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `accounts`: `address[]`
- `amounts`: `uint256[]`

**Returns:**
- `result`: `bool`

#### `deposit`

```solidity
function deposit(address layer2, address account, uint256 amount) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `account`: `address`
- `amount`: `uint256`

**Returns:**
- `result`: `bool`

#### `globalWithdrawalDelay`

```solidity
function globalWithdrawalDelay() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

*...and 12 more functions*

## Events

#### `Deposited`

```solidity
event Deposited(indexed address layer2, address depositor, uint256 amount)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `depositor`: `address`
- `amount`: `uint256`

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

#### `WithdrawalProcessed`

```solidity
event WithdrawalProcessed(indexed address layer2, address depositor, uint256 amount)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `depositor`: `address`
- `amount`: `uint256`

#### `WithdrawalRequested`

```solidity
event WithdrawalRequested(indexed address layer2, address depositor, uint256 amount)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `depositor`: `address`
- `amount`: `uint256`

## Integration

### Related Contracts

- **DepositManagerProxy** (`0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e`): Upgradeable proxy for DepositManager
- **DAOCommitteeProxy** (`0xDD9f0cCc044B0781289Ee318e5971b0139602C26`): Upgradeable proxy for DAOCommittee
- **DAOCommittee_V1** (`0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe`): DAOCommittee V1 implementation
- **DAOCommitteeProxy2** (`0xD6175F575F4d32392508Ee2FBbDec9a2E8B3c01a`): Second DAOCommittee proxy contract
- **DAOCommitteeProxy** (`0xDD9f0cCc044B0781289Ee318e5971b0139602C26`): Upgradeable proxy for DAOCommittee

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0x76c01207959df1242c2824b4445cde48eb55d2f1",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
