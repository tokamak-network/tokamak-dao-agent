---
name: generate-contract-docs
description: Check RAG document status - shows loaded documents count by category and network
disable-model-invocation: true
allowed-tools: Bash
---

Run the document status check script:

```bash
bun run .claude/skills/generate-contract-docs/check-status.ts
```

Report the results to the user in a clear table format showing:
- Total documents loaded
- Documents by category (contracts, governance, tokenomics, technical)
- Network breakdown for contracts (mainnet, sepolia)
