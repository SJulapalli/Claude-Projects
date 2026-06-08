## Why

The prediction market contract and backend tracker are fully functional but there is no user-facing interface — users currently have no way to discover markets, place bets, or manage their positions without using developer tools. A web frontend brings the protocol to non-technical users and completes the full product stack.

## What Changes

- Add a React single-page application (`frontend/`) that connects to both the PredictionMarket smart contract (via MetaMask) and the backend query server (via REST).
- Users can **browse markets** — view all active and past markets with their question, outcomes, pool size, deadlines, and resolution state.
- Users can **connect their MetaMask wallet** to identify themselves and sign transactions.
- Users can **place bets** by selecting an outcome and sending ETH through MetaMask.
- Users can **create new markets** by specifying a question, outcomes, and deadlines.
- Users can **resolve their own markets** by selecting the winning outcome after the betting deadline.
- Users can **cancel stale markets** that have passed their resolution deadline without being resolved.
- Users can **withdraw winnings** from resolved markets they bet on correctly, or reclaim funds from cancelled markets.
- Users can **view their bet history** — all markets they have placed bets on, sourced from the backend query API.

## Capabilities

### New Capabilities
- `wallet-connect`: MetaMask wallet connection, account detection, and network switching.
- `market-browse`: Display of all markets (active and past) from the backend query API, with filtering by state.
- `market-detail`: Detailed view of a single market — outcomes, bet totals, resolution state, and user-specific actions (place bet, resolve, cancel, withdraw).
- `market-create`: Form to create a new market by submitting a transaction to the contract via MetaMask.
- `user-bets`: View of all bets placed by the connected wallet address, pulled from the backend query API.

### Modified Capabilities
<!-- No existing capabilities change requirements — this is a new presentation layer only. -->

## Impact

- **New frontend code**: `frontend/` directory — React app with Vite, ethers.js for contract interaction, and standard fetch for backend API calls.
- **Dependencies**: React, Vite, ethers.js, react-router-dom
- **Reads from**: Backend query API (`GET /api/markets`, `/api/markets/:id`, `/api/users/:address/bets`)
- **Writes to**: PredictionMarket contract directly via MetaMask (createMarket, placeBet, resolveMarket, cancelMarket, withdraw)
- **No backend changes**: The frontend is a pure consumer of the existing contract and server.
