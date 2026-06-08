## ADDED Requirements

### Requirement: Display connected user's bet history
The frontend SHALL display all bets placed by the connected wallet address, fetched from the backend `GET /api/users/:address/bets` endpoint. Each entry SHALL show the market question, the outcome bet on, the amount bet, and the market's current state.

#### Scenario: Wallet connected with bets
- **WHEN** a connected user navigates to `/my-bets`
- **THEN** the frontend fetches bets for their address and renders each bet with the market question, selected outcome, amount, and market state (active, resolved with outcome label, or cancelled)

#### Scenario: Wallet connected with no bets
- **WHEN** a connected user navigates to `/my-bets` and has placed no bets
- **THEN** the frontend displays a "No bets placed yet" message

#### Scenario: Wallet not connected
- **WHEN** a user navigates to `/my-bets` without a connected wallet
- **THEN** the frontend prompts wallet connection and does not attempt a fetch

### Requirement: Link from bet to market detail
Each bet entry in the user bets list SHALL be a link to the corresponding market detail page.

#### Scenario: Click bet entry
- **WHEN** a user clicks on a bet entry in the `/my-bets` list
- **THEN** the frontend navigates to `/markets/:id` for that market
