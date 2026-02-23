# Tokamak DAO Agent — Fork Test Harness Design Document

> **Purpose**: A document for learning the design principles, structure, and patterns of 11 harnesses that verify Tokamak Network's mainnet contracts in a Foundry fork environment.

---

## Table of Contents

1. [Overview: Why Fork Test Harness](#1-overview-why-fork-test-harness)
2. [Execution Environment](#2-execution-environment)
3. [3-Layer Architecture](#3-3-layer-architecture)
4. [Layer A: Infrastructure Verification (Read-Only)](#4-layer-a-infrastructure-verification-read-only)
5. [Layer B: Protocol Flows (State Changes)](#5-layer-b-protocol-flows-state-changes)
6. [Layer C: Governance (Complex State Machine)](#6-layer-c-governance-complex-state-machine)
7. [Foundry Cheatcode Pattern Summary](#7-foundry-cheatcode-pattern-summary)
8. [Interface Strategy](#8-interface-strategy)
9. [Shared Address Registry](#9-shared-address-registry)
10. [Implicit Dependency Chain](#10-implicit-dependency-chain)
11. [Coverage Gaps and Future Work](#11-coverage-gaps-and-future-work)

---

## 1. Overview: Why Fork Test Harness

Tokamak Network's contracts exhibit meaningful behavior **only in their deployed mainnet state**. Reasons:

- **Proxy pattern**: DAOCommitteeProxy has dual implementations (slot0/slot1), routing by selector.
- **Callback chain**: `TON.approveAndCall → WTON.onApprove → DepositManager.onApprove` — three contracts are called in sequence within a single transaction.
- **Seigniorage math**: SeigManager's coinage factor uses RAY (10^27) precision rmul/rdiv, which cannot be tested without actual staking state.
- **Governance state**: Committee members, quorum, voting periods, etc. all depend on on-chain state.

**Fork test** solves all of this:
```
Clone actual mainnet state locally → impersonate any address with vm.prank → advance time/blocks with vm.roll/vm.warp
```

These harnesses serve two roles simultaneously:
1. **Verification tool** — prove/disprove protocol behavior
2. **Exploration tool** — diagnose/discover on-chain state

---

## 2. Execution Environment

### foundry.toml Configuration

```toml
# Fork testing profile — excludes legacy src/ contracts
[profile.fork]
src = "test"          # compile only the test directory, not src
out = "out"
test = "test"
solc_version = "0.8.24"
evm_version = "paris"
```

Key point: `src = "test"` — excludes contract sources (various Solidity versions) from compilation targets, compiling only test files.

### Execution Commands

```bash
# Basic execution
FOUNDRY_PROFILE=fork forge test --fork-url $ALCHEMY_RPC_URL -vvv

# Specific contract only
FOUNDRY_PROFILE=fork forge test --match-contract ApproveAndCall --fork-url $ALCHEMY_RPC_URL -vvv

# Specific test only
FOUNDRY_PROFILE=fork forge test --match-test test_SimulateAgenda --fork-url $ALCHEMY_RPC_URL -vvv

# Environment variable parameterization (AgendaSimulation)
AGENDA_ID=42 FOUNDRY_PROFILE=fork forge test --match-contract AgendaSimulation --fork-url $ALCHEMY_RPC_URL -vvv
```

---

## 3. 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Layer C: Governance (Complex State Machine)             │
│  ├── DAOVotingLifecycle.t.sol   — Full DAO lifecycle     │
│  └── AgendaSimulation.t.sol     — Agenda replay tool     │
├─────────────────────────────────────────────────────────┤
│  Layer B: Protocol Flows (State Change Tests)            │
│  ├── TONCompatibility.t.sol     — Token restriction proof│
│  ├── StakingDeposit.t.sol       — Deposit paths          │
│  ├── StakingWithdraw.t.sol      — Withdrawal lifecycle   │
│  ├── ApproveAndCall.t.sol       — Full callback chain    │
│  └── Seigniorage.t.sol          — Seigniorage distribution│
├─────────────────────────────────────────────────────────┤
│  Layer A: Infrastructure (Read-Only Verification)        │
│  ├── CompileInterfaces.t.sol    — ABI generator          │
│  ├── StorageVerify.t.sol        — Storage slot diagnosis │
│  ├── DAOCommitteeRouting.t.sol  — Proxy routing          │
│  └── Layer2Registration.t.sol   — Ecosystem topology     │
└─────────────────────────────────────────────────────────┘
```

Characteristics of each Layer:

| Layer | setUp | State Changes | Assertion Style | Role |
|-------|-------|--------------|-----------------|------|
| A | None or minimal | None (view only) | `assertEq`, `assertTrue` | Verify infrastructure correctness |
| B | Token allocation via `deal` | Deposit/withdrawal/transfer | `assertEq`, `assertApproxEqAbs` | Prove protocol flows |
| C | Complex (including agenda creation) | Voting/execution | `assertGe`, `vm.expectRevert` | Governance simulation |

---

## 4. Layer A: Infrastructure Verification (Read-Only)

### 4.1 CompileInterfaces.t.sol — ABI Generation Bridge

**Purpose**: Not a behavioral test. Forces Foundry to compile 9 Complete interfaces and generate ABI JSONs in `contracts/out/`.

```solidity
// pragma ^0.8.4 — minimum version compatible with all interfaces
contract CompileInterfaces {
    // public state variable → Foundry must compile to resolve the type
    IDAOCommitteeComplete public daoCommittee;
    IWTONComplete public wton;
    ISeigManagerComplete public seigManager;
    // ... all 9
}
```

**Key design decision**: Does not inherit `is Test`. Pure compilation trigger.

**Connection to MCP server**: Generated ABIs are used by `loadAbi` in `on-chain.ts`.
```
I{Name}Complete (1st priority) → I{Name}Full (2nd priority) → I{Name} (3rd priority)
```

### 4.2 StorageVerify.t.sol — Raw Storage Slot Exploration

**Purpose**: Uses `vm.load` to reverse-engineer the actual storage layout behind proxies.

```solidity
function testDaoSeigRateSlot() public {
    // 1. Get the correct value via view function
    uint256 valueFromCall = ISeigManagerFull(SEIG_MANAGER_PROXY).daoSeigRate();

    // 2. Iterate raw slots to find the matching value
    for (uint256 i = 24; i <= 32; i++) {
        bytes32 val = vm.load(SEIG_MANAGER_PROXY, bytes32(i));
        emit log_named_bytes32(..., val);
    }
}
```

**Key takeaways**:
- `vm.load(address, slot)` — cheatcode for directly reading EVM storage
- Comparing function call results vs raw slots confirms the storage layout
- `emit log_named_*` — legacy DSTest-style logging API (predates console.log)

**Side effect**: Defines the `ISeigManagerFull` interface, used as ABI fallback for the MCP server.

### 4.3 DAOCommitteeRouting.t.sol — Proxy Dual Implementation Verification

**Purpose**: Verifies DAOCommitteeProxy's slot0(core)/slot1(admin) routing logic at the selector level.

```solidity
function test_SelectorRoutingToSlot1() public view {
    bytes4[] memory slot1Selectors = new bytes4[](10);
    slot1Selectors[0] = bytes4(keccak256("setSeigManager(address)"));
    slot1Selectors[1] = bytes4(keccak256("setDaoVault(address)"));
    // ...

    for (uint256 i = 0; i < slot1Selectors.length; i++) {
        address impl = proxy.getSelectorImplementation2(slot1Selectors[i]);
        bool isSlot1 = (impl == SLOT1_IMPL);
    }
}
```

**Key takeaways**:
- `bytes4(keccak256("functionName(argTypes)"))` — Solidity function selector computation
- `getSelectorImplementation2(selector)` — Tokamak proxy's custom routing lookup
- `aliveImplementation(address)` — check implementation active/inactive state
- Regression test to verify retired implementations (`V1_OLD`, `OWNER_OLD`) are inactive

**Tokamak proxy pattern** (differs from EIP-1967):
```
┌── DAOCommitteeProxy ──┐
│  slot0: DAOCommittee_V1 (core: castVote, executeAgenda, ...)    │
│  slot1: DAOCommitteeOwner (admin: setSeigManager, setQuorum, ...)│
│  selectorImplementation: selector → implementation mapping       │
│  getSelectorImplementation2: check mapping → fallback to slot0   │
└───────────────────────────┘
```

### 4.4 Layer2Registration.t.sol — Ecosystem Topology Snapshot

**Purpose**: Iterates through all 10 registered operators' state to verify ecosystem health.

```solidity
address[10] OPERATORS = [
    0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF, // tokamak1
    0x44e3605d0ed58FD125E9C47D1bf25a4406c13b57, // DXM Corp
    0x2B67D8D4E61b68744885E243EfAF988f1Fc66E2D, // DSRV
    // ... 10 total
];
```

**Verification items**:

| Test | Verified Content |
|------|-----------------|
| `test_AllOperatorsRegistered` | 10/10 registered in Layer2Registry |
| `test_AllOperatorsHaveCoinages` | All operators have coinage contracts |
| `test_TotTokenState` | TOT(sWTON) token totalSupply and per-operator balances |
| `test_SeigManagerCrossRefs` | SeigManager's registry, depositManager, factory addresses match |
| `test_SeigniorageParameters` | seigPerBlock > 0, paused == false |
| `test_CoinageFactoryState` | SeigManager is CoinageFactory's admin |

**Key takeaways**:
- Fixed-size arrays `address[10]` and `string[10]` — hardcoded operator list
- Pure view tests — can run without setUp
- SeigManager cross-reference verification — contract-to-contract reference integrity

---

## 5. Layer B: Protocol Flows (State Changes)

### 5.1 TONCompatibility.t.sol — TON DEX Compatibility Proof

**Key finding**: TON **cannot** be traded on DEXes. Because `SeigToken.transferFrom` requires `msg.sender == sender || msg.sender == recipient`.

```solidity
// ❌ Third party (router) calls transferFrom → REVERT
function test_TON_TransferFrom_ThirdParty_Reverts() public {
    vm.prank(user);
    ton.approve(UNISWAP_V2_ROUTER, amount);    // approve succeeds

    vm.prank(UNISWAP_V2_ROUTER);               // router calls
    vm.expectRevert("SeigToken: only sender or recipient can transfer");
    ton.transferFrom(user, recipient, amount);  // fails!
}

// ✅ Sender themselves calls transferFrom → succeeds
function test_TON_TransferFrom_BySender_Succeeds() public {
    vm.prank(user);
    ton.approve(user, amount);

    vm.prank(user);                             // sender == msg.sender
    ton.transferFrom(user, recipient, amount);  // succeeds
    assertEq(ton.balanceOf(recipient), amount);
}

// ✅ WTON is standard ERC20 → third-party transferFrom succeeds
function test_WTON_TransferFrom_ThirdParty_Succeeds() public {
    vm.prank(user);
    wton.approve(UNISWAP_V2_ROUTER, amount);

    vm.prank(UNISWAP_V2_ROUTER);
    wton.transferFrom(user, recipient, amount); // succeeds
}
```

**End-to-end swap test**:
```solidity
function test_TON_UniswapV2_Swap_Reverts() public {
    address[] memory path = new address[](2);
    path[0] = TON;
    path[1] = WETH;

    vm.prank(user);
    vm.expectRevert();  // transferFrom fails inside the router
    IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
        amountIn, 0, path, user, block.timestamp + 3600
    );
}
```

**Key takeaways**:
- `vm.expectRevert("specific message")` vs `vm.expectRevert()` — specific message matching vs bare revert
- Uniswap V2 and Sushiswap use the same router interface
- The fundamental difference between TON and WTON lies in the `transferFrom` restriction

### 5.2 StakingDeposit.t.sol — Deposit Path Tests

Verifies two deposit paths:

**Path 1: Direct WTON deposit**
```solidity
function test_Deposit_WTON_ToLayer2() public {
    uint256 depositAmount = 100 * RAY;  // WTON has 27 decimals

    vm.startPrank(user);                        // begin multi-call
    wton.approve(DEPOSIT_MANAGER, depositAmount);
    depositManager.deposit(TOKAMAK1, depositAmount);
    vm.stopPrank();                             // end multi-call

    uint256 accStakedAfter = depositManager.accStaked(TOKAMAK1, user);
    assertEq(accStakedAfter - accStakedBefore, depositAmount);
}
```

**Path 2: TON → WTON → DepositManager (callback chain)**
```solidity
function test_Deposit_ViaApproveAndCall() public {
    bytes memory data = abi.encode(DEPOSIT_MANAGER, TOKAMAK1);

    vm.prank(user);
    ton.approveAndCall(WTON, tonAmount, data);
    // TON(18 dec) → WTON(27 dec): conversion ratio = × 10^9
}
```

**Path 3: Unregistered Layer2 rejection**
```solidity
function test_Deposit_ToUnregisteredLayer2_Reverts() public {
    address fakeLayer2 = address(0xDEAD);
    vm.expectRevert();
    depositManager.deposit(fakeLayer2, depositAmount);
}
```

**Key takeaways**:
- `vm.startPrank` / `vm.stopPrank` — execute multiple consecutive calls with the same msg.sender
- `vm.prank` — change msg.sender for a single call only
- `deal(token, account, amount)` — forcibly set ERC20 balance (direct storage manipulation)
- Unit conversion between TON (18 decimals) and WTON (27 decimals, RAY): `× 10^9`

### 5.3 StakingWithdraw.t.sol — Withdrawal Lifecycle

**Deposit in setUp as prerequisite**:
```solidity
function setUp() public {
    deal(WTON, user, 1000 * RAY);

    // Deposit first for withdrawal testing
    vm.startPrank(user);
    wton.approve(DEPOSIT_MANAGER, 500 * RAY);
    depositManager.deposit(TOKAMAK1, 500 * RAY);
    vm.stopPrank();
}
```

**Withdrawal request → delay → processing**:
```solidity
function test_ProcessRequest_AfterDelay() public {
    // 1. Request withdrawal
    vm.prank(user);
    depositManager.requestWithdrawal(TOKAMAK1, withdrawAmount);

    // 2. Check delay (block-based)
    uint256 delay = depositManager.getDelayBlocks(TOKAMAK1);

    // 3. Advance blocks (vm.roll, NOT vm.warp)
    vm.roll(block.number + delay + 1);

    // 4. Process withdrawal
    vm.prank(user);
    depositManager.processRequest(TOKAMAK1, false);  // false = receive as WTON

    assertEq(wtonAfter - wtonBefore, withdrawAmount);
}
```

**Withdrawal attempt before delay → failure**:
```solidity
function test_ProcessRequest_BeforeDelay_Reverts() public {
    vm.prank(user);
    depositManager.requestWithdrawal(TOKAMAK1, withdrawAmount);

    // Attempt to process immediately without vm.roll
    vm.prank(user);
    vm.expectRevert("DepositManager: wait for withdrawal delay");
    depositManager.processRequest(TOKAMAK1, false);
}
```

**Key takeaways**:
- **Block-based delay** vs **time-based delay**: DepositManager uses `vm.roll` (blocks), DAOVotingLifecycle uses `vm.warp` (timestamps)
- Preparing state in setUp allows each test to run independently
- `processRequest(layer2, receiveTON)` — second argument selects WTON/TON

### 5.4 ApproveAndCall.t.sol — Full Callback Chain (Most Rigorous Harness)

**Verifies the 5-step callback chain in a single transaction**:

```
user → TON.approveAndCall(WTON, amount, data)
  ├── 1. TON.approve(WTON, amount)
  ├── 2. TON._callOnApprove → WTON.onApprove(owner, spender, amount, data)
  │     ├── 3a. WTON._swapFromTON(owner, owner, amount) — reclaim TON, mint WTON
  │     ├── 3b. WTON._approve(owner, depositManager, wtonAmount)
  │     └── 3c. WTON._callOnApprove → DepositManager.onApprove(...)
  │           ├── 4. DepositManager._deposit(layer2, owner, wtonAmount, owner)
  │           └── 5. SeigManager.onDeposit — coinage minting
  └── Result: user's TON → WTON → Layer2 staking complete
```

```solidity
function test_ApproveAndCall_FullChain() public {
    uint256 tonAmount = 100 ether;
    uint256 expectedWtonAmount = tonAmount * (10 ** 9);  // 18→27 decimals

    // data must use abi.encode (NOT abi.encodePacked)
    // abi.encode → 64 bytes (32 + 32), abi.encodePacked → 40 bytes (20 + 20) → fails!
    bytes memory data = abi.encode(DEPOSIT_MANAGER, TOKAMAK1);
    assertEq(data.length, 64);

    vm.prank(user);
    ton.approveAndCall(WTON, tonAmount, data);

    // Verification 1: TON decreased
    assertEq(tonBefore - tonAfter, tonAmount);

    // Verification 2: WTON balance = 0 (all deposited)
    assertEq(wtonToken.balanceOf(user), 0);

    // Verification 3: accStaked increased (exact match)
    assertEq(accStakedAfter - accStakedBefore, expectedWtonAmount);

    // Verification 4: stakeOf increased (approximate — RAY math rounding)
    assertApproxEqAbs(stakeIncrease, expectedWtonAmount, 10);  // ±10 wei tolerance
}
```

**Key takeaways**:
- `abi.encode` vs `abi.encodePacked` — former pads to 32 bytes, latter uses minimum length. onApprove uses `abi.decode`, so `abi.encode` is required
- `assertApproxEqAbs(a, b, maxDelta)` — tolerates RAY math rmul/rdiv rounding errors
- coinage's `stakeOf` is factor-based, so exact matching may be impossible

### 5.5 Seigniorage.t.sol — Seigniorage Distribution Mechanism

**Block advancement in setUp**:
```solidity
function setUp() public {
    vm.roll(block.number + 100);  // advance 100 blocks → accumulated seigniorage exists
}
```

**Specifics of updateSeigniorage**:
```solidity
function test_UpdateSeigniorage_MintWTON() public {
    // updateSeigniorage() can only be called by registered Layer2 (checkCoinage modifier)
    // → call indirectly through the Candidate contract

    try ICandidate(TOKAMAK1).updateSeigniorage() returns (bool success) {
        assertTrue(success);
        assertGe(dmWtonAfter, dmWtonBefore);  // WTON minted to DepositManager
    } catch {
        // Even on failure, verify system consistency
        assertGt(seigManager.seigPerBlock(), 0);
    }
}
```

**Key takeaways**:
- `try/catch` — suitable for tests where success/failure varies depending on chain state at fork point
- `checkCoinage(msg.sender)` modifier — SeigManager's access control. Only Layer2 contracts can call
- Seigniorage = WTON is minted to DepositManager → reflected in stakers' coinage balances

---

## 6. Layer C: Governance (Complex State Machine)

### 6.1 DAOVotingLifecycle.t.sol — Full DAO Lifecycle

**The most complex harness**. Simulates the full cycle of agenda creation → notice period → voting → execution.

**Agenda creation (TON fee payment)**:
```solidity
function test_FullVotingLifecycle_Accept() public {
    // 1. Prepare agenda data
    address[] memory targets = new address[](1);
    targets[0] = DAO_AGENDA_MANAGER;
    bytes[] memory bytecodes = new bytes[](1);
    bytecodes[0] = abi.encodeWithSignature("totalAgendas()");  // no-op

    // 2. Check and pay fee
    uint256 fee = agendaManager.createAgendaFees();
    address creator = makeAddr("creator");  // deterministic address generation
    deal(TON, creator, fee);

    // 3. Encode agenda calldata
    bytes memory agendaCalldata = abi.encode(
        targets, noticePeriod, votingPeriod, true, bytecodes
    );

    // 4. Simulate TON.approveAndCall
    vm.prank(creator);
    ton.approve(DAO_COMMITTEE_PROXY, fee);
    vm.prank(TON);  // as if the TON contract is calling
    dao.onApprove(creator, DAO_COMMITTEE_PROXY, fee, agendaCalldata);
```

**Voting — key finding**: Committee members do not call `dao.castVote()` directly. They vote through each member's **Candidate contract**.

```solidity
    // 5. Skip notice period
    vm.warp(block.timestamp + noticePeriod + 1);

    // 6. Committee members vote
    for (uint256 i = 0; i < maxMember && yesVotes < quorum; i++) {
        address member = dao.members(i);
        address candidateContract = dao.candidateContract(member);

        vm.prank(member);
        // ⚠️ ICandidate.castVote(), NOT dao.castVote()
        ICandidate(candidateContract).castVote(agendaId, 1, "approve");
        //                                              ↑ 1=YES, 2=NO, 3=ABSTAIN
    }

    // 7. End voting period
    vm.warp(block.timestamp + votingPeriod + 1);

    // 8. Execute agenda
    dao.executeAgenda(agendaId);
}
```

**Rejection scenario**:
```solidity
function test_VotingRejection() public {
    // ... (same agenda creation)

    // NO vote (vote=2)
    ICandidate(candidateContract).castVote(agendaId, 2, "reject");

    // Check status
    (uint256 result, uint256 status) = dao.currentAgendaStatus(agendaId);
    // result=2 (REJECT), status=4 (ENDED)

    // Verify execution is not possible
    vm.expectRevert();
    dao.executeAgenda(agendaId);
}
```

**Key takeaways**:
- `makeAddr("name")` — Forge standard library's deterministic address generation
- `vm.warp(timestamp)` — timestamp manipulation (time-based, not block-based)
- `vm.prank(TON)` — call as if the TON contract itself is msg.sender
- Vote values: 1=YES, 2=NO, 3=ABSTAIN
- Agenda status: result(1=ACCEPT, 2=REJECT), status(4=ENDED)

### 6.2 AgendaSimulation.t.sol — Agenda Replay Tool

**The only environment-variable-parameterized harness**. Replays past or proposed agendas.

```solidity
function setUp() public {
    agendaId = vm.envUint("AGENDA_ID");  // read agenda ID from environment variable
}

function test_SimulateAgenda() public {
    // 1. Query execution info
    (address[] memory targets, bytes[] memory bytecodes,
     bool atomicExecute, ) = agendaManager.getExecutionInfo(agendaId);

    // 2. Pre-state snapshot
    uint256 vaultTon = ton.balanceOf(DAO_VAULT);
    uint256 vaultWton = wton.balanceOf(DAO_VAULT);

    // 3. Execute each call as DAOCommitteeProxy
    for (uint256 i = 0; i < targets.length; i++) {
        vm.prank(DAO_COMMITTEE_PROXY);
        (bool success, bytes memory returnData) = targets[i].call(bytecodes[i]);

        if (!success && atomicExecute) {
            revert(string(abi.encodePacked(
                "Atomic execution failed at call ", vm.toString(i),
                ": ", _extractRevertReason(returnData)
            )));
        }
    }

    // 4. Analyze state changes
    int256 tonDiff = int256(vaultTonAfter) - int256(vaultTon);
    int256 wtonDiff = int256(vaultWtonAfter) - int256(vaultWton);
}
```

**Revert reason extraction (inline assembly)**:
```solidity
function _extractRevertReason(bytes memory data) internal pure returns (string memory) {
    if (data.length < 68) return "Unknown reason";
    assembly {
        data := add(data, 0x04)  // skip the 4-byte selector of Error(string)
    }
    return abi.decode(data, (string));
}
```

**Key takeaways**:
- `vm.envUint("KEY")` — read values from environment variables. Enables using tests as operational tools
- Low-level `.call(bytecodes[i])` — execute raw calldata without ABI
- Atomic vs non-atomic execution — if atomic, entire transaction reverts on any single failure
- Track TON/WTON balance changes in DAOVault → financial impact analysis
- `vm.toString(uint)` — convert number to string (for error message composition)

---

## 7. Foundry Cheatcode Pattern Summary

### Identity Spoofing

| Cheatcode | Purpose | Example |
|-----------|---------|---------|
| `vm.prank(addr)` | Change msg.sender for next 1 call | `vm.prank(user); ton.approve(...)` |
| `vm.startPrank(addr)` | Change msg.sender for all subsequent calls | Sequential approve → deposit |
| `vm.stopPrank()` | Release startPrank | Cleanup after deposit |

### Time/Block Manipulation

| Cheatcode | Purpose | Used In |
|-----------|---------|---------|
| `vm.roll(blockNumber)` | Set block.number | StakingWithdraw (withdrawal delay), Seigniorage |
| `vm.warp(timestamp)` | Set block.timestamp | DAOVotingLifecycle (voting period) |

**Important**: Tokamak's two delay mechanisms:
- **Withdrawal delay** = block-based → `vm.roll`
- **Voting/notice period** = timestamp-based → `vm.warp`

### State Manipulation

| Cheatcode | Purpose | Example |
|-----------|---------|---------|
| `deal(token, account, amount)` | Forcibly set ERC20 balance | `deal(TON, user, 1000 ether)` |
| `vm.load(addr, slot)` | Read raw storage slot | StorageVerify |

### Verification

| Cheatcode | Purpose | Example |
|-----------|---------|---------|
| `vm.expectRevert()` | Next call must revert | Expect bare revert |
| `vm.expectRevert("msg")` | Revert with specific message | `"SeigToken: only sender..."` |
| `assertEq(a, b)` | Exact match | Balance change verification |
| `assertApproxEqAbs(a, b, delta)` | Approximate match | RAY math rounding |
| `assertGt`, `assertGe`, `assertLe` | Range verification | seigPerBlock > 0 |
| `assertTrue`, `assertFalse` | Boolean | aliveImplementation |

### Utilities

| Cheatcode | Purpose | Example |
|-----------|---------|---------|
| `makeAddr("name")` | Deterministic address generation | DAOVotingLifecycle |
| `vm.envUint("KEY")` | Read environment variable | AgendaSimulation |
| `vm.toString(uint)` | Number to string conversion | Error message composition |

---

## 8. Interface Strategy

### Dual Structure

```
Inside test files                      interfaces/ directory
┌──────────────────────┐               ┌────────────────────────────┐
│ Inline minimal        │               │ Complete interfaces         │
│ interfaces            │               │ IDAOCommitteeComplete      │
│ IERC20 (5 redefs)     │               │ ISeigManagerComplete       │
│ IDepositManager (3x)  │               │ IWTONComplete              │
│ ISeigManager (4x)     │               │ ... 9 total                │
│                        │               │                            │
│ Each file declares    │               │ Includes all public        │
│ only needed functions │               │ functions                  │
└──────────────────────┘               └────────────────────────────┘
         ↓                                         ↓
    Used for test execution             CompileInterfaces.t.sol
                                        converts to ABI JSON
                                              ↓
                                    Used by MCP server's loadAbi
```

**Why inline minimal interfaces?**

1. **Minimal dependencies** — each test file can run independently
2. **Readability** — functions used by the test are immediately visible
3. **Compilation speed** — only necessary ABIs are generated

**Trade-offs**:
- IERC20 is defined 5 times (each with slightly different function sets)
- Function signature typos are only caught at runtime

### ABI Connection to MCP Server

```
on-chain.ts loadAbi lookup order:
  1. I{Name}Complete  ← complete ABI from interfaces/ directory
  2. I{Name}Full      ← ISeigManagerFull from StorageVerify.t.sol
  3. I{Name}          ← general interface (minimal functionality)
```

---

## 9. Shared Address Registry

All harnesses use the same mainnet addresses, but each file declares them independently.

```solidity
// These addresses serve as the "implicit fixture" for all harnesses
address constant TON            = 0x2be5e8c109e2197D077D13A82dAead6a9b3433C5;
address constant WTON           = 0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2;
address constant DEPOSIT_MANAGER = 0x0b58ca72b12F01FC05F8f252e226f3E2089BD00E;
address constant SEIG_MANAGER    = 0x0b55a0f463b6DEFb81c6063973763951712D0E5F;
address constant LAYER2_REGISTRY = 0x7846c2248A7B4dE77E9C2Bae7FBB93bfC286837B;
address constant TOKAMAK1        = 0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF;
address constant DAO_COMMITTEE   = 0xDD9f0cCc044B0781289Ee318e5971b0139602C26;
address constant DAO_AGENDA_MGR  = 0xcD4421d082752f363E1687544a09d5112cD4f484;
address constant DAO_VAULT       = 0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303;
```

### Test User Address Conventions

| Address | Purpose | Used In |
|---------|---------|---------|
| `address(0xBEEF)` | Default test user | StakingDeposit, StakingWithdraw, ApproveAndCall |
| `address(0x1234)` | TON transfer test user | TONCompatibility |
| `address(0x5678)` | TON recipient | TONCompatibility |
| `makeAddr("creator")` | Agenda creator | DAOVotingLifecycle |

---

## 10. Implicit Dependency Chain

There are no explicit dependencies between test files, but reading them in the following order deepens understanding of the protocol logic:

```
1. Layer2Registration  ← "Does the ecosystem exist?"
   │  10 operators, coinage, TOT, SeigManager cross-references
   │
2. TONCompatibility    ← "What can you do with TON?"
   │  Discover transferFrom restriction → understand the need for WTON
   │
3. StakingDeposit      ← "How do you stake with WTON?"
   │  Two paths: direct deposit + approveAndCall
   │
4. ApproveAndCall      ← "What is the full flow a user actually experiences?"
   │  TON → WTON → DepositManager → SeigManager 5-step chain
   │
5. StakingWithdraw     ← "What happens when you unstake?"
   │  Withdrawal request → block delay → processing
   │
6. Seigniorage         ← "How do rewards accumulate?"
   │  seigPerBlock, coinage factor, updateSeigniorage
   │
7. DAOCommitteeRouting ← "What is the governance contract structure?"
   │  Dual implementations, selector routing
   │
8. DAOVotingLifecycle  ← "How does an agenda pass?"
   │  Creation → notice → voting → execution/rejection
   │
9. AgendaSimulation    ← "Let's simulate an actual agenda"
   │  Specify agenda ID via environment variable → financial impact analysis
   │
10. StorageVerify      ← "What is the contract's internal structure?"
    Raw storage slot reverse engineering
```

---

## 11. Coverage Gaps and Future Work

### Currently Uncovered Areas

| Area | Current State | Importance |
|------|--------------|------------|
| Uniswap V3 + TON | Address declared only, no tests | Low (sufficiently proven with V2) |
| `claimActivityReward` | Selector routing only confirmed | **High** (committee reward mechanism) |
| Batch withdrawal `processRequests` | Only single-item tested | Medium |
| `setCommissionRate` | Read only | Medium |
| `createCandidate` | Routing only confirmed | **High** (candidate registration) |
| `changeMember` | Untested | **High** (committee member replacement) |
| DAOVault financial flows | Balance tracking only | **High** (governance treasury) |
| WTON actual DEX swap | Only approve verified | Low (depends on liquidity) |
| SeigManager upgrade | Untested | Medium |

### Structural Improvement Opportunities

1. **Shared base contract** — extract address constants and common interfaces to `TokamakForkBase.sol`
2. **Interface consolidation** — import Complete interfaces in behavioral tests as well
3. **Cross-harness state sharing** — lift setUp patterns to base contract to eliminate duplication

---

## Appendix: Per-File Summary Table

| File | Layer | setUp | Test Count | Key Cheatcode | Nature |
|------|-------|-------|-----------|---------------|--------|
| CompileInterfaces | A | None | 0 | None | ABI generator |
| StorageVerify | A | None | 2 | `vm.load` | Diagnostic tool |
| DAOCommitteeRouting | A | None | 5 | None (view only) | Routing verification |
| Layer2Registration | A | None | 7 | None (view only) | Topology snapshot |
| TONCompatibility | B | `deal` | 7 | `vm.prank`, `vm.expectRevert` | Proof |
| StakingDeposit | B | `deal` | 3 | `vm.startPrank` | Path test |
| StakingWithdraw | B | `deal` + deposit | 3 | `vm.roll` | Lifecycle |
| ApproveAndCall | B | `deal` | 1 | `vm.prank` | Full chain proof |
| Seigniorage | B | `vm.roll` | 6 | `try/catch` | Mechanism verification |
| DAOVotingLifecycle | C | None (self-contained) | 4 | `vm.warp`, `vm.prank(TON)` | Governance simulation |
| AgendaSimulation | C | `vm.envUint` | 1 | low-level `.call`, assembly | Operational tool |
