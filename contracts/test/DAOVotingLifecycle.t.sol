// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title DAO Voting Lifecycle Fork Test
 * @notice Tests the full DAO agenda lifecycle: query members → create agenda → vote → execute
 *         Also tests rejection/expiry scenarios.
 *
 * Run with:
 *   FOUNDRY_PROFILE=fork forge test --match-contract DAOVotingLifecycle --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract DAOVotingLifecycle is Test {
    address constant DAO_COMMITTEE_PROXY = 0xDD9f0cCc044B0781289Ee318e5971b0139602C26;
    address constant DAO_AGENDA_MANAGER = 0xcD4421d082752f363E1687544a09d5112cD4f484;
    address constant TON = 0x2be5e8c109e2197D077D13A82dAead6a9b3433C5;
    address constant WTON = 0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2;
    address constant DAO_VAULT = 0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303;
    address constant SEIG_MANAGER_PROXY = 0x0b55a0f463b6DEFb81c6063973763951712D0E5F;

    IDAOCommittee dao = IDAOCommittee(DAO_COMMITTEE_PROXY);
    IDAOAgendaManager agendaManager = IDAOAgendaManager(DAO_AGENDA_MANAGER);
    ITON ton = ITON(TON);
    IERC20 wton = IERC20(WTON);

    // ===================================================================
    // Test 1: Query current committee state
    // ===================================================================
    function test_QueryCommitteeState() public view {
        uint256 maxMember = dao.maxMember();
        uint256 quorum = dao.quorum();

        console.log("=== Committee State ===");
        console.log("maxMember:", maxMember);
        console.log("quorum:", quorum);

        // List current members
        for (uint256 i = 0; i < maxMember; i++) {
            try dao.members(i) returns (address member) {
                console.log("Member slot", i, ":", member);
                if (member != address(0)) {
                    bool isMem = dao.isMember(member);
                    console.log("  isMember:", isMem);
                }
            } catch {
                console.log("Member slot", i, ": (empty/reverted)");
            }
        }

        // Check agenda count
        uint256 totalAgendas = agendaManager.totalAgendas();
        console.log("Total agendas:", totalAgendas);

        // Check fee
        uint256 fee = agendaManager.createAgendaFees();
        console.log("Agenda creation fee (TON):", fee);

        assertGe(maxMember, 1, "Should have at least 1 member slot");
        assertGe(quorum, 1, "Quorum should be at least 1");
    }

    // ===================================================================
    // Test 2: Full voting lifecycle — create, vote YES, execute
    // ===================================================================
    function test_FullVotingLifecycle_Accept() public {
        // Setup: We'll create a no-op agenda (call a view function)
        // Target: DAOAgendaManager.totalAgendas() — harmless view call
        address[] memory targets = new address[](1);
        targets[0] = DAO_AGENDA_MANAGER;
        bytes[] memory bytecodes = new bytes[](1);
        bytecodes[0] = abi.encodeWithSignature("totalAgendas()");
        uint128 noticePeriod = uint128(agendaManager.minimumNoticePeriodSeconds());
        uint128 votingPeriod = uint128(agendaManager.minimumVotingPeriodSeconds());

        // Step 1: Create agenda via onApprove (simulating TON.approveAndCall)
        uint256 fee = agendaManager.createAgendaFees();
        address creator = makeAddr("creator");
        deal(TON, creator, fee);

        // Encode agenda data for onApprove
        bytes memory agendaCalldata = abi.encode(
            targets,
            noticePeriod,
            votingPeriod,
            true, // atomicExecute
            bytecodes
        );

        // Simulate TON.approveAndCall → DAOCommittee.onApprove
        vm.prank(creator);
        ton.approve(DAO_COMMITTEE_PROXY, fee);

        // Call onApprove as if TON called it
        vm.prank(TON);
        bool created = dao.onApprove(creator, DAO_COMMITTEE_PROXY, fee, agendaCalldata);
        assertTrue(created, "Agenda creation should succeed");

        uint256 agendaId = agendaManager.totalAgendas() - 1;
        console.log("Created agenda ID:", agendaId);

        // Step 2: Skip notice period
        vm.warp(block.timestamp + noticePeriod + 1);

        // Step 3: Cast votes from committee members (need quorum YES votes)
        uint256 maxMember = dao.maxMember();
        uint256 quorum = dao.quorum();
        uint256 yesVotes;

        for (uint256 i = 0; i < maxMember && yesVotes < quorum; i++) {
            address member = dao.members(i);
            if (member == address(0)) continue;

            address candidateContract = dao.candidateContract(member);
            if (candidateContract == address(0)) continue;

            // Cast YES vote (1) via candidate contract
            vm.prank(member);
            ICandidate(candidateContract).castVote(agendaId, 1, "approve");
            yesVotes++;
            console.log("Vote cast by member:", member, "via", candidateContract);
        }

        assertGe(yesVotes, quorum, "Should have reached quorum");

        // Step 4: End voting period
        vm.warp(block.timestamp + votingPeriod + 1);

        // Step 5: Execute agenda
        dao.executeAgenda(agendaId);
        console.log("Agenda executed successfully");
    }

    // ===================================================================
    // Test 3: Rejection scenario — majority NO votes
    // ===================================================================
    function test_VotingRejection() public {
        // Create a simple agenda
        address[] memory targets = new address[](1);
        targets[0] = DAO_AGENDA_MANAGER;
        bytes[] memory bytecodes = new bytes[](1);
        bytecodes[0] = abi.encodeWithSignature("totalAgendas()");
        uint128 noticePeriod = uint128(agendaManager.minimumNoticePeriodSeconds());
        uint128 votingPeriod = uint128(agendaManager.minimumVotingPeriodSeconds());

        uint256 fee = agendaManager.createAgendaFees();
        address creator = makeAddr("creator2");
        deal(TON, creator, fee);

        bytes memory agendaCalldata = abi.encode(
            targets, noticePeriod, votingPeriod, true, bytecodes
        );

        vm.prank(creator);
        ton.approve(DAO_COMMITTEE_PROXY, fee);
        vm.prank(TON);
        dao.onApprove(creator, DAO_COMMITTEE_PROXY, fee, agendaCalldata);

        uint256 agendaId = agendaManager.totalAgendas() - 1;

        // Skip notice period
        vm.warp(block.timestamp + noticePeriod + 1);

        // Cast NO votes (vote=2) until quorum
        uint256 maxMember = dao.maxMember();
        uint256 quorum = dao.quorum();
        uint256 noVotes;

        for (uint256 i = 0; i < maxMember && noVotes < quorum; i++) {
            address member = dao.members(i);
            if (member == address(0)) continue;

            address candidateContract = dao.candidateContract(member);
            if (candidateContract == address(0)) continue;

            vm.prank(member);
            ICandidate(candidateContract).castVote(agendaId, 2, "reject");
            noVotes++;
        }

        // Check status — should be ENDED with REJECT result
        (uint256 result, uint256 status) = dao.currentAgendaStatus(agendaId);
        console.log("Agenda result:", result); // 2 = REJECT
        console.log("Agenda status:", status); // 4 = ENDED

        // Should NOT be executable
        vm.expectRevert();
        dao.executeAgenda(agendaId);
        console.log("Rejected agenda correctly cannot be executed");
    }

    // ===================================================================
    // Test 4: Read all historical agendas
    // ===================================================================
    function test_ReadAllHistoricalAgendas() public view {
        uint256 total = agendaManager.totalAgendas();
        console.log("Total historical agendas:", total);

        for (uint256 i = 0; i < total; i++) {
            (uint256 result, uint256 status) = dao.currentAgendaStatus(i);
            console.log("Agenda", i, "status:", status);
            console.log("  result:", result);
        }
    }
}

// ===================================================================
// Interfaces
// ===================================================================

interface IDAOCommittee {
    function maxMember() external view returns (uint256);
    function quorum() external view returns (uint256);
    function members(uint256 index) external view returns (address);
    function isMember(address _candidate) external view returns (bool);
    function candidateContract(address _candidate) external view returns (address);
    function candidatesLength() external view returns (uint256);
    function onApprove(address owner, address spender, uint256 amount, bytes calldata data) external returns (bool);
    function castVote(uint256 _agendaID, uint256 _vote, string calldata _comment) external;
    function executeAgenda(uint256 _agendaID) external;
    function currentAgendaStatus(uint256 _agendaID) external view returns (uint256 agendaResult, uint256 agendaStatus);
    function activityRewardPerSecond() external view returns (uint256);
    function getClaimableActivityReward(address _candidate) external view returns (uint256);
}

interface IDAOAgendaManager {
    function totalAgendas() external view returns (uint256);
    function createAgendaFees() external view returns (uint256);
    function minimumNoticePeriodSeconds() external view returns (uint256);
    function minimumVotingPeriodSeconds() external view returns (uint256);
    function executingPeriodSeconds() external view returns (uint256);
    function getExecutionInfo(uint256 agendaID)
        external view returns (address[] memory targets, bytes[] memory functionBytecodes, bool atomicExecute);
}

interface ITON {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

interface ICandidate {
    function castVote(uint256 _agendaID, uint256 _vote, string calldata _comment) external;
    function candidate() external view returns (address);
    function updateSeigniorage() external returns (bool);
}
