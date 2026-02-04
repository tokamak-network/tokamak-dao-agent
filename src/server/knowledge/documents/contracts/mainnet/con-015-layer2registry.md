---
id: "con-015"
title: "Layer2Registry Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "implementation", "registry"]
related_docs: ["con-016"]
source_url: "https://etherscan.io/address/0x296ef64487ecfddcdd03eab35c81c9262dab88ba"
---

# Layer2Registry

## Overview

Layer 2 registration logic



## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x296ef64487ecfddcdd03eab35c81c9262dab88ba` |
| **Contract Name** | Layer2Registry |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | implementation |


## On-Chain State

*No on-chain state available*


## Functions

### View Functions

#### `OPERATOR_ROLE`

```solidity
function OPERATOR_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

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

#### `isOperator`

```solidity
function isOperator(address account) view returns (bool)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `layer2ByIndex`

```solidity
function layer2ByIndex(uint256 index) view returns (address)
```

**Parameters:**
- `index`: `uint256`

**Returns:**
- `result`: `address`

#### `layer2s`

```solidity
function layer2s(address layer2) view returns (bool)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `result`: `bool`

#### `numLayer2s`

```solidity
function numLayer2s() view returns (uint256)
```

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

### State-Changing Functions

#### `addOperator`

```solidity
function addOperator(address account)
```

**Parameters:**
- `account`: `address`

#### `deployCoinage`

```solidity
function deployCoinage(address layer2, address seigManager) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `seigManager`: `address`

**Returns:**
- `result`: `bool`

#### `grantRole`

```solidity
function grantRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

#### `register`

```solidity
function register(address layer2) returns (bool)
```

**Parameters:**
- `layer2`: `address`

**Returns:**
- `result`: `bool`

#### `registerAndDeployCoinage`

```solidity
function registerAndDeployCoinage(address layer2, address seigManager) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `seigManager`: `address`

**Returns:**
- `result`: `bool`

#### `removeOperator`

```solidity
function removeOperator(address account)
```

**Parameters:**
- `account`: `address`

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

#### `revokeOperator`

```solidity
function revokeOperator(address account)
```

**Parameters:**
- `account`: `address`

#### `revokeRole`

```solidity
function revokeRole(bytes32 role, address account)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

*...and 1 more functions*

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

#### `registerAndDeployCoinageAndSetCommissionRate`

```solidity
function registerAndDeployCoinageAndSetCommissionRate(address layer2, address seigManager, uint256 commissionRate, bool isCommissionRateNegative) returns (bool)
```

**Parameters:**
- `layer2`: `address`
- `seigManager`: `address`
- `commissionRate`: `uint256`
- `isCommissionRateNegative`: `bool`

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

#### `transferAdmin`

```solidity
function transferAdmin(address newAdmin)
```

**Parameters:**
- `newAdmin`: `address`

*...and 1 more functions*

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

#### `revokeMinter`

```solidity
function revokeMinter(address account)
```

**Parameters:**
- `account`: `address`

## Events

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

## Integration

### Related Contracts

- **Layer2RegistryProxy** (`0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b`): Upgradeable proxy for Layer2Registry

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0x296ef64487ecfddcdd03eab35c81c9262dab88ba",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
