# Tokamak Network Contract Relationship Map

> **Version 1.0** | Generated 2026-02-11 | Ethereum Mainnet
>
> All proxy implementations, ownership, and cross-references verified on-chain via `cast call`.
> Static analysis from 746 Solidity source files across 44 contract directories.

---

## Overview

Tokamak Network operates **51 contracts** across **4 subsystems** on Ethereum mainnet.
The system implements a staking-based seigniorage model where TON holders stake through operators
to earn rewards, governed by an on-chain DAO with arbitrary execution capability.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    TOKAMAK NETWORK ARCHITECTURE                      │
│                                                                      │
│  ┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐  │
│  │   TOKENS     │     │   STAKING ENGINE  │     │   GOVERNANCE     │  │
│  │             │     │                  │     │                  │  │
│  │  TON ←──→ WTON    │  SeigManager     │     │  DAOCommittee    │  │
│  │    │         │     │    ↕             │     │    ↕             │  │
│  │  sWTON      │     │  DepositManager  │     │  DAOAgendaManager│  │
│  │  (Coinages) │     │    ↕             │     │    ↕             │  │
│  │  CoinageFactory   │  Layer2Registry  │     │  DAOVault        │  │
│  └─────────────┘     │    ↕             │     │    ↕             │  │
│                      │  PowerTON        │     │  Candidate(s)    │  │
│                      └──────────────────┘     └──────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                    L2 OPERATOR LAYER                             ││
│  │  Layer2Manager ←→ L1BridgeRegistry ←→ OperatorManagerFactory    ││
│  │  10 Operators: tokamak1, DXM, DSRV, Talken, staked, level, ... ││
│  └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### Central Authority

**DAOCommitteeProxy** (`0xDD9f...C26`) is the admin/owner of all critical contracts:
- SeigManagerProxy, DepositManagerProxy, Layer2RegistryProxy (isAdmin=true)
- DAOAgendaManager, DAOVault (owner)
- CandidateFactoryProxy (referenced as candidateFactory)

---

## 1. Token Layer

### TON — Native Token
| | |
|---|---|
| Address | `0x2be5e8c109e2197D077D13A82dAead6a9b3433C5` |
| Decimals | 18 (WAD) |
| Compiler | Solidity 0.5.12 |
| Upgradeable | No |

**Key Characteristics:**
- **Restricted `transferFrom`**: Requires `msg.sender == sender || msg.sender == recipient`
  - This is a deliberate design choice, NOT a bug
  - Prevents unauthorized third-party transfers that could manipulate seigniorage
  - Consequence: **TON cannot be traded on DEX** (Uniswap, Sushiswap) — verified via fork test
- **`setSeigManager()` permanently disabled** — reverts on call
- **seigManager = address(0)** — TON does not have an active SeigManager callback
- Inherits: `Ownable, ERC20Mintable, ERC20Detailed, SeigToken`

### WTON — Wrapped TON
| | |
|---|---|
| Address | `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` |
| Decimals | 27 (RAY) |
| Compiler | Solidity 0.5.12 |
| Upgradeable | No |

**Key Characteristics:**
- **Standard ERC20 compliant** — no `transferFrom` restriction → **CAN be traded on DEX**
- Conversion: 1 TON = 10^9 WTON (RAY/WAD = 10^9)
- Swap functions: `swapToTON()`, `swapFromTON()`, `swapToTONAndTransfer()`, `swapFromTONAndTransfer()`
- Includes `ReentrancyGuard` on all swap operations
- **Minter relationships (verified on-chain):**
  - WTON is a minter of TON (`TON.isMinter(WTON) = true`)
  - SeigManagerProxy is a minter of WTON (`WTON.isMinter(SeigManagerProxy) = true`)
- **seigManager = 0x710936...** (SeigManagerV0) — points to the original, NOT current proxy

> **Note:** WTON.seigManager pointing to V0 means the SeigManager callback on WTON transfers uses the old implementation. This may be intentional (V0 is the base logic) or a stale reference.

### Minting Chain

```
SeigManager mints → WTON (seigniorage distribution)
WTON mints → TON (via swapToTON, when reserves insufficient)
```

### approveAndCall Callback Chain

The primary UX path for single-transaction staking:

```
User calls: TON.approveAndCall(WTON, amount, abi.encode(DepositManager, Layer2))
  │
  ├─ TON sets allowance[user][WTON] = amount
  └─ TON calls WTON.onApprove(user, WTON, amount, data)
       │
       ├─ Verify: msg.sender == address(ton)
       ├─ Decode: (depositManager, layer2) from data
       ├─ _swapFromTON: user's TON → WTON (mint WTON, pull TON)
       ├─ _approve: allowance[user][depositManager] = wtonAmount
       └─ _callOnApprove → DepositManager.onApprove(user, DM, wtonAmount, layer2)
            │
            ├─ Verify: msg.sender == _wton
            ├─ Decode: layer2 from data
            └─ _deposit(layer2, user, wtonAmount)
                 ├─ Transfer WTON from user to DepositManager
                 ├─ Update stake tracking
                 └─ SeigManager.onDeposit(layer2, user, amount)
```

### StakedWTON (sWTON) & Coinages
| | |
|---|---|
| TOT Token | `0x47e264ea9b229368aa90c331D3f4CBe0b4c0f01d` |
| CoinageFactory | `0xe8fAe91B80dd515c3D8B9FC02CB5B2ecFDDABf43` |

- `RefactorCoinageSnapshot` implements auto-compounding via a `factor` multiplier
- Internal storage is "RAY BASED" (divided by factor), public API returns "RAY FACTORED" (multiplied)
- As `setFactor()` increases the multiplier, all balances grow proportionally → seigniorage accrual
- One coinage per Layer2 operator, created via `CoinageFactory.deploy()`
- `_tot` tracks total staked across all Layer2s

---

## 2. Staking Engine

### SeigManager — Central Hub
| | |
|---|---|
| Proxy | `0x0b55a0f463b6defb81c6063973763951712d0e5f` |
| Admin | DAOCommitteeProxy |
| Pattern | ProxyStorage with selector routing |

**Implementation Routing (verified on-chain):**

| Function Group | Routes To | Address |
|----------------|-----------|---------|
| Default (most functions) | SeigManagerV1_2 | `0xb1958719...` |
| `excludeFromL2Seigniorage` | SeigManagerV1_3 | `0xce18C6F8...` |
| `estimatedDistribute` | SeigManagerV1_3 | `0xce18C6F8...` |
| Other L2 functions | SeigManagerV1_3 | `0xce18C6F8...` |

**Version History:**

| Version | Address | Status | Key Changes |
|---------|---------|--------|-------------|
| V0 | `0x710936...` | Deprecated | Original (Solidity 0.5.12). Basic seigniorage with DSMath |
| V1 | `0x3b1e59...` | Deprecated | First Solidity 0.8 port |
| V1_2 | `0xb19587...` | **Active (default)** | L2 seigniorage support, FullMath, Layer2Manager/L1BridgeRegistry integration |
| V1_3 | `0xce18C6...` | **Active (selector)** | Reentrancy guard, L2 pause/resume, estimatedDistribute(), custom errors |

**Cross-References (all verified on-chain):**

| Reference | Contract | Address |
|-----------|----------|---------|
| ton | TON | `0x2be5e8c...` |
| wton | WTON | `0xc4A11aa...` |
| registry | Layer2RegistryProxy | `0x7846c22...` |
| depositManager | DepositManagerProxy | `0x0b58ca7...` |
| factory | CoinageFactory | `0xe8fAe91...` |
| dao | DAOVault | `0x2520CD6...` |
| powerton | PowerTONSwapperProxy | `0x9702981...` |
| layer2Manager | Layer2ManagerProxy | `0xD6Bf6B2...` |
| l1BridgeRegistry | L1BridgeRegistryProxy | `0x39d4328...` |

**seigPerBlock = 3.92 × 10^27** (~3.92 WTON per block in RAY)

**Seigniorage Distribution Formula:**
```
maxSeig = blocks_since_last × seigPerBlock
stakedRatio = tot_supply / (TON_supply × 10^9 + TOT_supply)
stakedSeig = maxSeig × stakedRatio

unstakedSeig = maxSeig - stakedSeig - l2TotalSeigs
  → powertonSeig = unstakedSeig × powerTONSeigRate
  → daoSeig = unstakedSeig × daoSeigRate
  → pseig = (maxSeig - stakedSeig) × relativeSeigRate

l2TotalSeigs = maxSeig × (totalL2TVL / ton_supply)  [V1_2+]

Distribution:
  WTON.mint(depositManager, stakedSeig)   → stakers
  WTON.mint(powerton, powertonSeig)       → PowerTON
  WTON.mint(dao, daoSeig)                 → DAOVault
  Layer2Manager.transferL2Seigniorage()   → L2 operators [V1_2+]
```

### DepositManager — Staking Custody
| | |
|---|---|
| Proxy | `0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e` |
| Implementation | `0x76C01207...` (DepositManager V1.0) |
| Admin | DAOCommitteeProxy |

**Deposit Flow:**
```
deposit(layer2, amount)
  → Pull WTON from user via safeTransferFrom
  → Update: accStaked[layer2][account] += amount
  → Notify: SeigManager.onDeposit(layer2, account, amount)
    → SeigManager mints coinage + tot tokens
```

**Withdrawal Flow (time-locked):**
```
requestWithdrawal(layer2, amount)
  → SeigManager.onWithdraw(layer2, account, amount)  [burns coinage/tot]
  → Add to withdrawal queue with delay = max(globalDelay, layer2Delay)
  → Status: staked → pending

[Wait delay blocks]

processRequest(layer2, receiveTON)
  → If receiveTON: WTON.swapToTONAndTransfer(user, amount)
  → Else: WTON.safeTransfer(user, amount)
  → Status: pending → unstaked
```

**V1.1 Addition: Cross-chain withdrawal**
```
withdrawAndDepositL2(layer2, amount)
  → Withdraw from L1 staking
  → Swap WTON → TON
  → Bridge to L2 via L1Bridge (Optimism-compatible)
```

### Layer2Registry
| | |
|---|---|
| Proxy | `0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b` |
| Implementation | `0x296EF64...` |
| Admin | DAOCommitteeProxy |
| Registered Layer2s | **10** (verified) |

**Functions:**
- `register(layer2)` → Mark as registered
- `registerAndDeployCoinage(layer2, seigManager)` → Register + deploy sWTON coinage
- `unregister(layer2)` → Remove (onlyOwner)

### PowerTONSwapperProxy
| | |
|---|---|
| Proxy | `0x970298189050aBd4dc4F119ccae14ee145ad9371` |
| Declared Impl | `0x0AA0191...` (PowerTONUpgrade) |
| Status | **KNOWLEDGE GAP** — `implementation2()` reverts |

Receives portion of seigniorage from SeigManager. Exact mechanism and current state require further investigation.

---

## 3. Governance

### DAOCommittee — Core Governance
| | |
|---|---|
| Proxy | `0xDD9f0cCc044B0781289Ee318e5971b0139602C26` |
| Pattern | ProxyStorage2 (dual-implementation) |
| Max Members | **3** (verified) |
| Quorum | **2** (verified) |
| Total Agendas | **16** (verified) |

**Implementation Architecture (verified on-chain):**

| Slot | Address | Status | Purpose |
|------|---------|--------|---------|
| impl(0) | `0x9050Af1638...` | **ALIVE** | Main governance logic |
| impl(1) | `0xcb9859Dc0f...` | **ALIVE** | Secondary (likely admin/owner functions) |
| DAOCommittee_V1 | `0xcC88dFa531...` | **NOT ALIVE** | Deprecated original |

> **Discovery:** The current implementations (0x9050Af..., 0xcb9859...) are **not listed in contracts.json**.
> The registered DAOCommittee_V1 is deprecated. The actual running code is newer.

**DAOCommitteeProxy2** (`0xD6175F...`) has **implementation = address(0)** — completely inactive/unused.

**Agenda Lifecycle:**

```
1. CREATION — User pays 100 TON fee via TON.approveAndCall()
   ├─ Fee burned to address(1)
   ├─ Security check: cannot target DAOVault for TON/WTON claims
   └─ AgendaManager.newAgenda(targets[], bytecodes[], noticePeriod, votingPeriod, atomicExecute)

2. NOTICE PERIOD (≥16 days) — No voting allowed

3. VOTING (≥2 days) — Committee members vote via Candidate.castVote()
   ├─ Vote types: YES=1, NO=2, ABSTAIN=0
   ├─ Auto-result on quorum:
   │   ├─ YES ≥ 2 → ACCEPT, status=WAITING_EXEC
   │   ├─ NO ≥ 2 → REJECT, status=ENDED
   │   └─ (NO+ABSTAIN) ≥ 2 → DISMISS, status=ENDED

4. EXECUTION (≤7 days after voting)
   └─ executeAgenda(agendaID)
       └─ For each target: target.call(bytecode)  ← ARBITRARY EXECUTION
```

**The DAO's Arbitrary Execution Power:**
`executeAgenda()` uses low-level `call()` — it can invoke ANY function on ANY contract.
This is how upgrades, parameter changes, and administrative actions are performed.
All targets must succeed atomically.

### DAOAgendaManager
| | |
|---|---|
| Address | `0xcD4421d082752f363E1687544a09d5112cD4f484` |
| Owner | DAOCommitteeProxy |
| Upgradeable | No |

Stores agenda data, voting records, execution info. Not upgradeable.

### DAOVault — Treasury
| | |
|---|---|
| Address | `0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303` |
| Owner | DAOCommitteeProxy |
| Upgradeable | No |

- Holds TON, WTON, and arbitrary ERC-20 tokens
- Receives seigniorage from SeigManager (as `dao` reference)
- Disburses committee member activity rewards (`claimERC20`)
- Auto-swaps between TON/WTON when needed for claims

### Candidate System

**CandidateFactory** (`0x9FC7100...` proxy) → Deploys `CandidateProxy` instances
**CandidateAddOnFactory** (`0xFA8ce5c...` proxy) → Deploys `CandidateAddOnProxy` instances

Each Candidate wraps an operator (EOA or Layer2 contract) for DAO participation:
- `changeMember(slotIndex)` — Compete for committee seat (must have more stake than current member)
- `castVote(agendaID, vote)` — Vote on proposals
- `claimActivityReward()` — Claim periodic WTON rewards from DAOVault
- `updateSeigniorage()` — Trigger SeigManager seigniorage update

---

## 4. Operator & Layer2

### Layer2ManagerProxy
| | |
|---|---|
| Proxy | `0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D` |
| Implementation | `0x2EB7f5...` (Layer2ManagerV1_1) |

**Functions:**
- `registerCandidateAddOn(rollupConfig, amount, flagTon, memo)` — Register new L2 operator with initial deposit
- `transferL2Seigniorage(layer2, amount)` — Called by SeigManager to distribute L2 rewards
- `pauseCandidateAddOn(rollupConfig)` / `unpauseCandidateAddOn()` — Control seigniorage eligibility

**Storage:** Maps operators ↔ rollupConfigs ↔ candidateAddOns

### L1BridgeRegistryProxy
| | |
|---|---|
| Proxy | `0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4` |
| Implementation | `0x259Ac3...` (L1BridgeRegistryV1_1) |

**Rollup Types:**
| Type | Description | TVL Source |
|------|-------------|------------|
| 0 | Unregistered | N/A |
| 1 | Legacy Optimism | `TON.balanceOf(l1StandardBridge)` |
| 2 | Bedrock (native TON) | `TON.balanceOf(optimismPortal)` |

**Seigniorage Control:**
- `rejectCandidateAddOn(rollupConfig)` — Stop seigniorage + block deposits (seigniorageCommittee only)
- `restoreCandidateAddOn(rollupConfig)` — Resume seigniorage

### Registered Operators (10)

| # | Name | Address |
|---|------|---------|
| 1 | tokamak1 | `0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF` |
| 2 | DXM Corp | `0x44e3605d0ed58FD125E9C47D1bf25a4406c13b57` |
| 3 | DSRV | `0x2B67D8D4E61b68744885E243EfAF988f1Fc66E2D` |
| 4 | Talken | `0x36101b31e74c5E8f9a9cec378407Bbb776287761` |
| 5 | staked | `0x2c25A6be0e6f9017b5bf77879c487eed466F2194` |
| 6 | level | `0x0F42D1C40b95DF7A1478639918fc358B4aF5298D` |
| 7 | decipher | `0xbc602C1D9f3aE99dB4e9fD3662CE3D02e593ec5d` |
| 8 | DeSpread | `0xC42cCb12515b52B59c02eEc303c887C8658f5854` |
| 9 | Danal Fintech | `0xf3CF23D896Ba09d8EcdcD4655d918f71925E3FE5` |
| 10 | Hammer DAO | `0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2` |

---

## 5. Proxy Architecture & Upgrade Patterns

### ProxyStorage Pattern (Tokamak Custom)

Used by: SeigManager, DepositManager, Layer2Registry, CandidateFactory, CandidateAddOnFactory, Layer2Manager, L1BridgeRegistry, RefactorCoinageSnapshot

```solidity
contract ProxyStorage {
    bool public pauseProxy;
    mapping(uint256 => address) public proxyImplementation;     // index → impl
    mapping(address => bool) public aliveImplementation;        // impl → active?
    mapping(bytes4 => address) public selectorImplementation;   // selector → impl
}
```

**Three-Layer Routing:**
1. Check `selectorImplementation[msg.sig]` → specific function routing
2. If not found or not alive → fallback to `proxyImplementation[0]`
3. `delegatecall` to selected implementation

**Key Advantage:** Incremental upgrades — migrate specific functions to new implementations without replacing everything. SeigManager demonstrates this: V1_2 default + V1_3 for L2 functions.

### ERC1967 Pattern (Exception)

Used by: **OperatorManagerFactory** only. Creates `OperatorManagerProxy` instances via CREATE2.
This is the only contract using standard OpenZeppelin proxy pattern.

### ProxyStorage2 (DAO Extension)

Used by: DAOCommitteeProxy, DAOCommitteeProxy2. Extends ProxyStorage with DAO-specific storage.

### Upgrade History (from agendas)

| Upgrade | Proxy | From | To |
|---------|-------|------|----|
| SeigManager V0→V1_2 | SeigManagerProxy | V0 | V1_2 (default) |
| SeigManager +V1_3 | SeigManagerProxy | — | V1_3 (selector) |
| DAOCommittee | DAOCommitteeProxy | V1 | 0x9050Af... + 0xcb9859... |
| DepositManager | DepositManagerProxy | V1.0 | V1.0 (unchanged) |

---

## 6. Ownership & Access Control Chain

**Verified on-chain:**

```
DAOCommitteeProxy (0xDD9f...C26) ─── THE SUPREME AUTHORITY
  │
  ├─── isAdmin ──→ SeigManagerProxy
  ├─── isAdmin ──→ DepositManagerProxy
  ├─── isAdmin ──→ Layer2RegistryProxy
  ├─── owner ────→ DAOAgendaManager
  ├─── owner ────→ DAOVault
  ├─── ref ──────→ CandidateFactoryProxy (candidateFactory)
  │
  │ Via executeAgenda() arbitrary calls:
  ├─── can call ─→ ANY contract with ANY function
  └─── has upgraded: SeigManager, DAOCommittee implementations

MultiSigWallet (0xE3F72...)
  └─── 3 signers: [0x77b9D5..., 0x9de8cA..., 0xa4ABB4...]
       (Role in governance unclear — may be initial deployer)
```

**Access Control Pattern:**
Most contracts use `AccessibleCommon` (OpenZeppelin AccessControl + ERC165):
- `DEFAULT_ADMIN_ROLE` = owner
- `MINTER_ROLE` for token operations
- Custom modifiers: `onlyRegistry`, `onlyDepositManager`, `onlySeigManager`, `onlyLayer2Manager`

---

## 7. Key Interaction Flows

### Flow 1: Stake TON (Single Transaction)

```
User → TON.approveAndCall(WTON, amount, [DepositManager, Layer2])
  └→ WTON.onApprove() → swap TON→WTON → approve DM
      └→ DepositManager.onApprove() → _deposit()
          └→ SeigManager.onDeposit() → mint coinage + tot
```

### Flow 2: Seigniorage Distribution

```
Layer2.updateSeigniorage() OR SeigManager.updateSeigniorageLayer(layer2)
  └→ SeigManager._increaseTot()
      ├→ Calculate: maxSeig, stakedSeig, unstakedSeig, l2Seigs
      ├→ WTON.mint(depositManager, stakedSeig)      → for stakers
      ├→ WTON.mint(powerton, powertonSeig)           → PowerTON
      ├→ WTON.mint(dao, daoSeig)                     → DAOVault
      ├→ Layer2Manager.transferL2Seigniorage()       → L2 operators
      └→ tot.setFactor() + coinage.setFactor()       → auto-compound
```

### Flow 3: DAO Agenda Execution

```
User → TON.approveAndCall(DAOCommittee, fee, agendaData)
  └→ DAOCommittee.onApprove() → _createAgenda()
      └→ AgendaManager.newAgenda(targets, bytecodes)

[16+ days notice, 2+ days voting, ≤7 days execution window]

DAOCommittee.executeAgenda(id)
  └→ For each target[i]:
      target[i].call(bytecodes[i])  ← arbitrary execution
```

### Flow 4: L2 Operator Registration

```
Operator → Layer2Manager.registerCandidateAddOn(rollupConfig, deposit, memo)
  ├→ L1BridgeRegistry.getRollupInfo(rollupConfig)  — verify registered
  ├→ OperatorManagerFactory.createOperatorManager(rollupConfig)  — deploy via CREATE2
  ├→ DAOCommittee.createCandidateAddOn(memo, operator)  — create Candidate
  └→ DepositManager.deposit(candidateAddOn, operator, amount)  — stake initial deposit
```

---

## 8. Knowledge Gaps & Verification TODO

### Unresolved Items

| # | Item | Issue | Priority |
|---|------|-------|----------|
| 1 | **SwapProxy** (`0x30e65B3A...`) | No source code. `implementation2()` reverts. Purpose unclear. | HIGH |
| 2 | **PowerTONSwapperProxy** (`0x970298...`) | `implementation2()` reverts. Different proxy interface? | HIGH |
| 3 | **DAOCommittee current impls** | 0x9050Af... and 0xcb9859... not in contracts.json. Need to verify source. | HIGH |
| 4 | **DAOCommitteeProxy2** (`0xD6175F...`) | impl=address(0). Why does this exist? Was it ever active? | MEDIUM |
| 5 | **L1BridgeRegistryProxy_Legacy** (`0x17Fa32D...`) | Has impl 0x70aFe7... Relationship with current proxy unclear. | MEDIUM |
| 6 | **WTON.seigManager → V0** | Points to 0x710936... (V0), not current proxy. Intentional or stale? | MEDIUM |
| 7 | **MultiSigWallet threshold** | `required()` reverts. What does this wallet own/control? | LOW |
| 8 | **contracts.json staleness** | SeigManager and DAOCommittee implementation fields are outdated. | LOW |

### Recommended Next Steps

1. **Etherscan verification** for 0x9050Af... and 0xcb9859... to identify DAOCommittee implementations
2. **Agenda history analysis** — scan all 16 agendas to trace every upgrade
3. **PowerTON investigation** — try alternative proxy function signatures
4. **SwapProxy** — check if used by Layer2Manager.swapProxy or is obsolete
5. **Full staker flow test** — fork test to verify end-to-end staking still works

---

## Appendix: Full Address Table

| Name | Address | Type | Subsystem |
|------|---------|------|-----------|
| TON | `0x2be5e8c109e2197D077D13A82dAead6a9b3433C5` | Token | Tokens |
| WTON | `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` | Token | Tokens |
| StakedWTON (tot) | `0x47e264ea9b229368aa90c331D3f4CBe0b4c0f01d` | Token | Tokens |
| CoinageFactory | `0xe8fAe91B80dd515c3D8B9FC02CB5B2ecFDDABf43` | Factory | Tokens |
| SeigManagerProxy | `0x0b55a0f463b6defb81c6063973763951712d0e5f` | Proxy | Staking |
| SeigManagerV0 | `0x710936500aC59e8551331871Cbad3D33d5e0D909` | Impl (deprecated) | Staking |
| SeigManager (V1) | `0x3b1e59c2ff4b850d78ab50cb13a4a482101681b6` | Impl (deprecated) | Staking |
| SeigManagerV1_2 | `0xb1958719b3Af9B4d85D93EFC5e317C97cCe9aBc4` | Impl (active default) | Staking |
| SeigManagerV1_3 | `0xce18C6F84F10881eA47A43AF7311A29bb116F628` | Impl (active selector) | Staking |
| DepositManagerProxy | `0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e` | Proxy | Staking |
| DepositManager | `0x76c01207959df1242c2824b4445cde48eb55d2f1` | Impl (active) | Staking |
| DepositManagerV1_1 | `0x74bC3031b9369e6b898e82784106257D4D37Eac5` | Impl | Staking |
| Layer2RegistryProxy | `0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b` | Proxy | Staking |
| Layer2Registry | `0x296ef64487ecfddcdd03eab35c81c9262dab88ba` | Impl (active) | Staking |
| PowerTONSwapperProxy | `0x970298189050aBd4dc4F119ccae14ee145ad9371` | Proxy | Staking |
| PowerTONUpgrade | `0x0AA0191e9cc7BE9B7228D4d3E3Dd65749C93551F` | Impl | Staking |
| SwapProxy | `0x30e65B3A6e6868F044944Aa0e9C5d52F8dcb138d` | Proxy | Staking |
| RefactorCoinageSnapshot | `0xef12310ff8a6e96357b7d2c4a759b19ce94f7dfb` | Impl | Tokens |
| DAOCommitteeProxy | `0xDD9f0cCc044B0781289Ee318e5971b0139602C26` | Proxy | Governance |
| DAOCommitteeProxy2 | `0xD6175F575F4d32392508Ee2FBbDec9a2E8B3c01a` | Proxy (inactive) | Governance |
| DAOCommittee_V1 | `0xcC88dFa531512f24A8a5CbCB88F7B6731807EEFe` | Impl (deprecated) | Governance |
| DAOCommitteeOwner | `0x5991Aebb5271522d33C457bf6DF26d83c0dAa221` | Owner | Governance |
| DAOAgendaManager | `0xcD4421d082752f363E1687544a09d5112cD4f484` | Manager | Governance |
| DAOVault | `0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303` | Vault | Governance |
| Candidate | `0x1a8f59017e0434efc27e89640ac4b7d7d194c0a3` | Impl | Governance |
| CandidateFactoryProxy | `0x9fc7100a16407ee24a79c834a56e6eca555a5d7c` | Proxy | Governance |
| CandidateFactory | `0xc5eb1c5ce7196bdb49ea7500ca18a1b9f1fa3ffb` | Impl (active) | Governance |
| CandidateAddOnV1_1 | `0x73Bfd5cAEC63307784C7B6d2555F18ec24D96E2e` | Impl | Governance |
| CandidateAddOnFactoryProxy | `0xFA8ce5caF456115E72B96E5074769b8f66AA5861` | Proxy | Governance |
| CandidateAddOnFactory | `0x557E24b5CbFbDA3e5aC1bD01F38EcDe865791Bc5` | Impl (active) | Governance |
| Layer2ManagerProxy | `0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D` | Proxy | Layer2 |
| Layer2ManagerV1_1 | `0x2EB7f500125f11544392B83B87cDEb9456f3509f` | Impl (active) | Layer2 |
| L1BridgeRegistryProxy | `0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4` | Proxy | Layer2 |
| L1BridgeRegistryV1_1 | `0x259Ac335EB42d345A61bE48104eC0Ec20b283F14` | Impl (active) | Layer2 |
| L1BridgeRegistryProxy_Legacy | `0x17Fa32DFf4c26cf0AC65Ff6700B57a4826513Fa0` | Proxy (legacy) | Layer2 |
| OperatorManagerFactory | `0xAf86b21edDdC78ea27E23A7F2151d60d4e069450` | Factory | Layer2 |
| OperatorManagerV1_1 | `0xB5F3b31dFB4DCe9a2FA12dE50A97250d60823750` | Impl | Layer2 |
| MultiSigWallet | `0xE3F72E959834d0A72aFb2ea79F5ec2b4243d2d95` | Multisig | — |

---

*This document is machine-verified against on-chain state. Knowledge gaps are explicitly marked.
For programmatic access, see `docs/contract-relationships.json`.*
