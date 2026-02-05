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

This project is an **MCP server** that provides 9 tools to Claude Code for analyzing Tokamak Network:

```
Claude Code
    ↕ (MCP, stdio)
Tokamak MCP Server (src/mcp/server.ts, Bun)
    ├── get_contract_info      → contracts.json lookup
    ├── read_contract_source   → contracts/src/*.sol reading
    ├── search_contract_code   → Solidity code search
    ├── read_storage_slot      → Raw storage slot reading
    ├── read_contract_state    → Full state decoding via layouts
    ├── query_on_chain         → View function calls
    ├── fetch_agenda           → DAO proposal lookup
    ├── decode_calldata        → Transaction data decoding
    └── simulate_transaction   → eth_call simulation
```

**Interface**: Claude Code is the only interface. No web UI.

### Key Directories

| Path | Purpose |
|------|---------|
| `src/mcp/` | MCP server and tools |
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
