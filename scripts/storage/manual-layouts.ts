/**
 * Manual storage layouts for legacy contracts that can't be compiled with forge
 * These are based on OpenZeppelin ERC20 and custom Tokamak contracts
 */

import { writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LAYOUTS_DIR = join(__dirname, "layouts");

// TON Token - Based on OpenZeppelin ERC20Mintable (Solidity 0.5.12)
// Source: openzeppelin-solidity 2.x ERC20 standard
const TON_LAYOUT = {
  contractAddress: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
  contractName: "TON",
  implementationName: "TON",
  compilerVersion: "v0.5.12",
  isProxy: false,
  implementationAddress: null,
  note: "Manual layout based on OpenZeppelin ERC20Mintable v2.x",
  layout: {
    storage: [
      { label: "_balances", slot: "0", type: "t_mapping(t_address,t_uint256)", offset: 0 },
      { label: "_allowances", slot: "1", type: "t_mapping(t_address,t_mapping(t_address,t_uint256))", offset: 0 },
      { label: "_totalSupply", slot: "2", type: "t_uint256", offset: 0 },
      { label: "_owner", slot: "3", type: "t_address", offset: 0 },
      { label: "_minters", slot: "4", type: "t_mapping(t_address,t_bool)", offset: 0 },
      { label: "seigManager", slot: "5", type: "t_address", offset: 0 },
    ],
    types: {
      "t_address": { encoding: "inplace", label: "address", numberOfBytes: "20" },
      "t_uint256": { encoding: "inplace", label: "uint256", numberOfBytes: "32" },
      "t_bool": { encoding: "inplace", label: "bool", numberOfBytes: "1" },
      "t_mapping(t_address,t_uint256)": { encoding: "mapping", key: "t_address", value: "t_uint256", label: "mapping(address => uint256)", numberOfBytes: "32" },
      "t_mapping(t_address,t_bool)": { encoding: "mapping", key: "t_address", value: "t_bool", label: "mapping(address => bool)", numberOfBytes: "32" },
      "t_mapping(t_address,t_mapping(t_address,t_uint256))": { encoding: "mapping", key: "t_address", value: "t_mapping(t_address,t_uint256)", label: "mapping(address => mapping(address => uint256))", numberOfBytes: "32" },
    }
  }
};

// WTON Token - Similar to TON with additional RAY precision
const WTON_LAYOUT = {
  contractAddress: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
  contractName: "WTON",
  implementationName: "WTON",
  compilerVersion: "v0.5.12",
  isProxy: false,
  implementationAddress: null,
  note: "Manual layout based on OpenZeppelin ERC20 v2.x with SeigManager integration",
  layout: {
    storage: [
      { label: "_balances", slot: "0", type: "t_mapping(t_address,t_uint256)", offset: 0 },
      { label: "_allowances", slot: "1", type: "t_mapping(t_address,t_mapping(t_address,t_uint256))", offset: 0 },
      { label: "_totalSupply", slot: "2", type: "t_uint256", offset: 0 },
      { label: "_owner", slot: "3", type: "t_address", offset: 0 },
      { label: "seigManager", slot: "4", type: "t_address", offset: 0 },
      { label: "ton", slot: "5", type: "t_address", offset: 0 },
    ],
    types: {
      "t_address": { encoding: "inplace", label: "address", numberOfBytes: "20" },
      "t_uint256": { encoding: "inplace", label: "uint256", numberOfBytes: "32" },
      "t_mapping(t_address,t_uint256)": { encoding: "mapping", key: "t_address", value: "t_uint256", label: "mapping(address => uint256)", numberOfBytes: "32" },
      "t_mapping(t_address,t_mapping(t_address,t_uint256))": { encoding: "mapping", key: "t_address", value: "t_mapping(t_address,t_uint256)", label: "mapping(address => mapping(address => uint256))", numberOfBytes: "32" },
    }
  }
};

// DAOVault - Solidity 0.7.6
const DAOVAULT_LAYOUT = {
  contractAddress: "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303",
  contractName: "DAOVault",
  implementationName: "DAOVault",
  compilerVersion: "v0.7.6",
  isProxy: false,
  implementationAddress: null,
  note: "Manual layout for DAOVault",
  layout: {
    storage: [
      { label: "_owner", slot: "0", type: "t_address", offset: 0 },
      { label: "ton", slot: "1", type: "t_address", offset: 0 },
      { label: "wton", slot: "2", type: "t_address", offset: 0 },
    ],
    types: {
      "t_address": { encoding: "inplace", label: "address", numberOfBytes: "20" },
    }
  }
};

// DAOAgendaManager - Solidity 0.7.6
const DAOAGENDAMANAGER_LAYOUT = {
  contractAddress: "0xcD4421d082752f363E1687544a09d5112cD4f484",
  contractName: "DAOAgendaManager",
  implementationName: "DAOAgendaManager",
  compilerVersion: "v0.7.6",
  isProxy: false,
  implementationAddress: null,
  note: "Manual layout for DAOAgendaManager",
  layout: {
    storage: [
      { label: "_owner", slot: "0", type: "t_address", offset: 0 },
      { label: "committee", slot: "1", type: "t_address", offset: 0 },
      { label: "agendas", slot: "2", type: "t_array(t_struct)dyn", offset: 0 },
      { label: "agendaFees", slot: "3", type: "t_mapping(t_uint256,t_uint256)", offset: 0 },
      { label: "minimumNoticePeriodSeconds", slot: "4", type: "t_uint256", offset: 0 },
      { label: "minimumVotingPeriodSeconds", slot: "5", type: "t_uint256", offset: 0 },
      { label: "executingPeriodSeconds", slot: "6", type: "t_uint256", offset: 0 },
      { label: "createAgendaFees", slot: "7", type: "t_uint256", offset: 0 },
    ],
    types: {
      "t_address": { encoding: "inplace", label: "address", numberOfBytes: "20" },
      "t_uint256": { encoding: "inplace", label: "uint256", numberOfBytes: "32" },
      "t_array(t_struct)dyn": { encoding: "dynamic_array", label: "Agenda[]", numberOfBytes: "32" },
      "t_mapping(t_uint256,t_uint256)": { encoding: "mapping", key: "t_uint256", value: "t_uint256", label: "mapping(uint256 => uint256)", numberOfBytes: "32" },
    }
  }
};

// DAOCommitteeProxy - Solidity 0.7.6
const DAOCOMMITTEEPROXY_LAYOUT = {
  contractAddress: "0xDD9f0cCc044B0781289Ee318e5971b0139602C26",
  contractName: "DAOCommitteeProxy",
  implementationName: "DAOCommitteeProxy",
  compilerVersion: "v0.7.6",
  isProxy: true,
  implementationAddress: null,
  note: "Manual layout for DAOCommitteeProxy",
  layout: {
    storage: [
      { label: "ton", slot: "0", type: "t_address", offset: 0 },
      { label: "daoVault", slot: "1", type: "t_address", offset: 0 },
      { label: "agendaManager", slot: "2", type: "t_address", offset: 0 },
      { label: "candidateFactory", slot: "3", type: "t_address", offset: 0 },
      { label: "layer2Registry", slot: "4", type: "t_address", offset: 0 },
      { label: "seigManager", slot: "5", type: "t_address", offset: 0 },
      { label: "members", slot: "6", type: "t_array(t_address)dyn", offset: 0 },
      { label: "memberIndexes", slot: "7", type: "t_mapping(t_address,t_uint256)", offset: 0 },
      { label: "maxMember", slot: "8", type: "t_uint256", offset: 0 },
      { label: "quorum", slot: "9", type: "t_uint256", offset: 0 },
      { label: "activityRewardPerSecond", slot: "10", type: "t_uint256", offset: 0 },
    ],
    types: {
      "t_address": { encoding: "inplace", label: "address", numberOfBytes: "20" },
      "t_uint256": { encoding: "inplace", label: "uint256", numberOfBytes: "32" },
      "t_array(t_address)dyn": { encoding: "dynamic_array", base: "t_address", label: "address[]", numberOfBytes: "32" },
      "t_mapping(t_address,t_uint256)": { encoding: "mapping", key: "t_address", value: "t_uint256", label: "mapping(address => uint256)", numberOfBytes: "32" },
    }
  }
};

const MANUAL_LAYOUTS = [
  TON_LAYOUT,
  WTON_LAYOUT,
  DAOVAULT_LAYOUT,
  DAOAGENDAMANAGER_LAYOUT,
  DAOCOMMITTEEPROXY_LAYOUT,
];

async function main() {
  console.log("=== Generating Manual Storage Layouts ===\n");
  
  for (const layout of MANUAL_LAYOUTS) {
    const outputPath = join(LAYOUTS_DIR, `${layout.contractName}.json`);
    
    // Don't overwrite if already exists from forge
    if (existsSync(outputPath)) {
      console.log(`⚠️  ${layout.contractName}: Skipped (already exists)`);
      continue;
    }
    
    writeFileSync(outputPath, JSON.stringify(layout, null, 2));
    console.log(`✅ ${layout.contractName}: Created manual layout`);
  }
  
  console.log("\nDone!");
}

main().catch(console.error);
