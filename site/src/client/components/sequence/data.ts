import type { Participant, Step, Detail, StateChanges } from "./types";

const MOCK = {
  operator: "0x488f...771B",
  agentId: "0x7a3e...f91d",
  delegationId: "0xb4c8...e0b2",
  proposalId: "48291038...7562",
  metadataURI: "ipfs://QmYx3...agent-v1.json",
  rationaleURI: "ipfs://QmTk7...rationale.json",
  salt: "0xdeadbeef...5678",
  commitHash: "0xa1b2c3d4...3456",
  preferencesURI: "data:application/json;base64,...",
};

export const P: Participant[] = [
  { id: "user", label: "User (EOA)", short: "User", color: "#e0e0e8" },
  { id: "registry", label: "AgentRegistry", short: "Registry", color: "#4a9eff" },
  { id: "delegation", label: "AgentDelegation", short: "Delegation", color: "#22c55e" },
  { id: "governor", label: "Governor", short: "Governor", color: "#eab308" },
  { id: "rationale", label: "RationaleCommit", short: "Rationale", color: "#f97316" },
  { id: "credibility", label: "CredibilityRegistry", short: "Credibility", color: "#a78bfa" },
  { id: "resolver", label: "GovernorResolver", short: "Resolver", color: "#ef4444" },
];

export const STEPS: Step[] = [
  {
    id: 0, title: "Step 0", subtitle: "Register Agent",
    arrows: [
      { from: 0, to: 1, label: "registerAgent(metadataURI)", type: "call", detailId: 0 },
      { from: 1, to: 0, label: "agentId", type: "return" },
    ],
  },
  {
    id: 1, title: "Step 1", subtitle: "Delegate",
    arrows: [
      { from: 0, to: 2, label: "delegateToAgent(agentId, expiry, prefsURI)", type: "call", detailId: 1 },
      { from: 2, to: 1, label: "isActiveAgent(agentId)", type: "subcall" },
      { from: 1, to: 2, label: "true", type: "subreturn" },
      { from: 2, to: 0, label: "delegationId", type: "return" },
    ],
  },
  {
    id: 2, title: "Step 2", subtitle: "Create Proposal",
    arrows: [
      { from: 0, to: 3, label: "propose(targets, values, calldatas, desc)", type: "call", detailId: 2 },
      { from: 3, to: 0, label: "proposalId", type: "return" },
    ],
  },
  {
    id: 3, title: "Step 3a", subtitle: "Commit Rationale",
    arrows: [
      { from: 0, to: 4, label: "commitRationale(agentId, proposalId, commitHash)", type: "call", detailId: 3 },
      { from: 4, to: 1, label: "agentOperator(agentId)", type: "subcall" },
      { from: 1, to: 4, label: "operator", type: "subreturn" },
      { from: 4, to: 0, label: "\u2713", type: "return" },
    ],
  },
  {
    id: 4, title: "Step 3b", subtitle: "Record Prediction",
    arrows: [
      { from: 0, to: 5, label: "recordPrediction(agentId, proposalId, 1, 85)", type: "call", detailId: 4 },
      { from: 5, to: 1, label: "agentOperator(agentId)", type: "subcall" },
      { from: 1, to: 5, label: "operator", type: "subreturn" },
      { from: 5, to: 0, label: "\u2713", type: "return" },
    ],
  },
  {
    id: 5, title: "Step 4", subtitle: "Vote",
    arrows: [
      { from: 0, to: 3, label: "castVote(proposalId, For)", type: "call", detailId: 5 },
      { from: 3, to: 0, label: "\u2713", type: "return" },
    ],
  },
  {
    id: 6, title: "Step 5", subtitle: "Reveal Rationale",
    arrows: [
      { from: 0, to: 4, label: "revealRationale(agentId, proposalId, URI, salt)", type: "call", detailId: 6 },
      { from: 4, to: 1, label: "agentOperator(agentId)", type: "subcall" },
      { from: 1, to: 4, label: "operator", type: "subreturn" },
      { from: 4, to: 4, label: "verify hash", type: "self" },
      { from: 4, to: 0, label: "\u2713", type: "return" },
    ],
  },
  {
    id: 7, title: "Step 6", subtitle: "Resolve",
    arrows: [
      { from: 0, to: 6, label: "resolve(credibility, agentId, proposalId, govPropId)", type: "call", detailId: 7 },
      { from: 6, to: 3, label: "state(govProposalId)", type: "subcall" },
      { from: 3, to: 6, label: "Succeeded", type: "subreturn" },
      { from: 6, to: 5, label: "resolvePrediction(agentId, proposalId, 1)", type: "subcall", detailId: 8 },
      { from: 5, to: 5, label: "computeDelta \u2192 +3", type: "self" },
      { from: 5, to: 6, label: "\u2713", type: "subreturn" },
      { from: 6, to: 0, label: "\u2713", type: "return" },
    ],
  },
  {
    id: 8, title: "Step 7", subtitle: "View Credibility",
    arrows: [
      { from: 0, to: 5, label: "getCredibility(agentId)  [view]", type: "call", detailId: 9 },
      { from: 5, to: 0, label: "(totalScore=3, totalPredictions=1)", type: "return" },
    ],
  },
];

export const DETAILS: Detail[] = [
  /* 0: registerAgent */
  {
    title: "AgentRegistry.registerAgent()",
    signature: "function registerAgent(string calldata metadataURI) external returns (bytes32 agentId)",
    params: [
      { name: "metadataURI", value: MOCK.metadataURI, desc: "AI agent profile JSON URI" },
    ],
    logic: [
      "uint256 nonce = operatorNonce[msg.sender]++",
      "agentId = keccak256(abi.encodePacked(msg.sender, nonce))",
      "_agents[agentId] = Agent(msg.sender, metadataURI, true)",
    ],
    returns: [{ name: "agentId", value: MOCK.agentId, type: "bytes32" }],
    events: ["AgentRegistered(agentId, msg.sender, metadataURI)"],
    storage: [
      { slot: "agents[agentId].operator", before: "\u2205", after: MOCK.operator },
      { slot: "agents[agentId].metadataURI", before: '""', after: '"ipfs://QmYx3..."' },
      { slot: "agents[agentId].active", before: "false", after: "true" },
      { slot: "operatorNonce[operator]", before: "0", after: "1" },
    ],
  },
  /* 1: delegateToAgent */
  {
    title: "AgentDelegation.delegateToAgent()",
    signature: "function delegateToAgent(bytes32 agentId, uint256 expiry, string calldata preferencesURI) external returns (bytes32)",
    params: [
      { name: "agentId", value: MOCK.agentId, desc: "Registered agent ID" },
      { name: "expiry", value: "block.timestamp + 30 days", desc: "Delegation expiry timestamp" },
      { name: "preferencesURI", value: MOCK.preferencesURI, desc: "Delegator preferences JSON URI" },
    ],
    logic: [
      "\u2460 registry.isActiveAgent(agentId) \u2190 verify agent is active",
      "\u2461 auto-revoke existing delegation if any",
      "\u2462 delegationId = keccak256(msg.sender, nonce++)",
      "\u2463 _delegations[delegationId] = create new delegation",
    ],
    returns: [{ name: "delegationId", value: MOCK.delegationId, type: "bytes32" }],
    events: ["AgentDelegationCreated(msg.sender, agentId, delegationId, expiry)"],
    storage: [
      { slot: "delegations[delegId].agentId", before: "\u2205", after: MOCK.agentId },
      { slot: "delegations[delegId].expiry", before: "0", after: "1743000000" },
      { slot: "delegations[delegId].preferencesURI", before: '""', after: '"data:..."' },
      { slot: "activeDelegation[delegator]", before: "\u2205", after: MOCK.delegationId },
    ],
  },
  /* 2: propose */
  {
    title: "Governor.propose()",
    signature: "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256)",
    params: [
      { name: "targets", value: "[address(0)]", desc: "Target contracts" },
      { name: "description", value: '"Upgrade treasury allocation for Q3"', desc: "Proposal description" },
    ],
    logic: [
      "proposalId = hashProposal(targets, values, calldatas, keccak256(description))",
      "_proposals[proposalId].voteStart = block.number + votingDelay",
      "_proposals[proposalId].voteEnd = voteStart + votingPeriod",
    ],
    returns: [{ name: "proposalId", value: MOCK.proposalId, type: "uint256" }],
    events: ["ProposalCreated(proposalId, proposer, targets, values, calldatas, voteStart, voteEnd, description)"],
    storage: [
      { slot: "proposals[propId].voteStart", before: "0", after: "block.number + 1" },
      { slot: "proposals[propId].voteEnd", before: "0", after: "voteStart + 100" },
    ],
  },
  /* 3: commitRationale */
  {
    title: "RationaleCommitment.commitRationale()",
    signature: "function commitRationale(bytes32 agentId, uint256 proposalId, bytes32 commitHash) external",
    params: [
      { name: "agentId", value: MOCK.agentId, desc: "Agent ID" },
      { name: "proposalId", value: MOCK.proposalId, desc: "Proposal ID" },
      { name: "commitHash", value: MOCK.commitHash, desc: "keccak256(rationaleURI || salt)" },
    ],
    logic: [
      "\u2460 onlyAgentOperator: registry.agentOperator(agentId) == msg.sender",
      "\u2461 require: no existing commit (prevent double commit)",
      "\u2462 _commitments[agentId][proposalId] = Commitment(commitHash, block.timestamp, false)",
    ],
    returns: [],
    events: ["RationaleCommitted(agentId, proposalId, commitHash, block.timestamp)"],
    storage: [
      { slot: "commitments[agent][prop].commitHash", before: "\u2205", after: MOCK.commitHash },
      { slot: "commitments[agent][prop].timestamp", before: "0", after: "1740000000" },
      { slot: "commitments[agent][prop].revealed", before: "false", after: "false" },
    ],
  },
  /* 4: recordPrediction */
  {
    title: "CredibilityRegistry.recordPrediction()",
    signature: "function recordPrediction(bytes32 agentId, uint256 proposalId, uint8 verdict, uint8 score) external",
    params: [
      { name: "agentId", value: MOCK.agentId, desc: "Agent ID" },
      { name: "proposalId", value: MOCK.proposalId, desc: "Proposal ID" },
      { name: "verdict", value: "1 (For)", desc: "Predicted vote direction" },
      { name: "score", value: "85", desc: "Confidence (0-100)" },
    ],
    logic: [
      "\u2460 onlyAgentOperator: registry.agentOperator(agentId) == msg.sender",
      "\u2461 require: score <= 100",
      "\u2462 require: no existing prediction",
      "\u2463 _predictions[agentId][proposalId] = Prediction(1, 85, true, false, 0)",
    ],
    returns: [],
    events: ["PredictionRecorded(agentId, proposalId, verdict=1, score=85)"],
    storage: [
      { slot: "predictions[agent][prop].verdict", before: "\u2205", after: "1 (For)" },
      { slot: "predictions[agent][prop].score", before: "0", after: "85" },
      { slot: "predictions[agent][prop].exists", before: "false", after: "true" },
      { slot: "predictions[agent][prop].resolved", before: "-", after: "false" },
    ],
  },
  /* 5: castVote */
  {
    title: "Governor.castVote()",
    signature: "function castVote(uint256 proposalId, uint8 support) external returns (uint256)",
    params: [
      { name: "proposalId", value: MOCK.proposalId, desc: "Proposal ID" },
      { name: "support", value: "1 (For)", desc: "0=Against, 1=For, 2=Abstain" },
    ],
    logic: [
      "\u2460 require: state(proposalId) == Active",
      "\u2461 require: !hasVoted[proposalId][msg.sender]",
      "\u2462 weight = getVotes(msg.sender, proposalSnapshot)",
      "\u2463 _countVote(proposalId, msg.sender, support, weight)",
    ],
    returns: [{ name: "weight", value: "1000000", type: "uint256" }],
    events: ['VoteCast(voter, proposalId, support=1, weight, reason="")'],
    storage: [
      { slot: "hasVoted[propId][voter]", before: "false", after: "true" },
      { slot: "proposalVotes[propId].forVotes", before: "0", after: "1000000" },
    ],
  },
  /* 6: revealRationale */
  {
    title: "RationaleCommitment.revealRationale()",
    signature: "function revealRationale(bytes32 agentId, uint256 proposalId, string calldata rationaleURI, bytes32 salt) external",
    params: [
      { name: "agentId", value: MOCK.agentId, desc: "Agent ID" },
      { name: "proposalId", value: MOCK.proposalId, desc: "Proposal ID" },
      { name: "rationaleURI", value: MOCK.rationaleURI, desc: "Rationale document URI" },
      { name: "salt", value: MOCK.salt, desc: "Random value used during commit" },
    ],
    logic: [
      "\u2460 onlyAgentOperator: registry.agentOperator(agentId) == msg.sender",
      "\u2461 computed = keccak256(abi.encodePacked(rationaleURI, salt))",
      "\u2462 require: computed == commitments[agentId][proposalId].commitHash",
      "\u2463 any change causes hash mismatch \u2192 revert",
    ],
    returns: [],
    events: ["RationaleRevealed(agentId, proposalId, rationaleURI)"],
    storage: [
      { slot: "commitments[agent][prop].revealed", before: "false", after: "true" },
      { slot: "commitments[agent][prop].rationaleURI", before: '""', after: MOCK.rationaleURI },
    ],
  },
  /* 7: resolve (GovernorResolver) */
  {
    title: "GovernorResolver.resolve()",
    signature: "function resolve(ICredibilityRegistry credibility, bytes32 agentId, uint256 proposalId, uint256 govProposalId) external",
    params: [
      { name: "credibility", value: "0x7782...941F", desc: "CredibilityRegistry address" },
      { name: "agentId", value: MOCK.agentId, desc: "Agent ID" },
      { name: "proposalId", value: MOCK.proposalId, desc: "Proposal ID" },
      { name: "govProposalId", value: MOCK.proposalId, desc: "Governor proposal ID" },
    ],
    logic: [
      "\u2460 state = governor.state(govProposalId)",
      "\u2461 Succeeded/Executed \u2192 outcome=1, Defeated/Canceled \u2192 outcome=0",
      "\u2462 Pending/Active/Queued \u2192 revert ProposalNotFinalized",
      "\u2463 credibility.resolvePrediction(agentId, proposalId, outcome)",
    ],
    returns: [],
    events: ["(events emitted by CredibilityRegistry)"],
    storage: [],
  },
  /* 8: resolvePrediction (CredibilityRegistry) */
  {
    title: "CredibilityRegistry.resolvePrediction()",
    signature: "function resolvePrediction(bytes32 agentId, uint256 proposalId, uint8 actualOutcome) external",
    params: [
      { name: "agentId", value: MOCK.agentId, desc: "Agent ID" },
      { name: "proposalId", value: MOCK.proposalId, desc: "Proposal ID" },
      { name: "actualOutcome", value: "1 (positive)", desc: "0=negative, 1=positive" },
    ],
    logic: [
      "\u2460 onlyResolver: msg.sender == resolver (GovernorResolver)",
      "\u2461 prediction = _predictions[agentId][proposalId]",
      "\u2462 highConf = (score >= 70) = true",
      "\u2463 correct = (verdict >= 1) == (outcome == 1) = true",
      "\u2464 delta = deltas[0] = +3 (high confidence + correct)",
      "\u2465 credibility[agentId].totalScore += 3",
    ],
    returns: [],
    events: ["PredictionResolved(agentId, proposalId, delta=+3)"],
    storage: [
      { slot: "predictions[agent][prop].resolved", before: "false", after: "true" },
      { slot: "predictions[agent][prop].delta", before: "0", after: "+3" },
      { slot: "credibility[agentId].totalScore", before: "0", after: "3" },
      { slot: "credibility[agentId].totalPredictions", before: "0", after: "1" },
    ],
  },
  /* 9: getCredibility */
  {
    title: "CredibilityRegistry.getCredibility()  [view]",
    signature: "function getCredibility(bytes32 agentId) external view returns (int256 totalScore, uint256 totalPredictions)",
    params: [
      { name: "agentId", value: MOCK.agentId, desc: "Agent ID" },
    ],
    logic: [
      "return _credibility[agentId]",
      "No transaction \u2014 pure read call",
    ],
    returns: [
      { name: "totalScore", value: "3", type: "int256" },
      { name: "totalPredictions", value: "1", type: "uint256" },
    ],
    events: [],
    storage: [],
  },
];

export const STATE_CHANGES: StateChanges[] = [
  /* step 0 */ {
    AgentRegistry: [
      { k: "agents[0x7a3e..].operator", v: MOCK.operator },
      { k: "agents[0x7a3e..].metadataURI", v: '"ipfs://QmYx3..."' },
      { k: "agents[0x7a3e..].active", v: "true" },
      { k: "operatorNonce[0x488f..]", v: "1" },
    ],
  },
  /* step 1 */ {
    AgentDelegation: [
      { k: "delegations[0xb4c8..].agentId", v: "0x7a3e..f91d" },
      { k: "delegations[0xb4c8..].expiry", v: "1743000000" },
      { k: "activeDelegation[0x488f..]", v: "0xb4c8..e0b2" },
    ],
  },
  /* step 2 */ {
    Governor: [
      { k: "proposals[4829..].voteStart", v: "block.number + 1" },
      { k: "proposals[4829..].voteEnd", v: "voteStart + 100" },
    ],
  },
  /* step 3 */ {
    RationaleCommitment: [
      { k: "commitments[agent][prop].commitHash", v: "0xa1b2..3456" },
      { k: "commitments[agent][prop].timestamp", v: "1740000000" },
    ],
  },
  /* step 4 */ {
    CredibilityRegistry: [
      { k: "predictions[agent][prop].verdict", v: "1 (For)" },
      { k: "predictions[agent][prop].score", v: "85" },
      { k: "predictions[agent][prop].exists", v: "true" },
    ],
  },
  /* step 5 */ {
    Governor: [
      { k: "hasVoted[propId][voter]", v: "true" },
      { k: "proposalVotes[propId].forVotes", v: "1000000" },
    ],
  },
  /* step 6 */ {
    RationaleCommitment: [
      { k: "commitments[agent][prop].revealed", v: "true" },
      { k: 'commitments[agent][prop].rationaleURI', v: '"ipfs://QmTk7..."' },
    ],
  },
  /* step 7 */ {
    CredibilityRegistry: [
      { k: "predictions[agent][prop].resolved", v: "true" },
      { k: "predictions[agent][prop].delta", v: "+3" },
      { k: "credibility[agentId].totalScore", v: "3" },
      { k: "credibility[agentId].totalPredictions", v: "1" },
    ],
  },
  /* step 8 */ {},
];

/* ── Layout constants ── */
export const COL_GAP = 155;
export const COL_START = 75;
export const COLS = P.map((_, i) => COL_START + i * COL_GAP);
export const SVG_W = COLS[COLS.length - 1] + COL_START + 20;
export const HEADER_H = 55;
export const ROW_H = 28;
export const STEP_GAP = 18;
export const SELF_H = 22;

/* Compute Y positions per step */
interface StepLayout {
  startY: number;
  arrowYs: number[];
}

function computeStepLayouts(): { layouts: StepLayout[]; svgH: number } {
  let curY = HEADER_H + 20;
  const layouts: StepLayout[] = [];
  for (const step of STEPS) {
    const startY = curY;
    curY += 22;
    const arrowYs: number[] = [];
    for (const a of step.arrows) {
      arrowYs.push(curY);
      curY += a.type === "self" ? SELF_H + 4 : ROW_H;
    }
    layouts.push({ startY, arrowYs });
    curY += STEP_GAP;
  }
  return { layouts, svgH: curY + 10 };
}

export const { layouts: STEP_LAYOUTS, svgH: SVG_H } = computeStepLayouts();

export const CONTRACT_COLORS: Record<string, string> = {
  AgentRegistry: "#4a9eff",
  AgentDelegation: "#22c55e",
  Governor: "#eab308",
  RationaleCommitment: "#f97316",
  CredibilityRegistry: "#a78bfa",
};
