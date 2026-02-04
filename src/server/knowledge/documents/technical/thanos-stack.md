---
id: "tech-001"
title: "Thanos Stack"
category: "technical"
status: "active"
created_at: "2025-02-04"
updated_at: "2025-02-04"
version: "1.0"
tags: ["thanos", "layer2", "rollup", "architecture"]
related_docs: ["tech-002"]
---

# Thanos Stack

## Overview

Thanos is Tokamak Network's Layer 2 scaling solution based on Optimistic Rollup technology.

## Key Features

- **Optimistic Rollup**: Leverages fraud proofs for security
- **EVM Compatibility**: Full Ethereum Virtual Machine compatibility
- **Low Cost**: Significantly reduced transaction fees
- **High Throughput**: Increased transaction processing capacity

## Architecture

### Sequencer
Processes and orders transactions for L2 blocks.

### Batcher
Batches L2 transactions for submission to L1.

### Proposer
Proposes state roots to L1 for verification.

### Challenger
Monitors for fraud and submits fraud proofs when necessary.

## Integration with Tokamak DAO

- L2 operators stake WTON for security
- Stakers earn seigniorage from L2 operations
- Governance decisions affect L2 parameters

---

*TODO: Add detailed technical specifications*
