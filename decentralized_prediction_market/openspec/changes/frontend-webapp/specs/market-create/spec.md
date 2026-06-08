## ADDED Requirements

### Requirement: Create a new market via form
The frontend SHALL provide a form at `/create` that allows a connected user to create a new prediction market by entering a question, at least two outcome labels, a betting deadline, and a resolution deadline. Submitting the form SHALL send a `createMarket` transaction via MetaMask.

#### Scenario: Successful market creation
- **WHEN** a connected user fills in a valid question, two or more outcomes, a future betting deadline, and a resolution deadline after the betting deadline, then submits the form
- **THEN** the frontend submits the `createMarket` transaction, shows a pending state, and on confirmation navigates to the newly created market's detail page

#### Scenario: Fewer than two outcomes
- **WHEN** a user submits the create form with fewer than two outcome fields filled in
- **THEN** the form shows a validation error and does not submit the transaction

#### Scenario: Invalid deadlines
- **WHEN** a user submits with a betting deadline in the past or a resolution deadline before the betting deadline
- **THEN** the form shows a validation error and does not submit

#### Scenario: Wallet not connected
- **WHEN** a user navigates to `/create` without a connected wallet
- **THEN** the frontend prompts wallet connection before showing the form

### Requirement: Dynamic outcome fields
The form SHALL allow users to add and remove outcome fields dynamically, with a minimum of two outcomes always required.

#### Scenario: Add outcome
- **WHEN** a user clicks "Add Outcome"
- **THEN** a new outcome input field is added to the form

#### Scenario: Remove outcome
- **WHEN** a user clicks remove on an outcome field and more than two outcomes exist
- **THEN** that outcome field is removed from the form
