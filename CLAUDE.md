# MANDATORY: 답변 전 온체인 검증 필수

> 이 프로젝트의 #1 규칙. 위반 시 에이전트가 무용지물이 됩니다.

## 규칙: 컨트랙트 동작에 대해 절대 추측하지 않는다

온체인 동작, 토큰 호환성, 트랜잭션 결과에 대한 질문을 받으면:

1. **멈춘다** — 답변을 작성하지 않는다
2. **검증한다** — MCP 도구를 먼저 호출한다
3. **답변한다** — 검증 결과만을 근거로 답변한다

### 필수 워크플로우

| 질문 패턴 | 필수 도구 |
|-----------|----------|
| "X 토큰이 Y DEX에서 거래 가능?" | `verify_token_compatibility` → `run_fork_test` |
| "이 트랜잭션이 성공할까?" | `simulate_transaction` |
| "X의 현재 값은?" | `query_on_chain` 또는 `read_contract_state` |
| "컨트랙트 X가 Y와 호환?" | `run_fork_test` |

### 올바른 예시

질문: "TON이 유니스왑에서 거래 가능한가요?"

❌ 틀림: "TON은 표준 ERC20이므로 가능합니다."
✅ 맞음: [verify_token_compatibility 호출 → 결과 확인 → revert 확인 → 불가능 답변]

---

# Project Instructions for Claude

## Project Mission

> **An AI agent that understands Tokamak Network contracts more deeply than the developers themselves.**

### Goals
1. Analyze DAO proposals independently and provide well-reasoned opinions
2. Possess sufficient knowledge to propose new agendas for Tokamak Network's advancement

### Decision Criteria
Validate all work against these questions:
- "Does this work contribute to a deeper understanding of Tokamak Network?"
- "Does this enhance our capability to participate in DAO governance?"

### Autonomy Principle
- Do not wait for the user to guide you. Proactively identify and propose better approaches.
- If you see a more effective path to the mission, speak up immediately.
- The user may not know what's needed — that's your job to figure out and communicate.

---

## Architecture

Two interfaces share the same **11 tools** for analyzing Tokamak Network:

```
Claude Code                          Web Chat UI (src/web/)
    ↕ (MCP, stdio)                      ↕ (Anthropic API)
Tokamak MCP Server                   Tokamak Web Server
(src/mcp/server.ts)                  (src/web/server.ts)
    ↘                                  ↙
      Shared Tool Handlers (src/mcp/tools/handlers.ts)
        ├── get_contract_info           → contracts.json lookup
        ├── read_contract_source        → contracts/src/*.sol reading
        ├── search_contract_code        → Solidity code search
        ├── read_storage_slot           → Raw storage slot reading
        ├── read_contract_state         → Full state decoding via layouts
        ├── query_on_chain              → View function calls
        ├── fetch_agenda                → DAO proposal lookup
        ├── decode_calldata             → Transaction data decoding
        ├── simulate_transaction        → eth_call simulation
        ├── verify_token_compatibility  → DEX compatibility verification ⭐
        └── run_fork_test               → Foundry fork test execution ⭐
```

**Foundry Fork Tests** (`contracts/test/`):
- `TONCompatibility.t.sol` - TON/WTON DEX compatibility tests

**Interfaces**:
- **Claude Code**: MCP server via stdio (`src/mcp/server.ts`)
- **Web Chat UI**: Anthropic API agentic loop (`src/web/server.ts`), system prompt with verification-first protocol

### Key Directories

| Path | Purpose |
|------|---------|
| `src/mcp/` | MCP server and tools (shared handlers) |
| `src/web/` | Web chat UI server and system prompt |
| `contracts/src/` | 44 verified Solidity contract trees (746 files) |
| `contracts/out/` | Compiled ABIs from Foundry |
| `scripts/mainnet/contracts.json` | Contract registry (addresses, types, proxy relationships) |
| `scripts/mainnet/agendas.json` | Cached DAO agenda data |
| `scripts/storage/layouts/` | Storage layout JSONs for on-chain decoding |
| `scripts/storage/reader.ts` | Low-level storage reading utilities |

### MCP Server Registration

Configured in `.claude/settings.json`. Requires `ALCHEMY_RPC_URL` env var for on-chain queries.

---

## Core Principles (Always Apply)

- **Simplicity First**: Make every change as simple as possible. Minimize code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Only touch what's necessary. Avoid introducing bugs.
- **Evidence Over Speculation**: Never guess about contract behavior. Always verify with on-chain data.

---

## Workflow Rules

### 1. Planning (REQUIRED for non-trivial tasks)

**When to use plan mode:**
- Task has 3+ steps
- Involves architectural decisions
- Requires verification steps

**Planning actions:**
- Write plan to `tasks/todo.md` with checkable items
- If something goes wrong → STOP and re-plan immediately
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

**Use subagents (Task tool) for:**
- Research and exploration
- Parallel analysis
- Complex problems requiring more compute
- Keeping main context window clean

**Rule:** One task per subagent for focused execution.

### 3. Verification (REQUIRED before marking complete)

Before marking any task done:
- [ ] Prove it works (run tests, check logs)
- [ ] Diff behavior vs main branch when relevant
- [ ] Ask: "Would a staff engineer approve this?"

**Never mark complete without demonstrating correctness.**

### 4. Code Quality

**For non-trivial changes:**
- Pause and ask: "Is there a more elegant way?"
- If fix feels hacky → implement the elegant solution

**For simple fixes:**
- Don't over-engineer
- Skip elegance review

### 5. Bug Fixing (Autonomous)

When given a bug report:
- Just fix it. Don't ask for hand-holding.
- Find logs, errors, failing tests → resolve them
- Fix failing CI tests without being told how
- Zero context switching required from the user

---

## Self-Improvement Protocol

**REQUIRED after ANY user correction:**

1. Update `tasks/lessons.md` with:
   - The mistake pattern
   - Rule to prevent recurrence
2. Review lessons at session start

---

## Task Tracking

| Step | Action | File |
|------|--------|------|
| Plan | Write checkable items | `tasks/todo.md` |
| Execute | Mark items complete as you go | `tasks/todo.md` |
| Review | Add review section | `tasks/todo.md` |
| Learn | Capture lessons from corrections | `tasks/lessons.md` |

**At each step:** Provide high-level summary of changes.
