# Tokamak DAO Agent

An AI agent that analyzes Tokamak Network contracts and DAO governance.

Connected to Claude Code as an MCP (Model Context Protocol) server, it performs on-chain state queries, contract analysis, and proposal review through natural language conversation.

## Architecture

```mermaid
flowchart TB
    Claude["Claude Code"]

    Claude <-->|"MCP (stdio)"| Server

    subgraph Server["MCP Server (Bun)"]
        direction TB

        subgraph tools1["Code Exploration"]
            get_contract_info
            read_contract_source
            search_contract_code
        end

        subgraph tools2["On-chain Query"]
            read_storage_slot
            read_contract_state
            query_on_chain
        end

        subgraph tools3["Governance"]
            fetch_agenda
            decode_calldata
        end

        subgraph tools4["Simulation"]
            simulate_transaction
        end
    end

    subgraph Data["Local Data"]
        contracts_json["contracts.json\n(contract registry)"]
        sources["contracts/src/\n(746 Solidity files)"]
        abis["contracts/out/\n(compiled ABIs)"]
        layouts["storage/layouts/\n(slot mappings)"]
        agendas["agendas.json\n(cached proposals)"]
    end

    RPC["Ethereum Mainnet\n(Alchemy RPC)"]

    tools1 --> contracts_json & sources & abis
    tools2 --> layouts & abis & RPC
    tools3 --> agendas & abis & RPC
    tools4 --> RPC
```

## Tools

| Tool | Description |
|------|-------------|
| `get_contract_info` | Look up contract address, type, and proxy relationships |
| `read_contract_source` | Read verified Solidity source code |
| `search_contract_code` | Search keywords across contract sources |
| `read_storage_slot` | Read raw storage slot data |
| `read_contract_state` | Decode full state via storage layouts |
| `query_on_chain` | Call view/pure functions |
| `fetch_agenda` | Fetch DAO proposal details |
| `decode_calldata` | Decode transaction calldata |
| `simulate_transaction` | Simulate transactions via eth_call |

## Setup

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- Alchemy API key (Ethereum mainnet)

### Install & Run

```bash
bun install
```

The MCP server is registered in `.claude/settings.json` and connects automatically when Claude Code starts.

Manual run:

```bash
ALCHEMY_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<key> bun run mcp
```

### Contracts (Foundry)

```bash
cd contracts
forge build
```

## Project Structure

```
src/mcp/                  MCP server and tool implementations
contracts/src/             Verified Solidity sources (44 contracts)
contracts/out/             Compiled ABIs (Foundry)
scripts/mainnet/
  ├── contracts.json       Contract registry
  └── agendas.json         Cached DAO proposal data
scripts/storage/
  ├── layouts/             Storage layout JSONs
  └── reader.ts            Storage reading utilities
```

## License

Private
