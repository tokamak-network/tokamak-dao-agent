# ERC-XXXX: Agent Governance Interface

AI agents are already voting in DAOs through regular EOAs — indistinguishable from human voters. The question is not whether AI will participate in governance, but whether we standardize *how*.

Without a common interface, each DAO builds incompatible AI integrations. Agent reputations become siloed. Delegators have no way to set expiry, preferences, or escalation paths. After Vitalik's [AI stewards proposal](https://ethereum-magicians.org/t/ai-stewards-for-dao-governance), the community response made clear there is appetite for this — but no one has defined the on-chain interface layer.

This ERC specifies four Solidity interfaces (two core, two optional extensions) for agent registration, preference-aware delegation with expiry and escalation, commit-reveal rationale integrity, and prediction-based credibility tracking. It layers on top of ERC-5805 and ERC-4824 without requiring Governor modifications.

**Full specification:** [ERC Agent Governance Interface](https://erc-ai-governance.tokamak.network)
**Reference implementation:** [GitHub](https://github.com/nicetokamak/tokamak-dao-agent) (98 tests, Sepolia deployment, CC0)

Status: **Draft**. We welcome feedback, co-authors, and alternative implementations.

### Discussion Questions

1. What friction do you foresee when integrating with existing Governor deployments?
2. Is the gas cost of commit-reveal rationale integrity justified by the transparency benefit, or should this be L2-only?
3. What risks do you see in cross-DAO credibility portability — and what mitigations would you add?
