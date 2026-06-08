## 1. Project Setup

- [x] 1.1 Initialize Hardhat project with npm, install dependencies (hardhat, @nomicfoundation/hardhat-toolbox, dotenv, @openzeppelin/contracts)
- [x] 1.2 Configure hardhat.config.js with Solidity ^0.8.20 compiler and Sepolia network settings using env vars
- [x] 1.3 Create .env.example with SEPOLIA_RPC_URL and PRIVATE_KEY placeholders
- [x] 1.4 Create .gitignore excluding .env, node_modules/, artifacts/, cache/

## 2. Smart Contract

- [x] 2.1 Create contracts/PredictionMarket.sol with Market struct, storage mappings, and events (MarketCreated, BetPlaced, MarketResolved, Withdrawal, MarketCancelled)
- [x] 2.2 Implement createMarket function with input validation (2+ outcomes, future betting deadline, resolution deadline after betting deadline)
- [x] 2.3 Implement placeBet function with validation (before deadline, valid outcome, non-zero value, not resolved/cancelled)
- [x] 2.4 Implement resolveMarket function restricted to market creator with validation (after betting deadline, before resolution deadline, not already resolved)
- [x] 2.5 Implement withdraw function with proportional payout for resolved markets and full refund for cancelled markets, using ReentrancyGuard
- [x] 2.6 Implement cancelMarket function callable by anyone after resolution deadline on unresolved markets

## 3. Deployment

- [x] 3.1 Create deployment script (scripts/deploy.js) that deploys PredictionMarket and logs the contract address

## 4. Testing

- [x] 4.1 Write tests for market creation (valid creation, revert on <2 outcomes, revert on past deadline, revert on bad resolution deadline)
- [x] 4.2 Write tests for betting (valid bet, revert after deadline, revert on zero value, revert on invalid outcome, revert on resolved/cancelled market)
- [x] 4.3 Write tests for resolution (creator resolves, revert for non-creator, revert before betting deadline, revert on already resolved)
- [x] 4.4 Write tests for withdrawal (winner withdraws proportional share, revert for non-winner, revert on double withdrawal, revert on unresolved market)
- [x] 4.5 Write tests for cancellation (cancel after resolution deadline, revert before deadline, revert on resolved market, refund after cancellation)
