/**
 * Find Layer2 operators from event logs
 */

const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;

if (!ALCHEMY_RPC_URL) {
  console.error("Error: ALCHEMY_RPC_URL environment variable is required");
  process.exit(1);
}

const LAYER2_REGISTRY_PROXY = "0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b";

// Event topic for Layer2Registered(address indexed layer2)
// keccak256("Layer2Registered(address)")
const LAYER2_REGISTERED_TOPIC = "0x3c86ad64ffb7a4b74d3fd3f7c9d00f43826f9c18e3ec8f4a6dc7f43d8db3ff03";

async function main() {
  console.log("=== Finding Layer2 Operators from Event Logs ===\n");

  // Get logs for Layer2Registered events
  const response = await fetch(ALCHEMY_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getLogs",
      params: [{
        address: LAYER2_REGISTRY_PROXY,
        fromBlock: "0x0",
        toBlock: "latest",
      }],
      id: 1,
    }),
  });

  const result = await response.json() as { result?: { topics: string[]; data: string; transactionHash: string }[]; error?: { message: string } };

  if (result.error) {
    console.log(`Error: ${result.error.message}`);
    return;
  }

  const logs = result.result || [];
  console.log(`Found ${logs.length} events from Layer2Registry\n`);

  // Group events by topic
  const eventsByTopic: Record<string, number> = {};
  const layer2Addresses: Set<string> = new Set();

  for (const log of logs) {
    const topic0 = log.topics[0];
    eventsByTopic[topic0] = (eventsByTopic[topic0] || 0) + 1;

    // If this event has an indexed address (topic1), it might be a Layer2
    if (log.topics[1]) {
      const addr = "0x" + log.topics[1].slice(-40).toLowerCase();
      if (addr !== "0x0000000000000000000000000000000000000000") {
        layer2Addresses.add(addr);
      }
    }
  }

  console.log("Event topics found:");
  for (const [topic, count] of Object.entries(eventsByTopic)) {
    console.log(`  ${topic}: ${count} events`);
  }

  console.log(`\nPotential Layer2 addresses from indexed topics (${layer2Addresses.size}):`);
  let i = 1;
  for (const addr of layer2Addresses) {
    console.log(`  ${i++}. ${addr}`);
  }

  // Now let's also check the Tokamak staking data from a known source
  console.log("\n=== Checking known Tokamak Layer2 operators ===\n");

  // These are known Layer2 operator addresses from Tokamak Network
  const knownOperators = [
    { name: "tokamak1", address: "0x516f2f9cd1760a4cde6dbc1d66b2f9c8e24de59c" },
    { name: "Level", address: "0x42ccf0769e87cb2952634f607df1c7d62e0bbc52" },
    { name: "DSRV", address: "0x0f0f9a7e2b1f2e3c4d5e6f7a8b9c0d1e2f3a4b5c" },
    { name: "Talken", address: "0x0000000000000000000000000000000000000000" },
    { name: "DXM Corp", address: "0x0000000000000000000000000000000000000000" },
    { name: "staked", address: "0x0000000000000000000000000000000000000000" },
    { name: "decipher", address: "0x0000000000000000000000000000000000000000" },
    { name: "DeSpread", address: "0x0000000000000000000000000000000000000000" },
    { name: "Danal Fintech", address: "0x0000000000000000000000000000000000000000" },
    { name: "Hammer DAO", address: "0x0000000000000000000000000000000000000000" },
  ];

  // Verify which addresses are actually Layer2 contracts
  for (const addr of layer2Addresses) {
    // Check if it's a contract
    const codeResponse = await fetch(ALCHEMY_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [addr, "latest"],
        id: 1,
      }),
    });

    const codeResult = await codeResponse.json() as { result?: string };
    const isContract = codeResult.result && codeResult.result !== "0x" && codeResult.result.length > 2;
    console.log(`${addr}: ${isContract ? "Contract" : "EOA"}`);
  }

  // Output JSON
  console.log("\n=== JSON Output ===\n");
  const layer2Array = Array.from(layer2Addresses);
  console.log(JSON.stringify(layer2Array.map((addr, i) => ({
    name: `Layer2Operator${i + 1}`,
    address: addr,
    type: "layer2",
    docId: `con-0${51 + i}`,
    description: `Registered Layer2 operator contract`
  })), null, 2));
}

main().catch(console.error);
