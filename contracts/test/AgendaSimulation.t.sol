// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title Agenda Simulation Fork Test
 * @notice Simulates execution of a DAO agenda by reading targets+bytecodes from
 *         DAOAgendaManager and executing them as DAOCommitteeProxy.
 *
 * Run with:
 *   AGENDA_ID=1 FOUNDRY_PROFILE=fork forge test --match-contract AgendaSimulation --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract AgendaSimulation is Test {
    address constant DAO_COMMITTEE_PROXY = 0xDD9f0cCc044B0781289Ee318e5971b0139602C26;
    address constant DAO_AGENDA_MANAGER = 0xcD4421d082752f363E1687544a09d5112cD4f484;
    address constant TON = 0x2be5e8c109e2197D077D13A82dAead6a9b3433C5;
    address constant WTON = 0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2;
    address constant DAO_VAULT = 0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303;
    address constant SEIG_MANAGER = 0x0b55a0f463b6DEFb81c6063973763951712D0E5F;

    uint256 agendaId;

    IDAOAgendaManager agendaManager = IDAOAgendaManager(DAO_AGENDA_MANAGER);
    IERC20 ton = IERC20(TON);
    IERC20 wton = IERC20(WTON);

    function setUp() public {
        agendaId = vm.envUint("AGENDA_ID");
    }

    function test_SimulateAgenda() public {
        // 1. Get execution info
        (
            address[] memory targets,
            bytes[] memory bytecodes,
            bool atomicExecute
        ) = agendaManager.getExecutionInfo(agendaId);

        require(targets.length > 0, "No targets in agenda");
        require(targets.length == bytecodes.length, "Mismatched targets/bytecodes");

        console.log("=== Agenda Simulation ===");
        console.log("Agenda ID:", agendaId);
        console.log("Targets:", targets.length);
        console.log("Atomic:", atomicExecute);

        // 2. Snapshot key state before execution
        uint256 vaultTon = ton.balanceOf(DAO_VAULT);
        uint256 vaultWton = wton.balanceOf(DAO_VAULT);

        console.log("--- Pre-execution State ---");
        console.log("DAOVault TON:", vaultTon);
        console.log("DAOVault WTON:", vaultWton);

        // 3. Execute each call as DAOCommitteeProxy
        uint256 successCount;
        uint256 failCount;

        for (uint256 i = 0; i < targets.length; i++) {
            console.log("--- Executing call", i, "---");
            console.log("Target:", targets[i]);

            vm.prank(DAO_COMMITTEE_PROXY);
            (bool success, bytes memory returnData) = targets[i].call(bytecodes[i]);

            if (success) {
                successCount++;
                console.log("Result: SUCCESS");
            } else {
                failCount++;
                console.log("Result: REVERTED");

                // If atomic, revert entire transaction
                if (atomicExecute) {
                    revert(string(abi.encodePacked(
                        "Atomic execution failed at call ",
                        vm.toString(i),
                        ": ",
                        _extractRevertReason(returnData)
                    )));
                }
            }
        }

        // 4. Post-execution state diff
        uint256 vaultTonAfter = ton.balanceOf(DAO_VAULT);
        uint256 vaultWtonAfter = wton.balanceOf(DAO_VAULT);

        console.log("--- Post-execution State ---");
        console.log("DAOVault TON:", vaultTonAfter);
        console.log("DAOVault WTON:", vaultWtonAfter);

        int256 tonDiff = int256(vaultTonAfter) - int256(vaultTon);
        int256 wtonDiff = int256(vaultWtonAfter) - int256(vaultWton);

        console.log("--- State Diff ---");
        if (tonDiff != 0) console.log("TON change:", tonDiff > 0 ? "+" : "-", tonDiff > 0 ? uint256(tonDiff) : uint256(-tonDiff));
        if (wtonDiff != 0) console.log("WTON change:", wtonDiff > 0 ? "+" : "-", wtonDiff > 0 ? uint256(wtonDiff) : uint256(-wtonDiff));

        console.log("=== Summary ===");
        console.log("Success:", successCount);
        console.log("Failed:", failCount);

        // Assert at least partial success for non-atomic
        if (!atomicExecute) {
            assertGt(successCount, 0, "At least one call should succeed");
        }
    }

    function _extractRevertReason(bytes memory data) internal pure returns (string memory) {
        if (data.length < 68) return "Unknown reason";
        assembly {
            data := add(data, 0x04)
        }
        return abi.decode(data, (string));
    }
}

// Minimal interfaces
interface IDAOAgendaManager {
    function getExecutionInfo(uint256 agendaID)
        external
        view
        returns (address[] memory targets, bytes[] memory functionBytecodes, bool atomicExecute);

    function agendas(uint256 agendaID)
        external
        view
        returns (
            uint256 id,
            address creator,
            bool executed,
            uint256 createdTimestamp,
            uint256 noticeEndTimestamp,
            uint256 votingPeriodEndTimestamp,
            uint256 executableLimitTimestamp,
            uint256 executedTimestamp,
            uint256 countingYes,
            uint256 countingNo,
            uint256 countingAbstain,
            uint8 status,
            uint8 result
        );

    function numAgendas() external view returns (uint256);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}
