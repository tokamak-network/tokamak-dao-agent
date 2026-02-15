// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

/**
 * @title Layer2 Registration + Coinage Verification Fork Test
 * @notice Verifies all 10 registered Layer2 operators have coinages, and
 *         checks the Layer2Registry ↔ SeigManager ↔ CoinageFactory relationship.
 *
 * Run with:
 *   FOUNDRY_PROFILE=fork forge test --match-contract Layer2Registration --fork-url $ALCHEMY_RPC_URL -vvv
 */
contract Layer2Registration is Test {
    address constant SEIG_MANAGER_PROXY = 0x0b55a0f463b6DEFb81c6063973763951712D0E5F;
    address constant LAYER2_REGISTRY_PROXY = 0x7846c2248A7B4dE77E9C2Bae7FBB93bfC286837B;
    address constant DEPOSIT_MANAGER_PROXY = 0x0b58ca72b12F01FC05F8f252e226f3E2089BD00E;
    address constant COINAGE_FACTORY = 0xe8fAe91B80dd515c3D8B9FC02CB5B2ecFDDABf43;
    address constant TOT = 0x47e264ea9b229368aa90c331D3f4CBe0b4c0f01d;

    // All 10 registered Layer2 operators
    address[10] OPERATORS = [
        0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF, // tokamak1
        0x44e3605d0ed58FD125E9C47D1bf25a4406c13b57, // DXM Corp
        0x2B67D8D4E61b68744885E243EfAF988f1Fc66E2D, // DSRV
        0x36101b31e74c5E8f9a9cec378407Bbb776287761, // Talken
        0x2c25A6be0e6f9017b5bf77879c487eed466F2194, // staked
        0x0F42D1C40b95DF7A1478639918fc358B4aF5298D, // level
        0xbc602C1D9f3aE99dB4e9fD3662CE3D02e593ec5d, // decipher
        0xC42cCb12515b52B59c02eEc303c887C8658f5854, // DeSpread
        0xf3CF23D896Ba09d8EcdcD4655d918f71925E3FE5, // Danal Fintech
        0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2  // Hammer DAO
    ];

    string[10] NAMES = [
        "tokamak1", "DXM Corp", "DSRV", "Talken", "staked",
        "level", "decipher", "DeSpread", "Danal Fintech", "Hammer DAO"
    ];

    ISeigManager seig = ISeigManager(SEIG_MANAGER_PROXY);
    ILayer2Registry registry = ILayer2Registry(LAYER2_REGISTRY_PROXY);

    // ===================================================================
    // Test 1: All operators are registered
    // ===================================================================
    function test_AllOperatorsRegistered() public view {
        console.log("=== Layer2 Registration Check ===");
        uint256 registeredCount;

        for (uint256 i = 0; i < 10; i++) {
            bool isReg = registry.layer2s(OPERATORS[i]);
            console.log(NAMES[i], "registered:", isReg);
            if (isReg) registeredCount++;
        }

        console.log("Total registered:", registeredCount, "/ 10");
        assertEq(registeredCount, 10, "All 10 operators should be registered");
    }

    // ===================================================================
    // Test 2: All operators have coinages deployed
    // ===================================================================
    function test_AllOperatorsHaveCoinages() public view {
        console.log("=== Coinage Check ===");
        uint256 withCoinage;

        for (uint256 i = 0; i < 10; i++) {
            address coinage = seig.coinages(OPERATORS[i]);
            bool hasCoinage = coinage != address(0);
            console.log(NAMES[i], "coinage:", coinage);

            if (hasCoinage) {
                withCoinage++;
                // Check coinage supply
                uint256 supply = ICoinage(coinage).totalSupply();
                console.log("  totalSupply:", supply);
            }
        }

        console.log("Operators with coinage:", withCoinage, "/ 10");
        assertEq(withCoinage, 10, "All operators should have coinages");
    }

    // ===================================================================
    // Test 3: Verify TOT (total staked) token state
    // ===================================================================
    function test_TotTokenState() public view {
        address totAddr = seig.tot();
        console.log("=== TOT (sWTON) State ===");
        console.log("TOT address:", totAddr);
        assertEq(totAddr, TOT, "TOT address should match");

        uint256 totSupply = ICoinage(totAddr).totalSupply();
        console.log("TOT totalSupply:", totSupply);
        assertGt(totSupply, 0, "TOT should have supply (stakers exist)");

        // Check each operator's TOT balance (represents their total staked)
        for (uint256 i = 0; i < 10; i++) {
            uint256 balance = ICoinage(totAddr).balanceOf(OPERATORS[i]);
            if (balance > 0) {
                console.log(NAMES[i], "TOT balance:", balance);
            }
        }
    }

    // ===================================================================
    // Test 4: Verify last commit blocks
    // ===================================================================
    function test_LastCommitBlocks() public view {
        console.log("=== Last Commit Blocks ===");

        for (uint256 i = 0; i < 10; i++) {
            uint256 lastBlock = seig.lastCommitBlock(OPERATORS[i]);
            console.log(NAMES[i], "lastCommitBlock:", lastBlock);
        }
    }

    // ===================================================================
    // Test 5: Verify SeigManager cross-references
    // ===================================================================
    function test_SeigManagerCrossRefs() public view {
        console.log("=== SeigManager Cross-References ===");

        address ton = seig.ton();
        address wton = seig.wton();
        address regAddr = seig.registry();
        address dm = seig.depositManager();
        address factoryAddr = seig.factory();
        address daoAddr = seig.dao();
        address l2m = seig.layer2Manager();

        console.log("ton:", ton);
        console.log("wton:", wton);
        console.log("registry:", regAddr);
        console.log("depositManager:", dm);
        console.log("factory:", factoryAddr);
        console.log("dao:", daoAddr);
        console.log("layer2Manager:", l2m);

        assertEq(regAddr, LAYER2_REGISTRY_PROXY, "registry should be Layer2RegistryProxy");
        assertEq(dm, DEPOSIT_MANAGER_PROXY, "depositManager should be DepositManagerProxy");
        assertEq(factoryAddr, COINAGE_FACTORY, "factory should be CoinageFactory");
    }

    // ===================================================================
    // Test 6: Seigniorage parameters
    // ===================================================================
    function test_SeigniorageParameters() public view {
        console.log("=== Seigniorage Parameters ===");

        uint256 spb = seig.seigPerBlock();
        uint256 lastBlock = seig.lastSeigBlock();
        bool isPaused = seig.paused();
        uint256 totalL2TVL = seig.totalLayer2TVL();

        console.log("seigPerBlock:", spb);
        console.log("lastSeigBlock:", lastBlock);
        console.log("paused:", isPaused);
        console.log("totalLayer2TVL:", totalL2TVL);
        console.log("powerTONSeigRate:", seig.powerTONSeigRate());
        console.log("daoSeigRate:", seig.daoSeigRate());
        console.log("relativeSeigRate:", seig.relativeSeigRate());

        assertGt(spb, 0, "seigPerBlock should be set");
        assertFalse(isPaused, "SeigManager should not be paused");
    }

    // ===================================================================
    // Test 7: CoinageFactory state
    // ===================================================================
    function test_CoinageFactoryState() public view {
        console.log("=== CoinageFactory ===");
        console.log("Address:", COINAGE_FACTORY);

        // Verify factory is accessible
        bool isAdmin = ICoinageFactory(COINAGE_FACTORY).isAdmin(SEIG_MANAGER_PROXY);
        console.log("SeigManager is admin of CoinageFactory:", isAdmin);
    }
}

// ===================================================================
// Interfaces
// ===================================================================

interface ISeigManager {
    function ton() external view returns (address);
    function wton() external view returns (address);
    function registry() external view returns (address);
    function depositManager() external view returns (address);
    function factory() external view returns (address);
    function dao() external view returns (address);
    function tot() external view returns (address);
    function coinages(address layer2) external view returns (address);
    function lastCommitBlock(address layer2) external view returns (uint256);
    function seigPerBlock() external view returns (uint256);
    function lastSeigBlock() external view returns (uint256);
    function paused() external view returns (bool);
    function totalLayer2TVL() external view returns (uint256);
    function powerTONSeigRate() external view returns (uint256);
    function daoSeigRate() external view returns (uint256);
    function relativeSeigRate() external view returns (uint256);
    function layer2Manager() external view returns (address);
}

interface ILayer2Registry {
    function layer2s(address) external view returns (bool);
    function numLayer2s() external view returns (uint256);
}

interface ICoinage {
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
    function factor() external view returns (uint256);
}

interface ICoinageFactory {
    function isAdmin(address) external view returns (bool);
}
