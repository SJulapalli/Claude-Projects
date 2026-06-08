## ADDED Requirements

### Requirement: Create a prediction market
The contract SHALL allow any user to create a new prediction market by specifying a question (string), a list of outcomes (string array with at least 2 entries), a betting deadline (future timestamp), and a resolution deadline (timestamp after the betting deadline). The contract SHALL store the market with an auto-incremented ID, record the creator's address, and emit a `MarketCreated` event.

#### Scenario: Successful market creation
- **WHEN** a user calls `createMarket` with a valid question, 2+ outcomes, a betting deadline in the future, and a resolution deadline after the betting deadline
- **THEN** the contract stores the market, assigns it the next available ID, and emits a `MarketCreated` event with the market ID and creator address

#### Scenario: Fewer than 2 outcomes
- **WHEN** a user calls `createMarket` with fewer than 2 outcomes
- **THEN** the transaction reverts

#### Scenario: Betting deadline in the past
- **WHEN** a user calls `createMarket` with a betting deadline that has already passed
- **THEN** the transaction reverts

#### Scenario: Resolution deadline before betting deadline
- **WHEN** a user calls `createMarket` with a resolution deadline earlier than or equal to the betting deadline
- **THEN** the transaction reverts

### Requirement: Place a bet on a market
The contract SHALL allow any user to place a bet on an existing market by specifying the market ID and the outcome index, sending ETH with the transaction. The bet amount SHALL be added to both the user's per-outcome bet balance and the market's total pool. The contract SHALL emit a `BetPlaced` event.

#### Scenario: Successful bet placement
- **WHEN** a user calls `placeBet` with a valid market ID, a valid outcome index, and a non-zero ETH value before the betting deadline
- **THEN** the contract records the bet, increases the market's total pool by the sent amount, and emits a `BetPlaced` event

#### Scenario: Bet after betting deadline
- **WHEN** a user calls `placeBet` after the market's betting deadline has passed
- **THEN** the transaction reverts

#### Scenario: Bet with zero ETH
- **WHEN** a user calls `placeBet` with zero msg.value
- **THEN** the transaction reverts

#### Scenario: Bet on invalid outcome index
- **WHEN** a user calls `placeBet` with an outcome index that does not exist in the market
- **THEN** the transaction reverts

#### Scenario: Bet on resolved or cancelled market
- **WHEN** a user calls `placeBet` on a market that has been resolved or cancelled
- **THEN** the transaction reverts

### Requirement: Resolve a market
The contract SHALL allow only the market creator to resolve a market by specifying the winning outcome index. Resolution SHALL only be allowed after the betting deadline and before the resolution deadline. The contract SHALL mark the market as resolved and emit a `MarketResolved` event.

#### Scenario: Successful resolution by creator
- **WHEN** the market creator calls `resolveMarket` with a valid outcome index after the betting deadline and before the resolution deadline
- **THEN** the contract records the winning outcome, marks the market as resolved, and emits a `MarketResolved` event

#### Scenario: Non-creator attempts resolution
- **WHEN** a user who is not the market creator calls `resolveMarket`
- **THEN** the transaction reverts

#### Scenario: Resolution before betting deadline
- **WHEN** the market creator calls `resolveMarket` before the betting deadline has passed
- **THEN** the transaction reverts

#### Scenario: Resolution of already resolved market
- **WHEN** the market creator calls `resolveMarket` on a market that is already resolved
- **THEN** the transaction reverts

### Requirement: Withdraw winnings
The contract SHALL allow a user who bet on the winning outcome to withdraw their proportional share of the total pool. The payout SHALL be calculated as `(userBetOnWinningOutcome / totalBetOnWinningOutcome) * totalPool`. The contract SHALL use the pull pattern and protect against reentrancy. The contract SHALL emit a `Withdrawal` event.

#### Scenario: Successful withdrawal
- **WHEN** a winning bettor calls `withdraw` on a resolved market where they have unclaimed winnings
- **THEN** the contract transfers their proportional share of the pool and emits a `Withdrawal` event

#### Scenario: Withdrawal by non-winner
- **WHEN** a user who did not bet on the winning outcome calls `withdraw`
- **THEN** the transaction reverts (zero payout)

#### Scenario: Double withdrawal
- **WHEN** a user who has already withdrawn calls `withdraw` again on the same market
- **THEN** the transaction reverts (nothing left to claim)

#### Scenario: Withdrawal on unresolved market
- **WHEN** a user calls `withdraw` on a market that has not been resolved
- **THEN** the transaction reverts

### Requirement: Cancel a stale market
The contract SHALL allow anyone to cancel a market if the resolution deadline has passed and the market has not been resolved. Cancellation SHALL mark the market as cancelled and allow all bettors to reclaim their original bet amounts via the `withdraw` function. The contract SHALL emit a `MarketCancelled` event.

#### Scenario: Successful cancellation
- **WHEN** any user calls `cancelMarket` after the resolution deadline has passed on an unresolved market
- **THEN** the contract marks the market as cancelled and emits a `MarketCancelled` event

#### Scenario: Cancellation before resolution deadline
- **WHEN** a user calls `cancelMarket` before the resolution deadline has passed
- **THEN** the transaction reverts

#### Scenario: Cancellation of already resolved market
- **WHEN** a user calls `cancelMarket` on a market that has already been resolved
- **THEN** the transaction reverts

#### Scenario: Withdrawal after cancellation
- **WHEN** a bettor calls `withdraw` on a cancelled market
- **THEN** the contract refunds the bettor's total original bet amount across all outcomes
