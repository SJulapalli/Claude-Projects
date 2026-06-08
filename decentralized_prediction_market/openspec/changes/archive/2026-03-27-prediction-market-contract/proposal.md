## Why

There is no existing prediction market infrastructure in this project. We need a Solidity smart contract that lets users create, bet on, and resolve prediction markets on the Ethereum Sepolia testnet — enabling decentralized, trustless wagering on arbitrary outcomes without relying on external oracles.

## What Changes

- Add a Solidity smart contract (`PredictionMarket.sol`) that supports the full prediction market lifecycle: creation, betting, resolution, withdrawal, and cancellation.
- Users can **create markets** specifying a question, possible outcomes, a betting deadline, and a resolution deadline.
- Users can **place bets** on an outcome, sending ETH to the contract's pool before the betting deadline.
- The **market creator resolves** the market by selecting the winning outcome (single winner only, no oracle).
- **Winners withdraw** their proportional share of the total pool.
- Anyone can **cancel an unresolved market** after the resolution deadline passes, allowing all bettors to reclaim their funds.
- Set up a Hardhat project targeting the Sepolia testnet for compilation, testing, and deployment.

## Capabilities

### New Capabilities
- `market-lifecycle`: Core smart contract logic for creating markets, placing bets, resolving outcomes, withdrawing winnings, and cancelling stale markets.
- `hardhat-setup`: Hardhat project configuration, compilation, deployment scripts, and Sepolia testnet targeting.

### Modified Capabilities
<!-- No existing capabilities to modify — this is a greenfield project. -->

## Impact

- **New contract code**: `contracts/PredictionMarket.sol`
- **Deployment tooling**: Hardhat config, deploy scripts, and test files
- **Dependencies**: Hardhat, ethers.js, Solidity compiler, dotenv for Sepolia RPC/key config
- **Network**: Sepolia testnet only — no mainnet deployment or real funds
