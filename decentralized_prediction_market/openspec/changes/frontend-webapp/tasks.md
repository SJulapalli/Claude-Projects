## 1. Project Setup

- [x] 1.1 Scaffold frontend/ directory with Vite + React template (npm create vite@latest frontend -- --template react)
- [x] 1.2 Install dependencies: ethers, react-router-dom
- [x] 1.3 Create frontend/.env.example with VITE_API_URL and VITE_CONTRACT_ADDRESS placeholders
- [x] 1.4 Configure frontend/src/contract.js to export ABI (imported from artifacts/) and contract address from env

## 2. Wallet Connection

- [x] 2.1 Create WalletContext (src/context/WalletContext.jsx) that manages connected account, signer, and provider
- [x] 2.2 Implement connectWallet function: request accounts via window.ethereum, detect MetaMask absence, handle user rejection
- [x] 2.3 On context mount, auto-detect already-connected account and set it without prompting
- [x] 2.4 Add network check utility: detect if wallet is on Sepolia (chainId 11155111) and prompt switch if not
- [x] 2.5 Add ConnectWalletButton component that shows "Connect Wallet" or shortened address based on connection state

## 3. App Shell and Routing

- [x] 3.1 Set up react-router-dom in src/main.jsx with routes: / (market list), /markets/:id (detail), /create (create form), /my-bets (user bets)
- [x] 3.2 Create Navbar component with links to Markets, Create Market, My Bets, and the ConnectWalletButton

## 4. Market Browse Page

- [x] 4.1 Create src/pages/MarketList.jsx that fetches GET /api/markets on mount and renders a list of MarketCard components
- [x] 4.2 Create MarketCard component showing question, state label (Active/Closed/Resolved/Cancelled), total pool, and betting deadline
- [x] 4.3 Add state filter controls (All / Active / Closed / Resolved / Cancelled) that filter the displayed list client-side
- [x] 4.4 Handle loading and error states for the market list fetch

## 5. Market Detail Page

- [x] 5.1 Create src/pages/MarketDetail.jsx that fetches GET /api/markets/:id on mount and displays full market info
- [x] 5.2 Show outcomes list with per-outcome bet totals and percentage of pool
- [x] 5.3 Implement PlaceBet component: outcome selector, ETH amount input, submit button — visible only when market is active
- [x] 5.4 Wire PlaceBet to the contract's placeBet function via MetaMask signer; show pending state and re-fetch on confirmation
- [x] 5.5 Implement ResolveMarket component: outcome selector and submit button — visible only to the market creator after betting deadline and before resolution deadline
- [x] 5.6 Wire ResolveMarket to the contract's resolveMarket function
- [x] 5.7 Implement CancelMarket button — visible to any connected user after resolution deadline on unresolved markets
- [x] 5.8 Wire CancelMarket to the contract's cancelMarket function
- [x] 5.9 Implement Withdraw button — visible when connected user has a winning bet (resolved) or any bet (cancelled) and no existing withdrawal record
- [x] 5.10 Wire Withdraw to the contract's withdraw function
- [x] 5.11 Handle loading, error, and not-found states for the market detail fetch

## 6. Create Market Page

- [x] 6.1 Create src/pages/CreateMarket.jsx with a form: question input, dynamic outcome fields (add/remove, min 2), betting deadline datetime picker, resolution deadline datetime picker
- [x] 6.2 Add client-side validation: 2+ outcomes, betting deadline in the future, resolution deadline after betting deadline
- [x] 6.3 Wire form submission to the contract's createMarket function via MetaMask signer; show pending state
- [x] 6.4 On transaction confirmation, navigate to the new market's detail page using the marketId from the MarketCreated event

## 7. User Bets Page

- [x] 7.1 Create src/pages/UserBets.jsx that fetches GET /api/users/:address/bets for the connected wallet on mount
- [x] 7.2 Render each bet as a card showing market question (linked to /markets/:id), outcome index label, amount, and market state
- [x] 7.3 Show "Connect your wallet to view bets" message when no wallet is connected
- [x] 7.4 Handle empty state ("No bets placed yet") and error state
