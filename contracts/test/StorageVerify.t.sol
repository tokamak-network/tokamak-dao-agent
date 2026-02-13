// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title Storage Verification Fork Test
 * @notice Diagnoses daoSeigRate storage slot location on SeigManagerProxy
 *
 * Run with: FOUNDRY_PROFILE=fork forge test --match-test testDaoSeigRateSlot --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract StorageVerify is Test {
    address constant SEIG_MANAGER_PROXY = 0x0b55a0f463b6DEFb81c6063973763951712D0E5F;

    function testDaoSeigRateSlot() public {
        // Get the actual value via function call (correct regardless of slot)
        uint256 valueFromCall = ISeigManagerFull(SEIG_MANAGER_PROXY).daoSeigRate();
        emit log_named_uint("daoSeigRate() from call", valueFromCall);

        // Also read related rates for context
        uint256 powerTONRate = ISeigManagerFull(SEIG_MANAGER_PROXY).powerTONSeigRate();
        uint256 relativeRate = ISeigManagerFull(SEIG_MANAGER_PROXY).relativeSeigRate();
        uint256 seigPerBlock = ISeigManagerFull(SEIG_MANAGER_PROXY).seigPerBlock();
        emit log_named_uint("powerTONSeigRate() from call", powerTONRate);
        emit log_named_uint("relativeSeigRate() from call", relativeRate);
        emit log_named_uint("seigPerBlock() from call", seigPerBlock);

        // Read raw storage at slots 24-32 to find where daoSeigRate actually lives
        for (uint256 i = 24; i <= 32; i++) {
            bytes32 val = vm.load(SEIG_MANAGER_PROXY, bytes32(i));
            emit log_named_bytes32(string(abi.encodePacked("slot ", vm.toString(i))), val);
        }

        // The function call result should be non-zero
        assertGt(valueFromCall, 0, "daoSeigRate should be non-zero");

        // Also verify calling the implementation directly returns 0 (uninitialized storage)
        address impl = ISeigManagerFull(SEIG_MANAGER_PROXY).implementation();
        emit log_named_address("implementation address", impl);
    }

    function testAllSeigRatesAndSlots() public {
        // Comprehensive slot check: read slots 0-32 and log all non-zero
        emit log_string("=== Raw storage slots 0-32 on SeigManagerProxy ===");
        for (uint256 i = 0; i <= 32; i++) {
            bytes32 val = vm.load(SEIG_MANAGER_PROXY, bytes32(i));
            if (uint256(val) != 0) {
                emit log_named_bytes32(string(abi.encodePacked("slot ", vm.toString(i))), val);
            }
        }

        // Compare against function calls
        emit log_string("=== Function call results ===");

        address registry = ISeigManagerFull(SEIG_MANAGER_PROXY).registry();
        address depositManager = ISeigManagerFull(SEIG_MANAGER_PROXY).depositManager();
        address ton = ISeigManagerFull(SEIG_MANAGER_PROXY).ton();
        address wton = ISeigManagerFull(SEIG_MANAGER_PROXY).wton();
        address tot = ISeigManagerFull(SEIG_MANAGER_PROXY).tot();

        emit log_named_address("registry()", registry);
        emit log_named_address("depositManager()", depositManager);
        emit log_named_address("ton()", ton);
        emit log_named_address("wton()", wton);
        emit log_named_address("tot()", tot);

        uint256 seigPerBlock = ISeigManagerFull(SEIG_MANAGER_PROXY).seigPerBlock();
        uint256 lastSeigBlock = ISeigManagerFull(SEIG_MANAGER_PROXY).lastSeigBlock();
        uint256 minimumAmount = ISeigManagerFull(SEIG_MANAGER_PROXY).minimumAmount();
        uint256 powerTONSeigRate = ISeigManagerFull(SEIG_MANAGER_PROXY).powerTONSeigRate();
        uint256 daoSeigRate = ISeigManagerFull(SEIG_MANAGER_PROXY).daoSeigRate();
        uint256 relativeSeigRate = ISeigManagerFull(SEIG_MANAGER_PROXY).relativeSeigRate();

        emit log_named_uint("seigPerBlock()", seigPerBlock);
        emit log_named_uint("lastSeigBlock()", lastSeigBlock);
        emit log_named_uint("minimumAmount()", minimumAmount);
        emit log_named_uint("powerTONSeigRate()", powerTONSeigRate);
        emit log_named_uint("daoSeigRate()", daoSeigRate);
        emit log_named_uint("relativeSeigRate()", relativeSeigRate);
    }
}

/**
 * @dev Comprehensive ISeigManager interface including all public view functions.
 *      Used both for fork testing and as ABI source for MCP tools.
 *      The compiled ABI at contracts/out/StorageVerify.t.sol/ISeigManagerFull.json
 *      is loaded by the MCP server's loadAbi fallback search.
 */
interface ISeigManagerFull {
    // Seigniorage rates
    function daoSeigRate() external view returns (uint256);
    function powerTONSeigRate() external view returns (uint256);
    function relativeSeigRate() external view returns (uint256);
    function seigPerBlock() external view returns (uint256);
    function lastSeigBlock() external view returns (uint256);

    // Staking parameters
    function minimumAmount() external view returns (uint256);
    function adjustCommissionDelay() external view returns (uint256);
    function accRelativeSeig() external view returns (uint256);

    // Infrastructure addresses
    function registry() external view returns (address);
    function depositManager() external view returns (address);
    function ton() external view returns (address);
    function wton() external view returns (address);
    function tot() external view returns (address);

    // Per-layer2 data
    function coinages(address layer2) external view returns (address);
    function commissionRates(address layer2) external view returns (uint256);
    function lastCommitBlock(address layer2) external view returns (uint256);
    function stakeOf(address layer2, address account) external view returns (uint256);

    // State
    function paused() external view returns (bool);

    // Proxy functions
    function implementation() external view returns (address);
}
