## ADDED Requirements

### Requirement: Display market details
The frontend SHALL display full details for a single market fetched from `GET /api/markets/:id`, including question, all outcomes, total pool, per-outcome bet totals, deadlines, creator address, and resolution state.

#### Scenario: Market loaded successfully
- **WHEN** a user navigates to `/markets/:id`
- **THEN** the frontend fetches and displays the market question, outcomes with their individual bet totals, total pool size, betting deadline, resolution deadline, creator address, and current state

#### Scenario: Market not found
- **WHEN** the backend returns 404 for the requested market ID
- **THEN** the frontend displays a "Market not found" message

### Requirement: Place a bet
The frontend SHALL allow a connected user to place a bet on a market by selecting an outcome and entering an ETH amount, then submitting a transaction via MetaMask. The bet action SHALL only be available when the market is active (not resolved, not cancelled, betting deadline not passed).

#### Scenario: Successful bet placement
- **WHEN** a connected user selects an outcome, enters a valid ETH amount, and confirms the transaction in MetaMask
- **THEN** the frontend submits the `placeBet` transaction and shows a pending state until confirmation, then refreshes the market data

#### Scenario: Bet on inactive market
- **WHEN** a market's betting deadline has passed, or it is resolved or cancelled
- **THEN** the bet form is hidden or disabled

#### Scenario: Wallet not connected
- **WHEN** a user attempts to place a bet without a connected wallet
- **THEN** the frontend prompts wallet connection before proceeding

### Requirement: Resolve a market
The frontend SHALL allow the market creator (when their wallet is connected) to resolve a market by selecting the winning outcome and submitting a transaction. Resolution SHALL only be available after the betting deadline and before the resolution deadline.

#### Scenario: Creator resolves market
- **WHEN** the connected wallet matches the market's creator address and the betting deadline has passed and the resolution deadline has not passed
- **THEN** a resolve form is shown allowing the creator to select a winning outcome and submit the `resolveMarket` transaction

#### Scenario: Non-creator viewing market
- **WHEN** the connected wallet does not match the market creator
- **THEN** the resolve form is not shown

### Requirement: Cancel a market
The frontend SHALL allow any connected user to cancel an unresolved market after the resolution deadline has passed by submitting a `cancelMarket` transaction.

#### Scenario: Cancel available after resolution deadline
- **WHEN** the resolution deadline has passed and the market is not resolved or cancelled
- **THEN** a "Cancel Market" button is shown to any connected user

#### Scenario: Cancel not available before deadline
- **WHEN** the resolution deadline has not yet passed
- **THEN** no cancel button is shown

### Requirement: Withdraw from a market
The frontend SHALL allow a connected user to withdraw their winnings from a resolved market, or reclaim their funds from a cancelled market, by submitting a `withdraw` transaction. The withdraw action SHALL only be shown if the user has an eligible bet.

#### Scenario: Winner withdraws from resolved market
- **WHEN** the connected user has a bet on the winning outcome of a resolved market and has not yet withdrawn
- **THEN** a "Withdraw Winnings" button is shown and triggers the `withdraw` transaction

#### Scenario: Bettor reclaims from cancelled market
- **WHEN** the connected user placed a bet on a cancelled market and has not yet withdrawn
- **THEN** a "Reclaim Funds" button is shown and triggers the `withdraw` transaction

#### Scenario: Already withdrawn
- **WHEN** the backend shows a withdrawal record for the connected user on that market
- **THEN** no withdraw button is shown
