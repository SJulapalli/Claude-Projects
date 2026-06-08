## ADDED Requirements

### Requirement: Hardhat project initialization
The project SHALL be initialized as a Hardhat project with Solidity ^0.8.20 compilation, ethers.js v6 integration, and a `hardhat.config.js` configured for the Sepolia testnet.

#### Scenario: Successful compilation
- **WHEN** a developer runs `npx hardhat compile`
- **THEN** the `PredictionMarket.sol` contract compiles without errors

#### Scenario: Sepolia network configured
- **WHEN** a developer inspects `hardhat.config.js`
- **THEN** a `sepolia` network entry exists with an RPC URL and account private key sourced from environment variables

### Requirement: Deployment script
The project SHALL include a deployment script that deploys the `PredictionMarket` contract to the configured network.

#### Scenario: Local deployment
- **WHEN** a developer runs the deploy script against the Hardhat local network
- **THEN** the `PredictionMarket` contract is deployed and the contract address is logged to the console

#### Scenario: Sepolia deployment
- **WHEN** a developer runs the deploy script with `--network sepolia` and valid environment variables
- **THEN** the contract is deployed to the Sepolia testnet and the contract address is logged

### Requirement: Unit tests
The project SHALL include Hardhat unit tests covering core contract functionality using ethers.js and Chai.

#### Scenario: All tests pass
- **WHEN** a developer runs `npx hardhat test`
- **THEN** all tests pass covering market creation, betting, resolution, withdrawal, and cancellation

#### Scenario: Tests cover revert conditions
- **WHEN** a developer runs `npx hardhat test`
- **THEN** tests verify that invalid operations (e.g., betting after deadline, non-creator resolution) correctly revert

### Requirement: Environment variable configuration
The project SHALL use a `.env` file (excluded from version control via `.gitignore`) for sensitive configuration: Sepolia RPC URL and deployer private key.

#### Scenario: .env.example provided
- **WHEN** a developer clones the project
- **THEN** a `.env.example` file exists showing the required variable names without actual values

#### Scenario: .gitignore excludes secrets
- **WHEN** a developer inspects `.gitignore`
- **THEN** `.env` and `node_modules/` are listed as excluded
