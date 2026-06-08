## ADDED Requirements

### Requirement: Display list of all markets
The frontend SHALL display all indexed markets fetched from the backend `GET /api/markets` endpoint. Each market entry SHALL show the question, outcome count, total pool, betting deadline, and current state (active, resolved, cancelled).

#### Scenario: Markets loaded successfully
- **WHEN** the market list page loads
- **THEN** the frontend fetches all markets from the backend and renders each one with its question, state label (Active / Resolved / Cancelled), total pool, and betting deadline

#### Scenario: No markets exist
- **WHEN** the backend returns an empty array
- **THEN** the frontend displays a "No markets yet" message

#### Scenario: Backend fetch fails
- **WHEN** the backend is unreachable or returns an error
- **THEN** the frontend displays an error message and does not crash

### Requirement: Filter markets by state
The frontend SHALL allow users to filter the market list by state: All, Active (not resolved, not cancelled, betting deadline in the future), Closed (betting deadline passed, not yet resolved), Resolved, and Cancelled.

#### Scenario: Filter to active markets
- **WHEN** a user selects the "Active" filter
- **THEN** only markets where resolved is false, cancelled is false, and betting deadline is in the future are shown

#### Scenario: Filter to resolved markets
- **WHEN** a user selects the "Resolved" filter
- **THEN** only markets where resolved is true are shown

### Requirement: Navigate to market detail
The frontend SHALL allow users to click a market in the list to navigate to the market detail page.

#### Scenario: Click market in list
- **WHEN** a user clicks a market entry in the list
- **THEN** the frontend navigates to the `/markets/:id` route for that market
