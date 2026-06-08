## Context

The PredictionMarket contract is deployed on Sepolia and a backend query server indexes its events and exposes a REST API. There is no user interface. This design introduces a React single-page application that serves as the presentation layer, reading market data from the backend REST API and sending transactions directly to the contract through MetaMask.

## Goals / Non-Goals

**Goals:**
- A React SPA that lets any user browse markets and see their state
- MetaMask wallet integration for identifying the connected user and signing transactions
- Read path: pull market and bet data from the backend query server (no direct on-chain reads for lists)
- Write path: send transactions (createMarket, placeBet, resolveMarket, cancelMarket, withdraw) directly to the contract via ethers.js + MetaMask
- Per-user bet history sourced from the backend `/api/users/:address/bets` endpoint

**Non-Goals:**
- User authentication or session management of any kind
- Showing real-time live updates (polling on page focus is sufficient)
- Optimistic UI updates — wait for transaction confirmation then re-fetch
- Mobile-specific design or PWA features
- Multi-network support (Sepolia only)
- Gas estimation or fee display

## Decisions

### Framework: React + Vite
**Decision:** React with Vite for bundling, no UI component library.
**Rationale:** React is the most broadly understood frontend framework. Vite provides fast dev server and simple build output. Avoiding a UI component library keeps the dependency surface minimal and avoids opinionated styling that may conflict with the project's visual direction.
**Alternative considered:** Next.js — adds server-side rendering complexity that is unnecessary for a pure client-side dApp.

### Contract interaction: ethers.js via MetaMask provider
**Decision:** Use `window.ethereum` (injected by MetaMask) as the ethers.js provider. Wrap it in a `BrowserProvider` and request a signer for write operations.
**Rationale:** This is the standard pattern for dApp frontends. ethers.js is already used in the project. No wallet adapter library (e.g., wagmi/rainbowkit) is needed given the single-wallet, single-network constraint.

### Data fetching: backend API for reads, contract for writes
**Decision:** All list and detail reads go through the backend REST API. Writes go directly to the contract via MetaMask. No direct contract reads for market lists.
**Rationale:** The backend indexer already solves the "no list" problem of on-chain data. Reading from it is simpler and faster than querying the contract. Direct contract writes via MetaMask are necessary since the backend is read-only by design.

### State management: React Context + local useState
**Decision:** A `WalletContext` holds the connected account and ethers signer. Page-level components manage their own fetch state with `useState`/`useEffect`.
**Rationale:** The app has minimal shared state — only the wallet connection needs to be global. A full state management library (Redux, Zustand) would be overengineered.

### Routing: react-router-dom
**Decision:** Client-side routing with react-router-dom. Routes:
- `/` — market list (all markets)
- `/markets/:id` — market detail page
- `/create` — create market form
- `/my-bets` — connected user's bet history
**Rationale:** Standard approach for React SPAs. Four routes cover all user flows cleanly.

### ABI source
**Decision:** Import the contract ABI from the compiled Hardhat artifact at `../artifacts/contracts/PredictionMarket.sol/PredictionMarket.json` (relative path from `frontend/src/`).
**Rationale:** Reuses the already-generated artifact. Keeps the ABI in sync with the contract automatically when recompiled.

### Backend API base URL
**Decision:** Configure backend URL via a Vite environment variable (`VITE_API_URL`, defaulting to `http://localhost:3000`).
**Rationale:** Allows pointing at a deployed backend without code changes. `.env.example` documents the variable.

## Risks / Trade-offs

- **MetaMask not installed** → Show a clear "Please install MetaMask" message. Do not crash.
- **Wrong network** → If the user is not on Sepolia, prompt them to switch. Contract calls will fail otherwise.
- **Backend out of sync** → If the backend server is down or lagging, the read data may be stale or unavailable. Mitigation: Show loading/error states clearly; writes still work via MetaMask regardless.
- **Transaction pending UX** → After submitting a transaction, the UI must disable the action button and show a pending state until confirmation. Without this, users may double-submit.
- **No wallet connected** → Read-only views (market list, market detail) should work without a wallet. Write actions should prompt wallet connection if not yet connected.
