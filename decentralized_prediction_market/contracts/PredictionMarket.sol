// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PredictionMarket is ReentrancyGuard {
    struct Market {
        address creator;
        string question;
        string[] outcomes;
        uint256 bettingDeadline;
        uint256 resolutionDeadline;
        bool resolved;
        bool cancelled;
        uint256 winningOutcome;
        uint256 totalPool;
    }

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;
    // marketId => outcomeIndex => total bet on that outcome
    mapping(uint256 => mapping(uint256 => uint256)) public outcomeTotals;
    // marketId => bettor => outcomeIndex => amount
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public bets;
    // marketId => bettor => whether they have withdrawn
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;

    event MarketCreated(uint256 indexed marketId, address indexed creator);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, uint256 outcomeIndex, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint256 winningOutcome);
    event MarketCancelled(uint256 indexed marketId);
    event Withdrawal(uint256 indexed marketId, address indexed user, uint256 amount);

    function createMarket(
        string calldata _question,
        string[] calldata _outcomes,
        uint256 _bettingDeadline,
        uint256 _resolutionDeadline
    ) external returns (uint256) {
        require(_outcomes.length >= 2, "Need at least 2 outcomes");
        require(_bettingDeadline > block.timestamp, "Betting deadline must be in the future");
        require(_resolutionDeadline > _bettingDeadline, "Resolution deadline must be after betting deadline");

        uint256 marketId = nextMarketId++;
        Market storage m = markets[marketId];
        m.creator = msg.sender;
        m.question = _question;
        m.bettingDeadline = _bettingDeadline;
        m.resolutionDeadline = _resolutionDeadline;

        for (uint256 i = 0; i < _outcomes.length; i++) {
            m.outcomes.push(_outcomes[i]);
        }

        emit MarketCreated(marketId, msg.sender);
        return marketId;
    }

    function placeBet(uint256 _marketId, uint256 _outcomeIndex) external payable {
        Market storage m = markets[_marketId];
        require(m.creator != address(0), "Market does not exist");
        require(block.timestamp < m.bettingDeadline, "Betting deadline has passed");
        require(!m.resolved, "Market already resolved");
        require(!m.cancelled, "Market is cancelled");
        require(_outcomeIndex < m.outcomes.length, "Invalid outcome index");
        require(msg.value > 0, "Bet must be greater than zero");

        bets[_marketId][msg.sender][_outcomeIndex] += msg.value;
        outcomeTotals[_marketId][_outcomeIndex] += msg.value;
        m.totalPool += msg.value;

        emit BetPlaced(_marketId, msg.sender, _outcomeIndex, msg.value);
    }

    function resolveMarket(uint256 _marketId, uint256 _winningOutcome) external {
        Market storage m = markets[_marketId];
        require(msg.sender == m.creator, "Only creator can resolve");
        require(block.timestamp >= m.bettingDeadline, "Betting deadline has not passed");
        require(block.timestamp < m.resolutionDeadline, "Resolution deadline has passed");
        require(!m.resolved, "Market already resolved");
        require(!m.cancelled, "Market is cancelled");
        require(_winningOutcome < m.outcomes.length, "Invalid outcome index");

        m.resolved = true;
        m.winningOutcome = _winningOutcome;

        emit MarketResolved(_marketId, _winningOutcome);
    }

    function withdraw(uint256 _marketId) external nonReentrant {
        Market storage m = markets[_marketId];
        require(m.resolved || m.cancelled, "Market not resolved or cancelled");
        require(!hasWithdrawn[_marketId][msg.sender], "Already withdrawn");

        uint256 payout;

        if (m.resolved) {
            uint256 userBet = bets[_marketId][msg.sender][m.winningOutcome];
            require(userBet > 0, "No winning bet");
            uint256 winningTotal = outcomeTotals[_marketId][m.winningOutcome];
            payout = (userBet * m.totalPool) / winningTotal;
        } else {
            // Cancelled: refund all bets across all outcomes
            for (uint256 i = 0; i < m.outcomes.length; i++) {
                payout += bets[_marketId][msg.sender][i];
            }
            require(payout > 0, "No bets to refund");
        }

        hasWithdrawn[_marketId][msg.sender] = true;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");

        emit Withdrawal(_marketId, msg.sender, payout);
    }

    function cancelMarket(uint256 _marketId) external {
        Market storage m = markets[_marketId];
        require(m.creator != address(0), "Market does not exist");
        require(block.timestamp >= m.resolutionDeadline, "Resolution deadline has not passed");
        require(!m.resolved, "Market already resolved");
        require(!m.cancelled, "Market already cancelled");

        m.cancelled = true;

        emit MarketCancelled(_marketId);
    }

    function getOutcomes(uint256 _marketId) external view returns (string[] memory) {
        return markets[_marketId].outcomes;
    }
}
