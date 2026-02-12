/**
 * DAO-callable function registry
 *
 * Data sourced from tokamak-network/dao-action-builder predefined methods.
 * Contains only governance-callable functions (nonpayable state-changing).
 */

export interface AbiInput {
  name: string;
  type: string;
}

export interface AbiOutput {
  name: string;
  type: string;
}

export interface AbiFunction {
  type: "function";
  name: string;
  inputs: AbiInput[];
  outputs: AbiOutput[];
  stateMutability: "nonpayable";
}

export interface DaoAction {
  id: string;
  name: string;
  description: string;
  address: string; // mainnet proxy address
  abi: AbiFunction[];
}

export const DAO_ACTIONS: DaoAction[] = [
  // ─── SeigManager ───
  {
    id: "tokamak-seig-manager",
    name: "Tokamak SeigManager",
    description: "Seigniorage distribution management",
    address: "0x0b55a0f463b6defb81c6063973763951712d0e5f",
    abi: [
      { type: "function", name: "setData", inputs: [{ name: "powerton_", type: "address" }, { name: "daoAddress", type: "address" }, { name: "powerTONSeigRate_", type: "uint256" }, { name: "daoSeigRate_", type: "uint256" }, { name: "relativeSeigRate_", type: "uint256" }, { name: "adjustDelay_", type: "uint256" }, { name: "minimumAmount_", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setPowerTON", inputs: [{ name: "powerton_", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setDao", inputs: [{ name: "daoAddress", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setPowerTONSeigRate", inputs: [{ name: "powerTONSeigRate_", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setDaoSeigRate", inputs: [{ name: "daoSeigRate_", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setPseigRate", inputs: [{ name: "pseigRate_", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setCoinageFactory", inputs: [{ name: "factory_", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "transferCoinageOwnership", inputs: [{ name: "newSeigManager", type: "address" }, { name: "coinages_", type: "address[]" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "renounceWTONMinter", inputs: [], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setAdjustDelay", inputs: [{ name: "adjustDelay_", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setMinimumAmount", inputs: [{ name: "minimumAmount_", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setSeigStartBlock", inputs: [{ name: "_seigStartBlock", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setInitialTotalSupply", inputs: [{ name: "_initialTotalSupply", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setBurntAmountAtDAO", inputs: [{ name: "_burntAmountAtDAO", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "renounceMinter", inputs: [{ name: "target", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "renouncePauser", inputs: [{ name: "target", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "renounceOwnership", inputs: [{ name: "target", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "transferOwnership", inputs: [{ name: "target", type: "address" }, { name: "newOwner", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "transferAdmin", inputs: [{ name: "newAdmin", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addMinter", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeMinter", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addOperator", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeOperator", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addChallenger", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeChallenger", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── DAOCommittee ───
  {
    id: "tokamak-dao-committee",
    name: "Tokamak DAOCommittee",
    description: "DAO governance committee management",
    address: "0xDD9f0cCc044B0781289Ee318e5971b0139602C26",
    abi: [
      { type: "function", name: "removeFromBlacklist", inputs: [{ name: "_candidate", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "createCandidateOwner", inputs: [{ name: "_memo", type: "string" }, { name: "_operatorAddress", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "registerLayer2CandidateByOwner", inputs: [{ name: "_operator", type: "address" }, { name: "_layer2", type: "address" }, { name: "_memo", type: "string" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setAgendaStatus", inputs: [{ name: "_agendaID", type: "uint256" }, { name: "_status", type: "uint256" }, { name: "_result", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setSeigManager", inputs: [{ name: "_seigManager", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setCandidatesSeigManager", inputs: [{ name: "_candidateContracts", type: "address[]" }, { name: "_seigManager", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setCandidatesCommittee", inputs: [{ name: "_candidateContracts", type: "address[]" }, { name: "_committee", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setDaoVault", inputs: [{ name: "_daoVault", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setLayer2Registry", inputs: [{ name: "_layer2Registry", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setAgendaManager", inputs: [{ name: "_agendaManager", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setCandidateFactory", inputs: [{ name: "_candidateFactory", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setTon", inputs: [{ name: "_ton", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setActivityRewardPerSecond", inputs: [{ name: "_value", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "increaseMaxMember", inputs: [{ name: "_newMaxMember", type: "uint256" }, { name: "_quorum", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "decreaseMaxMember", inputs: [{ name: "_reducingMemberIndex", type: "uint256" }, { name: "_quorum", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setQuorum", inputs: [{ name: "_quorum", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setCreateAgendaFees", inputs: [{ name: "_fees", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setMinimumNoticePeriodSeconds", inputs: [{ name: "_minimumNoticePeriod", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setMinimumVotingPeriodSeconds", inputs: [{ name: "_minimumVotingPeriod", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setExecutingPeriodSeconds", inputs: [{ name: "_executingPeriodSeconds", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── DAOVault ───
  {
    id: "tokamak-dao-vault",
    name: "Tokamak DAOVault",
    description: "DAO treasury management",
    address: "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303",
    abi: [
      { type: "function", name: "setTON", inputs: [{ name: "_ton", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setWTON", inputs: [{ name: "_wton", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "approveTON", inputs: [{ name: "_to", type: "address" }, { name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "approveWTON", inputs: [{ name: "_to", type: "address" }, { name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "approveERC20", inputs: [{ name: "_token", type: "address" }, { name: "_to", type: "address" }, { name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "claimTON", inputs: [{ name: "_to", type: "address" }, { name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "claimWTON", inputs: [{ name: "_to", type: "address" }, { name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "claimERC20", inputs: [{ name: "_token", type: "address" }, { name: "_to", type: "address" }, { name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── DAOAgendaManager ───
  {
    id: "tokamak-dao-agenda-manager",
    name: "Tokamak DAOAgendaManager",
    description: "DAO proposal/agenda management",
    address: "0xcD4421d082752f363E1687544a09d5112cD4f484",
    abi: [
      { type: "function", name: "setCommittee", inputs: [{ name: "_committee", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setCreateAgendaFees", inputs: [{ name: "_createAgendaFees", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setMinimumNoticePeriodSeconds", inputs: [{ name: "_minimumNoticePeriodSeconds", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setExecutingPeriodSeconds", inputs: [{ name: "_executingPeriodSeconds", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setMinimumVotingPeriodSeconds", inputs: [{ name: "_minimumVotingPeriodSeconds", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "newAgenda", inputs: [{ name: "_targets", type: "address[]" }, { name: "_noticePeriodSeconds", type: "uint256" }, { name: "_votingPeriodSeconds", type: "uint256" }, { name: "_atomicExecute", type: "bool" }, { name: "_functionBytecodes", type: "bytes[]" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "nonpayable" },
      { type: "function", name: "castVote", inputs: [{ name: "_agendaID", type: "uint256" }, { name: "_voter", type: "address" }, { name: "_vote", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setExecutedAgenda", inputs: [{ name: "_agendaID", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setResult", inputs: [{ name: "_agendaID", type: "uint256" }, { name: "_result", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setStatus", inputs: [{ name: "_agendaID", type: "uint256" }, { name: "_status", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "endAgendaVoting", inputs: [{ name: "_agendaID", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── DepositManager ───
  {
    id: "tokamak-deposit-manager",
    name: "Tokamak DepositManager",
    description: "TON staking deposit management",
    address: "0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e",
    abi: [
      { type: "function", name: "setMinDepositGasLimit", inputs: [{ name: "gasLimit_", type: "uint32" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setAddresses", inputs: [{ name: "_l1BridgeRegistry", type: "address" }, { name: "_layer2Manager", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "transferAdmin", inputs: [{ name: "newAdmin", type: "address" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── Layer2Registry ───
  {
    id: "tokamak-layer2-registry",
    name: "Tokamak Layer2Registry",
    description: "Layer2 operator registration management",
    address: "0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b",
    abi: [
      { type: "function", name: "unregister", inputs: [{ name: "layer2", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "transferAdmin", inputs: [{ name: "newAdmin", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addMinter", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeMinter", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addOperator", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeOperator", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── L1BridgeRegistry ───
  {
    id: "tokamak-l1-bridge-registry",
    name: "Tokamak L1BridgeRegistry",
    description: "L1 bridge management",
    address: "0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4",
    abi: [
      { type: "function", name: "setAddresses", inputs: [{ name: "_layer2Manager", type: "address" }, { name: "_seigManager", type: "address" }, { name: "_ton", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setSeigniorageCommittee", inputs: [{ name: "_seigniorageCommittee", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "rejectCandidateAddOn", inputs: [{ name: "rollupConfig", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "restoreCandidateAddOn", inputs: [{ name: "rollupConfig", type: "address" }, { name: "rejectedL2Deposit", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "transferAdmin", inputs: [{ name: "newAdmin", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addManager", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeManager", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "revokeManager", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "revokeRegistrant", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── Layer2Manager ───
  {
    id: "tokamak-layer2-manager",
    name: "Tokamak Layer2Manager",
    description: "Layer2 network management",
    address: "0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D",
    abi: [
      { type: "function", name: "setAddresses", inputs: [{ name: "_l1BridgeRegistry", type: "address" }, { name: "_operatorManagerFactory", type: "address" }, { name: "_ton", type: "address" }, { name: "_wton", type: "address" }, { name: "_dao", type: "address" }, { name: "_depositManager", type: "address" }, { name: "_seigManager", type: "address" }, { name: "_swapProxy", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setOperatorManagerFactory", inputs: [{ name: "_operatorManagerFactory", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "setMinimumInitialDepositAmount", inputs: [{ name: "_minimumInitialDepositAmount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "transferAdmin", inputs: [{ name: "newAdmin", type: "address" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── TON ───
  {
    id: "tokamak-ton",
    name: "Tokamak TON",
    description: "TON token interface",
    address: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
    abi: [
      { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "approveAndCall", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }, { name: "data", type: "bytes" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "transferFrom", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
    ],
  },

  // ─── WTON ───
  {
    id: "tokamak-wton",
    name: "Tokamak WTON",
    description: "Wrapped TON token interface",
    address: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
    abi: [
      { type: "function", name: "swapToTON", inputs: [{ name: "wtonAmount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "swapFromTON", inputs: [{ name: "tonAmount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "swapToTONAndTransfer", inputs: [{ name: "to", type: "address" }, { name: "wtonAmount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "swapFromTONAndTransfer", inputs: [{ name: "to", type: "address" }, { name: "tonAmount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "approveAndCall", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }, { name: "data", type: "bytes" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "transferFrom", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "addMinter", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "decreaseAllowance", inputs: [{ name: "spender", type: "address" }, { name: "subtractedValue", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "increaseAllowance", inputs: [{ name: "spender", type: "address" }, { name: "addedValue", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
      { type: "function", name: "transferOwnership", inputs: [{ name: "target", type: "address" }, { name: "newOwner", type: "address" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },

  // ─── CandidateFactory ───
  {
    id: "tokamak-candidate-factory",
    name: "Tokamak CandidateFactory",
    description: "Candidate contract deployment",
    address: "0x9fc7100a16407ee24a79c834a56e6eca555a5d7c",
    abi: [
      { type: "function", name: "setAddress", inputs: [{ name: "_depositManager", type: "address" }, { name: "_daoCommittee", type: "address" }, { name: "_candidateImp", type: "address" }, { name: "_ton", type: "address" }, { name: "_wton", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "addAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "removeAdmin", inputs: [{ name: "account", type: "address" }], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "transferAdmin", inputs: [{ name: "newAdmin", type: "address" }], outputs: [], stateMutability: "nonpayable" },
    ],
  },
];

// ─── Lookup helpers ───

/** Name aliases for flexible lookup (case-insensitive) */
const NAME_ALIASES: Record<string, string> = {
  seigmanager: "tokamak-seig-manager",
  daocommittee: "tokamak-dao-committee",
  daovault: "tokamak-dao-vault",
  daoagendamanager: "tokamak-dao-agenda-manager",
  depositmanager: "tokamak-deposit-manager",
  layer2registry: "tokamak-layer2-registry",
  l1bridgeregistry: "tokamak-l1-bridge-registry",
  layer2manager: "tokamak-layer2-manager",
  ton: "tokamak-ton",
  wton: "tokamak-wton",
  candidatefactory: "tokamak-candidate-factory",
};

const _byId = new Map(DAO_ACTIONS.map((a) => [a.id, a]));
const _byAddress = new Map(DAO_ACTIONS.map((a) => [a.address.toLowerCase(), a]));

/**
 * Find a DAO action by contract name, id, or address.
 */
export function findDaoAction(nameOrAddress: string): DaoAction | undefined {
  const q = nameOrAddress.trim();

  // By address
  if (q.startsWith("0x") && q.length === 42) {
    return _byAddress.get(q.toLowerCase());
  }

  // By id
  const byId = _byId.get(q);
  if (byId) return byId;

  // By alias (strip spaces, underscores, dashes, case-insensitive)
  const normalized = q.toLowerCase().replace(/[\s_\-]/g, "");
  const aliasId = NAME_ALIASES[normalized];
  if (aliasId) return _byId.get(aliasId);

  // Substring match on name
  const lower = q.toLowerCase();
  return DAO_ACTIONS.find((a) => a.name.toLowerCase().includes(lower));
}

/**
 * Get ABI for a contract by name/address (for encode_calldata).
 */
export function getDaoActionAbi(contractName: string): AbiFunction[] | null {
  const action = findDaoAction(contractName);
  return action ? action.abi : null;
}
