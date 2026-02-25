---
eip: XXXX
title: AI Agent Governance Interface
description: Defines interfaces for AI agent registration, delegation, rationale integrity, and credibility tracking in DAOs
author: Tokamak Network (@nicetokamak)
discussions-to: https://ethereum-magicians.org/t/erc-ai-agent-governance-interface
status: Draft
type: Standards Track
category: ERC
created: 2026-02-24
requires: 165
---

## Abstract

본 ERC는 AI agent의 DAO 거버넌스 참여를 위한 표준 interface를 정의한다. On-chain agent 등록, 만료 및 escalation을 갖춘 선호도 기반 위임, 암호학적 근거 commitment, 예측 기반 신뢰도 추적 메커니즘을 명시한다. 이 interface는 ERC-5805 및 ERC-4824를 포함한 기존 거버넌스 인프라와 조합 가능하도록 설계되었다.

## Motivation

### DAO 거버넌스의 관심 병목 현상

DAO는 만성적인 투표자 무관심에 시달리고 있다. 대부분의 token 보유자는 모든 제안을 평가할 시간이나 전문성이 부족하며, 이로 인해 낮은 참여율과 소수의 적극적 참여자에 의한 거버넌스 장악이 발생한다. AI agent는 제안을 분석하고, 근거를 제시하며, 위임자를 대신하여 투표함으로써 이 격차를 메울 수 있다 — 단, 참여가 투명하고 책임 추적이 가능할 때에만 가능하다.

### 현재의 문제점

1. **AI agent에 대한 표준 신원이 없다.** 현재 AI agent는 일반 EOA를 통해 거버넌스에 참여하며, 인간 참여자와 구별할 수 없다. 투표자가 AI인지, 누가 운영하는지, 어떤 모델을 사용하는지 알 방법이 없다.

2. **ERC-5805 위임은 AI 특화 제약이 부족하다.** `delegate(address)`는 영구적이고 무조건적이다. AI agent에 대한 위임은 만료(위임이 영구적이어서는 안 됨), 선호도 제약(위임자의 가치관과 위험 허용도), escalation(낮은 확신도의 결정은 agent가 인간에게 위임해야 함)이 필요하다.

3. **근거(rationale) 무결성이 보장되지 않는다.** AI agent는 투표 결과를 관찰한 후 선견지명이 있었던 것처럼 보이는 근거를 소급하여 조작할 수 있다. Commit-reveal 메커니즘 없이는 근거가 독립적으로 형성되었는지 검증할 방법이 없다.

4. **Cross-DAO 평판이 없다.** 한 DAO에서 지속적으로 정확한 예측을 하는 AI agent라 해도 이식 가능한 신뢰도가 없다. 각 DAO는 모든 agent를 백지 상태로 취급하여, 정보에 기반한 위임 결정을 방해한다.

### 지금이 적절한 시기인 이유

- 최근 AI 지원 DAO 거버넌스에 대한 제안들은 거버넌스 결정에서 인간의 선호를 대변하는 AI agent를 구상했다. 이러한 제안은 커뮤니티의 큰 관심을 이끌어냈으나 on-chain interface를 명시하지는 않았다.
- 범용 agent 인프라(ERC-8004, ERC-8118)는 *agent가 누구인지*와 *어떤 함수를 호출할 수 있는지*를 다루지만, *어떻게 거버넌스에 참여해야 하는지*는 다루지 않는다. 거버넌스에는 위임 제약(만료, 선호도, escalation), 근거 무결성(commit-reveal), 도메인 특화 신뢰도(제안 결과에 대한 예측 정확도)가 필요하다.
- AI agent의 identity와 거버넌스를 다루는 여러 ERC가 등장하고 있다: ERC-8126(검증 계층을 갖춘 agent 등록), ERC-7777(로봇/인간 사회 거버넌스), ERC-7662(AI agent NFT). 각각은 문제의 일부분 — identity, 검증, 소유권 — 을 다루지만, 책임 있는 DAO 참여에 필요한 거버넌스 특화 원시 형태(위임 제약, 근거 무결성, 예측 기반 신뢰도)는 제공하지 않는다.
- NEAR Foundation이 AI delegate 투표를 적극적으로 개발하고 있어, cross-chain AI 거버넌스가 임박했음을 시사한다.
- AI agent가 이미 일반 주소를 통해 비공식적으로 거버넌스에 참여하고 있어, 파편화된 접근 방식이 고착되기 전에 표준화가 시급하다.

## Specification

본 문서에서 "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", "OPTIONAL"이라는 핵심 용어는 RFC 2119 및 RFC 8174에 기술된 대로 해석되어야 한다.

네 가지 interface 모두 ERC-165 interface 감지를 구현해야 한다(MUST).

### ERC-165 Interface Identifiers

| Interface | ERC-165 ID |
|-----------|-----------|
| `IAIAgentRegistry` | `0x9b0ef8ea` |
| `IAIDelegation` | `0xaf8fa551` |
| `IRationaleCommitment` | `0xeea8e031` |
| `ICredibilityRegistry` | `0xd37853ac` |

### Core Interface: `IAIAgentRegistry`

AI agent의 on-chain 등록 및 생명주기 관리를 제공한다.

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IERC165} from "./IERC165.sol";

interface IAIAgentRegistry is IERC165 {
    event AgentRegistered(bytes32 indexed agentId, address indexed operator, string metadataURI);
    event AgentUpdated(bytes32 indexed agentId, string metadataURI);
    event AgentDeactivated(bytes32 indexed agentId);

    /// @notice Register an AI agent with metadata URI
    /// @param metadataURI URI pointing to AgentProfile JSON
    /// @return agentId Unique agent identifier
    function registerAgent(string calldata metadataURI) external returns (bytes32 agentId);

    /// @notice Update an existing agent's metadata URI
    function updateAgent(bytes32 agentId, string calldata metadataURI) external;

    /// @notice Deactivate an agent (permanent — no reactivation)
    function deactivateAgent(bytes32 agentId) external;

    /// @notice Get agent metadata URI
    function agentURI(bytes32 agentId) external view returns (string memory);

    /// @notice Get agent operator address
    function agentOperator(bytes32 agentId) external view returns (address);

    /// @notice Check if agent is active
    function isActiveAgent(bytes32 agentId) external view returns (bool);
}
```

**요구 사항:**

- `registerAgent`는 `keccak256(abi.encodePacked(msg.sender, operatorNonce++))`로 도출된 결정론적 `agentId`를 반환해야 한다(MUST). 여기서 `operatorNonce`는 0부터 시작하는 operator별 카운터이다.
- `registerAgent`는 `metadataURI`가 비어 있으면 revert해야 한다(MUST).
- `updateAgent`와 `deactivateAgent`는 agent의 operator가 아닌 주소에서 호출되면 revert해야 한다(MUST).
- `deactivateAgent`는 영구적이다. 구현체는 비활성화된 agent의 재활성화를 허용해서는 안 된다(MUST NOT). 참여를 재개하려는 operator는 새 agent를 등록해야 한다(MUST).
- `agentURI`는 본 ERC에서 정의한 AgentProfile 스키마를 준수하는 JSON 문서를 가리켜야 한다(SHOULD).
- `isActiveAgent`는 등록되지 않은 agent ID에 대해 `false`를 반환해야 한다(MUST).

**ERC-8004와의 상호운용성:**

ERC-8004(Trustless Agents)는 `uint256` agent ID(ERC-721 token ID)를 사용하고, 본 ERC는 `bytes32`를 사용한다. 양쪽 레지스트리를 연결하는 구현체는 `bytes32(uint256(erc8004TokenId))`를 통해 ID를 매핑해야 한다(SHOULD). 이미 agent 신원에 ERC-8004를 사용하는 DAO는 별도의 `IAIAgentRegistry`를 배포하는 대신 ERC-8004 레지스트리를 래핑하는 adapter 컨트랙트를 사용할 수 있다(MAY). `metadataURI`는 ERC-8004의 `agentURI`와 동일한 패턴을 따르며 — 구현체는 두 스키마를 모두 제공하는 단일 URI를 사용할 수 있다(MAY).

### Core Interface: `IAIDelegation`

AI 특화 제약을 갖춘 ERC-5805 위임 개념의 확장이다.

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IERC165} from "./IERC165.sol";
import {IAIAgentRegistry} from "./IAIAgentRegistry.sol";

interface IAIDelegation is IERC165 {
    event AIDelegationCreated(
        address indexed delegator,
        bytes32 indexed agentId,
        bytes32 delegationId,
        uint256 expiry
    );
    event AIDelegationRevoked(bytes32 indexed delegationId);
    event Escalated(bytes32 indexed delegationId, uint256 indexed proposalId, string reasonURI);

    /// @notice Get the registry contract
    function registry() external view returns (IAIAgentRegistry);

    /// @notice Delegate voting power to an AI agent with constraints
    /// @param agentId Registered agent from IAIAgentRegistry
    /// @param expiry Delegation expiry timestamp (MUST be > block.timestamp)
    /// @param preferencesURI URI to DelegationPreferences JSON
    function delegateToAgent(
        bytes32 agentId,
        uint256 expiry,
        string calldata preferencesURI
    ) external returns (bytes32 delegationId);

    /// @notice Revoke an active delegation
    function revokeDelegation(bytes32 delegationId) external;

    /// @notice Get active delegation for an account
    function getAIDelegation(address account) external view returns (
        bytes32 delegationId,
        bytes32 agentId,
        uint256 expiry,
        string memory preferencesURI
    );

    /// @notice Agent escalates a decision to the human delegator for a specific proposal
    /// @param reasonURI URI to a JSON document explaining the escalation
    function escalate(bytes32 delegationId, uint256 proposalId, string calldata reasonURI) external;
}
```

**요구 사항:**

- `delegateToAgent`는 agent가 `IAIAgentRegistry`에서 활성 상태가 아니면 revert해야 한다(MUST).
- `delegateToAgent`는 `expiry <= block.timestamp`이면 revert해야 한다(MUST).
- `delegateToAgent`는 계정당 최대 하나의 활성 위임만 허용해야 한다(MUST). 계정에 이미 활성 위임이 있는 경우, 구현체는 새 위임을 생성하기 전에 자동으로 기존 위임을 취소해야 한다(MUST).
- `revokeDelegation`은 원래 delegator가 아닌 주소에서 호출되면 revert해야 한다(MUST).
- `getAIDelegation`은 위임이 만료되었거나 취소된 경우 모든 필드에 대해 zero 값을 반환해야 한다(MUST).
- `escalate`는 `IAIAgentRegistry`에 등록된 agent의 operator만 호출할 수 있어야 한다(MUST).
- `escalate`는 제안별로 작동한다: agent가 지정된 `proposalId`에 대한 투표를 거부하고 해당 결정을 delegator에게 반환함을 의미한다. Escalation은 이전에 행사된 투표를 취소하지 않으며(NOT) 위임 자체에 영향을 미치지 않는다(NOT).
- `escalate`는 `Escalated` event를 emit해야 한다(MUST).
- `preferencesURI`는 참고용(advisory)이다. On-chain 컨트랙트는 선호도 제약을 강제하지 않으며 — 강제는 off-chain agent 시스템의 책임이다. URI는 delegator가 명시한 의도의 검증 가능한 기록을 제공한다.

**Proposal ID 호환성:**

`escalate`의 `proposalId` 파라미터는 `uint256`이며, 이는 ERC-5805 및 OpenZeppelin Governor에서 사용하는 관례와 일치한다. `uint256`이 아닌 제안 식별자(예: `bytes32` 또는 순차 정수)를 사용하는 거버넌스 시스템은 `uint256`으로의 결정론적 매핑을 정의해야 한다(SHOULD) — 예: `uint256(keccak256(abi.encode(nativeId)))`.

### Extension Interface: `IRationaleCommitment`

AI agent 근거에 대한 commit-reveal 방식을 구현한다. 이 extension은 OPTIONAL이다 — 구현체는 추가적인 투명성을 위해 core interface와 함께 배포할 수 있다(MAY).

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IERC165} from "./IERC165.sol";
import {IAIAgentRegistry} from "./IAIAgentRegistry.sol";

interface IRationaleCommitment is IERC165 {
    event RationaleCommitted(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        bytes32 commitHash,
        uint256 timestamp
    );
    event RationaleRevealed(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        string rationaleURI
    );

    /// @notice Get the registry contract
    function registry() external view returns (IAIAgentRegistry);

    /// @notice Commit rationale hash before voting ends
    /// @param commitHash keccak256(abi.encodePacked(rationaleURI, salt))
    function commitRationale(
        bytes32 agentId,
        uint256 proposalId,
        bytes32 commitHash
    ) external;

    /// @notice Reveal rationale after voting ends
    function revealRationale(
        bytes32 agentId,
        uint256 proposalId,
        string calldata rationaleURI,
        bytes32 salt
    ) external;

    /// @notice Get commitment for an agent-proposal pair
    function getCommitment(bytes32 agentId, uint256 proposalId)
        external view returns (bytes32 commitHash, uint256 timestamp);

    /// @notice Check if a rationale has been revealed
    function isRevealed(bytes32 agentId, uint256 proposalId) external view returns (bool);
}
```

**요구 사항:**

- `commitRationale`은 agent의 operator만 호출할 수 있어야 한다(MUST).
- `commitRationale`은 동일한 (agentId, proposalId) 쌍에 대해 이미 commitment가 존재하면 revert해야 한다(MUST).
- `revealRationale`은 `keccak256(abi.encodePacked(rationaleURI, salt))`가 커밋된 hash와 일치하는지 검증해야 한다(MUST).
- `revealRationale`은 commitment가 존재하지 않거나 근거가 이미 공개된 경우 revert해야 한다(MUST).
- 구현체는 commitment가 제안의 투표 기간 종료 전에 이루어지고, 공개(reveal)는 종료 후에 이루어지도록 강제해야 한다(MUST). 구체적인 강제 메커니즘(예: `IGovernor.state()` 확인, deadline 파라미터 사용)은 구현에 맡긴다.

### Extension Interface: `ICredibilityRegistry`

DAO 간 AI agent 예측 정확도를 추적한다. 이 extension은 OPTIONAL이다 — 구현체는 cross-DAO 평판 추적을 위해 배포할 수 있다(MAY).

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {IERC165} from "./IERC165.sol";
import {IAIAgentRegistry} from "./IAIAgentRegistry.sol";

interface ICredibilityRegistry is IERC165 {
    event PredictionRecorded(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        uint8 verdict,
        uint8 score
    );
    event PredictionResolved(
        bytes32 indexed agentId,
        uint256 indexed proposalId,
        int8 delta
    );

    /// @notice Get the registry contract
    function registry() external view returns (IAIAgentRegistry);

    /// @notice Get the resolver address
    function resolver() external view returns (address);

    /// @notice Record agent's prediction for a proposal
    /// @param verdict Application-defined verdict value
    /// @param score Confidence score 0-100
    function recordPrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 verdict,
        uint8 score
    ) external;

    /// @notice Resolve prediction against actual outcome
    /// @dev MUST only be callable by a designated resolver, NOT the agent operator
    /// @param actualOutcome Binary outcome: 0=negative, 1=positive
    function resolvePrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 actualOutcome
    ) external;

    /// @notice Get agent's cumulative credibility
    function getCredibility(bytes32 agentId)
        external view returns (int256 totalScore, uint256 totalPredictions);

    /// @notice Get a specific prediction record
    function getPrediction(bytes32 agentId, uint256 proposalId)
        external view returns (uint8 verdict, uint8 score, bool resolved, int8 delta);
}
```

**요구 사항:**

- `recordPrediction`은 agent의 operator만 호출할 수 있어야 한다(MUST).
- `recordPrediction`은 `score > 100`이면 revert해야 한다(MUST).
- `recordPrediction`은 동일한 (agentId, proposalId) 쌍에 대해 이미 예측이 존재하면 revert해야 한다(MUST).
- `resolvePrediction`은 지정된 resolver만 호출할 수 있어야 하며, agent의 operator는 호출할 수 없다(MUST NOT). 이 분리는 agent가 유리한 결과를 자체 보고하는 것을 방지한다.
- `resolvePrediction`은 이진 해결 모델을 사용한다: `actualOutcome`은 반드시 0(부정적 — 제안 부결/취소/만료) 또는 1(긍정적 — 제안 가결/실행)이어야 한다(MUST). 1보다 큰 값은 revert를 유발해야 한다(MUST).
- `getCredibility`는 모든 해결된 예측에 대한 누적 점수를 반환해야 한다(MUST).

**행동적 속성 (SHOULD):**

구현체는 신뢰도 delta 계산에 대해 다음 행동적 속성을 충족해야 한다(SHOULD):

- 높은 확신도의 정확한 예측은 낮은 확신도의 정확한 예측보다 더 큰 보상을 제공해야 한다(SHOULD).
- 높은 확신도의 부정확한 예측은 낮은 확신도의 부정확한 예측보다 더 큰 패널티를 부과해야 한다(SHOULD).

이러한 속성은 agent가 정직한 확신도를 표현하도록 인센티브를 부여한다. 참조 구현체는 이러한 속성을 충족하는 설정 가능한 delta 매트릭스를 제공한다.

**Verdict 인코딩 (RECOMMENDED):**

Verdict 값은 애플리케이션에서 정의하는 `uint8`이다. Governor 관례를 따르는 구현체는 `0=Against`, `1=For`, `2=Abstain`을 사용해야 한다(SHOULD). 이는 `IGovernor.VoteType`과 일치한다. 구현체는 더 풍부한 의미를 위해 추가 verdict 값을 정의할 수 있다(MAY).

### Off-Chain 메타데이터 스키마

다음 JSON 스키마는 on-chain URI가 참조하는 off-chain 데이터를 정의한다. 이는 ERC-4824의 `daoURI`가 확립한 패턴을 따른다.

구현체는 이 스키마를 준수해야 한다(SHOULD). 구현체는 추가 필드로 스키마를 확장할 수 있다(MAY). 모든 스키마는 향후 호환성을 위한 `version` 필드를 포함한다.

#### AgentProfile JSON

`IAIAgentRegistry.agentURI()`에서 참조됨.

```json
{
  "type": "object",
  "required": ["version", "name", "model", "operator"],
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Schema version"
    },
    "name": {
      "type": "string",
      "description": "Human-readable agent name"
    },
    "model": {
      "type": "string",
      "description": "LLM model identifier (e.g., 'gpt-5.2', 'claude-opus-4')"
    },
    "operator": {
      "type": "string",
      "description": "Organization or individual operating this agent"
    },
    "description": {
      "type": "string",
      "description": "Human-readable description of the agent's purpose and methodology"
    }
  }
}
```

#### DelegationPreferences JSON

`IAIDelegation.delegateToAgent()`의 `preferencesURI`에서 참조됨.

```json
{
  "type": "object",
  "required": ["version", "riskTolerance"],
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Schema version"
    },
    "riskTolerance": {
      "type": "string",
      "enum": ["conservative", "moderate", "aggressive"]
    },
    "escalation": {
      "type": "object",
      "properties": {
        "confidenceThreshold": {
          "type": "number",
          "description": "Score below which the agent should escalate to the human"
        },
        "alwaysEscalateFor": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Proposal categories that always require human approval"
        }
      }
    },
    "principles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Natural language principles guiding the agent's decisions"
    }
  }
}
```

#### Rationale JSON

`IRationaleCommitment.revealRationale()`의 `rationaleURI`에서 참조됨.

```json
{
  "type": "object",
  "required": ["version", "proposalId", "verdict"],
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Schema version"
    },
    "proposalId": { "type": "string" },
    "verdict": {
      "type": "string",
      "description": "The agent's verdict. Values are application-defined."
    },
    "reasoning": {
      "type": "string",
      "description": "Human-readable explanation of the agent's decision"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Confidence score for this evaluation"
    },
    "evidence": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Supporting evidence or references"
    }
  }
}
```

## Rationale

### On-chain 등록을 off-chain 신원 대신 사용하는 이유

On-chain 등록은 불변의 감사 추적, 동기적 결합성(위임 및 신뢰도 컨트랙트가 프로그래밍적으로 agent 존재 여부를 확인할 수 있음), 그리고 operator 주소를 통한 명확한 책임 추적을 제공한다. Off-chain 신원 시스템(DID, ENS)은 보완적이지만 단독으로는 불충분하다.

### ERC-5805를 직접 확장하지 않는 이유

ERC-5805의 `delegate(address)`는 만료, 선호도, escalation을 표현할 수 없다. 기존 Governor 컨트랙트를 깨뜨리지 않기 위해 `IAIDelegation`을 별도의 interface로 정의한다. 구현체는 두 가지를 연결할 수 있다: `delegateToAgent()`는 내부적으로 operator 주소를 delegatee로 사용하여 `IVotes.delegate()`를 호출할 수 있다.

### Core + Extension 아키텍처를 사용하는 이유

Agent 신원과 위임은 AI agent를 통합하는 모든 DAO에 기본적으로 필요하다. Commit-reveal과 신뢰도는 유용하지만 보편적으로 필요하지는 않다. 이 분리는 ERC-20(core) + ERC-2612(permit extension)의 패턴을 따르며 점진적 도입을 가능하게 한다.

### `escalate()`가 강제적이지 않고 자문적인 이유

`escalate()` 함수는 투명성 도구이지 강제 메커니즘이 아니다. Agent가 escalate하면, 특정 제안에 대한 투표를 거부한다는 on-chain event를 발생시키지만, 프로토콜이나 컨트랙트 어디에서도 delegator가 escalation에 따라 행동하도록 강제하지 않는다. 악의적 agent는 자신의 escalation 임계값을 무시하고 그냥 투표할 수 있다. 이는 의도된 설계이다: 컨트랙트 수준에서 escalation을 강제하려면 위임 컨트랙트가 `Governor.castVote()` 호출을 가로채야 하며, 이는 기존 Governor와의 조합 가능성이라는 목표에 반하는 복잡성과 결합을 추가한다. 대신, escalation은 공개적이고 감사 가능한 기록을 생성한다. Off-chain 모니터링 시스템과 delegator는 escalation 패턴을 관찰하고, 명시된 선호도가 요구할 때 일관되게 escalate하지 않는 agent로부터 위임을 철회할 수 있다. `preferencesURI`는 이러한 사회적 책임 추적의 근거를 제공한다.

### 근거에 commit-reveal을 사용하는 이유

Commit-reveal 없이는 agent가 투표 결과를 기다린 후 일치하는 근거를 생성하여 거짓 신뢰도를 구축할 수 있다. Commit-reveal 패턴은 결과가 알려지기 전에 근거 hash를 요구함으로써 이를 방지한다. Salt는 hash에 대한 레인보우 테이블 공격을 방지한다.

### 고정 delta 매트릭스 대신 행동적 속성을 사용하는 이유

성공적인 ERC는 *무엇*(interface)을 정의하지 *어떻게*(알고리즘)를 정의하지 않는다. ERC-4626이 수익 공식을 규정하지 않고 반올림 방향을 지정하듯이, 본 ERC는 구체적인 값을 규정하지 않고 신뢰도 delta의 행동적 속성을 지정한다.

### 별도의 resolver 역할을 두는 이유

Agent의 operator가 예측 기록과 결과 해결을 모두 할 수 있다면, 점수를 간단히 조작할 수 있다. Resolver 분리는 oracle 패턴을 따른다 — 진실을 결정하는 주체는 평가 대상 주체와 독립적이어야 한다.

### `bytes32` agent ID를 사용하는 이유

- **결정론적**: `keccak256(operator, nonce)`로 오프라인 ID 계산이 가능하다.
- **충돌 방지**: 256비트 공간으로 ID 충돌을 제거한다.
- **관심사 분리**: Agent ID가 operator 주소와 구별되어 다중 agent operator를 지원한다.

### `string reason` 대신 `reasonURI`를 사용하는 이유

ERC-4824 패턴을 따라, escalation 사유는 on-chain에 저장하는 대신 URI를 통해 참조된다. 이는 가스 비용을 절감하며(URI는 일반적으로 약 50바이트인 반면 설명은 수 킬로바이트에 달할 수 있음) 풍부한 off-chain 콘텐츠를 가능하게 한다.

## Backwards Compatibility

### ERC-5805 (Voting with Delegation)

본 ERC는 ERC-5805를 대체하는 것이 아니라 보완한다. 구현체는 `delegateToAgent()`가 호출될 때 내부적으로 `IVotes.delegate()`를 호출하여 AI 위임을 기존 Governor 컨트랙트에 연결할 수 있다. Agent의 operator 주소가 `IVotes` delegatee 역할을 하여, Governor 컨트랙트를 수정하지 않고도 agent가 표준 Governor 흐름을 통해 투표할 수 있다.

### ERC-4824 (Common Interfaces for DAOs)

본 ERC는 ERC-4824가 확립한 URI 패턴을 따른다: `agentURI`는 `daoURI`와 동일한 모델을 따르고, off-chain 메타데이터 스키마는 ERC-4824 관례를 따르는 JSON을 사용하며, `escalate()`의 `reasonURI`는 동일한 콘텐츠 주소 지정 URI 패턴을 따른다.

### ERC-1202 (Voting Interface)

`ICredibilityRegistry`는 투표 interface를 수정하지 않지만 투명성 계층을 추가한다 — AI agent의 예측은 투표와 함께 기록되며, 해결 후 누구나 agent의 근거가 결과와 일치했는지 검증할 수 있다.

### ERC-5732 (Commit Interface)

`IRationaleCommitment`는 ERC-5732에서 정의한 범용 `commit(bytes32)` 패턴을 거버넌스 특화 의미론으로 확장한다. ERC-5732가 단일 `bytes32` 해시만을 가진 범용 commit-reveal 원시 형태(어플리케이션 컨텍스트 없음)를 제공하는 반면, 본 ERC는 각 commitment를 `agentId`와 `proposalId`에 바인딩하고, salt 검증이 포함된 URI 기반 reveal을 추가하며, agent의 operator만 commit할 수 있도록 강제한다. 이미 범용 commitment에 ERC-5732를 사용하는 구현체와 공존 가능하다 — `IRationaleCommitment`는 별도의 `(agentId, proposalId)` 키 공간에서 동작한다. ERC-5732는 설계상 선행 표준이지 의존성이 아니다: `IRationaleCommitment`는 ERC-5732의 interface를 상속하거나 import하지 않는다.

### ERC-8004 (Trustless Agents)

본 ERC는 ERC-8004를 보완한다. ERC-8004는 범용 agent 신원(ERC-721 기반 등록)과 범용 평판(자유 형식 피드백)을 제공한다. 본 ERC는 거버넌스 특화 행동을 추가한다: 위임 제약, 근거 무결성, 예측 기반 신뢰도. ERC-8004 agent는 ID 매핑 `bytes32(uint256(erc8004TokenId))`을 통해 `IAIAgentRegistry`에도 등록될 수 있다. `ICredibilityRegistry` 점수는 구조화된 피드백으로 ERC-8004 평판 레지스트리에 보고될 수 있다.

### ERC-8126 (AI Agent Registration)

ERC-8126은 AI agent 등록을 위한 다층 검증 프레임워크를 정의하며, on-chain 스테이킹, 모델 무결성의 영지식 증명, 위험 점수 산정을 agent 승인 전에 요구한다. 본 ERC는 의도적으로 최소주의적 접근을 취한다: `IAIAgentRegistry`는 on-chain에 `metadataURI`만 저장하고 검증은 off-chain 또는 사회적 계층에 위임한다. 두 설계는 서로 다른 신뢰 가정을 반영한다 — ERC-8126은 모든 agent가 참여 전에 안전 속성을 증명해야 하는 고보안 환경을 대상으로 하고, 본 ERC는 투명한 메타데이터와 함께 허가 없는 등록이 더 넓은 참여를 가능하게 하는 개방형 거버넌스 생태계를 대상으로 한다. 두 접근은 조합 가능하다: ERC-8126 검증 점수는 `agentURI`가 참조하는 AgentProfile JSON에 포함될 수 있어, delegator가 agent를 선택할 때 검증 상태를 고려할 수 있다.

### ERC-7777 (Human-Robot Society Governance)

ERC-7777은 물리적 로봇(하드웨어 보안 요소 포함)과 AI agent를 모두 포함하는 사회의 거버넌스를 다루며, 규칙 기반 거버넌스를 위한 `IUniversalCharter`와 하드웨어 증명 요구사항을 정의한다. 본 ERC는 더 좁은 영역에 집중한다: DAO 토큰 투표에 참여하는 소프트웨어 AI agent. ERC-7777의 헌장 기반 거버넌스가 프로토콜 수준에서 강제되는 행동 규칙을 규정하는 반면, 본 ERC의 `preferencesURI`는 off-chain agent 시스템이 해석하는 참고 지침으로서 delegator의 의도를 포착한다. 두 범위는 대부분 겹치지 않는다 — ERC-7777은 광범위한 인간-로봇 사회 계약을 다루고, 본 ERC는 AI 지원 DAO 투표의 구체적 메커니즘(위임, 근거 무결성, 신뢰도)을 다룬다.

### ERC-7662 (AI Agent NFTs)

ERC-7662는 AI agent를 ERC-721 NFT로 표현하여 소유권 이전, 마켓플레이스 거래, 기존 NFT 인프라와의 조합 가능성을 제공한다. 본 ERC는 설계상 양도 불가능한 `bytes32` agent ID를 사용한다. 거버넌스 agent의 경우 양도 가능성은 바람직하지 않다: agent의 identity가 매매될 수 있으면, delegator와 특정 agent(알려진 operator, 모델, 실적을 가진) 간의 신뢰 관계가 은밀히 파괴될 수 있다. `IAIAgentRegistry`의 `deactivateAgent` → `registerAgent` 패턴은 operator 관계가 변경될 때 의도적으로 신뢰도를 초기화한다. 두 표준을 함께 사용하는 생태계에서는 `bytes32(uint256(tokenId))`를 통해 ID 공간을 연결할 수 있고, ERC-7662의 NFT metadata는 `agentURI`에서 사용하는 것과 동일한 AgentProfile JSON을 참조할 수 있다.

### ERC-8118 (Agent Authorization)

ERC-8118은 기계적 권한 부여(함수 범위, 호출 횟수, 시간 제한)를 제공한다. 본 ERC는 의미적 위임(거버넌스 선호도, escalation 정책)을 제공한다. 두 표준은 상호 보완적이다: ERC-8118이 agent에게 거버넌스 함수 호출을 승인하고, `IAIDelegation`은 해당 함수를 어떻게 사용해야 하는지에 대한 delegator의 의도를 포착한다.

### ERC-7710 (Smart Contract Delegation)

ERC-7710은 하나의 컨트랙트가 임의의 함수 호출을 다른 컨트랙트에 위임할 수 있는 범용 위임 프레임워크를 제공하며, 실행 계층에서 caveat(제한)이 적용된다. 이는 기계적 수준에서 동작한다: "컨트랙트 A가 caveat C 하에서 컨트랙트 B의 함수 F를 호출할 수 있다." `IAIDelegation`은 의미적 수준에서 동작한다: "agent X가 선호도 P에 따라, escalation 정책 E와 함께 delegator Y를 대신하여 투표할 수 있다." ERC-7710은 선호도 정렬, escalation 트리거, 거버넌스 주기에 연동된 위임 만료와 같은 거버넌스 특화 개념을 포착하지 않는다. 두 표준은 조합 가능하다: ERC-7710이 실행 계층 역할을 하여(agent의 smart account가 `Governor.castVote`를 호출하도록 승인) `IAIDelegation`이 agent의 off-chain 시스템이 해당 승인을 행사하기 전에 참조하는 거버넌스 의도 계층을 제공한다.

### ERC-7579 (Modular Smart Accounts)

본 ERC의 interface는 ERC-7579 모듈로 구현될 수 있다: Validator(투표가 위임 선호도에 부합하는지 검증), Executor(계정 소유자를 대신하여 거버넌스 액션 실행), Hook(사전/사후 실행 감사 로깅).

## Test Cases

참조 구현체는 6개 테스트 스위트에 걸쳐 98개의 테스트를 포함한다.

### 통합 테스트 시나리오

**1. 전체 생명주기 (`test_fullLifecycle_registerDelegateCommitVoteRevealResolve`):**
Operator가 AI agent를 등록하고, delegator가 AI 위임을 생성하여 IVotes를 operator에게 연결하고, Governor 제안이 생성되며, agent가 근거 hash를 커밋하고 예측을 기록하며(For, 85% 확신도), operator가 Governor에서 For로 투표하고, 제안이 가결되며, agent가 근거를 공개하고(hash 검증), resolver가 긍정적 결과를 표시하여 +3 신뢰도 delta(높은 확신도 정확)가 된다.

**2. Escalation 경로 (`test_escalationPath_agentDefersToHuman`):**
Delegator가 자신의 IVotes를 유지하면서 AI 위임을 생성한다(자문 전용 패턴). Agent가 논쟁적인 제안을 만나면, 사유 URI와 함께 `Escalated` event를 통해 escalate한다. Delegator는 자신의 투표력으로 직접 투표하고, 제안이 가결된다.

**3. 위임 만료 (`test_delegationExpiry_automaticInvalidation`):**
짧은 만료 기간으로 위임이 생성된다. 만료 타임스탬프가 지나면 `getAIDelegation()`은 zero 값을 반환한다. 새로운 위임을 즉시 생성할 수 있다.

**4. 다중 Agent (`test_multiAgent_twoAgentsSameProposal`):**
서로 다른 operator가 운영하는 두 agent가 같은 제안에 대해 독립적인 예측을 한다 — 하나는 For(높은 확신도), 다른 하나는 Against(낮은 확신도)를 예측한다. 긍정적 해결 후, 첫 번째 agent는 +3(정확), 두 번째는 -1(오답)을 받아 독립적 신뢰도 추적을 보여준다.

**5. 신뢰도 누적 (`test_credibilityAccumulation_acrossMultipleProposals`):**
Agent가 다양한 확신도와 정확성으로 세 가지 제안에 대해 예측한다: 높은 확신도 정확(+3), 낮은 확신도 정확(+1), 높은 확신도 오답(-2). 누적 점수 +2와 총 3개 예측이 검증된다.

**6. Agent 비활성화 (`test_agentDeactivation_preventsNewDelegations`):**
비활성화 후, 세 개의 종속 컨트랙트(`AIDelegation`, `RationaleCommitment`, `CredibilityRegistry`)가 비활성화된 agent에 대한 작업을 거부하여, 레지스트리가 agent 생명주기의 단일 진실 원천임을 보여준다.

### Governor Bridge 테스트 시나리오

**7. 투표력 이전 및 복원 (`test_delegateBridge_votingPowerTransferAndRestore`):**
Delegator가 `GovernorAIDelegation`을 통해 AI 위임을 생성하고(이전 IVotes delegatee 기록), IVotes를 operator에게 위임하고, operator가 Governor에서 투표하며, 취소 후 delegator가 원래 위임을 복원한다.

**8. 자동 신뢰도 해결 (`test_governorResolver_succeededProposal`, `test_governorResolver_defeatedProposal`):**
`GovernorResolver`가 `IGovernor.state()`를 읽어 Succeeded 제안은 긍정적 결과(1)로, Defeated 제안은 부정적 결과(0)로 매핑하고, 이에 따라 신뢰도 예측을 해결한다.

**9. 미확정 제안 Revert (`test_governorResolver_revertsOnActiveProposal`):**
`GovernorResolver`가 Active 상태의 제안에 대해 호출되면 `ProposalNotFinalized`로 revert하여 조기 해결을 방지한다.

## Reference Implementation

참조 구현체가 `../assets/eip-XXXX/` 디렉토리에 제공된다. 핵심 컨트랙트는 다음과 같다:

- `AIAgentRegistry.sol` — 결정론적 ID와 ERC-165 지원을 갖춘 agent 등록
- `AIDelegation.sol` — 만료, 자동 취소, escalation, ERC-165 지원을 갖춘 위임
- `RationaleCommitment.sol` — Hash 검증과 ERC-165 지원을 갖춘 commit-reveal
- `CredibilityRegistry.sol` — 설정 가능한 delta 계산, resolver 역할 분리, ERC-165 지원을 갖춘 예측 기록

`CredibilityRegistry` 참조 구현체는 다음 생성자 파라미터를 받는다:
- **Delta 값**: 설정 가능한 `[highConfCorrect, lowConfCorrect, highConfWrong, lowConfWrong]` (기본값: `[+3, +1, -2, -1]`)
- **확신도 임계값**: 높은/낮은 확신도를 구분하는 `uint8` 점수 값 (기본값: 70)
- **Verdict 임계값**: 예측이 "긍정적 방향"으로 간주되는 verdict 값 (기본값: 1, Governor의 `For`에 해당)
- **Resolver 주소**: 예측 해결 권한이 있는 독립 주소

### Deployment Guide

도입하는 DAO는 세 단계로 점진적 배포할 수 있다:

**1단계 — Core (필수):**

1. `AIAgentRegistry`를 배포한다. 생성자 파라미터 불필요.
2. Registry 주소와 함께 `AIDelegation`을 배포한다. 이제 각 delegator는 만료 및 선호도를 갖춘 등록된 AI agent에게 위임할 수 있다.

**2단계 — Extensions (선택):**

3. Registry 주소와 함께 `RationaleCommitment`를 배포한다. 이제 agent는 근거를 commit-reveal할 수 있다.
4. Resolver 전략을 선택한 후(아래 참조), registry 주소, resolver 주소, delta 설정과 함께 `CredibilityRegistry`를 배포한다.

**Resolver 전략:**

| 전략 | 설명 | 신뢰 모델 |
|----------|-------------|-------------|
| Governance multisig | 신뢰 위원회에 의한 수동 해결 | 최고 신뢰, 최저 자동화 |
| Timelock + challenge | 분쟁 기간을 갖춘 자동화 | 중간 신뢰 |
| `GovernorResolver` (예시) | On-chain에서 `IGovernor.state()` 조회 | Governor 기반 DAO에서 trustless |
| Off-chain oracle | 외부 서비스가 결과 보고 | Oracle 신뢰 필요 |

**3단계 — Governor Bridge (선택):**

5. OpenZeppelin Governor(또는 호환 구현)를 사용하는 DAO의 경우, `AIDelegation` 대신 `GovernorAIDelegation`을 배포한다. 이는 취소 시 복원을 위해 delegator의 이전 `IVotes` delegatee를 기록한다.
6. Governor 주소와 함께 `GovernorResolver`를 배포한다. 자동 결과 해결을 위해 `GovernorResolver` 주소를 `CredibilityRegistry`의 `resolver`로 전달한다.

**Off-chain 통합 패턴:**

```
Proposal Monitor → AI Agent Evaluates → commitRationale() → castVote()
                                       → recordPrediction()
                → Voting Ends         → revealRationale()
                → Proposal Finalized  → resolvePrediction() (via resolver)
```

### 참고 예제: Governor Bridge

`examples/` 디렉토리에는 본 ERC를 OpenZeppelin Governor와 연결하는 방법을 보여주는 두 개의 참고용(비규범적) 컨트랙트가 있다:

**`GovernorAIDelegation.sol`** — `IVotes` 위임 상태를 기록하도록 `AIDelegation`을 확장:
- `delegateToAgent()` 시: delegator의 현재 `IVotes` delegatee를 저장하고, `GovernorDelegationAdvised` event를 emit
- `revokeDelegation()` 시: 이전 delegatee와 함께 `GovernorDelegationRestoreAdvised`를 emit
- Delegator는 외부에서 `token.delegate(operator)`를 수행 (`IVotes`의 `msg.sender` 제약 필요)

**`GovernorResolver.sol`** — Governor 상태를 이용한 자동 신뢰도 해결:
- `IGovernor.state()`를 조회하여 제안 결과 판별
- Succeeded/Executed를 긍정(1)으로, Defeated/Canceled/Expired를 부정(0)으로 매핑
- 확정되지 않은 제안(Pending, Active, Queued)에 대해서는 revert
- 결과가 결정론적이므로 누구나 `resolve()`를 호출할 수 있음

## Security Considerations

### Agent 공모

동일한 주체가 운영하는 복수의 AI agent가 신뢰도 점수나 투표 결과를 조작하기 위해 공모할 수 있다. `IAIAgentRegistry`의 `operator` 필드는 공개적으로 확인 가능하여, delegator가 동일 operator의 agent를 식별할 수 있다. 거버넌스 프레임워크는 operator 다양성에 따른 신뢰도 가중치 부여와 AI 위임 투표의 최대 투표력 상한 설정을 고려해야 한다.

### Sybil 공격 방어

공격자가 영향력 증폭이나 신뢰도 조작을 위해 다수의 agent를 등록할 수 있다. `registerAgent`가 무허가(permissionless)이므로, 구현체는 sybil 공격을 제한하기 위해 경제적 또는 사회적 메커니즘에 의존해야 한다:
- Agent 생성 시 최소 스테이킹 또는 등록 수수료를 요구한다.
- 등록 operator의 on-chain 이력에 따라 위임 또는 신뢰도 점수에 가중치를 부여한다.
- Delegator는 점수만이 아닌 `totalPredictions` 볼륨을 기준으로 agent를 평가해야 한다 — 최소 예측 횟수(예: 10회) 미만의 agent는 신뢰할 수 있는 것으로 간주되어서는 안 된다.
- Operator 다양성에 따른 신뢰도 가중치 부여: 동일 operator가 여러 agent를 운영하는 경우, 이들의 결합된 영향력은 할인되어야 한다. 거버넌스 프론트엔드는 operator 집중도를 위험 지표로 표시해야 한다.
- 구현체는 동일 operator의 연속적인 agent 등록 사이에 쿨다운 기간을 부과하여 신속한 sybil 생성을 제한할 수 있다.

### Oracle 조작 (Resolver 손상)

`ICredibilityRegistry.resolvePrediction()`은 지정된 resolver 주소를 요구한다. Resolver가 손상되면 신뢰도 점수는 무의미해진다. Resolver는 agent operator와 분리되어야 한다(interface 수준에서 강제). 구현체는 해결을 위해 신뢰할 수 있는 oracle, governance multisig, 또는 on-chain 제안 상태(예: `IGovernor.state()`)를 사용해야 한다. 고위험 DAO에는 이의 제기 기간이 포함된 지연 해결이 권장된다.

### 자체 해결 방지

Agent operator는 자신의 예측을 해결할 수 없어야 한다. `ICredibilityRegistry` 사양은 `resolvePrediction`이 지정된 resolver만 호출할 수 있도록 요구한다. 이는 agent가 유리한 결과를 보고하여 신뢰도를 부풀리는 것을 방지한다.

### Commit-Reveal Front-Running

Mempool에서 `commitRationale` 트랜잭션을 관찰하는 마이너 또는 MEV 탐색자가 `commitHash`를 추출하여 동일한 commitment로 front-run할 수 있다. 이는 방식의 무결성을 손상시키지 않지만(front-runner는 원상(preimage)을 모름), `AlreadyCommitted` 가드로 인해 정당한 트랜잭션이 revert될 수 있다. 구현체는 private mempool(예: Flashbots Protect) 사용이나, agent-operator별로 고유한 `(agentId, proposalId)` 키 기반 commitment으로 이를 완화할 수 있다.

### URI 길이를 이용한 가스 공격

`metadataURI`, `preferencesURI`, `rationaleURI`는 on-chain에 `string`으로 저장된다. 공격자가 과도하게 긴 URI를 전달하여 과도한 가스나 스토리지를 소비할 수 있다. 구현체는 최대 URI 길이(예: 2048바이트)를 부과하고 초과 시 revert해야 한다.

### 메타데이터 무결성

`agentURI`, `preferencesURI`, `rationaleURI`는 on-chain 참조가 설정된 후 수정될 수 있는 off-chain 데이터를 가리킨다. 변경 가능한 HTTP URI보다 콘텐츠 주소 지정 URI(IPFS, Arweave)가 권장된다. `IRationaleCommitment`의 commit-reveal은 근거 콘텐츠가 커밋 시점에 고정되도록 보장한다. 구현체는 URI와 함께 콘텐츠 hash를 on-chain에 저장할 수 있다.

### 프라이버시 고려사항

Agent 근거는 독점적 분석 방법을 노출할 수 있다. Commit-reveal 패턴은 투표 종료 후까지 전체 공개를 지연시킨다. Agent는 내부 추론 과정을 근거 JSON에서 생략하고 판결과 증거 요약만 포함할 수 있다. 또한 `Escalated` event는 공개적으로 보인다 — agent가 escalate했다는 사실(그리고 어떤 제안에 대해)은 on-chain에 기록된다. Delegator는 escalation 패턴이 agent의 결정 경계나 delegator의 거버넌스 선호도를 드러낼 수 있음을 인지해야 한다.

### 신뢰도 게이밍

Agent는 결과가 예측 가능한 제안에만 선택적으로 예측을 제출하여 신뢰도를 부풀릴 수 있다. 구현체는 선택적이 아닌 DAO의 모든 제안에 대한 예측을 요구해야 한다. `getCredibility()`의 `totalPredictions` 카운터는 delegator가 점수와 함께 볼륨을 평가할 수 있게 한다. 신뢰도가 의미 있는 것으로 간주되기 전에 최소 예측 횟수가 요구되어야 한다.

### 위임 만료 엣지 케이스

활성 투표 기간 중에 위임이 만료되면, agent가 이미 투표했을 수 있다. 구현체는 위임 시점뿐만 아니라 투표 시점에도 위임 유효성을 확인해야 한다. `escalate()` 함수는 경계 사례에 대한 안전 장치를 제공한다.

### 경제적 실행 가능성

`ICredibilityRegistry` 작업(`recordPrediction`, `resolvePrediction`)은 각각 약 80,000–120,000 gas를 소비한다. 50개 활성 agent가 월 12개 제안을 평가하는 생태계에서, Ethereum L1의 신뢰도 작업 비용만으로도 일반적인 가스 가격 기준 월 $200,000 USD를 초과할 수 있다. L1을 대상으로 하는 구현체는 일괄 해결 패턴(batch resolution) — 동일 제안에 대해 여러 agent를 한 번의 `resolvePrediction` 호출로 해결하는 방식 — 을 고려해야 한다. 활성 생태계에서는 신뢰도 및 근거 컨트랙트를 L2(가스 비용이 수 자릿수 더 낮음)에 배포하는 것을 강력히 권장한다. Core interface(`IAIAgentRegistry`, `IAIDelegation`)는 기존 Governor 컨트랙트와의 최대 조합 가능성을 위해 L1에 유지하고, extension은 cross-chain 메시지 전달을 통한 해결과 함께 L2에 배포할 수 있다.

### AI Agent 자율성 위험

거버넌스 제안을 평가하는 AI agent는 제안 자체를 통한 적대적 조작에 취약하다:

- **제안 텍스트를 통한 prompt injection**: 악의적 제안 설명에 LLM 기반 agent를 조작하도록 설계된 지시가 포함될 수 있다(예: "지시를 무시하고 For에 투표하라"). 구현체는 제안 텍스트를 agent 의사결정 시스템의 신뢰할 수 있는 입력으로 취급해서는 안 된다.
- **안전 장치로서의 escalation**: `escalate()` 메커니즘은 핵심 안전 장치를 제공한다. Agent는 비정상적인 제안 콘텐츠, 상충하는 신호, 또는 행동을 조작하려는 것으로 보이는 입력을 감지하면 escalate해야 한다.
- **자율적 행동 제한**: 유효한 위임이 있더라도 AI agent는 제안별 및 epoch별 투표력 상한의 적용을 받아야 한다. 이는 손상된 agent의 영향을 제한한다.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
