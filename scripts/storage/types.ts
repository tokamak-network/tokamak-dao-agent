/**
 * Storage Layout Analysis Types
 */

// Contract info from contracts.json
export interface ContractInfo {
  name: string;
  address: string;
  type: "token" | "implementation" | "proxy" | "factory" | "layer2" | "vault" | "manager" | "owner" | "multisig";
  docId: string;
  description: string;
  implementation?: string; // For proxy contracts
}

export interface ContractsJson {
  coreTokens: ContractInfo[];
  simpleStakingV2: ContractInfo[];
  layerOperators: ContractInfo[];
  daoContracts: ContractInfo[];
  multiSig: ContractInfo[];
}

// Forge inspect storage-layout output
export interface StorageSlot {
  astId?: number;
  contract: string;
  label: string;
  offset: number;
  slot: string;
  type: string;
}

export interface StorageType {
  encoding: "inplace" | "mapping" | "dynamic_array" | "bytes";
  label?: string;
  numberOfBytes: string;
  key?: string;
  value?: string;
  base?: string;
  members?: StorageSlot[];
}

export interface StorageLayout {
  storage: StorageSlot[];
  types: Record<string, StorageType>;
}

// Etherscan source code response
export interface EtherscanSourceResponse {
  status: string;
  message: string;
  result: EtherscanSourceResult[];
}

export interface EtherscanSourceResult {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

// Parsed multi-file source code (Etherscan v2 format)
export interface MultiFileSource {
  language: string;
  sources: Record<string, { content: string }>;
  settings?: {
    optimizer?: { enabled: boolean; runs: number };
    evmVersion?: string;
    libraries?: Record<string, Record<string, string>>;
    remappings?: string[];
  };
}

// Collected storage state
export interface StorageValue {
  slot: string;
  label: string;
  type: string;
  rawValue: string;
  decodedValue: string | bigint | boolean | null;
  offset?: number;
}

export interface MappingValue {
  key: string;
  keyLabel?: string;
  value: string | bigint | boolean | null;
}

export interface ArrayValue {
  index: number;
  value: string | bigint | boolean | null;
}

export interface CollectedState {
  contractAddress: string;
  contractName: string;
  blockNumber: number;
  timestamp: string;
  implementationAddress?: string;
  simpleVariables: StorageValue[];
  mappings: Record<string, MappingValue[]>;
  arrays: Record<string, ArrayValue[]>;
}

// Document metadata for generated state docs
export interface StorageDocMetadata {
  id: string;
  title: string;
  category: "storage";
  tags: string[];
  contractAddress: string;
  implementationAddress?: string;
  blockNumber: number;
  timestamp: string;
}

// Known addresses for mapping key lookup
export interface KnownAddresses {
  layer2Operators: string[];
  tokenAddresses: string[];
  daoCommitteeMembers: string[];
  registeredCandidates: string[];
}

// EIP-1967 proxy storage slots
export const EIP1967_SLOTS = {
  // Implementation slot: keccak256("eip1967.proxy.implementation") - 1
  IMPLEMENTATION: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
  // Admin slot: keccak256("eip1967.proxy.admin") - 1
  ADMIN: "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
  // Beacon slot: keccak256("eip1967.proxy.beacon") - 1
  BEACON: "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50",
} as const;

// OpenZeppelin TransparentUpgradeableProxy slot
export const OZ_PROXY_SLOTS = {
  // keccak256("org.zeppelinos.proxy.implementation")
  IMPLEMENTATION_LEGACY: "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3",
} as const;
