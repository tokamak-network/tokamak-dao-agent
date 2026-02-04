---
id: "con-031"
title: "Layer2ManagerProxy Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "proxy", "upgradeable"]
related_docs: ["con-030"]
source_url: "https://etherscan.io/address/0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D"
---

# Layer2ManagerProxy

## Overview

Upgradeable proxy for Layer2Manager

This is an upgradeable proxy contract. The implementation logic is at `0x2eb7f500125f11544392b83b87cdeb9456f3509f`.

## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D` |
| **Contract Name** | Layer2ManagerProxy |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | proxy (Proxy) |
| **Implementation** | `0x2eb7f500125f11544392b83b87cdeb9456f3509f` |


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

#### `availableRegister`

```solidity
function availableRegister(address _rollupConfig) view returns (bool)
```

**Parameters:**
- `_rollupConfig`: `address`

**Returns:**
- `result`: `bool`

#### `candidateAddOnOfOperator`

```solidity
function candidateAddOnOfOperator(address _oper) view returns (address)
```

**Parameters:**
- `_oper`: `address`

**Returns:**
- `result`: `address`

#### `checkL1Bridge`

```solidity
function checkL1Bridge(address _rollupConfig) view returns (bool, address, address, address)
```

**Parameters:**
- `_rollupConfig`: `address`

**Returns:**
- `result`: `bool`
- `l1Bridge`: `address`
- `portal`: `address`
- `l2Ton`: `address`

#### `checkL1BridgeDetail`

```solidity
function checkL1BridgeDetail(address _rollupConfig) view returns (bool, address, address, address, uint8, uint8, bool, bool)
```

**Parameters:**
- `_rollupConfig`: `address`

**Returns:**
- `result`: `bool`
- `l1Bridge`: `address`
- `portal`: `address`
- `l2Ton`: `address`
- `_type`: `uint8`
- `status`: `uint8`
- `rejectedSeigs`: `bool`
- `rejectedL2Deposit`: `bool`

#### `checkLayer2TVL`

```solidity
function checkLayer2TVL(address _rollupConfig) view returns (bool, uint256)
```

**Parameters:**
- `_rollupConfig`: `address`

**Returns:**
- `result`: `bool`
- `amount`: `uint256`

#### `dao`

```solidity
function dao() view returns (address)
```

**Returns:**
- `result`: `address`

#### `hasRole`

```solidity
function hasRole(bytes32 role, address account) view returns (bool)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `l1BridgeRegistry`

```solidity
function l1BridgeRegistry() view returns (address)
```

**Returns:**
- `result`: `address`

#### `layerInfo`

```solidity
function layerInfo(address layer2) view returns (address, address)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `rollupConfig`: `address`
- `operator`: `address`

*...and 14 more functions*

### State-Changing Functions

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `registerCandidateAddOn`

```solidity
function registerCandidateAddOn(address rollupConfig, uint256 amount, bool flagTon, string memo)
```

**Parameters:**
- `rollupConfig`: `address`
- `amount`: `uint256`
- `flagTon`: `bool`
- `memo`: `string`

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

#### `pauseCandidateAddOn`

```solidity
function pauseCandidateAddOn(address rollupConfig)
```

**Parameters:**
- `rollupConfig`: `address`

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

#### `setAddresses`

```solidity
function setAddresses(address _l1BridgeRegistry, address _operatorManagerFactory, address _ton, address _wton, address _dao, address _depositManager, address _seigManager, address _swapProxy)
```

**Parameters:**
- `_l1BridgeRegistry`: `address`
- `_operatorManagerFactory`: `address`
- `_ton`: `address`
- `_wton`: `address`
- `_dao`: `address`
- `_depositManager`: `address`
- `_seigManager`: `address`
- `_swapProxy`: `address`

*...and 5 more functions*

### Token Operations

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

#### `transferL2Seigniorage`

```solidity
function transferL2Seigniorage(address layer2, uint256 amount)
```

**Parameters:**
- `layer2`: `address`
- `amount`: `uint256`

### Staking Operations

#### `depositManager`

```solidity
function depositManager() view returns (address)
```

**Returns:**
- `result`: `address`

#### `minimumInitialDepositAmount`

```solidity
function minimumInitialDepositAmount() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `seigManager`

```solidity
function seigManager() view returns (address)
```

**Returns:**
- `result`: `address`

## Events

#### `PausedCandidateAddOn`

```solidity
event PausedCandidateAddOn(address rollupConfig, address candidateAddOn)
```

**Parameters:**
- `rollupConfig`: `address`
- `candidateAddOn`: `address`

#### `RegisteredCandidateAddOn`

```solidity
event RegisteredCandidateAddOn(address rollupConfig, uint256 wtonAmount, string memo, address operator, address candidateAddOn)
```

**Parameters:**
- `rollupConfig`: `address`
- `wtonAmount`: `uint256`
- `memo`: `string`
- `operator`: `address`
- `candidateAddOn`: `address`

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

#### `SetAddresses`

```solidity
event SetAddresses(address _l2Register, address _operatorManagerFactory, address _ton, address _wton, address _dao, address _depositManager, address _seigManager, address _swapProxy)
```

**Parameters:**
- `_l2Register`: `address`
- `_operatorManagerFactory`: `address`
- `_ton`: `address`
- `_wton`: `address`
- `_dao`: `address`
- `_depositManager`: `address`
- `_seigManager`: `address`
- `_swapProxy`: `address`

#### `SetMinimumInitialDepositAmount`

```solidity
event SetMinimumInitialDepositAmount(uint256 _minimumInitialDepositAmount)
```

**Parameters:**
- `_minimumInitialDepositAmount`: `uint256`

#### `SetOperatorManagerFactory`

```solidity
event SetOperatorManagerFactory(address _operatorManagerFactory)
```

**Parameters:**
- `_operatorManagerFactory`: `address`

#### `TransferWTON`

```solidity
event TransferWTON(address layer2, address to, uint256 amount)
```

**Parameters:**
- `layer2`: `address`
- `to`: `address`
- `amount`: `uint256`

#### `UnpausedCandidateAddOn`

```solidity
event UnpausedCandidateAddOn(address rollupConfig, address candidateAddOn)
```

**Parameters:**
- `rollupConfig`: `address`
- `candidateAddOn`: `address`

## Integration

### Related Contracts

- **Layer2ManagerV1_1** (`0x2EB7f500125f11544392B83B87cDEb9456f3509f`): Layer2 Manager V1.1 implementation

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
