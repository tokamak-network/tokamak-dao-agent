// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {ICredibilityRegistry} from "./ICredibilityRegistry.sol";
import {IAgentRegistry} from "./IAgentRegistry.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title CredibilityRegistry
/// @notice Reference implementation of ICredibilityRegistry.
/// @dev Credibility deltas are configurable via constructor:
///      - highConfCorrect:  reward for high-confidence correct prediction (default +3)
///      - lowConfCorrect:   reward for low-confidence correct prediction (default +1)
///      - highConfWrong:    penalty for high-confidence incorrect prediction (default -2)
///      - lowConfWrong:     penalty for low-confidence incorrect prediction (default -1)
///
///      Resolution is restricted to a designated resolver address (not the agent operator)
///      to prevent agents from self-reporting favorable outcomes.
///
///      Verdict values are not restricted to a fixed range. The implementation treats
///      verdict >= verdictPositiveThreshold as "positive direction" for correctness checks.
contract CredibilityRegistry is ICredibilityRegistry, ERC165 {
    struct Prediction {
        uint8 verdict;
        uint8 score;
        bool exists;
        bool resolved;
        int8 delta;
    }

    struct AgentCredibility {
        int256 totalScore;
        uint256 totalPredictions;
    }

    struct DeltaConfig {
        int8 highConfCorrect;
        int8 lowConfCorrect;
        int8 highConfWrong;
        int8 lowConfWrong;
    }

    IAgentRegistry public immutable registry;
    address public immutable resolver;

    /// @notice Confidence threshold: score >= highConfThreshold is high confidence
    uint8 public immutable highConfThreshold;

    /// @notice Verdict threshold: verdict >= this value is considered "positive direction"
    uint8 public immutable verdictPositiveThreshold;

    /// @notice Delta configuration
    DeltaConfig public deltaConfig;

    /// @notice (agentId, proposalId) → Prediction
    mapping(bytes32 => mapping(uint256 => Prediction)) internal _predictions;

    /// @notice agentId → cumulative credibility
    mapping(bytes32 => AgentCredibility) internal _credibility;

    error NotAgentOperator(bytes32 agentId, address caller);
    error NotResolver(address caller);
    error AgentNotActive(bytes32 agentId);
    error PredictionExists(bytes32 agentId, uint256 proposalId);
    error PredictionNotFound(bytes32 agentId, uint256 proposalId);
    error AlreadyResolved(bytes32 agentId, uint256 proposalId);
    error InvalidScore(uint8 score);
    error InvalidOutcome(uint8 outcome);
    error InvalidDeltaConfig();

    /// @param _registry Address of the IAgentRegistry
    /// @param _resolver Address authorized to resolve predictions
    /// @param _highConfThreshold Score threshold for high confidence (default: 70)
    /// @param _verdictPositiveThreshold Verdict values >= this are "positive" (default: 1 for Governor-compatible)
    /// @param _deltas Delta values [highConfCorrect, lowConfCorrect, highConfWrong, lowConfWrong]
    constructor(
        address _registry,
        address _resolver,
        uint8 _highConfThreshold,
        uint8 _verdictPositiveThreshold,
        int8[4] memory _deltas
    ) {
        if (_deltas[0] <= _deltas[1]) revert InvalidDeltaConfig(); // highConfCorrect > lowConfCorrect
        if (_deltas[2] > _deltas[3]) revert InvalidDeltaConfig();  // highConfWrong <= lowConfWrong (more negative = harsher penalty)

        registry = IAgentRegistry(_registry);
        resolver = _resolver;
        highConfThreshold = _highConfThreshold;
        verdictPositiveThreshold = _verdictPositiveThreshold;
        deltaConfig = DeltaConfig({
            highConfCorrect: _deltas[0],
            lowConfCorrect: _deltas[1],
            highConfWrong: _deltas[2],
            lowConfWrong: _deltas[3]
        });
    }

    modifier onlyAgentOperator(bytes32 agentId) {
        address operator = registry.agentOperator(agentId);
        if (msg.sender != operator) revert NotAgentOperator(agentId, msg.sender);
        _;
    }

    modifier onlyResolver() {
        if (msg.sender != resolver) revert NotResolver(msg.sender);
        _;
    }

    /// @inheritdoc ICredibilityRegistry
    function recordPrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 verdict,
        uint8 score
    ) external onlyAgentOperator(agentId) {
        if (!registry.isActiveAgent(agentId)) revert AgentNotActive(agentId);
        if (score > 100) revert InvalidScore(score);
        if (_predictions[agentId][proposalId].exists) revert PredictionExists(agentId, proposalId);

        _predictions[agentId][proposalId] = Prediction({
            verdict: verdict,
            score: score,
            exists: true,
            resolved: false,
            delta: 0
        });

        emit PredictionRecorded(agentId, proposalId, verdict, score);
    }

    /// @inheritdoc ICredibilityRegistry
    function resolvePrediction(
        bytes32 agentId,
        uint256 proposalId,
        uint8 actualOutcome
    ) external onlyResolver {
        if (actualOutcome > 1) revert InvalidOutcome(actualOutcome);

        Prediction storage p = _predictions[agentId][proposalId];
        if (!p.exists) revert PredictionNotFound(agentId, proposalId);
        if (p.resolved) revert AlreadyResolved(agentId, proposalId);

        int8 delta = _computeDelta(p.verdict, p.score, actualOutcome);

        p.resolved = true;
        p.delta = delta;

        _credibility[agentId].totalScore += int256(delta);
        _credibility[agentId].totalPredictions += 1;

        emit PredictionResolved(agentId, proposalId, delta);
    }

    /// @inheritdoc ICredibilityRegistry
    function getCredibility(bytes32 agentId)
        external view returns (int256 totalScore, uint256 totalPredictions)
    {
        AgentCredibility storage c = _credibility[agentId];
        return (c.totalScore, c.totalPredictions);
    }

    /// @inheritdoc ICredibilityRegistry
    function getPrediction(bytes32 agentId, uint256 proposalId)
        external view returns (uint8 verdict, uint8 score, bool resolved, int8 delta)
    {
        Prediction storage p = _predictions[agentId][proposalId];
        return (p.verdict, p.score, p.resolved, p.delta);
    }

    /// @dev Compute credibility delta using configurable parameters
    ///      High confidence: score >= highConfThreshold OR score <= (100 - highConfThreshold)
    ///      Verdict direction: verdict >= verdictPositiveThreshold → positive
    function _computeDelta(uint8 verdict, uint8 score, uint8 actualOutcome) internal view returns (int8) {
        bool highConf = score >= highConfThreshold || score <= (100 - highConfThreshold);

        bool predictedPositive = verdict >= verdictPositiveThreshold;
        bool actualPositive = actualOutcome == 1;
        bool correct = predictedPositive == actualPositive;

        DeltaConfig memory d = deltaConfig;

        if (correct && highConf) return d.highConfCorrect;
        if (correct && !highConf) return d.lowConfCorrect;
        if (!correct && highConf) return d.highConfWrong;
        return d.lowConfWrong;
    }

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(ICredibilityRegistry).interfaceId || super.supportsInterface(interfaceId);
    }
}
