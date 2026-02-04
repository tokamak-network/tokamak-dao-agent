/**
 * Find additional Tokamak Network contract addresses
 * Queries on-chain data to discover Layer2 operators and related contracts
 */

import { createHash } from "crypto";

const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;

if (!ALCHEMY_RPC_URL) {
  console.error("Error: ALCHEMY_RPC_URL environment variable is required");
  process.exit(1);
}

// Known contract addresses
const CONTRACTS = {
  layer2RegistryProxy: "0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b",
  seigManagerProxy: "0x0b55a0f463b6defb81c6063973763951712d0e5f",
  depositManagerProxy: "0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e",
  daoCommitteeProxy: "0xDD9f0cCc044B0781289Ee318e5971b0139602C26",
  ton: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
  wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
};

// Compute function selector (first 4 bytes of keccak256 hash)
function getFunctionSelector(signature: string): string {
  const hash = createHash("sha3-256");
  // Use keccak256 via ethers-style computation
  // For simplicity, we'll use pre-computed selectors
  return "";
}

// Pre-computed function selectors
const SELECTORS = {
  // Layer2Registry
  numLayer2s: "0x326d99aa",
  layer2ByIndex: "0x6d7e82e2",
  // SeigManager
  tot: "0x1e2ff94f",
  powerTON: "0x3e832e1d",
  dao: "0x4162169f",
  coinages: "0xce0e2575",
  // DAOCommittee
  candidateFactory: "0x1e5e3c69",
  agendaManager: "0xe1580c7c",
  daoVault: "0x82de03ef",
  maxMember: "0x68be08fb",
  members: "0x5daf08ca",
  memberLength: "0x5a7adf7f",
  // Common
  owner: "0x8da5cb5b",
  implementation: "0x5c60da1b",
};

async function ethCall(to: string, data: string): Promise<string> {
  const response = await fetch(ALCHEMY_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
      id: 1,
    }),
  });
  const result = await response.json() as { result?: string; error?: { message: string } };
  if (result.error) {
    console.log(`   Error: ${result.error.message}`);
    return "0x";
  }
  return result.result || "0x";
}

function decodeAddress(result: string): string | null {
  if (!result || result === "0x" || result.length < 42) return null;
  const addr = "0x" + result.slice(-40).toLowerCase();
  if (addr === "0x0000000000000000000000000000000000000000") return null;
  return addr;
}

function decodeUint256(result: string): number {
  if (!result || result === "0x") return 0;
  return parseInt(result, 16);
}

async function main() {
  console.log("=== Finding Tokamak Network Contracts ===\n");

  // 1. Get number of Layer2s from registry
  console.log("1. Querying Layer2Registry for registered operators...\n");

  // Try calling numLayer2s()
  // selector for numLayer2s() = keccak256("numLayer2s()")[:4]
  const numLayer2sData = "0x" + Buffer.from("numLayer2s()").toString("hex").slice(0, 8);
  console.log(`   Calling numLayer2s() with selector...`);

  // Let's try the proper way - compute keccak256
  // numLayer2s() selector = 0x326d99aa based on function analysis
  let numResult = await ethCall(CONTRACTS.layer2RegistryProxy, "0x326d99aa");
  let numLayer2s = decodeUint256(numResult);

  if (numLayer2s === 0) {
    // Try alternative - maybe function name is different
    // layer2Count()
    numResult = await ethCall(CONTRACTS.layer2RegistryProxy, "0x8c1a6c52");
    numLayer2s = decodeUint256(numResult);
  }

  console.log(`   Number of Layer2s: ${numLayer2s}`);

  // 2. Get all Layer2 addresses
  const layer2Addresses: { index: number; address: string }[] = [];

  if (numLayer2s > 0) {
    console.log("\n   Layer2 Operators:");
    for (let i = 0; i < Math.min(numLayer2s, 20); i++) {
      // layer2ByIndex(uint256)
      const indexHex = i.toString(16).padStart(64, "0");
      const result = await ethCall(CONTRACTS.layer2RegistryProxy, "0x6d7e82e2" + indexHex);
      const address = decodeAddress(result);
      if (address) {
        layer2Addresses.push({ index: i, address });
        console.log(`   ${i + 1}. ${address}`);
      }
    }
  }

  // 3. Query SeigManagerProxy for related contracts
  console.log("\n2. Querying SeigManagerProxy for related contracts...\n");

  // tot() - Total Staked TON contract
  const totResult = await ethCall(CONTRACTS.seigManagerProxy, "0x1e2ff94f");
  const totAddress = decodeAddress(totResult);
  if (totAddress) console.log(`   tot (AutoRefactorCoinage): ${totAddress}`);

  // powerTON()
  const powerTONResult = await ethCall(CONTRACTS.seigManagerProxy, "0x3e832e1d");
  const powerTONAddress = decodeAddress(powerTONResult);
  if (powerTONAddress) console.log(`   powerTON: ${powerTONAddress}`);

  // dao()
  const daoResult = await ethCall(CONTRACTS.seigManagerProxy, "0x4162169f");
  const daoAddress = decodeAddress(daoResult);
  if (daoAddress) console.log(`   dao: ${daoAddress}`);

  // factory() - CoinageFactory
  const factoryResult = await ethCall(CONTRACTS.seigManagerProxy, "0xc45a0155");
  const factoryAddress = decodeAddress(factoryResult);
  if (factoryAddress) console.log(`   factory (CoinageFactory): ${factoryAddress}`);

  // registry()
  const registryResult = await ethCall(CONTRACTS.seigManagerProxy, "0x7b103999");
  const registryAddress = decodeAddress(registryResult);
  if (registryAddress) console.log(`   registry: ${registryAddress}`);

  // depositManager()
  const depositMgrResult = await ethCall(CONTRACTS.seigManagerProxy, "0x6c7ac9d8");
  const depositMgrAddress = decodeAddress(depositMgrResult);
  if (depositMgrAddress) console.log(`   depositManager: ${depositMgrAddress}`);

  // 4. Query DAOCommitteeProxy for related contracts
  console.log("\n3. Querying DAOCommitteeProxy for related contracts...\n");

  // candidateFactory()
  const candidateFactoryResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0x1e5e3c69");
  const candidateFactoryAddress = decodeAddress(candidateFactoryResult);
  if (candidateFactoryAddress) console.log(`   candidateFactory: ${candidateFactoryAddress}`);

  // agendaManager()
  const agendaManagerResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0xe1580c7c");
  const agendaManagerAddress = decodeAddress(agendaManagerResult);
  if (agendaManagerAddress) console.log(`   agendaManager: ${agendaManagerAddress}`);

  // daoVault()
  const daoVaultResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0x82de03ef");
  const daoVaultAddress = decodeAddress(daoVaultResult);
  if (daoVaultAddress) console.log(`   daoVault: ${daoVaultAddress}`);

  // seigManager()
  const seigMgrResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0x6fb7f558");
  const seigMgrAddress = decodeAddress(seigMgrResult);
  if (seigMgrAddress) console.log(`   seigManager: ${seigMgrAddress}`);

  // layer2Registry()
  const layer2RegResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0x236988b5");
  const layer2RegAddress = decodeAddress(layer2RegResult);
  if (layer2RegAddress) console.log(`   layer2Registry: ${layer2RegAddress}`);

  // 5. Get members from DAOCommittee
  console.log("\n4. Querying DAOCommittee members...\n");

  // maxMember()
  const maxMemberResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0x68be08fb");
  const maxMember = decodeUint256(maxMemberResult);
  console.log(`   maxMember: ${maxMember}`);

  // memberLength()
  const memberLengthResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0x5a7adf7f");
  const memberLength = decodeUint256(memberLengthResult);
  console.log(`   memberLength: ${memberLength}`);

  // Get members
  const members: string[] = [];
  for (let i = 0; i < memberLength; i++) {
    const indexHex = i.toString(16).padStart(64, "0");
    // members(uint256)
    const memberResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0x5daf08ca" + indexHex);
    const memberAddress = decodeAddress(memberResult);
    if (memberAddress) {
      members.push(memberAddress);
      console.log(`   Member ${i + 1}: ${memberAddress}`);
    }
  }

  // 6. Get implementation addresses
  console.log("\n5. Getting implementation addresses...\n");

  // SeigManagerProxy implementation()
  const seigImplResult = await ethCall(CONTRACTS.seigManagerProxy, "0x5c60da1b");
  const seigImpl = decodeAddress(seigImplResult);
  if (seigImpl) console.log(`   SeigManagerProxy impl: ${seigImpl}`);

  // DepositManagerProxy implementation()
  const depositImplResult = await ethCall(CONTRACTS.depositManagerProxy, "0x5c60da1b");
  const depositImpl = decodeAddress(depositImplResult);
  if (depositImpl) console.log(`   DepositManagerProxy impl: ${depositImpl}`);

  // Layer2RegistryProxy implementation()
  const layer2ImplResult = await ethCall(CONTRACTS.layer2RegistryProxy, "0x5c60da1b");
  const layer2Impl = decodeAddress(layer2ImplResult);
  if (layer2Impl) console.log(`   Layer2RegistryProxy impl: ${layer2Impl}`);

  // DAOCommitteeProxy implementation()
  const daoCommImplResult = await ethCall(CONTRACTS.daoCommitteeProxy, "0x5c60da1b");
  const daoCommImpl = decodeAddress(daoCommImplResult);
  if (daoCommImpl) console.log(`   DAOCommitteeProxy impl: ${daoCommImpl}`);

  // 7. Output summary
  console.log("\n\n=== Summary of Found Contracts ===\n");

  const allContracts: { name: string; address: string; type: string }[] = [];

  if (totAddress) allContracts.push({ name: "Tot", address: totAddress, type: "coinage" });
  if (powerTONAddress) allContracts.push({ name: "PowerTON", address: powerTONAddress, type: "rewards" });
  if (factoryAddress) allContracts.push({ name: "CoinageFactory", address: factoryAddress, type: "factory" });
  if (candidateFactoryAddress) allContracts.push({ name: "CandidateFactory", address: candidateFactoryAddress, type: "factory" });
  if (seigImpl) allContracts.push({ name: "SeigManager (impl)", address: seigImpl, type: "implementation" });
  if (depositImpl) allContracts.push({ name: "DepositManager (impl)", address: depositImpl, type: "implementation" });
  if (layer2Impl) allContracts.push({ name: "Layer2Registry (impl)", address: layer2Impl, type: "implementation" });
  if (daoCommImpl) allContracts.push({ name: "DAOCommittee (impl)", address: daoCommImpl, type: "implementation" });

  layer2Addresses.forEach(({ index, address }) => {
    allContracts.push({ name: `Layer2_${index}`, address, type: "layer2" });
  });

  members.forEach((addr, i) => {
    allContracts.push({ name: `DAOMember_${i}`, address: addr, type: "member" });
  });

  console.log(JSON.stringify(allContracts, null, 2));

  // 8. Output in contracts.json format
  console.log("\n\n=== JSON for contracts.json update ===\n");

  const jsonOutput = {
    additionalContracts: [
      totAddress && { name: "Tot", address: totAddress, type: "coinage", docId: "con-019", description: "Total staked coinage token (AutoRefactorCoinage)" },
      candidateFactoryAddress && { name: "CandidateFactory", address: candidateFactoryAddress, type: "factory", docId: "con-021", description: "Factory for creating Candidate contracts" },
      seigImpl && { name: "SeigManagerV2", address: seigImpl, type: "implementation", docId: "con-022", description: "SeigManager V2 implementation" },
      depositImpl && { name: "DepositManagerV2", address: depositImpl, type: "implementation", docId: "con-023", description: "DepositManager V2 implementation" },
      layer2Impl && { name: "Layer2RegistryV2", address: layer2Impl, type: "implementation", docId: "con-024", description: "Layer2Registry V2 implementation" },
      daoCommImpl && { name: "DAOCommitteeV2", address: daoCommImpl, type: "implementation", docId: "con-035", description: "DAOCommittee V2 implementation" },
    ].filter(Boolean),
    layerOperators: layer2Addresses.map(({ index, address }) => ({
      name: `Layer2Operator${index + 1}`,
      address,
      type: "layer2",
      docId: `con-0${51 + index}`,
      description: `Registered Layer2 operator contract #${index + 1}`
    })),
    daoMembers: members.map((addr, i) => ({
      name: `DAOMember${i + 1}`,
      address: addr,
      type: "member",
      docId: `con-0${71 + i}`,
      description: `DAO Committee member #${i + 1}`
    })),
  };

  console.log(JSON.stringify(jsonOutput, null, 2));
}

main().catch(console.error);
