# Rethink: Strategic Self-Review

You are reviewing the current approach to ensure alignment with the project mission.

## Project Mission Reminder
> An AI agent that understands Tokamak Network contracts more deeply than the developers themselves.

## Step 1: Explore Current State

First, thoroughly explore the codebase to understand what exists:

1. **MCP Tools**: Read `src/mcp/tools/` to understand available tools
2. **Data Layer**: Scan `src/mcp/data/` for contract registry and ABI loading
3. **Scripts**: Check `scripts/` for data collection capabilities
4. **Tasks**: Read `tasks/todo.md` for completed and pending work
5. **Contracts**: Check `contracts/src/` for collected contract sources

Use the Task tool with Explore agent to get a comprehensive view.

## Step 2: Self-Coaching Questions

After exploring, answer each question honestly and specifically:

### 1. Current State Assessment
- What do we currently know about Tokamak Network?
- What are the gaps in our understanding?
- What assumptions are we making that haven't been verified?

### 2. Approach Evaluation
- Is the current approach the best path to deep understanding?
- What would a Tokamak Network core developer know that we don't?
- Are we collecting information, or truly understanding?

### 3. Uncertainty Check
- What are we uncertain about right now?
- What hypotheses do we have that need verification?
- How can we test those hypotheses?

### 4. Better Alternatives
- Is there a more effective approach we haven't considered?
- What would 10x our understanding with minimal effort?
- Are we missing any critical information sources?

### 5. Next Action
- Based on this reflection, what should change?
- What's the single most valuable next step?
- Should we refactor our approach or continue?

## Output Format

Provide:
1. **Honest Assessment** — Current state without sugarcoating
2. **Key Insight** — The most important realization from this review
3. **Recommended Action** — Specific next step with rationale
4. **Open Questions** — What to discuss with the user if needed
