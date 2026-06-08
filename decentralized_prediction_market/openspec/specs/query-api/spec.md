## ADDED Requirements

### Requirement: List all markets
The server SHALL expose a `GET /api/markets` endpoint that returns a JSON array of all indexed markets with their core fields.

#### Scenario: Markets exist
- **WHEN** a client sends a GET request to `/api/markets` and markets have been indexed
- **THEN** the server responds with HTTP 200 and a JSON array of market objects, each containing market_id, creator, question, outcomes, betting_deadline, resolution_deadline, resolved, cancelled, winning_outcome, and total_pool

#### Scenario: No markets exist
- **WHEN** a client sends a GET request to `/api/markets` and no markets have been indexed
- **THEN** the server responds with HTTP 200 and an empty JSON array

### Requirement: Get market details
The server SHALL expose a `GET /api/markets/:id` endpoint that returns full details for a specific market, including its bets and withdrawal information.

#### Scenario: Market exists
- **WHEN** a client sends a GET request to `/api/markets/:id` with a valid market ID
- **THEN** the server responds with HTTP 200 and a JSON object containing all market fields plus an array of bets placed on that market and an array of withdrawals from that market

#### Scenario: Market not found
- **WHEN** a client sends a GET request to `/api/markets/:id` with an ID that does not exist in the database
- **THEN** the server responds with HTTP 404 and a JSON error message

### Requirement: Get market resolution state
The server SHALL expose a `GET /api/markets/:id/resolution` endpoint that returns the resolution state of a specific market.

#### Scenario: Market is resolved
- **WHEN** a client sends a GET request to `/api/markets/:id/resolution` for a resolved market
- **THEN** the server responds with HTTP 200 and a JSON object containing resolved (true), cancelled (false), winning_outcome, and the winning outcome label from the outcomes array

#### Scenario: Market is cancelled
- **WHEN** a client sends a GET request to `/api/markets/:id/resolution` for a cancelled market
- **THEN** the server responds with HTTP 200 and a JSON object containing resolved (false), cancelled (true), and winning_outcome as null

#### Scenario: Market is pending
- **WHEN** a client sends a GET request to `/api/markets/:id/resolution` for a market that is neither resolved nor cancelled
- **THEN** the server responds with HTTP 200 and a JSON object containing resolved (false), cancelled (false), and winning_outcome as null

#### Scenario: Market not found
- **WHEN** a client sends a GET request to `/api/markets/:id/resolution` for a non-existent market
- **THEN** the server responds with HTTP 404 and a JSON error message

### Requirement: Get user bets
The server SHALL expose a `GET /api/users/:address/bets` endpoint that returns all bets placed by a specific Ethereum address across all markets.

#### Scenario: User has placed bets
- **WHEN** a client sends a GET request to `/api/users/:address/bets` for an address that has placed bets
- **THEN** the server responds with HTTP 200 and a JSON array of bet objects, each containing market_id, outcome_index, amount, and tx_hash, along with the market's question for context

#### Scenario: User has no bets
- **WHEN** a client sends a GET request to `/api/users/:address/bets` for an address with no recorded bets
- **THEN** the server responds with HTTP 200 and an empty JSON array
