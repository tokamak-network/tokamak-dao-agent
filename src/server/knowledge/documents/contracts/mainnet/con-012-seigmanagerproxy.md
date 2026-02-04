---
id: "con-012"
title: "SeigManagerProxy Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "proxy", "staking", "seigniorage", "rewards", "upgradeable"]
related_docs: ["con-032", "con-034", "con-075", "con-074", "con-073"]
source_url: "https://etherscan.io/address/0x0b55a0f463b6defb81c6063973763951712d0e5f"
---

# SeigManagerProxy

## Overview

Upgradeable proxy for SeigManager

This is an upgradeable proxy contract. The implementation logic is at `0xb1958719b3af9b4d85d93efc5e317c97cce9abc4`.

## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x0b55a0f463b6defb81c6063973763951712d0e5f` |
| **Contract Name** | SeigManagerProxy |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | proxy (Proxy) |
| **Implementation** | `0xb1958719b3af9b4d85d93efc5e317c97cce9abc4` |


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

*...and 36 more functions*

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

*...and 3 more functions*

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

#### `isPauseL2Seigniorage`

```solidity
function isPauseL2Seigniorage(address layer2) view returns (bool)
```

**Parameters:**
- `layer2`: `address`

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

#### `pauseProxy`

```solidity
function pauseProxy() view returns (bool)
```

**Returns:**
- `result`: `bool`

*...and 27 more functions*

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

*...and 1 more functions*

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

#### `allowIssuanceLayer2Seigs`

```solidity
function allowIssuanceLayer2Seigs(address layer2) view returns (address, bool)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `rollupConfig`: `address`
- `allowed`: `bool`

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

#### `depositManager`

```solidity
function depositManager() view returns (address)
```

**Returns:**
- `result`: `address`

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

*...and 19 more functions*

## Events

#### `CoinageCreated`

```solidity
event CoinageCreated(indexed address layer2, address coinage)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `coinage`: `address`

#### `CommissionRateSet`

```solidity
event CommissionRateSet(indexed address layer2, uint256 previousRate, uint256 newRate)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `previousRate`: `uint256`
- `newRate`: `uint256`

#### `CommitLog1`

```solidity
event CommitLog1(uint256 totalStakedAmount, uint256 totalSupplyOfWTON, uint256 prevTotalSupply, uint256 nextTotalSupply)
```

**Parameters:**
- `totalStakedAmount`: `uint256`
- `totalSupplyOfWTON`: `uint256`
- `prevTotalSupply`: `uint256`
- `nextTotalSupply`: `uint256`

#### `Initialized`

```solidity
event Initialized(address ton_, address wton_, address registry_, address depositManager_, uint256 seigPerBlock_, address factory_, uint256 lastSeigBlock_)
```

**Parameters:**
- `ton_`: `address`
- `wton_`: `address`
- `registry_`: `address`
- `depositManager_`: `address`
- `seigPerBlock_`: `uint256`
- `factory_`: `address`
- `lastSeigBlock_`: `uint256`

#### `OnSnapshot`

```solidity
event OnSnapshot(uint256 snapshotId)
```

**Parameters:**
- `snapshotId`: `uint256`

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

#### `SetAdjustDelay`

```solidity
event SetAdjustDelay(uint256 adjustDelay_)
```

**Parameters:**
- `adjustDelay_`: `uint256`

#### `SetBurntAmountAtDAO`

```solidity
event SetBurntAmountAtDAO(uint256 _burntAmountAtDAO)
```

**Parameters:**
- `_burntAmountAtDAO`: `uint256`

#### `SetCoinageFactory`

```solidity
event SetCoinageFactory(address factory_)
```

**Parameters:**
- `factory_`: `address`

#### `SetDao`

```solidity
event SetDao(address daoAddress)
```

**Parameters:**
- `daoAddress`: `address`

#### `SetDaoSeigRate`

```solidity
event SetDaoSeigRate(uint256 daoSeigRate)
```

**Parameters:**
- `daoSeigRate`: `uint256`

#### `SetInitialTotalSupply`

```solidity
event SetInitialTotalSupply(uint256 _initialTotalSupply)
```

**Parameters:**
- `_initialTotalSupply`: `uint256`

*...and 10 more events*

## Integration

### Related Contracts

- **DAOAgendaManager** (`0xcD4421d082752f363E1687544a09d5112cD4f484`): Manages DAO agenda proposals and voting
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
  "0x0b55a0f463b6defb81c6063973763951712d0e5f",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
