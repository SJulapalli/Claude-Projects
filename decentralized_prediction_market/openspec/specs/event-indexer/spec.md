## ADDED Requirements

### Requirement: Listen for contract events
The server SHALL connect to the PredictionMarket contract using ethers.js and subscribe to all five events: `MarketCreated`, `BetPlaced`, `MarketResolved`, `MarketCancelled`, and `Withdrawal`. Each event SHALL be processed and persisted to the SQLite database as it is received.

#### Scenario: MarketCreated event received
- **WHEN** the contract emits a `MarketCreated` event with a market ID and creator address
- **THEN** the server inserts a new row into the `markets` table with the market ID, creator address, and fetches the market's full data (question, outcomes, deadlines) from the contract to populate all fields

#### Scenario: BetPlaced event received
- **WHEN** the contract emits a `BetPlaced` event with market ID, bettor, outcome index, and amount
- **THEN** the server inserts a new row into the `bets` table and updates the market's `total_pool` in the `markets` table

#### Scenario: MarketResolved event received
- **WHEN** the contract emits a `MarketResolved` event with market ID and winning outcome
- **THEN** the server updates the corresponding market row, setting `resolved` to true and recording the `winning_outcome`

#### Scenario: MarketCancelled event received
- **WHEN** the contract emits a `MarketCancelled` event with a market ID
- **THEN** the server updates the corresponding market row, setting `cancelled` to true

#### Scenario: Withdrawal event received
- **WHEN** the contract emits a `Withdrawal` event with market ID, user address, and amount
- **THEN** the server inserts a new row into the `withdrawals` table

### Requirement: Backfill historical events on startup
The server SHALL query all historical contract events from a stored `last_synced_block` (or block 0 if none) up to the current block on startup. All historical events SHALL be processed in the same manner as live events. After backfill completes, the server SHALL update `last_synced_block` and begin listening for live events.

#### Scenario: First startup with no prior sync
- **WHEN** the server starts and no `last_synced_block` exists in the database
- **THEN** the server queries all events from block 0 to the current block and inserts them into the database

#### Scenario: Restart after previous sync
- **WHEN** the server starts and a `last_synced_block` value exists in the database
- **THEN** the server queries events from `last_synced_block + 1` to the current block, processes them, and updates `last_synced_block`

#### Scenario: Duplicate event handling
- **WHEN** the server encounters an event that has already been processed (same tx_hash and log index)
- **THEN** the server skips the duplicate without error

### Requirement: SQLite database schema
The server SHALL create and maintain a SQLite database with the following tables: `markets`, `bets`, `withdrawals`, and `sync_state`. The schema SHALL mirror the contract's data model without any transforms or derived fields.

#### Scenario: Database initialization
- **WHEN** the server starts and the database file does not exist
- **THEN** the server creates the database file and all required tables with appropriate columns and indexes

#### Scenario: Markets table structure
- **WHEN** a market is stored
- **THEN** the `markets` table row SHALL contain: market_id (integer primary key), creator (text), question (text), outcomes (text, JSON array), betting_deadline (integer), resolution_deadline (integer), resolved (integer/boolean), cancelled (integer/boolean), winning_outcome (integer), total_pool (text)

#### Scenario: Bets table structure
- **WHEN** a bet is stored
- **THEN** the `bets` table row SHALL contain: id (auto-increment), market_id (integer), bettor (text), outcome_index (integer), amount (text), tx_hash (text)

#### Scenario: Withdrawals table structure
- **WHEN** a withdrawal is stored
- **THEN** the `withdrawals` table row SHALL contain: id (auto-increment), market_id (integer), user_address (text), amount (text), tx_hash (text)
