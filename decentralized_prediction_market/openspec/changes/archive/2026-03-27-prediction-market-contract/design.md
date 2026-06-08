## Context

This is a greenfield project — there is no existing smart contract or Hardhat setup. We are building a single Solidity contract (`PredictionMarket.sol`) that manages the full lifecycle of prediction markets on the Ethereum Sepolia testnet. The contract is creator-resolved (no oracle) and handles only test ETH.

## Goals / Non-Goals

**Goals:**
- A single, simple Solidity contract covering market creation, betting, resolution, withdrawal, and cancellation
- Hardhat project with compilation, unit tests, and a Sepolia deployment script
- Clear separation of market states enforced on-chain via modifiers/checks

**Non-Goals:**
- Oracle integration or decentralized resolution mechanisms
- Multi-outcome (partial) winners — exactly one winning outcome per market
- Mainnet deployment, gas optimization beyond basic best practices
- Frontend or off-chain indexing (event-based only)
- Fee collection or platform revenue mechanics
- Upgradeability patterns (proxy, diamond, etc.)

## Decisions

### Single contract vs. factory pattern
**Decision:** Single monolithic contract with an internal mapping of market IDs.
**Rationale:** A factory that deploys one contract per market adds deployment gas cost and complexity with no benefit at testnet scale. A mapping-based approach (`mapping(uint256 => Market)`) keeps everything in one place and is simpler to test and deploy. If the project scales, a factory can be introduced later.

### Market data model
**Decision:** A `Market` struct stored in a `mapping(uint256 => Market)` keyed by an auto-incrementing counter.
- Struct fields: `creator`, `question` (string), `outcomes` (string array), `bettingDeadline`, `resolutionDeadline`, `resolved` (bool), `cancelled` (bool), `winningOutcome` (uint256), `totalPool` (uint256).
- Per-market bet tracking: `mapping(uint256 => mapping(address => mapping(uint256 => uint256)))` for `marketId → bettor → outcomeIndex → amount`, plus `mapping(uint256 => mapping(uint256 => uint256))` for `marketId → outcomeIndex → totalBetOnOutcome`.
**Rationale:** Flat mappings are gas-efficient and straightforward. Storing per-outcome totals enables proportional payout calculation without iterating over bettors.

### Payout calculation
**Decision:** Proportional payout — a winner receives `(theirBetOnWinningOutcome / totalBetOnWinningOutcome) * totalPool`.
**Rationale:** This is the simplest fair distribution model. It naturally handles varying bet sizes and doesn't require tracking odds at bet time.

### Withdrawal pattern
**Decision:** Pull-based withdrawal (winners call `withdraw()`) rather than push-based (contract sends to all winners).
**Rationale:** Pull pattern avoids reentrancy risk from looping over external calls and is the established Solidity best practice. Winners claim their own funds.

### Cancellation mechanism
**Decision:** Anyone can call `cancelMarket()` after the resolution deadline if the creator has not resolved. Cancellation refunds each bettor their original bets via individual `withdraw()` calls (same pull pattern).
**Rationale:** Prevents markets from locking funds indefinitely if the creator disappears. Using the same pull-based withdrawal for cancellation keeps the contract simple.

### Solidity version and tooling
**Decision:** Solidity ^0.8.20, Hardhat with ethers.js v6, OpenZeppelin's `ReentrancyGuard` for withdrawal safety.
**Rationale:** 0.8.x has built-in overflow checks. Hardhat is the standard Ethereum dev tool. ReentrancyGuard is a minimal, audited dependency that eliminates a common vulnerability class.

## Risks / Trade-offs

- **Creator trust risk** → The creator can resolve dishonestly. Mitigation: This is an accepted design constraint (no oracle). Users should only bet in markets with trusted creators.
- **Unclaimed funds** → If winners never call `withdraw()`, ETH stays locked in the contract. Mitigation: Acceptable for testnet; a sweep function could be added later if needed.
- **String storage cost** → Storing `question` and `outcomes` as strings is gas-expensive. Mitigation: Acceptable for Sepolia testnet where gas has no real cost.
- **No upgradability** → Contract is immutable once deployed. Mitigation: For a testnet project, redeployment is trivial.
