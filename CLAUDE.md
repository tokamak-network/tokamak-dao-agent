# Project Instructions for Claude

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