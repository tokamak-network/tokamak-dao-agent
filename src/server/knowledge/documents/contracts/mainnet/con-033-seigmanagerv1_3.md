---
id: "con-033"
title: "SeigManagerV1_3 Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation", "staking", "seigniorage", "rewards"]
related_docs: ["con-034", "con-075", "con-074", "con-073", "con-076"]
source_url: "https://etherscan.io/address/0xce18C6F84F10881eA47A43AF7311A29bb116F628"
---

# SeigManagerV1_3

## Overview

SeigManager V1.3 implementation



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xce18C6F84F10881eA47A43AF7311A29bb116F628` |
| **Contract Name** | SeigManagerV1_3 |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | implementation |


## On-Chain State

- **paused**: `false`


## Functions

### View Functions

#### `CHALLENGER_ROLE`

```solidity
function CHALLENGER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `INITIAL_TOTAL_SUPPLY_MAINNET`

```solidity
function INITIAL_TOTAL_SUPPLY_MAINNET() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `MANAGER_ROLE`

```solidity
function MANAGER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `MAX_VALID_COMMISSION`

```solidity
function MAX_VALID_COMMISSION() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `MIN_VALID_COMMISSION`

```solidity
function MIN_VALID_COMMISSION() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `OPERATOR_ROLE`

```solidity
function OPERATOR_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `RAY`

```solidity
function RAY() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `REGISTRANT_ROLE`

```solidity
function REGISTRANT_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `adjustCommissionDelay`

```solidity
function adjustCommissionDelay() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `aliveImplementation`

```solidity
function aliveImplementation(address ) view returns (bool)
```

**Parameters:**
- ``: `address`

**Returns:**
- `result`: `bool`

*...and 21 more functions*

### State-Changing Functions

#### `addChallenger`

```solidity
function addChallenger(address account)
```

**Parameters:**
- `account`: `address`

#### `addOperator`

```solidity
function addOperator(address account)
```

**Parameters:**
- `account`: `address`

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `removeChallenger`

```solidity
function removeChallenger(address account)
```

**Parameters:**
- `account`: `address`

#### `removeOperator`

```solidity
function removeOperator(address account)
```

**Parameters:**
- `account`: `address`

#### `renounceChallenger`

```solidity
function renounceChallenger()
```

#### `renounceOperator`

```solidity
function renounceOperator()
```

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

### Admin Functions

#### `DEFAULT_ADMIN_ROLE`

```solidity
function DEFAULT_ADMIN_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `PAUSE_ROLE`

```solidity
function PAUSE_ROLE() view returns (bytes32)
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

#### `layer2PauseBlocks`

```solidity
function layer2PauseBlocks(address , uint256 ) view returns (uint256)
```

**Parameters:**
- ``: `address`
- ``: `uint256`

**Returns:**
- `result`: `uint256`

#### `layer2UnpauseBlocks`

```solidity
function layer2UnpauseBlocks(address , uint256 ) view returns (uint256)
```

**Parameters:**
- ``: `address`
- ``: `uint256`

**Returns:**
- `result`: `uint256`

#### `pause`

```solidity
function pause()
```

#### `pauseProxy`

```solidity
function pauseProxy() view returns (bool)
```

**Returns:**
- `result`: `bool`

*...and 5 more functions*

### Token Operations

#### `BURNT_AMOUNT_MAINNET`

```solidity
function BURNT_AMOUNT_MAINNET() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `MINTER_ROLE`

```solidity
function MINTER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `addMinter`

```solidity
function addMinter(address account)
```

**Parameters:**
- `account`: `address`

#### `burntAmountAtDAO`

```solidity
function burntAmountAtDAO() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `isMinter`

```solidity
function isMinter(address account) view returns (bool)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `removeMinter`

```solidity
function removeMinter(address account)
```

**Parameters:**
- `account`: `address`

#### `renounceMinter`

```solidity
function renounceMinter()
```

### Staking Operations

#### `SEIG_START_MAINNET`

```solidity
function SEIG_START_MAINNET() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `accRelativeSeig`

```solidity
function accRelativeSeig() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `claimableL2Seigniorage`

```solidity
function claimableL2Seigniorage(address layer2) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `amount`: `uint256`

#### `daoSeigRate`

```solidity
function daoSeigRate() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `excludeFromL2Seigniorage`

```solidity
function excludeFromL2Seigniorage(address layer2) returns (bool)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `result`: `bool`

#### `includeFromL2Seigniorage`

```solidity
function includeFromL2Seigniorage(address layer2) returns (bool)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `result`: `bool`

#### `powerTONSeigRate`

```solidity
function powerTONSeigRate() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `relativeSeigRate`

```solidity
function relativeSeigRate() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `seigStartBlock`

```solidity
function seigStartBlock() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `updateSeigniorage`

```solidity
function updateSeigniorage() returns (bool)
```

**Returns:**
- `result`: `bool`

*...and 1 more functions*

## Events

#### `AddedSeigAtLayer`

```solidity
event AddedSeigAtLayer(address layer2, uint256 seigs, uint256 operatorSeigs, uint256 nextTotalSupply, uint256 prevTotalSupply)
```

**Parameters:**
- `layer2`: `address`
- `seigs`: `uint256`
- `operatorSeigs`: `uint256`
- `nextTotalSupply`: `uint256`
- `prevTotalSupply`: `uint256`

#### `Comitted`

```solidity
event Comitted(indexed address layer2)
```

**Parameters:**
- `layer2`: `address` (indexed)

#### `CommitLog1`

```solidity
event CommitLog1(uint256 totalStakedAmount, uint256 totalSupplyOfWTON, uint256 prevTotalSupply, uint256 nextTotalSupply)
```

**Parameters:**
- `totalStakedAmount`: `uint256`
- `totalSupplyOfWTON`: `uint256`
- `prevTotalSupply`: `uint256`
- `nextTotalSupply`: `uint256`

#### `ExcludedFromL2Seigniorage`

```solidity
event ExcludedFromL2Seigniorage(address layer2)
```

**Parameters:**
- `layer2`: `address`

#### `IncludedFromL2Seigniorage`

```solidity
event IncludedFromL2Seigniorage(address layer2)
```

**Parameters:**
- `layer2`: `address`

#### `Paused`

```solidity
event Paused(address account)
```

**Parameters:**
- `account`: `address`

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

#### `SeigGiven2`

```solidity
event SeigGiven2(indexed address layer2, uint256 totalSeig, uint256 stakedSeig, uint256 unstakedSeig, uint256 powertonSeig, uint256 daoSeig, uint256 pseig, uint256 l2TotalSeigs, uint256 layer2Seigs)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `totalSeig`: `uint256`
- `stakedSeig`: `uint256`
- `unstakedSeig`: `uint256`
- `powertonSeig`: `uint256`
- `daoSeig`: `uint256`
- `pseig`: `uint256`
- `l2TotalSeigs`: `uint256`
- `layer2Seigs`: `uint256`

#### `Unpaused`

```solidity
event Unpaused(address account)
```

**Parameters:**
- `account`: `address`

## Integration

### Related Contracts

- **DAOCommitteeProxy** (`0xDD9f0cCc044B0781289Ee318e5971b0139602C26`): Upgradeable proxy for DAOCommittee
- **DAOCommittee_V1** (`0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe`): DAOCommittee V1 implementation
- **DAOCommitteeProxy2** (`0xD6175F575F4d32392508Ee2FBbDec9a2E8B3c01a`): Second DAOCommittee proxy contract
- **DAOCommitteeProxy** (`0xDD9f0cCc044B0781289Ee318e5971b0139602C26`): Upgradeable proxy for DAOCommittee
- **DAOCommitteeOwner** (`0x5991Aebb5271522d33C457bf6DF26d83c0dAa221`): DAOCommittee owner contract

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xce18C6F84F10881eA47A43AF7311A29bb116F628",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
