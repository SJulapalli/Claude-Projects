## ADDED Requirements

### Requirement: Connect MetaMask wallet
The frontend SHALL allow users to connect their MetaMask wallet by clicking a connect button. Once connected, the app SHALL display the connected account address and make it available to all components that need to sign transactions or identify the user.

#### Scenario: Successful wallet connection
- **WHEN** a user clicks the "Connect Wallet" button and approves the connection in MetaMask
- **THEN** the app stores the connected account address in global context and replaces the connect button with a display of the shortened address

#### Scenario: MetaMask not installed
- **WHEN** a user clicks "Connect Wallet" and `window.ethereum` is not available
- **THEN** the app displays a message instructing the user to install MetaMask

#### Scenario: User rejects connection
- **WHEN** a user clicks "Connect Wallet" but denies the MetaMask permission prompt
- **THEN** the app remains in the disconnected state with no error crash

### Requirement: Detect already-connected account on load
The frontend SHALL check on initial page load whether MetaMask already has an account connected and, if so, set it as the active account without requiring the user to click connect again.

#### Scenario: Account already connected on load
- **WHEN** the app loads and MetaMask already has an authorized account
- **THEN** the app automatically uses that account without prompting the user

#### Scenario: No account connected on load
- **WHEN** the app loads and no MetaMask account is connected
- **THEN** the app shows the "Connect Wallet" button and read-only views remain accessible

### Requirement: Enforce Sepolia network
The frontend SHALL detect whether the connected wallet is on the Sepolia network. If not, it SHALL prompt the user to switch to Sepolia before any write transaction is submitted.

#### Scenario: User is on wrong network
- **WHEN** a connected user attempts a write transaction and their wallet is not on Sepolia
- **THEN** the app prompts the user to switch to Sepolia and does not submit the transaction

#### Scenario: User is on Sepolia
- **WHEN** a connected user attempts a write transaction and their wallet is on Sepolia
- **THEN** the transaction proceeds normally
