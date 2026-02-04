---
id: "con-034"
title: "DepositManagerV1_1 Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation", "deposit", "withdrawal", "staking"]
related_docs: ["con-034", "con-075", "con-074", "con-073", "con-076"]
source_url: "https://etherscan.io/address/0x74bC3031b9369e6b898e82784106257D4D37Eac5"
---

# DepositManagerV1_1

## Overview

DepositManager V1.1 implementation



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x74bC3031b9369e6b898e82784106257D4D37Eac5` |
| **Contract Name** | DepositManagerV1_1 |
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

#### `layer2Manager`

```solidity
function layer2Manager() view returns (address)
```

**Returns:**
- `result`: `address`

#### `proxyImplementation`

```solidity
function proxyImplementation(uint256 ) view returns (address)
```

**Parameters:**
- ``: `uint256`

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

#### `ton`

```solidity
function ton() view returns (address)
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
function setAddresses(address _l1BridgeRegistry, address _layer2Manager)
```

**Parameters:**
- `_l1BridgeRegistry`: `address`
- `_layer2Manager`: `address`

#### `setMinDepositGasLimit`

```solidity
function setMinDepositGasLimit(uint32 gasLimit_)
```

**Parameters:**
- `gasLimit_`: `uint32`

*...and 2 more functions*

### Staking Operations

#### `globalWithdrawalDelay`

```solidity
function globalWithdrawalDelay() view returns (uint256)
```

**Returns:**
- `result`: `uint256`

#### `minDepositGasLimit`

```solidity
function minDepositGasLimit() view returns (uint32)
```

**Returns:**
- `result`: `uint32`

#### `oldDepositManager`

```solidity
function oldDepositManager() view returns (address)
```

**Returns:**
- `result`: `address`

#### `requestWithdrawal`

```solidity
function requestWithdrawal(address layer2, uint256 amount) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `amount`: `uint256`

**Returns:**
- `result`: `bool`

#### `withdrawAndDepositL2`

```solidity
function withdrawAndDepositL2(address layer2, uint256 amount) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `amount`: `uint256`

**Returns:**
- `result`: `bool`

#### `withdrawalDelay`

```solidity
function withdrawalDelay(address ) view returns (uint256)
```

**Parameters:**
- ``: `address`

**Returns:**
- `result`: `uint256`

## Events

#### `DepositedERC20To`

```solidity
event DepositedERC20To(address l1Bridge, address l1Ton, address l2Ton, address caller, uint256 tonAmount, uint32 minDepositGasLimit)
```

**Parameters:**
- `l1Bridge`: `address`
- `l1Ton`: `address`
- `l2Ton`: `address`
- `caller`: `address`
- `tonAmount`: `uint256`
- `minDepositGasLimit`: `uint32`

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
event SetAddresses(address l1BridgeRegistry_, address layer2Manager_)
```

**Parameters:**
- `l1BridgeRegistry_`: `address`
- `layer2Manager_`: `address`

#### `SetMinDepositGasLimit`

```solidity
event SetMinDepositGasLimit(uint32 gasLimit_)
```

**Parameters:**
- `gasLimit_`: `uint32`

#### `WithdrawalAndDeposited`

```solidity
event WithdrawalAndDeposited(indexed address layer2, address account, uint256 amount)
```

**Parameters:**
- `layer2`: `address` (indexed)
- `account`: `address`
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
  "0x74bC3031b9369e6b898e82784106257D4D37Eac5",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
