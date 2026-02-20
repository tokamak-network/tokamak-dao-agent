# Tokamak DAO Agent — Fork Test Harness 설계 문서

> **목적**: Tokamak Network의 메인넷 컨트랙트를 Foundry fork 환경에서 검증하는 11개 harness의 설계 원리, 구조, 패턴을 학습하기 위한 문서.

---

## 목차

1. [개요: 왜 Fork Test Harness인가](#1-개요-왜-fork-test-harness인가)
2. [실행 환경](#2-실행-환경)
3. [3-Layer 아키텍처](#3-3-layer-아키텍처)
4. [Layer A: 인프라 검증 (읽기 전용)](#4-layer-a-인프라-검증-읽기-전용)
5. [Layer B: 프로토콜 플로우 (상태 변경)](#5-layer-b-프로토콜-플로우-상태-변경)
6. [Layer C: 거버넌스 (복합 상태 머신)](#6-layer-c-거버넌스-복합-상태-머신)
7. [Foundry Cheatcode 패턴 정리](#7-foundry-cheatcode-패턴-정리)
8. [인터페이스 전략](#8-인터페이스-전략)
9. [공유 주소 레지스트리](#9-공유-주소-레지스트리)
10. [암묵적 의존 체인](#10-암묵적-의존-체인)
11. [커버리지 갭과 향후 과제](#11-커버리지-갭과-향후-과제)

---

## 1. 개요: 왜 Fork Test Harness인가

Tokamak Network의 컨트랙트는 **메인넷에 배포된 상태**에서만 의미 있는 동작을 보인다. 이유:

- **프록시 패턴**: DAOCommitteeProxy는 slot0/slot1 이중 구현체를 가지며, 셀렉터별로 라우팅된다.
- **콜백 체인**: `TON.approveAndCall → WTON.onApprove → DepositManager.onApprove` — 세 컨트랙트가 한 트랜잭션에서 연쇄 호출된다.
- **시뇨리지 수학**: SeigManager의 coinage factor는 RAY(10^27) 정밀도의 rmul/rdiv를 사용하며, 실제 스테이킹 상태 없이는 테스트할 수 없다.
- **거버넌스 상태**: 위원회 멤버, 쿼럼, 투표 기간 등은 모두 온체인 상태에 의존한다.

**Fork test**는 이 모든 것을 해결한다:
```
실제 메인넷 상태를 로컬에 복제 → vm.prank로 어떤 주소든 흉내 → vm.roll/vm.warp로 시간/블록 전진
```

이 harness들은 두 가지 역할을 동시에 수행한다:
1. **검증 도구** — 프로토콜 동작을 증명/반증
2. **탐색 도구** — 온체인 상태를 진단/발견

---

## 2. 실행 환경

### foundry.toml 설정

```toml
# Fork testing profile — 레거시 src/ 컨트랙트를 제외한다
[profile.fork]
src = "test"          # src가 아닌 test 디렉토리만 컴파일
out = "out"
test = "test"
solc_version = "0.8.24"
evm_version = "paris"
```

핵심: `src = "test"` — 컨트랙트 소스(다양한 Solidity 버전)를 컴파일 대상에서 제외하고, 테스트 파일만 컴파일한다.

### 실행 명령

```bash
# 기본 실행
FOUNDRY_PROFILE=fork forge test --fork-url $ALCHEMY_RPC_URL -vvv

# 특정 컨트랙트만
FOUNDRY_PROFILE=fork forge test --match-contract ApproveAndCall --fork-url $ALCHEMY_RPC_URL -vvv

# 특정 테스트만
FOUNDRY_PROFILE=fork forge test --match-test test_SimulateAgenda --fork-url $ALCHEMY_RPC_URL -vvv

# 환경변수 파라미터화 (AgendaSimulation)
AGENDA_ID=42 FOUNDRY_PROFILE=fork forge test --match-contract AgendaSimulation --fork-url $ALCHEMY_RPC_URL -vvv
```

---

## 3. 3-Layer 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  Layer C: Governance (복합 상태 머신)                       │
│  ├── DAOVotingLifecycle.t.sol   — DAO 전체 생명주기         │
│  └── AgendaSimulation.t.sol     — 안건 리플레이 도구        │
├─────────────────────────────────────────────────────────┤
│  Layer B: Protocol Flows (상태 변경 테스트)                 │
│  ├── TONCompatibility.t.sol     — 토큰 제한 증명            │
│  ├── StakingDeposit.t.sol       — 예치 경로                │
│  ├── StakingWithdraw.t.sol      — 출금 생명주기             │
│  ├── ApproveAndCall.t.sol       — 전체 콜백 체인            │
│  └── Seigniorage.t.sol          — 시뇨리지 분배            │
├─────────────────────────────────────────────────────────┤
│  Layer A: Infrastructure (읽기 전용 검증)                   │
│  ├── CompileInterfaces.t.sol    — ABI 생성기               │
│  ├── StorageVerify.t.sol        — 스토리지 슬롯 진단        │
│  ├── DAOCommitteeRouting.t.sol  — 프록시 라우팅             │
│  └── Layer2Registration.t.sol   — 에코시스템 토폴로지        │
└─────────────────────────────────────────────────────────┘
```

각 Layer의 특성:

| Layer | setUp | 상태 변경 | Assertion 스타일 | 역할 |
|-------|-------|----------|-----------------|------|
| A | 없음 또는 최소 | 없음 (view only) | `assertEq`, `assertTrue` | 인프라가 올바른지 확인 |
| B | `deal`로 토큰 지급 | 예치/출금/전송 | `assertEq`, `assertApproxEqAbs` | 프로토콜 흐름 증명 |
| C | 복합 (안건 생성 포함) | 투표/실행 | `assertGe`, `vm.expectRevert` | 거버넌스 시뮬레이션 |

---

## 4. Layer A: 인프라 검증 (읽기 전용)

### 4.1 CompileInterfaces.t.sol — ABI 생성 브릿지

**목적**: 행동 테스트가 아니다. Foundry가 9개 Complete 인터페이스를 컴파일하여 `contracts/out/`에 ABI JSON을 생성하도록 강제한다.

```solidity
// pragma ^0.8.4 — 모든 인터페이스와 호환되는 최소 버전
contract CompileInterfaces {
    // public state variable → Foundry가 타입을 resolve하려면 컴파일해야 함
    IDAOCommitteeComplete public daoCommittee;
    IWTONComplete public wton;
    ISeigManagerComplete public seigManager;
    // ... 9개 전체
}
```

**핵심 설계 결정**: `is Test`를 상속하지 않는다. 순수 컴파일 트리거.

**MCP 서버와의 연결**: 생성된 ABI는 `on-chain.ts`의 `loadAbi`가 사용한다.
```
I{Name}Complete (1순위) → I{Name}Full (2순위) → I{Name} (3순위)
```

### 4.2 StorageVerify.t.sol — 원시 스토리지 슬롯 탐색

**목적**: `vm.load`를 사용해 프록시 뒤의 실제 스토리지 레이아웃을 역공학한다.

```solidity
function testDaoSeigRateSlot() public {
    // 1. view 함수로 정답 확인
    uint256 valueFromCall = ISeigManagerFull(SEIG_MANAGER_PROXY).daoSeigRate();

    // 2. raw slot을 순회하며 같은 값을 찾기
    for (uint256 i = 24; i <= 32; i++) {
        bytes32 val = vm.load(SEIG_MANAGER_PROXY, bytes32(i));
        emit log_named_bytes32(..., val);
    }
}
```

**학습 포인트**:
- `vm.load(address, slot)` — EVM 스토리지를 직접 읽는 cheatcode
- 함수 호출 결과 vs raw slot 비교로 스토리지 레이아웃을 확정
- `emit log_named_*` — DSTest 스타일의 오래된 로깅 API (console.log보다 선행)

**부수 효과**: `ISeigManagerFull` 인터페이스를 정의하여 MCP 서버의 ABI fallback으로 사용.

### 4.3 DAOCommitteeRouting.t.sol — 프록시 이중 구현체 검증

**목적**: DAOCommitteeProxy의 slot0(core)/slot1(admin) 라우팅 로직을 셀렉터 단위로 검증한다.

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

**학습 포인트**:
- `bytes4(keccak256("functionName(argTypes)"))` — Solidity 함수 셀렉터 계산
- `getSelectorImplementation2(selector)` — Tokamak 프록시의 커스텀 라우팅 조회
- `aliveImplementation(address)` — 구현체 활성/비활성 상태 확인
- 퇴역한 구현체(`V1_OLD`, `OWNER_OLD`)가 비활성인지 확인하는 회귀 테스트

**Tokamak 프록시 패턴** (EIP-1967과 다름):
```
┌── DAOCommitteeProxy ──┐
│  slot0: DAOCommittee_V1 (core: castVote, executeAgenda, ...)    │
│  slot1: DAOCommitteeOwner (admin: setSeigManager, setQuorum, ...)│
│  selectorImplementation: selector → 구현체 매핑               │
│  getSelectorImplementation2: 매핑 체크 → 없으면 slot0 fallback  │
└───────────────────────────┘
```

### 4.4 Layer2Registration.t.sol — 에코시스템 토폴로지 스냅샷

**목적**: 10개 등록 오퍼레이터 전체의 상태를 순회하며 에코시스템 건전성을 확인한다.

```solidity
address[10] OPERATORS = [
    0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF, // tokamak1
    0x44e3605d0ed58FD125E9C47D1bf25a4406c13b57, // DXM Corp
    0x2B67D8D4E61b68744885E243EfAF988f1Fc66E2D, // DSRV
    // ... 총 10개
];
```

**검증 항목**:

| 테스트 | 검증 내용 |
|--------|----------|
| `test_AllOperatorsRegistered` | 10/10 Layer2Registry 등록 확인 |
| `test_AllOperatorsHaveCoinages` | 모든 오퍼레이터에 coinage 컨트랙트 존재 |
| `test_TotTokenState` | TOT(sWTON) 토큰의 totalSupply, 오퍼레이터별 잔고 |
| `test_SeigManagerCrossRefs` | SeigManager가 참조하는 registry, depositManager, factory 주소 일치 |
| `test_SeigniorageParameters` | seigPerBlock > 0, paused == false |
| `test_CoinageFactoryState` | SeigManager가 CoinageFactory의 admin인지 확인 |

**학습 포인트**:
- 고정 크기 배열 `address[10]`과 `string[10]` — 하드코딩된 오퍼레이터 목록
- 순수 view 테스트 — setUp 없이 실행 가능
- SeigManager의 cross-reference 검증 — 컨트랙트 간 참조 무결성

---

## 5. Layer B: 프로토콜 플로우 (상태 변경)

### 5.1 TONCompatibility.t.sol — TON의 DEX 호환성 증명

**핵심 발견**: TON은 DEX에서 거래할 수 **없다**. `SeigToken.transferFrom`이 `msg.sender == sender || msg.sender == recipient`을 요구하기 때문.

```solidity
// ❌ 제3자(라우터)가 transferFrom → REVERT
function test_TON_TransferFrom_ThirdParty_Reverts() public {
    vm.prank(user);
    ton.approve(UNISWAP_V2_ROUTER, amount);    // approve는 성공

    vm.prank(UNISWAP_V2_ROUTER);               // 라우터가 호출
    vm.expectRevert("SeigToken: only sender or recipient can transfer");
    ton.transferFrom(user, recipient, amount);  // 실패!
}

// ✅ sender 본인이 transferFrom → 성공
function test_TON_TransferFrom_BySender_Succeeds() public {
    vm.prank(user);
    ton.approve(user, amount);

    vm.prank(user);                             // sender == msg.sender
    ton.transferFrom(user, recipient, amount);  // 성공
    assertEq(ton.balanceOf(recipient), amount);
}

// ✅ WTON은 표준 ERC20 → 제3자 transferFrom 성공
function test_WTON_TransferFrom_ThirdParty_Succeeds() public {
    vm.prank(user);
    wton.approve(UNISWAP_V2_ROUTER, amount);

    vm.prank(UNISWAP_V2_ROUTER);
    wton.transferFrom(user, recipient, amount); // 성공
}
```

**End-to-end 스왑 테스트**:
```solidity
function test_TON_UniswapV2_Swap_Reverts() public {
    address[] memory path = new address[](2);
    path[0] = TON;
    path[1] = WETH;

    vm.prank(user);
    vm.expectRevert();  // 라우터 내부에서 transferFrom이 실패
    IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
        amountIn, 0, path, user, block.timestamp + 3600
    );
}
```

**학습 포인트**:
- `vm.expectRevert("specific message")` vs `vm.expectRevert()` — 특정 메시지 매칭 vs bare revert
- Uniswap V2와 Sushiswap은 동일한 라우터 인터페이스를 사용
- TON과 WTON의 근본적 차이는 `transferFrom` 제한에 있다

### 5.2 StakingDeposit.t.sol — 예치 경로 테스트

두 가지 예치 경로를 검증한다:

**경로 1: WTON 직접 예치**
```solidity
function test_Deposit_WTON_ToLayer2() public {
    uint256 depositAmount = 100 * RAY;  // WTON은 27 decimals

    vm.startPrank(user);                        // 다중 호출 시작
    wton.approve(DEPOSIT_MANAGER, depositAmount);
    depositManager.deposit(TOKAMAK1, depositAmount);
    vm.stopPrank();                             // 다중 호출 종료

    uint256 accStakedAfter = depositManager.accStaked(TOKAMAK1, user);
    assertEq(accStakedAfter - accStakedBefore, depositAmount);
}
```

**경로 2: TON → WTON → DepositManager (콜백 체인)**
```solidity
function test_Deposit_ViaApproveAndCall() public {
    bytes memory data = abi.encode(DEPOSIT_MANAGER, TOKAMAK1);

    vm.prank(user);
    ton.approveAndCall(WTON, tonAmount, data);
    // TON(18 dec) → WTON(27 dec): 변환 비율 = × 10^9
}
```

**경로 3: 미등록 Layer2 거부**
```solidity
function test_Deposit_ToUnregisteredLayer2_Reverts() public {
    address fakeLayer2 = address(0xDEAD);
    vm.expectRevert();
    depositManager.deposit(fakeLayer2, depositAmount);
}
```

**학습 포인트**:
- `vm.startPrank` / `vm.stopPrank` — 연속된 여러 호출을 같은 msg.sender로 실행
- `vm.prank` — 단일 호출만 msg.sender 변경
- `deal(token, account, amount)` — ERC20 잔고를 강제로 설정 (스토리지 직접 조작)
- TON(18 decimals)과 WTON(27 decimals, RAY)의 단위 변환: `× 10^9`

### 5.3 StakingWithdraw.t.sol — 출금 생명주기

**setUp에서 예치 선행**:
```solidity
function setUp() public {
    deal(WTON, user, 1000 * RAY);

    // 출금 테스트를 위해 먼저 예치
    vm.startPrank(user);
    wton.approve(DEPOSIT_MANAGER, 500 * RAY);
    depositManager.deposit(TOKAMAK1, 500 * RAY);
    vm.stopPrank();
}
```

**출금 요청 → 딜레이 → 처리**:
```solidity
function test_ProcessRequest_AfterDelay() public {
    // 1. 출금 요청
    vm.prank(user);
    depositManager.requestWithdrawal(TOKAMAK1, withdrawAmount);

    // 2. 딜레이 확인 (블록 기반)
    uint256 delay = depositManager.getDelayBlocks(TOKAMAK1);

    // 3. 블록 전진 (vm.roll, NOT vm.warp)
    vm.roll(block.number + delay + 1);

    // 4. 출금 처리
    vm.prank(user);
    depositManager.processRequest(TOKAMAK1, false);  // false = WTON으로 수령

    assertEq(wtonAfter - wtonBefore, withdrawAmount);
}
```

**딜레이 전 출금 시도 → 실패**:
```solidity
function test_ProcessRequest_BeforeDelay_Reverts() public {
    vm.prank(user);
    depositManager.requestWithdrawal(TOKAMAK1, withdrawAmount);

    // vm.roll 없이 바로 처리 시도
    vm.prank(user);
    vm.expectRevert("DepositManager: wait for withdrawal delay");
    depositManager.processRequest(TOKAMAK1, false);
}
```

**학습 포인트**:
- **블록 기반 딜레이** vs **시간 기반 딜레이**: DepositManager는 `vm.roll`(블록), DAOVotingLifecycle은 `vm.warp`(타임스탬프)
- setUp에서 상태를 준비하면 각 테스트가 독립적으로 실행 가능
- `processRequest(layer2, receiveTON)` — 두 번째 인자로 WTON/TON 선택

### 5.4 ApproveAndCall.t.sol — 전체 콜백 체인 (가장 엄밀한 harness)

**5단계 콜백 체인을 단일 트랜잭션에서 검증**:

```
user → TON.approveAndCall(WTON, amount, data)
  ├── 1. TON.approve(WTON, amount)
  ├── 2. TON._callOnApprove → WTON.onApprove(owner, spender, amount, data)
  │     ├── 3a. WTON._swapFromTON(owner, owner, amount) — TON 회수, WTON 민팅
  │     ├── 3b. WTON._approve(owner, depositManager, wtonAmount)
  │     └── 3c. WTON._callOnApprove → DepositManager.onApprove(...)
  │           ├── 4. DepositManager._deposit(layer2, owner, wtonAmount, owner)
  │           └── 5. SeigManager.onDeposit — coinage 민팅
  └── 결과: user의 TON → WTON → Layer2 스테이킹 완료
```

```solidity
function test_ApproveAndCall_FullChain() public {
    uint256 tonAmount = 100 ether;
    uint256 expectedWtonAmount = tonAmount * (10 ** 9);  // 18→27 decimals

    // data는 반드시 abi.encode (NOT abi.encodePacked)
    // abi.encode → 64 bytes (32 + 32), abi.encodePacked → 40 bytes (20 + 20) → 실패!
    bytes memory data = abi.encode(DEPOSIT_MANAGER, TOKAMAK1);
    assertEq(data.length, 64);

    vm.prank(user);
    ton.approveAndCall(WTON, tonAmount, data);

    // 검증 1: TON 감소
    assertEq(tonBefore - tonAfter, tonAmount);

    // 검증 2: WTON 잔고 = 0 (전부 예치됨)
    assertEq(wtonToken.balanceOf(user), 0);

    // 검증 3: accStaked 증가 (정확히 일치)
    assertEq(accStakedAfter - accStakedBefore, expectedWtonAmount);

    // 검증 4: stakeOf 증가 (근사 — RAY 수학 라운딩)
    assertApproxEqAbs(stakeIncrease, expectedWtonAmount, 10);  // ±10 wei 허용
}
```

**학습 포인트**:
- `abi.encode` vs `abi.encodePacked` — 전자는 32바이트 패딩, 후자는 최소 길이. onApprove는 `abi.decode`를 사용하므로 반드시 `abi.encode`
- `assertApproxEqAbs(a, b, maxDelta)` — RAY 수학의 rmul/rdiv 라운딩 오차를 허용
- coinage의 `stakeOf`는 factor 기반이라 정확한 일치가 불가능할 수 있다

### 5.5 Seigniorage.t.sol — 시뇨리지 분배 메커니즘

**setUp에서 블록 전진**:
```solidity
function setUp() public {
    vm.roll(block.number + 100);  // 100블록 전진 → 축적된 시뇨리지 존재
}
```

**updateSeigniorage의 특수성**:
```solidity
function test_UpdateSeigniorage_MintWTON() public {
    // updateSeigniorage()는 등록된 Layer2만 호출 가능 (checkCoinage modifier)
    // → Candidate 컨트랙트를 통해 간접 호출

    try ICandidate(TOKAMAK1).updateSeigniorage() returns (bool success) {
        assertTrue(success);
        assertGe(dmWtonAfter, dmWtonBefore);  // WTON이 DepositManager에 민팅됨
    } catch {
        // 실패해도 시스템 정합성 확인
        assertGt(seigManager.seigPerBlock(), 0);
    }
}
```

**학습 포인트**:
- `try/catch` — 포크 시점의 체인 상태에 따라 성공/실패가 달라지는 테스트에 적합
- `checkCoinage(msg.sender)` modifier — SeigManager의 접근 제어. Layer2 컨트랙트만 호출 가능
- 시뇨리지 = WTON이 DepositManager로 민팅됨 → 스테이커의 coinage 잔고에 반영

---

## 6. Layer C: 거버넌스 (복합 상태 머신)

### 6.1 DAOVotingLifecycle.t.sol — DAO 전체 생명주기

**가장 복잡한 harness**. 안건 생성 → 공지기간 → 투표 → 실행의 전체 사이클을 시뮬레이션한다.

**안건 생성 (TON 수수료 지불)**:
```solidity
function test_FullVotingLifecycle_Accept() public {
    // 1. 안건 데이터 준비
    address[] memory targets = new address[](1);
    targets[0] = DAO_AGENDA_MANAGER;
    bytes[] memory bytecodes = new bytes[](1);
    bytecodes[0] = abi.encodeWithSignature("totalAgendas()");  // no-op

    // 2. 수수료 확인 및 지급
    uint256 fee = agendaManager.createAgendaFees();
    address creator = makeAddr("creator");  // 결정론적 주소 생성
    deal(TON, creator, fee);

    // 3. 안건 calldata 인코딩
    bytes memory agendaCalldata = abi.encode(
        targets, noticePeriod, votingPeriod, true, bytecodes
    );

    // 4. TON.approveAndCall을 시뮬레이션
    vm.prank(creator);
    ton.approve(DAO_COMMITTEE_PROXY, fee);
    vm.prank(TON);  // TON 컨트랙트가 호출하는 것처럼
    dao.onApprove(creator, DAO_COMMITTEE_PROXY, fee, agendaCalldata);
```

**투표 — 핵심 발견**: 위원이 직접 `dao.castVote()`를 호출하지 않는다. 각 위원의 **Candidate 컨트랙트**를 통해 투표한다.

```solidity
    // 5. 공지기간 스킵
    vm.warp(block.timestamp + noticePeriod + 1);

    // 6. 위원들의 투표
    for (uint256 i = 0; i < maxMember && yesVotes < quorum; i++) {
        address member = dao.members(i);
        address candidateContract = dao.candidateContract(member);

        vm.prank(member);
        // ⚠️ dao.castVote()가 아닌 ICandidate.castVote()
        ICandidate(candidateContract).castVote(agendaId, 1, "approve");
        //                                              ↑ 1=YES, 2=NO, 3=ABSTAIN
    }

    // 7. 투표기간 종료
    vm.warp(block.timestamp + votingPeriod + 1);

    // 8. 안건 실행
    dao.executeAgenda(agendaId);
}
```

**거부 시나리오**:
```solidity
function test_VotingRejection() public {
    // ... (동일한 안건 생성)

    // NO 투표 (vote=2)
    ICandidate(candidateContract).castVote(agendaId, 2, "reject");

    // 상태 확인
    (uint256 result, uint256 status) = dao.currentAgendaStatus(agendaId);
    // result=2 (REJECT), status=4 (ENDED)

    // 실행 불가 확인
    vm.expectRevert();
    dao.executeAgenda(agendaId);
}
```

**학습 포인트**:
- `makeAddr("name")` — Forge 표준 라이브러리의 결정론적 주소 생성
- `vm.warp(timestamp)` — 타임스탬프 조작 (블록이 아닌 시간 기반)
- `vm.prank(TON)` — TON 컨트랙트 자체가 msg.sender인 것처럼 호출
- 투표 값: 1=YES, 2=NO, 3=ABSTAIN
- 안건 상태: result(1=ACCEPT, 2=REJECT), status(4=ENDED)

### 6.2 AgendaSimulation.t.sol — 안건 리플레이 도구

**유일하게 환경변수로 파라미터화된 harness**. 과거 또는 제안된 안건을 재실행한다.

```solidity
function setUp() public {
    agendaId = vm.envUint("AGENDA_ID");  // 환경변수에서 안건 ID 읽기
}

function test_SimulateAgenda() public {
    // 1. 실행 정보 조회
    (address[] memory targets, bytes[] memory bytecodes,
     bool atomicExecute, ) = agendaManager.getExecutionInfo(agendaId);

    // 2. 사전 상태 스냅샷
    uint256 vaultTon = ton.balanceOf(DAO_VAULT);
    uint256 vaultWton = wton.balanceOf(DAO_VAULT);

    // 3. DAOCommitteeProxy로서 각 호출 실행
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

    // 4. 상태 변화 분석
    int256 tonDiff = int256(vaultTonAfter) - int256(vaultTon);
    int256 wtonDiff = int256(vaultWtonAfter) - int256(vaultWton);
}
```

**Revert reason 추출 (인라인 어셈블리)**:
```solidity
function _extractRevertReason(bytes memory data) internal pure returns (string memory) {
    if (data.length < 68) return "Unknown reason";
    assembly {
        data := add(data, 0x04)  // Error(string)의 4바이트 셀렉터 건너뛰기
    }
    return abi.decode(data, (string));
}
```

**학습 포인트**:
- `vm.envUint("KEY")` — 환경변수에서 값 읽기. 테스트를 운용 도구로 사용 가능
- low-level `.call(bytecodes[i])` — ABI 없이 raw calldata 실행
- atomic vs non-atomic 실행 — 원자적이면 하나라도 실패 시 전체 revert
- DAOVault의 TON/WTON 잔고 변화 추적 → 재무 영향 분석
- `vm.toString(uint)` — 숫자를 문자열로 변환 (에러 메시지 조합용)

---

## 7. Foundry Cheatcode 패턴 정리

### 신원 위조 (Identity Spoofing)

| Cheatcode | 용도 | 사용 예 |
|-----------|------|---------|
| `vm.prank(addr)` | 다음 1회 호출의 msg.sender 변경 | `vm.prank(user); ton.approve(...)` |
| `vm.startPrank(addr)` | 이후 모든 호출의 msg.sender 변경 | 연속 approve → deposit |
| `vm.stopPrank()` | startPrank 해제 | deposit 후 정리 |

### 시간/블록 조작

| Cheatcode | 용도 | 사용 파일 |
|-----------|------|----------|
| `vm.roll(blockNumber)` | block.number 설정 | StakingWithdraw (출금 딜레이), Seigniorage |
| `vm.warp(timestamp)` | block.timestamp 설정 | DAOVotingLifecycle (투표 기간) |

**중요**: Tokamak의 두 가지 딜레이 메커니즘:
- **출금 딜레이** = 블록 기반 → `vm.roll`
- **투표/공지 기간** = 타임스탬프 기반 → `vm.warp`

### 상태 조작

| Cheatcode | 용도 | 사용 예 |
|-----------|------|---------|
| `deal(token, account, amount)` | ERC20 잔고 강제 설정 | `deal(TON, user, 1000 ether)` |
| `vm.load(addr, slot)` | raw 스토리지 슬롯 읽기 | StorageVerify |

### 검증

| Cheatcode | 용도 | 사용 예 |
|-----------|------|---------|
| `vm.expectRevert()` | 다음 호출이 revert되어야 함 | bare revert 기대 |
| `vm.expectRevert("msg")` | 특정 메시지로 revert | `"SeigToken: only sender..."` |
| `assertEq(a, b)` | 정확한 일치 | 잔고 변화 검증 |
| `assertApproxEqAbs(a, b, delta)` | 근사 일치 | RAY 수학 라운딩 |
| `assertGt`, `assertGe`, `assertLe` | 범위 검증 | seigPerBlock > 0 |
| `assertTrue`, `assertFalse` | 불리언 | aliveImplementation |

### 유틸리티

| Cheatcode | 용도 | 사용 예 |
|-----------|------|---------|
| `makeAddr("name")` | 결정론적 주소 생성 | DAOVotingLifecycle |
| `vm.envUint("KEY")` | 환경변수 읽기 | AgendaSimulation |
| `vm.toString(uint)` | 숫자→문자열 변환 | 에러 메시지 조합 |

---

## 8. 인터페이스 전략

### 이원화된 구조

```
테스트 파일 내부                          interfaces/ 디렉토리
┌──────────────────────┐                ┌────────────────────────────┐
│ 인라인 최소 인터페이스    │                │ Complete 인터페이스           │
│ IERC20 (5회 재정의)     │                │ IDAOCommitteeComplete      │
│ IDepositManager (3회)  │                │ ISeigManagerComplete       │
│ ISeigManager (4회)     │                │ IWTONComplete              │
│                        │                │ ... 9개                    │
│ 각 파일에서 필요한       │                │                            │
│ 함수만 선언             │                │ 모든 public 함수 포함        │
└──────────────────────┘                └────────────────────────────┘
         ↓                                         ↓
    테스트 실행에 사용                     CompileInterfaces.t.sol이
                                         ABI JSON으로 변환
                                              ↓
                                    MCP 서버의 loadAbi가 사용
```

**왜 인라인 최소 인터페이스인가?**

1. **의존성 최소화** — 각 테스트 파일이 독립 실행 가능
2. **가독성** — 테스트가 사용하는 함수가 바로 보임
3. **컴파일 속도** — 필요한 ABI만 생성

**트레이드오프**:
- IERC20가 5회 중복 정의됨 (각각 약간 다른 함수 집합)
- 함수 시그니처 오타 시 런타임에서만 발견됨

### MCP 서버와의 ABI 연결

```
on-chain.ts loadAbi 탐색 순서:
  1. I{Name}Complete  ← interfaces/ 디렉토리의 완전한 ABI
  2. I{Name}Full      ← StorageVerify.t.sol의 ISeigManagerFull
  3. I{Name}          ← 일반 인터페이스 (최소 기능)
```

---

## 9. 공유 주소 레지스트리

모든 harness가 동일한 메인넷 주소를 사용하지만, 각 파일에서 독립적으로 선언한다.

```solidity
// 이 주소들이 전체 harness의 "암묵적 fixture" 역할을 한다
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

### 테스트 사용자 주소 규칙

| 주소 | 용도 | 사용 파일 |
|------|------|----------|
| `address(0xBEEF)` | 기본 테스트 사용자 | StakingDeposit, StakingWithdraw, ApproveAndCall |
| `address(0x1234)` | TON 전송 테스트 사용자 | TONCompatibility |
| `address(0x5678)` | TON 수신자 | TONCompatibility |
| `makeAddr("creator")` | 안건 생성자 | DAOVotingLifecycle |

---

## 10. 암묵적 의존 체인

테스트 파일 간에 명시적 의존은 없지만, 프로토콜 로직 상 다음 순서로 읽으면 이해가 깊어진다:

```
1. Layer2Registration  ← "에코시스템이 존재하는가?"
   │  10개 오퍼레이터, coinage, TOT, SeigManager 상호참조
   │
2. TONCompatibility    ← "TON으로 뭘 할 수 있는가?"
   │  transferFrom 제한 발견 → WTON 사용 필요성 이해
   │
3. StakingDeposit      ← "WTON으로 어떻게 스테이킹하는가?"
   │  직접 deposit + approveAndCall 두 경로
   │
4. ApproveAndCall      ← "사용자가 실제로 경험하는 전체 플로우는?"
   │  TON → WTON → DepositManager → SeigManager 5단계 체인
   │
5. StakingWithdraw     ← "스테이킹을 해제하면?"
   │  출금 요청 → 블록 딜레이 → 처리
   │
6. Seigniorage         ← "보상은 어떻게 쌓이는가?"
   │  seigPerBlock, coinage factor, updateSeigniorage
   │
7. DAOCommitteeRouting ← "거버넌스 컨트랙트 구조는?"
   │  이중 구현체, 셀렉터 라우팅
   │
8. DAOVotingLifecycle  ← "안건은 어떻게 통과되는가?"
   │  생성 → 공지 → 투표 → 실행/거부
   │
9. AgendaSimulation    ← "실제 안건을 시뮬레이션해보자"
   │  환경변수로 안건 ID 지정 → 재무 영향 분석
   │
10. StorageVerify      ← "컨트랙트 내부 구조는?"
    raw 스토리지 슬롯 역공학
```

---

## 11. 커버리지 갭과 향후 과제

### 현재 미커버 영역

| 영역 | 현재 상태 | 중요도 |
|------|----------|-------|
| Uniswap V3 + TON | 주소만 선언, 테스트 없음 | 낮음 (V2에서 충분히 증명) |
| `claimActivityReward` | 셀렉터 라우팅만 확인 | **높음** (위원 보상 메커니즘) |
| 배치 출금 `processRequests` | 단건만 테스트 | 중간 |
| `setCommissionRate` | 읽기만 | 중간 |
| `createCandidate` | 라우팅만 확인 | **높음** (후보자 등록) |
| `changeMember` | 미테스트 | **높음** (위원 교체) |
| DAOVault 재무 플로우 | 잔고 추적만 | **높음** (거버넌스 재무) |
| WTON 실제 DEX 스왑 | approve만 검증 | 낮음 (유동성 의존) |
| SeigManager 업그레이드 | 미테스트 | 중간 |

### 구조적 개선 기회

1. **공유 base contract** — 주소 상수와 공통 인터페이스를 `TokamakForkBase.sol`로 추출
2. **인터페이스 통합** — 행동 테스트에서도 Complete 인터페이스를 import
3. **Harness 간 상태 공유** — setUp 패턴을 base contract로 올려 중복 제거

---

## 부록: 파일별 요약 테이블

| 파일 | Layer | setUp | 테스트 수 | 핵심 cheatcode | 성격 |
|------|-------|-------|----------|---------------|------|
| CompileInterfaces | A | 없음 | 0 | 없음 | ABI 생성기 |
| StorageVerify | A | 없음 | 2 | `vm.load` | 진단 도구 |
| DAOCommitteeRouting | A | 없음 | 5 | 없음 (view only) | 라우팅 검증 |
| Layer2Registration | A | 없음 | 7 | 없음 (view only) | 토폴로지 스냅샷 |
| TONCompatibility | B | `deal` | 7 | `vm.prank`, `vm.expectRevert` | 증명 |
| StakingDeposit | B | `deal` | 3 | `vm.startPrank` | 경로 테스트 |
| StakingWithdraw | B | `deal` + deposit | 3 | `vm.roll` | 생명주기 |
| ApproveAndCall | B | `deal` | 1 | `vm.prank` | 전체 체인 증명 |
| Seigniorage | B | `vm.roll` | 6 | `try/catch` | 메커니즘 검증 |
| DAOVotingLifecycle | C | 없음 (self-contained) | 4 | `vm.warp`, `vm.prank(TON)` | 거버넌스 시뮬레이션 |
| AgendaSimulation | C | `vm.envUint` | 1 | low-level `.call`, assembly | 운용 도구 |
