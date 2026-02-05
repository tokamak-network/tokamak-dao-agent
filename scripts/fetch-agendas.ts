/**
 * Phase 0: Fetch all DAO agendas from on-chain
 *
 * Queries DAOAgendaManager to enumerate all past agendas,
 * decode their calldata, and collect voting results.
 */

import {
  createPublicClient,
  http,
  decodeFunctionData,
  type Address,
  type Hex,
  parseAbi,
} from "viem";
import { mainnet } from "viem/chains";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const RPC_URL = process.env.ALCHEMY_RPC_URL || "http://127.0.0.1:8545";

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
});

// Contract addresses
const DAO_AGENDA_MANAGER = "0xcD4421d082752f363E1687544a09d5112cD4f484" as Address;
const DAO_COMMITTEE_PROXY = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26" as Address;

// ABI for DAOAgendaManager
const agendaManagerAbi = parseAbi([
  "function numAgendas() view returns (uint256)",
  "function getAgendaStatus(uint256 _agendaID) view returns (uint256)",
  "function getAgendaResult(uint256 _agendaID) view returns (uint256, bool)",
  "function getVotingCount(uint256 _agendaID) view returns (uint256, uint256, uint256)",
  "function getAgendaTimestamps(uint256 _agendaID) view returns (uint256, uint256, uint256, uint256, uint256)",
  "function getExecutionInfo(uint256 _agendaID) view returns (address[], bytes[], bool, uint256)",
  "function getVoters(uint256 _agendaID) view returns (address[])",
  "function minimumNoticePeriodSeconds() view returns (uint256)",
  "function minimumVotingPeriodSeconds() view returns (uint256)",
  "function executingPeriodSeconds() view returns (uint256)",
  "function createAgendaFees() view returns (uint256)",
]);

// ABI for DAOCommittee
const committeeAbi = parseAbi([
  "function maxMember() view returns (uint256)",
  "function members(uint256) view returns (address)",
  "function quorum() view returns (uint256)",
  "function candidatesLength() view returns (uint256)",
]);

// Status and result enums
const AGENDA_STATUS = ["NONE", "NOTICE", "VOTING", "WAITING_EXEC", "EXECUTED", "ENDED"] as const;
const AGENDA_RESULT = ["PENDING", "ACCEPT", "REJECT", "DISMISS"] as const;

// Known contract names for readable output
const contractsJson = JSON.parse(
  readFileSync(join(__dirname, "mainnet/contracts.json"), "utf-8")
);

function buildAddressMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const category of Object.values(contractsJson) as any[]) {
    for (const contract of category) {
      map.set(contract.address.toLowerCase(), contract.name);
    }
  }
  return map;
}

const ADDRESS_NAMES = buildAddressMap();

function getContractName(address: string): string {
  return ADDRESS_NAMES.get(address.toLowerCase()) || address;
}

// Load all known ABIs for calldata decoding
function loadKnownAbis(): Map<string, any[]> {
  const abiMap = new Map<string, any[]>();
  const outDir = join(__dirname, "..", "contracts", "out");

  if (!existsSync(outDir)) return abiMap;

  // Key contracts we want to decode
  const contractFiles = [
    "SeigManager.sol/SeigManager.json",
    "DepositManager.sol/DepositManager.json",
    "Layer2Registry.sol/Layer2Registry.json",
    "DAOCommittee_V1.sol/DAOCommittee_V1.json",
    "DAOAgendaManager.sol/DAOAgendaManager.json",
    "CandidateFactory.sol/CandidateFactory.json",
    "Layer2Manager.sol/Layer2Manager.json",
    "TON.sol/TON.json",
    "WTON.sol/WTON.json",
  ];

  for (const file of contractFiles) {
    const filePath = join(outDir, file);
    if (existsSync(filePath)) {
      try {
        const json = JSON.parse(readFileSync(filePath, "utf-8"));
        if (json.abi) {
          const contractName = file.split("/")[0].replace(".sol", "");
          abiMap.set(contractName, json.abi);
        }
      } catch {}
    }
  }

  return abiMap;
}

function tryDecodeCalldata(calldata: Hex, knownAbis: Map<string, any[]>): string {
  for (const [contractName, abi] of knownAbis) {
    try {
      const decoded = decodeFunctionData({ abi, data: calldata });
      const argsStr = decoded.args
        ? decoded.args.map((a: any) => {
            if (typeof a === "bigint") return a.toString();
            if (Array.isArray(a)) return `[${a.map(String).join(", ")}]`;
            return String(a);
          }).join(", ")
        : "";
      return `${decoded.functionName}(${argsStr})`;
    } catch {}
  }

  // Fallback: show function selector
  const selector = calldata.slice(0, 10);
  return `unknown(selector: ${selector})`;
}

interface AgendaData {
  id: number;
  status: string;
  result: string;
  executed: boolean;
  votes: { yes: bigint; no: bigint; abstain: bigint };
  timestamps: {
    created: Date;
    noticeEnd: Date;
    votingStart: Date;
    votingEnd: Date;
    executed: Date | null;
  };
  targets: string[];
  targetNames: string[];
  calls: string[];
  atomicExecute: boolean;
  voters: string[];
}

async function fetchAllAgendas(): Promise<AgendaData[]> {
  console.log("Connecting to", RPC_URL.replace(/\/v2\/.*/, "/v2/***"));
  console.log("");

  // Get total count
  const numAgendas = await client.readContract({
    address: DAO_AGENDA_MANAGER,
    abi: agendaManagerAbi,
    functionName: "numAgendas",
  });

  console.log(`Total agendas: ${numAgendas}`);
  console.log("");

  // Get governance parameters
  const [minNotice, minVoting, execPeriod, fees, maxMember, quorum] = await Promise.all([
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "minimumNoticePeriodSeconds" }),
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "minimumVotingPeriodSeconds" }),
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "executingPeriodSeconds" }),
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "createAgendaFees" }),
    client.readContract({ address: DAO_COMMITTEE_PROXY, abi: committeeAbi, functionName: "maxMember" }),
    client.readContract({ address: DAO_COMMITTEE_PROXY, abi: committeeAbi, functionName: "quorum" }),
  ]);

  console.log("=== Governance Parameters ===");
  console.log(`  Min Notice Period: ${Number(minNotice) / 86400} days`);
  console.log(`  Min Voting Period: ${Number(minVoting) / 86400} days`);
  console.log(`  Executing Period:  ${Number(execPeriod) / 86400} days`);
  console.log(`  Agenda Creation Fee: ${Number(fees) / 1e18} TON`);
  console.log(`  Max Members: ${maxMember}`);
  console.log(`  Quorum: ${quorum}`);
  console.log("");

  // Load ABIs for decoding
  const knownAbis = loadKnownAbis();
  console.log(`Loaded ${knownAbis.size} ABIs for calldata decoding`);
  console.log("");

  // Fetch all agendas
  const agendas: AgendaData[] = [];
  const batchSize = 5;

  for (let i = 0; i < Number(numAgendas); i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, Number(numAgendas)); j++) {
      batch.push(fetchAgenda(j, knownAbis));
    }
    const results = await Promise.all(batch);
    agendas.push(...results);

    if (i % 10 === 0 && i > 0) {
      console.log(`  Fetched ${i}/${numAgendas} agendas...`);
    }
  }

  return agendas;
}

async function fetchAgenda(id: number, knownAbis: Map<string, any[]>): Promise<AgendaData> {
  const [status, resultTuple, votes, timestamps, execInfo, voters] = await Promise.all([
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "getAgendaStatus", args: [BigInt(id)] }),
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "getAgendaResult", args: [BigInt(id)] }),
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "getVotingCount", args: [BigInt(id)] }),
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "getAgendaTimestamps", args: [BigInt(id)] }),
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "getExecutionInfo", args: [BigInt(id)] }),
    client.readContract({ address: DAO_AGENDA_MANAGER, abi: agendaManagerAbi, functionName: "getVoters", args: [BigInt(id)] }),
  ]);

  const [result, executed] = resultTuple as [bigint, boolean];
  const [yes, no, abstain] = votes as [bigint, bigint, bigint];
  const [created, noticeEnd, votingStart, votingEnd, executedTs] = timestamps as [bigint, bigint, bigint, bigint, bigint];
  const [targets, functionBytecodes, atomicExecute] = execInfo as [Address[], Hex[], boolean];

  // Decode calldata for each target
  const calls = functionBytecodes.map((bytecode: Hex) => tryDecodeCalldata(bytecode, knownAbis));
  const targetNames = targets.map((t: Address) => getContractName(t));

  return {
    id,
    status: AGENDA_STATUS[Number(status)] || `UNKNOWN(${status})`,
    result: AGENDA_RESULT[Number(result)] || `UNKNOWN(${result})`,
    executed,
    votes: { yes, no, abstain },
    timestamps: {
      created: new Date(Number(created) * 1000),
      noticeEnd: new Date(Number(noticeEnd) * 1000),
      votingStart: Number(votingStart) > 0 ? new Date(Number(votingStart) * 1000) : new Date(0),
      votingEnd: new Date(Number(votingEnd) * 1000),
      executed: Number(executedTs) > 0 ? new Date(Number(executedTs) * 1000) : null,
    },
    targets: targets.map(String),
    targetNames,
    calls,
    atomicExecute,
    voters: voters.map(String),
  };
}

function printSummary(agendas: AgendaData[]) {
  console.log("=== Agenda Summary ===");
  console.log(`Total: ${agendas.length}`);

  // Count by status
  const statusCount = new Map<string, number>();
  const resultCount = new Map<string, number>();
  for (const a of agendas) {
    statusCount.set(a.status, (statusCount.get(a.status) || 0) + 1);
    resultCount.set(a.result, (resultCount.get(a.result) || 0) + 1);
  }

  console.log("\nBy Status:");
  for (const [status, count] of statusCount) {
    console.log(`  ${status}: ${count}`);
  }

  console.log("\nBy Result:");
  for (const [result, count] of resultCount) {
    console.log(`  ${result}: ${count}`);
  }

  console.log("\n=== All Agendas ===\n");

  for (const a of agendas) {
    console.log(`--- Agenda #${a.id} ---`);
    console.log(`  Status: ${a.status} | Result: ${a.result} | Executed: ${a.executed}`);
    console.log(`  Created: ${a.timestamps.created.toISOString()}`);
    console.log(`  Votes: YES=${a.votes.yes} NO=${a.votes.no} ABSTAIN=${a.votes.abstain}`);
    console.log(`  Voters: ${a.voters.length}`);

    for (let i = 0; i < a.targets.length; i++) {
      console.log(`  Target[${i}]: ${a.targetNames[i]} (${a.targets[i]})`);
      console.log(`  Call[${i}]:   ${a.calls[i]}`);
    }

    if (a.timestamps.executed) {
      console.log(`  Executed at: ${a.timestamps.executed.toISOString()}`);
    }
    console.log("");
  }
}

async function main() {
  try {
    const agendas = await fetchAllAgendas();
    printSummary(agendas);

    // Save raw data as JSON
    const outputPath = join(__dirname, "mainnet", "agendas.json");
    const serializable = agendas.map(a => ({
      ...a,
      votes: {
        yes: a.votes.yes.toString(),
        no: a.votes.no.toString(),
        abstain: a.votes.abstain.toString(),
      },
      timestamps: {
        created: a.timestamps.created.toISOString(),
        noticeEnd: a.timestamps.noticeEnd.toISOString(),
        votingStart: a.timestamps.votingStart.toISOString(),
        votingEnd: a.timestamps.votingEnd.toISOString(),
        executed: a.timestamps.executed?.toISOString() || null,
      },
    }));
    writeFileSync(outputPath, JSON.stringify(serializable, null, 2));
    console.log(`\nSaved to ${outputPath}`);
  } catch (error) {
    console.error("Error fetching agendas:", error);
    process.exit(1);
  }
}

main();
