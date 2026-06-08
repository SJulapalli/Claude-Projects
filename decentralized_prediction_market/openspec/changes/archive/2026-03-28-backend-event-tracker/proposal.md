## Why

The PredictionMarket smart contract stores all market and betting data on-chain, but querying it directly from a frontend is slow and limited — there's no way to list all markets, search by bettor, or get aggregated views without scanning every market ID. A lightweight backend that indexes contract events into a queryable database will let frontends efficiently retrieve market data without complex on-chain calls.

## What Changes

- Add an Express.js server that connects to the PredictionMarket contract via ethers.js and listens for all five contract events (`MarketCreated`, `BetPlaced`, `MarketResolved`, `MarketCancelled`, `Withdrawal`).
- Store event-derived data in a SQLite database — markets, bets, resolutions, cancellations, and withdrawals — mirroring only what the contract stores, with no transforms.
- Expose read-only REST API endpoints for querying:
  - List all markets
  - Get full details for a specific market (creator, question, outcomes, deadlines, pool, resolution state)
  - Get all markets a specific address has bet on
  - Get the resolution state of a market
- On startup, backfill historical events from the contract so the database is complete, then switch to live event listening.

## Capabilities

### New Capabilities
- `event-indexer`: Listens for PredictionMarket contract events and persists them into a SQLite database. Handles startup backfill and live event streaming.
- `query-api`: Read-only Express.js REST endpoints for querying indexed market and bet data.

### Modified Capabilities
<!-- No existing capabilities are modified — this is a new read-only layer on top of the existing contract. -->

## Impact

- **New server code**: `server/` directory with Express app, event listener, database layer, and API routes
- **Dependencies**: express, ethers.js, better-sqlite3 (or sqlite3), dotenv
- **Network**: Connects to the same Ethereum node (Sepolia RPC) as the contract deployment
- **Configuration**: Requires contract address and RPC URL via environment variables
- **No contract changes**: The server is purely read-only and does not interact with or modify the contract
