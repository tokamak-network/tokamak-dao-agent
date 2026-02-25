# docs/

Documentation for the ERC AI Agent Governance Interface and related articles.

## EIP Specification

| Language | File | Status |
|:---------|:-----|:-------|
| English (canonical) | [erc-ai-governance.md](erc-ai-governance.md) | Draft |
| Korean | [erc-ai-governance.ko.md](erc-ai-governance.ko.md) | Draft |
| Japanese | [erc-ai-governance.ja.md](erc-ai-governance.ja.md) | Draft |
| Chinese | [erc-ai-governance.zh.md](erc-ai-governance.zh.md) | Draft |

## Medium Articles

| Language | File | Notes |
|:---------|:-----|:------|
| English | [medium-article-en.md](medium-article-en.md) | |
| Korean | [medium-article-ko.md](medium-article-ko.md) | Localization, not a direct translation |

The Korean article is an independent localization adapted for the Korean audience, not a line-by-line translation of the English version. It includes audience-specific examples and framing.

## Translation Guidelines

- **English is canonical.** All spec changes should be made to `erc-ai-governance.md` first, then propagated to translations.
- **YAML front matter stays in English.** EIP metadata fields (`eip`, `title`, `author`, `status`, etc.) must not be translated.
- **Do not translate code blocks.** Solidity interfaces, function signatures, and inline code must remain identical across all languages.
- **Technical terms** (`commit-reveal`, `delegatee`, `escalation`, `on-chain`, `off-chain`) should be kept in English or transliterated consistently within each translation file.

## Internal Technical Docs

These are internal references for the Tokamak DAO Agent project and are not part of the EIP:

- `contract-map.md` — Tokamak Network contract topology
- `contract-relationships.json` — Machine-readable contract relationships
- `knowledge-gaps-resolved.md` — Resolved research questions
