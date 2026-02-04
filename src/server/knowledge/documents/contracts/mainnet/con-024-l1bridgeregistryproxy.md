---
id: "con-024"
title: "L1BridgeRegistryProxy Contract"
category: "contracts"
status: "active"
created_at: "2026-02-04"
updated_at: "2026-02-04"
version: "1.0"
tags: ["contract", "proxy", "registry", "upgradeable"]
related_docs: ["con-023"]
source_url: "https://etherscan.io/address/0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4"
---

# L1BridgeRegistryProxy

## Overview

Upgradeable proxy for L1BridgeRegistry

This is an upgradeable proxy contract. The implementation logic is at `0x259ac335eb42d345a61be48104ec0ec20b283f14`.

## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | `0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4` |
| **Contract Name** | L1BridgeRegistryProxy |
| **Compiler Version** | v0.8.19+commit.7dd6d404 |
| **Type** | proxy (Proxy) |
| **Implementation** | `0x259ac335eb42d345a61be48104ec0ec20b283f14` |


## On-Chain State

*No on-chain state available*


## Functions

### View Functions

#### `CHALLENGER_ROLE`

```solidity
function CHALLENGER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `MANAGER_ROLE`

```solidity
function MANAGER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `OPERATOR_ROLE`

```solidity
function OPERATOR_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

#### `REGISTRANT_ROLE`

```solidity
function REGISTRANT_ROLE() view returns (bytes32)
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

#### `availableForRegistration`

```solidity
function availableForRegistration(address rollupConfig, uint8 _type) view returns (bool)
```

**Parameters:**
- `rollupConfig`: `address`
- `_type`: `uint8`

**Returns:**
- `valid`: `bool`

#### `getRollupInfo`

```solidity
function getRollupInfo(address rollupConfig) view returns (uint8, address, bool, bool, string)
```

**Parameters:**
- `rollupConfig`: `address`

**Returns:**
- `type_`: `uint8`
- `l2TON_`: `address`
- `rejectedSeigs_`: `bool`
- `rejectedL2Deposit_`: `bool`
- `name_`: `string`

#### `hasRole`

```solidity
function hasRole(bytes32 role, address account) view returns (bool)
```

**Parameters:**
- `role`: `bytes32`
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `isManager`

```solidity
function isManager(address account) view returns (bool)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `result`: `bool`

#### `isRegistrant`

```solidity
function isRegistrant(address account) view returns (bool)
```

**Parameters:**
- `account`: `address`

**Returns:**
- `result`: `bool`

*...and 13 more functions*

### State-Changing Functions

#### `addManager`

```solidity
function addManager(address account)
```

**Parameters:**
- `account`: `address`

#### `addRegistrant`

```solidity
function addRegistrant(address account)
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

#### `registerRollupConfig`

```solidity
function registerRollupConfig(address rollupConfig, uint8 _type, address _l2TON, string _name)
```

**Parameters:**
- `rollupConfig`: `address`
- `_type`: `uint8`
- `_l2TON`: `address`
- `_name`: `string`

#### `registerRollupConfig`

```solidity
function registerRollupConfig(address rollupConfig, uint8 _type, address _l2TON)
```

**Parameters:**
- `rollupConfig`: `address`
- `_type`: `uint8`
- `_l2TON`: `address`

#### `registerRollupConfigByManager`

```solidity
function registerRollupConfigByManager(address rollupConfig, uint8 _type, address _l2TON)
```

**Parameters:**
- `rollupConfig`: `address`
- `_type`: `uint8`
- `_l2TON`: `address`

#### `registerRollupConfigByManager`

```solidity
function registerRollupConfigByManager(address rollupConfig, uint8 _type, address _l2TON, string _name)
```

**Parameters:**
- `rollupConfig`: `address`
- `_type`: `uint8`
- `_l2TON`: `address`
- `_name`: `string`

#### `rejectCandidateAddOn`

```solidity
function rejectCandidateAddOn(address rollupConfig)
```

**Parameters:**
- `rollupConfig`: `address`

#### `removeManager`

```solidity
function removeManager(address account)
```

**Parameters:**
- `account`: `address`

#### `removeRegistrant`

```solidity
function removeRegistrant(address account)
```

**Parameters:**
- `account`: `address`

*...and 7 more functions*

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
function setAddresses(address _layer2Manager, address _seigManager, address _ton)
```

**Parameters:**
- `_layer2Manager`: `address`
- `_seigManager`: `address`
- `_ton`: `address`

*...and 2 more functions*

### Token Operations

#### `MINTER_ROLE`

```solidity
function MINTER_ROLE() view returns (bytes32)
```

**Returns:**
- `result`: `bytes32`

### Staking Operations

#### `isRejectedL2Deposit`

```solidity
function isRejectedL2Deposit(address rollupConfig) view returns (bool)
```

**Parameters:**
- `rollupConfig`: `address`

**Returns:**
- `rejectedL2Deposit`: `bool`

#### `isRejectedSeigs`

```solidity
function isRejectedSeigs(address rollupConfig) view returns (bool)
```

**Parameters:**
- `rollupConfig`: `address`

**Returns:**
- `rejectedSeigs`: `bool`

#### `seigManager`

```solidity
function seigManager() view returns (address)
```

**Returns:**
- `result`: `address`

#### `seigniorageCommittee`

```solidity
function seigniorageCommittee() view returns (address)
```

**Returns:**
- `result`: `address`

## Events

#### `AddedBridge`

```solidity
event AddedBridge(address rollupConfig, address bridge)
```

**Parameters:**
- `rollupConfig`: `address`
- `bridge`: `address`

#### `AddedPortal`

```solidity
event AddedPortal(address rollupConfig, address portal)
```

**Parameters:**
- `rollupConfig`: `address`
- `portal`: `address`

#### `ChangedType`

```solidity
event ChangedType(address rollupConfig, uint8 type_, address l2TON, string name)
```

**Parameters:**
- `rollupConfig`: `address`
- `type_`: `uint8`
- `l2TON`: `address`
- `name`: `string`

#### `RegisteredRollupConfig`

```solidity
event RegisteredRollupConfig(address rollupConfig, uint8 type_, address l2TON, string name)
```

**Parameters:**
- `rollupConfig`: `address`
- `type_`: `uint8`
- `l2TON`: `address`
- `name`: `string`

#### `RejectedCandidateAddOn`

```solidity
event RejectedCandidateAddOn(address rollupConfig)
```

**Parameters:**
- `rollupConfig`: `address`

#### `RestoredCandidateAddOn`

```solidity
event RestoredCandidateAddOn(address rollupConfig)
```

**Parameters:**
- `rollupConfig`: `address`

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
event SetAddresses(address _layer2Manager, address _seigManager, address _ton)
```

**Parameters:**
- `_layer2Manager`: `address`
- `_seigManager`: `address`
- `_ton`: `address`

#### `SetBlockingL2Deposit`

```solidity
event SetBlockingL2Deposit(address rollupConfig, bool rejectedL2Deposit)
```

**Parameters:**
- `rollupConfig`: `address`
- `rejectedL2Deposit`: `bool`

#### `SetSeigniorageCommittee`

```solidity
event SetSeigniorageCommittee(address _seigniorageCommittee)
```

**Parameters:**
- `_seigniorageCommittee`: `address`

## Integration

### Related Contracts

- **L1BridgeRegistryV1_1** (`0x259Ac335EB42d345A61bE48104eC0Ec20b283F14`): L1 Bridge Registry V1.1 implementation

### Usage Examples

```typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4",
  ABI, // Import from generated ABI
  provider
);
```

---

*This document was auto-generated from on-chain data. Last updated: 2026-02-04*
