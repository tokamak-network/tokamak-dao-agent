// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title Compilation trigger for all Complete interfaces
/// @notice This file forces Foundry to compile and generate ABIs for all interfaces

import "./interfaces/IDAOCommitteeComplete.sol";
import "./interfaces/IDAOVaultComplete.sol";
import "./interfaces/IWTONComplete.sol";
import "./interfaces/ILayer2RegistryComplete.sol";
import "./interfaces/ICandidateFactoryComplete.sol";
import "./interfaces/ISeigManagerComplete.sol";
import "./interfaces/IDepositManagerComplete.sol";
import "./interfaces/IDAOAgendaManagerComplete.sol";

contract CompileInterfaces {
    // Reference each interface type to ensure compilation
    IDAOCommitteeComplete public daoCommittee;
    IDAOVaultComplete public daoVault;
    IWTONComplete public wton;
    ILayer2RegistryComplete public layer2Registry;
    ICandidateFactoryComplete public candidateFactory;
    ISeigManagerComplete public seigManager;
    IDepositManagerComplete public depositManager;
    IDAOAgendaManagerComplete public agendaManager;
}
