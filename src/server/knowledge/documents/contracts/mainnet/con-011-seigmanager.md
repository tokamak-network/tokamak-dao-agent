---
id: "con-011"
title: "SeigManager Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation", "staking", "seigniorage", "rewards"]
related_docs: ["con-034", "con-075", "con-074", "con-073", "con-076"]
source_url: "https://etherscan.io/address/0x3b1e59c2ff4b850d78ab50cb13a4a482101681b6"
---

# SeigManager

## Overview

Seigniorage calculation and distribution logic



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x3b1e59c2ff4b850d78ab50cb13a4a482101681b6` |
| **Contract Name** | SeigManager |
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

#### `DEFAULT_FACTOR`

```solidity
function DEFAULT_FACTOR() pure returns (uint256)
```

**Returns:**
- `result`: `uint256`

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

#### `coinages`

```solidity
function coinages(address layer2) view returns (address)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `result`: `address`

#### `commissionRates`

```solidity
function commissionRates(address layer2) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `result`: `uint256`

*...and 22 more functions*

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

#### `deployCoinage`

```solidity
function deployCoinage(address layer2) returns (bool)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `result`: `bool`

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `initialize`

```solidity
function initialize(address ton_, address wton_, address registry_, address depositManager_, uint256 seigPerBlock_, address factory_, uint256 lastSeigBlock_)
```

**Parameters:**
- `ton_`: `address`
- `wton_`: `address`
- `registry_`: `address`
- `depositManager_`: `address`
- `seigPerBlock_`: `uint256`
- `factory_`: `address`
- `lastSeigBlock_`: `uint256`

#### `onSnapshot`

```solidity
function onSnapshot() returns (uint256)
```

**Returns:**
- `snapshotId`: `uint256`

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

*...and 5 more functions*

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

#### `paused`

```solidity
function paused() view returns (bool)
```

**Returns:**
- `result`: `bool`

#### `pausedBlock`

```solidity
function pausedBlock() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

*...and 20 more functions*

### Token Operations

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

#### `additionalTotBurnAmount`

```solidity
function additionalTotBurnAmount(address layer2, address account, uint256 amount) view returns (uint256)
```

**Parameters:**
- `layer2`: `address`
- `account`: `address`
- `amount`: `uint256`

**Returns:**
- `totAmount`: `uint256`

#### `isMinter`

```solidity
function isMinter(address account) view returns (bool)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `onTransfer`

```solidity
function onTransfer(address sender, address recipient, uint256 amount) returns (bool)
```

**Parameters:**
- `sender`: `address`
- `recipient`: `address`
- `amount`: `uint256`

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
function renounceMinter(address target)
```

**Parameters:**
- `target`: `address`

#### `renounceMinter`

```solidity
function renounceMinter()
```

#### `renounceWTONMinter`

```solidity
function renounceWTONMinter()
```

#### `revokeMinter`

```solidity
function revokeMinter(address account)
```

**Parameters:**
- `account`: `address`

### Staking Operations

#### `accRelativeSeig`

```solidity
function accRelativeSeig() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `daoSeigRate`

```solidity
function daoSeigRate() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `depositManager`

```solidity
function depositManager() view returns (address)
```

**Returns:**
- `result`: `address`

#### `lastSeigBlock`

```solidity
function lastSeigBlock() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `onDeposit`

```solidity
function onDeposit(address layer2, address account, uint256 amount) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `account`: `address`
- `amount`: `uint256`

**Returns:**
- `result`: `bool`

#### `onWithdraw`

```solidity
function onWithdraw(address layer2, address account, uint256 amount) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `account`: `address`
- `amount`: `uint256`

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

#### `seigPerBlock`

```solidity
function seigPerBlock() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `stakeOf`

```solidity
function stakeOf(address account) view returns (uint256)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `amount`: `uint256`

*...and 8 more functions*

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

#### `CoinageCreated`

```solidity
event CoinageCreated(indexed address layer2, address coinage)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `coinage`: `address`

#### `Comitted`

```solidity
event Comitted(indexed address layer2)
```

**Parameters:**
- `layer2`: `address` (indexed)

#### `CommissionRateSet`

```solidity
event CommissionRateSet(indexed address layer2, uint256 previousRate, uint256 newRate)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `previousRate`: `uint256`
- `newRate`: `uint256`

#### `OnSnapshot`

```solidity
event OnSnapshot(uint256 snapshotId)
```

**Parameters:**
- `snapshotId`: `uint256`

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

#### `SeigGiven`

```solidity
event SeigGiven(indexed address layer2, uint256 totalSeig, uint256 stakedSeig, uint256 unstakedSeig, uint256 powertonSeig, uint256 daoSeig, uint256 pseig)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `totalSeig`: `uint256`
- `stakedSeig`: `uint256`
- `unstakedSeig`: `uint256`
- `powertonSeig`: `uint256`
- `daoSeig`: `uint256`
- `pseig`: `uint256`

#### `SetDaoSeigRate`

```solidity
event SetDaoSeigRate(uint256 daoSeigRate)
```

**Parameters:**
- `daoSeigRate`: `uint256`

#### `SetPowerTONSeigRate`

```solidity
event SetPowerTONSeigRate(uint256 powerTONSeigRate)
```

**Parameters:**
- `powerTONSeigRate`: `uint256`

#### `SetPseigRate`

```solidity
event SetPseigRate(uint256 pseigRate)
```

**Parameters:**
- `pseigRate`: `uint256`

#### `Unpaused`

```solidity
event Unpaused(address account)
```

**Parameters:**
- `account`: `address`

#### `UnstakeLog`

```solidity
event UnstakeLog(uint256 coinageBurnAmount, uint256 totBurnAmount)
```

**Parameters:**
- `coinageBurnAmount`: `uint256`
- `totBurnAmount`: `uint256`

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
  "0x3b1e59c2ff4b850d78ab50cb13a4a482101681b6",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
