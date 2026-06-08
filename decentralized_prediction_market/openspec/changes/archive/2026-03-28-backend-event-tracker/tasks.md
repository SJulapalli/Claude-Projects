## 1. Project Setup

- [x] 1.1 Initialize server/ directory with package.json and install dependencies (express, ethers, better-sqlite3, dotenv)
- [x] 1.2 Create server/.env.example with CONTRACT_ADDRESS, RPC_URL, and PORT placeholders
- [x] 1.3 Create server entry point (server/index.js) with Express app skeleton and dotenv config

## 2. Database Layer

- [x] 2.1 Create server/db.js that initializes SQLite database with markets, bets, withdrawals, and sync_state tables (including indexes)
- [x] 2.2 Add database helper functions: insert/update market, insert bet, insert withdrawal, get/set last synced block

## 3. Event Indexer

- [x] 3.1 Create server/indexer.js that connects to the contract using ethers.js and the compiled ABI from artifacts/
- [x] 3.2 Implement backfill function that queries historical events from last_synced_block to current block and processes them into the database
- [x] 3.3 Implement live event listeners for all five contract events (MarketCreated, BetPlaced, MarketResolved, MarketCancelled, Withdrawal) that persist data on receipt
- [x] 3.4 On MarketCreated events, fetch full market data (question, outcomes, deadlines) from the contract and store in the markets table

## 4. REST API Routes

- [x] 4.1 Create server/routes.js with Express router
- [x] 4.2 Implement GET /api/markets endpoint returning all markets as JSON
- [x] 4.3 Implement GET /api/markets/:id endpoint returning full market details with bets and withdrawals (404 if not found)
- [x] 4.4 Implement GET /api/markets/:id/resolution endpoint returning resolution state (404 if not found)
- [x] 4.5 Implement GET /api/users/:address/bets endpoint returning all bets by a specific address with market question context

## 5. Integration and Startup

- [x] 5.1 Wire up routes, database initialization, and indexer startup in server/index.js
- [x] 5.2 Add startup logging (connected contract address, backfill progress, server port)

## 6. Testing

- [x] 6.1 Write integration tests: deploy contract to Hardhat local network, emit events, verify database state and API responses
