# Knowledge Gaps Resolution

On-chain verification results for 8 unresolved items discovered in Phase 1.

Verification date: 2026-02-11
RPC: Alchemy Ethereum Mainnet

---

## 2.1 SwapProxy

**Address**: `0x30e65B3A6e6868F044944Aa0e9C5d52F8dcb138d`
**Priority**: HIGH

### Verification

- `pauseProxy` (slot 0): `0x0000000000000000000000000000000000000000000000000000000000000000` (zero)
- `proxyImplementation(0)`: **REVERTED** -- function does not exist
- EIP-1967 implementation slot: `0x0000000000000000000000000000000000000000000000000000000000000000` (zero)
- EIP-1967 admin slot: `0x0000000000000000000000000000000000000000000000000000000000000000` (zero)
- `implementation()`: not available (reverted)
- `getImplementation()`: not available (reverted)
- `owner()`, `admin()`, `alive()`: not available
- Storage slots 1-3: all zero
- Code size: **357 bytes**
- Bytecode selectors: `01ffc9a7` (`supportsInterface`) and `4273ca16` (`onApprove`)
- `supportsInterface(0x4273ca16)`: `true`

### Bytecode Analysis

Full bytecode retrieved and decoded. The contract has only two functions:
1. `supportsInterface(bytes4)` -- ERC-165 interface detection
2. `onApprove(address,address,uint256,bytes)` -- always returns `true`

### Conclusion

**SwapProxy is NOT a proxy contract.** Despite its name, it is a minimal `onApprove` receiver (357 bytes) that implements ERC-165. It serves as a callback handler for TON's `approveAndCall` pattern, likely used in the TON/WTON swap flow where TON calls `approveAndCall` with this contract as the target. The `onApprove` function always returns `true`, meaning any `approveAndCall` to this address will succeed.

The name "SwapProxy" is misleading -- it has no proxy delegation, no implementation storage, and no upgrade mechanism. It is a stateless, immutable contract.

**contracts.json update needed**: Change description from "TON/WTON swap proxy contract" to something more accurate, and change type from "proxy" to "callback".

---

## 2.2 PowerTONSwapperProxy

**Address**: `0x970298189050aBd4dc4F119ccae14ee145ad9371`
**Priority**: HIGH

### Verification

- `pauseProxy` (slot 0): `0x0000000000000000000000c4a11aaf6ea915ed7ac194161d2fc9384f15bff200`
  - This slot is packed storage. The last byte `00` indicates `pauseProxy = false`. The address `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` stored here is WTON.
- `proxyImplementation(0)`: **REVERTED** -- not a Tokamak-style multi-implementation proxy
- `implementation()`: `0x0Aa0191e9cC7BE9b7228d4d3e3DD65749c93551F` (PowerTONUpgrade)
- EIP-1967 implementation slot: `0x0000000000000000000000000aa0191e9cc7be9b7228d4d3e3dd65749c93551f`
  - Matches the `implementation()` result: `0x0Aa0191e9cC7BE9b7228d4d3e3DD65749c93551F`
- `wton()`: `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` (confirmed WTON)
- `ton()`: not available (likely accessed via WTON or not exposed)
- Code size: **4266 bytes**

### Conclusion

PowerTONSwapperProxy uses a **simple EIP-1967 proxy pattern** (not the Tokamak multi-implementation pattern). Its implementation is `0x0Aa0191e9cC7BE9b7228d4d3e3DD65749c93551F` (PowerTONUpgrade), which matches what contracts.json already records. The proxy is **not paused** and delegates to a single implementation. It stores a reference to WTON in its storage, indicating it handles WTON-related swap operations for the PowerTON system.

**contracts.json**: Already correct. Implementation `0x0AA0191e9cc7BE9B7228D4d3E3Dd65749C93551F` matches.

---

## 2.3 DAOCommittee Implementation

**Address (Proxy)**: `0xDD9f0cCc044B0781289Ee318e5971b0139602C26`
**Priority**: HIGH

### Verification

- `proxyImplementation(0)`: `0x9050Af1638f379A018737880aD946CdDA9101A25`
- `proxyImplementation(1)`: `0xcb9859Dc0fBECa68eFFf2bce289150513fdF7D92`
- `proxyImplementation(2)`: `0x0000000000000000000000000000000000000000` (empty)
- `proxyImplementation(3)`: `0x0000000000000000000000000000000000000000` (empty)

- `aliveImplementation(0x9050Af1638f379A018737880aD946CdDA9101A25)`: **true** (slot 0 impl is alive)
- `aliveImplementation(0xcb9859Dc0fBECa68eFFf2bce289150513fdF7D92)`: **true** (slot 1 impl is alive)
- `aliveImplementation(0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe)`: **false** (DAOCommittee_V1 is NOT alive)
- `aliveImplementation(0x5991Aebb5271522d33C457bf6DF26d83c0dAa221)`: **false** (DAOCommitteeOwner is NOT alive as implementation)

- `getSelectorImplementation(0x00000000)`: function not available on this proxy

### Conclusion

DAOCommitteeProxy uses the **Tokamak multi-implementation proxy pattern** with two active implementation slots:

| Slot | Address | Status |
|------|---------|--------|
| 0 | `0x9050Af1638f379A018737880aD946CdDA9101A25` | **alive** |
| 1 | `0xcb9859Dc0fBECa68eFFf2bce289150513fdF7D92` | **alive** |
| 2+ | zero | empty |

The previously known addresses (`0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe` = DAOCommittee_V1, `0x5991Aebb5271522d33C457bf6DF26d83c0dAa221` = DAOCommitteeOwner) are **no longer alive** as implementations. The proxy has been upgraded to new implementations.

**contracts.json update needed**: Add the two currently alive implementation addresses (`0x9050Af...` and `0xcb9859...`) and update DAOCommitteeProxy entry to reference them.

---

## 2.4 DAOCommitteeProxy2

**Address**: `0xD6175F575F4d32392508Ee2FBbDec9a2E8B3c01a`
**Priority**: MEDIUM

### Verification

- `proxyImplementation(0)`: `0x0000000000000000000000000000000000000000` (zero)
- `implementation()`: `0x0000000000000000000000000000000000000000` (zero)
- `implementation2(0)`: `0x0000000000000000000000000000000000000000` (zero)
- `pauseProxy()`: `false`
- `pauseProxy` (slot 0): `0x0000000000000000000000000000000000000000000000000000000000000000` (zero)
- EIP-1967 implementation slot: `0x0000000000000000000000000000000000000000000000000000000000000000` (zero)
- `aliveImplementation(0x9050Af...)`: `false`
- Code size: **5586 bytes**

### Conclusion

DAOCommitteeProxy2 is **deployed but completely uninitialized**. No implementation has been set at any slot, `pauseProxy` is false, and no alive implementations exist. The contract has code (5586 bytes, matching the DAOCommitteeProxy2.sol source using AccessControl/ERC165), but it has never been configured with an implementation address.

This is likely a **replacement proxy** that was deployed but never activated. It uses a different proxy pattern from the original DAOCommitteeProxy (AccessControl-based with `onlyOwner2` using `DEFAULT_ADMIN_ROLE` instead of the traditional `onlyOwner`). Since it has no implementation, any function calls that hit its fallback will revert with "Proxy: impl OR proxy is false".

**contracts.json**: Description should note it is uninitialized/unused.

---

## 2.5 L1BridgeRegistryProxy_Legacy

**Address**: `0x17Fa32DFf4c26cf0AC65Ff6700B57a4826513Fa0`
**Priority**: MEDIUM

### Verification

- `proxyImplementation(0)`: `0x70aFe7e41e7F7406BCC446f652e2f94ae5b76282`
- `implementation()`: `0x70aFe7e41e7F7406BCC446f652e2f94ae5b76282`
- `pauseProxy()`: `false`
- Implementation code size: **11430 bytes** (live contract)

**Current L1BridgeRegistryProxy** (`0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4`):
- `proxyImplementation(0)`: `0x259Ac335EB42d345A61bE48104eC0Ec20b283F14` (L1BridgeRegistryV1_1)
- `implementation()`: `0x259Ac335EB42d345A61bE48104eC0Ec20b283F14`

### Conclusion

The legacy and current L1BridgeRegistryProxy instances point to **different implementations**:

| Proxy | Implementation |
|-------|---------------|
| Legacy (`0x17Fa3...`) | `0x70aFe7e41e7F7406BCC446f652e2f94ae5b76282` (older version) |
| Current (`0x39d43...`) | `0x259Ac335EB42d345A61bE48104eC0Ec20b283F14` (V1.1) |

The legacy proxy is still **active** (not paused) and points to an older implementation at `0x70aFe7...` (11430 bytes of code). This was the L1BridgeRegistry targeted by agenda 13. The current system has migrated to a new proxy (`0x39d43...`) with the V1.1 implementation.

**contracts.json update needed**: Add the legacy implementation address `0x70aFe7e41e7F7406BCC446f652e2f94ae5b76282` and update L1BridgeRegistryProxy_Legacy to reference it.

---

## 2.6 WTON.seigManager -> V0

**WTON Address**: `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2`
**Priority**: MEDIUM

### Verification

- `WTON.seigManager()`: `0x710936500aC59e8551331871Cbad3D33d5e0D909` **(SeigManagerV0)**
- Expected SeigManagerProxy: `0x0b55a0f463b6defb81c6063973763951712d0e5f`

SeigManagerProxy state:
- `implementation()`: `0xb1958719b3Af9B4d85D93EFC5e317C97cCe9aBc4` (SeigManagerV1_2)
- `proxyImplementation(0)`: `0xb1958719b3Af9B4d85D93EFC5e317C97cCe9aBc4` (V1.2)
- `proxyImplementation(1)`: `0xce18C6F84F10881eA47A43AF7311A29bb116F628` (V1.3)
- `aliveImplementation(V1.2)`: `true`
- `aliveImplementation(V1.3)`: `true`
- `aliveImplementation(V0 = 0x7109...)`: **false** (V0 is NOT alive on the proxy)
- `wton()` on SeigManagerProxy: `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` (WTON, correct)

SeigManagerV0 direct check:
- `seigPerBlock()`: `3920000000000000000000000000` (3.92e27) -- functional
- Code size: **16880 bytes** -- has code, still operational

### Conclusion

**WTON's `seigManager` points directly to SeigManagerV0 (`0x7109...`), NOT to the SeigManagerProxy (`0x0b55...`).** This is a significant architectural detail:

1. WTON references the **old V0 implementation directly** instead of going through the proxy
2. SeigManagerV0 is **NOT alive** on the SeigManagerProxy (it was replaced by V1.2/V1.3)
3. However, SeigManagerV0 at `0x7109...` still has code (16880 bytes) and `seigPerBlock()` works
4. The SeigManagerProxy currently delegates to V1.2 (slot 0) and V1.3 (slot 1)

This means WTON's seigniorage operations use the **old V0 logic directly**, while the rest of the system (DepositManager, Layer2Registry, etc.) likely goes through the SeigManagerProxy to V1.2/V1.3. This could be intentional (backward compatibility) or a legacy configuration that was never updated.

**contracts.json**: SeigManagerV0 entry is already correct. Consider adding a note to WTON's description about its direct V0 reference.

---

## 2.7 MultiSigWallet

**Address**: `0xE3F72E959834d0A72aFb2ea79F5ec2b4243d2d95`
**Priority**: LOW

### Verification

- `required()`: **REVERTED** -- function name does not match ABI
- `numConfirmationsRequired()`: **2**
- `getOwners()`: 3 owners:
  1. `0x77b9D55e98126CD457D8F914647e634613D2A7fc`
  2. `0x9de8cAc67B6514837c31F367aC18a457d8f34c3D`
  3. `0xa4ABB4Bb512Fc1fecF5556ADDa9B8a4C96dc3790`
- `getTransactionCount()`: **1** (one transaction has been submitted)
- Storage slot 0: `0x03` (dynamic array length = 3 owners)
- Storage slot 3: `0x01` (transactions array length = 1)
- Layout exists: **Yes** (`scripts/storage/layouts/MultiSigWallet.json`)

### Storage Layout (from layout file)

| Slot | Variable | Type |
|------|----------|------|
| 0 | `owners` | `address[]` (length = 3) |
| 1 | `isOwner` | `mapping(address => bool)` |
| 2 | `isConfirmed` | `mapping(uint256 => mapping(address => bool))` |
| 3 | `transactions` | `Transaction[]` (length = 1) |

Note: The contract does NOT have a `required` storage variable in the layout. The `numConfirmationsRequired` value (2) is likely stored as an immutable or calculated differently.

### Conclusion

The MultiSigWallet is a **2-of-3 multisig** with 3 owner addresses. It has processed 1 transaction. The contract uses a custom implementation (compiled with Solidity 0.8.27) -- NOT the classic Gnosis MultiSigWallet. The `required()` function reverts but `numConfirmationsRequired()` returns 2, suggesting a non-standard interface.

The storage layout file exists and is accurate for the on-chain state (owners array length = 3, transactions array length = 1).

**contracts.json**: Update description to include "2-of-3 multisig" details.

---

## 2.8 contracts.json Updates

Based on all findings above, the following updates are recommended:

### 1. SwapProxy -- Reclassify (HIGH)

- **Current**: type = "proxy", description = "TON/WTON swap proxy contract"
- **Correct**: type = "callback", description = "TON/WTON swap approveAndCall receiver (onApprove handler, not a proxy)"

### 2. DAOCommitteeProxy -- Add current implementations (HIGH)

- Add two new entries for the currently alive implementations:
  - `0x9050Af1638f379A018737880aD946CdDA9101A25` (slot 0, alive)
  - `0xcb9859Dc0fBECa68eFFf2bce289150513fdF7D92` (slot 1, alive)
- Update proxy entry to reference these implementations

### 3. DAOCommitteeProxy2 -- Note uninitialized state (MEDIUM)

- Update description to indicate it is deployed but uninitialized

### 4. L1BridgeRegistryProxy_Legacy -- Add implementation (MEDIUM)

- Add implementation address: `0x70aFe7e41e7F7406BCC446f652e2f94ae5b76282`

### 5. WTON -- Note V0 reference (MEDIUM)

- Update description to note seigManager points to V0 directly, not SeigManagerProxy

### 6. MultiSigWallet -- Enrich description (LOW)

- Update description to include "2-of-3 multisig, 3 owners"

### 7. SeigManagerProxy -- Update current implementation (LOW)

- contracts.json lists `implementation: "0x3b1e59c2ff4b850d78ab50cb13a4a482101681b6"` but on-chain `proxyImplementation(0)` returns `0xb1958719b3Af9B4d85D93EFC5e317C97cCe9aBc4` (V1.2), with V1.3 at slot 1. The listed implementation `0x3b1e59...` appears to be an older version.
