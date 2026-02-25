// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../test/governance/mocks/MockERC20Votes.sol";
import "../test/governance/mocks/MockGovernor.sol";
import "../src/governance/AgentRegistry.sol";
import "../src/governance/AgentDelegation.sol";
import "../src/governance/RationaleCommitment.sol";
import "../src/governance/CredibilityRegistry.sol";
import "../src/governance/examples/GovernorResolver.sol";
import "../src/governance/examples/GovernorAgentDelegation.sol";

/// @title DeploySepolia
/// @notice Deploys all ERC AI Governance contracts to Sepolia testnet.
/// @dev Deployment order follows dependency graph:
///      1. MockERC20Votes (no deps)
///      2. MockGovernor (needs token)
///      3. AgentRegistry (no deps)
///      4. AgentDelegation (needs registry)
///      5. RationaleCommitment (needs registry)
///      6. GovernorResolver (needs governor)
///      7. CredibilityRegistry (needs registry + resolver)
///      8. GovernorAgentDelegation (needs registry + token)
///
/// Usage:
///   forge script script/DeploySepolia.s.sol:DeploySepolia \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast --verify \
///     --etherscan-api-key $ETHERSCAN_API_KEY
contract DeploySepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. Token
        MockERC20Votes token = new MockERC20Votes();
        console.log("MockERC20Votes:", address(token));

        // 2. Governor (votingDelay=1, votingPeriod=100, quorum=1e18)
        MockGovernor governor = new MockGovernor(
            IVotes(address(token)),
            1,    // votingDelay: 1 block
            100,  // votingPeriod: 100 blocks (~20 min on Sepolia)
            1e18  // quorum: 1 token
        );
        console.log("MockGovernor:", address(governor));

        // 3. AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry:", address(registry));

        // 4. AgentDelegation
        AgentDelegation delegation = new AgentDelegation(address(registry));
        console.log("AgentDelegation:", address(delegation));

        // 5. RationaleCommitment
        RationaleCommitment rationale = new RationaleCommitment(address(registry));
        console.log("RationaleCommitment:", address(rationale));

        // 6. GovernorResolver (needs governor)
        GovernorResolver resolver = new GovernorResolver(address(governor));
        console.log("GovernorResolver:", address(resolver));

        // 7. CredibilityRegistry
        //    deltas: [highConf+correct=+3, lowConf+correct=+1, highConf+wrong=-2, lowConf+wrong=-1]
        int8[4] memory deltas = [int8(3), int8(1), int8(-2), int8(-1)];
        CredibilityRegistry credibility = new CredibilityRegistry(
            address(registry),
            address(resolver),  // only resolver can finalize
            70,                 // highConfidenceThreshold
            1,                  // verdictPositiveThreshold (Governor: 1=For)
            deltas
        );
        console.log("CredibilityRegistry:", address(credibility));

        // 8. GovernorAgentDelegation
        GovernorAgentDelegation govDelegation = new GovernorAgentDelegation(
            address(registry),
            address(token)
        );
        console.log("GovernorAgentDelegation:", address(govDelegation));

        // Mint tokens to deployer for testing (100 tokens)
        token.mint(deployer, 100e18);
        console.log("Minted 100 MTK to deployer");

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== Deployment Summary ===");
        console.log("MockERC20Votes:       ", address(token));
        console.log("MockGovernor:         ", address(governor));
        console.log("AgentRegistry:      ", address(registry));
        console.log("AgentDelegation:         ", address(delegation));
        console.log("RationaleCommitment:  ", address(rationale));
        console.log("GovernorResolver:     ", address(resolver));
        console.log("CredibilityRegistry:  ", address(credibility));
        console.log("GovernorAgentDelegation: ", address(govDelegation));
    }
}
