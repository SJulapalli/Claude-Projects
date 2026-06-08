## ADDED Requirements

### Requirement: Filler word removal
The preprocessing module SHALL remove common filler words and verbal tics ("um", "uh", "like", "you know", "I mean" when used as filler) from transcript text.

#### Scenario: Filler words removed
- **WHEN** a segment contains "Um, so like, we need to push the deadline"
- **THEN** the text is cleaned to "So, we need to push the deadline"

### Requirement: Speaker turn merging
The preprocessing module SHALL merge consecutive segments from the same speaker with no intervening speaker into a single segment. The merged segment's `start` SHALL be the first segment's start and `end` SHALL be the last segment's end.

#### Scenario: Consecutive same-speaker segments
- **WHEN** Speaker 1 has three consecutive segments with no other speaker between them
- **THEN** the three segments are merged into one segment with combined text

### Requirement: False start removal
The preprocessing module SHALL detect and remove false starts and self-corrections from transcript text (e.g., "We should — actually, we need to push the deadline" becomes "We need to push the deadline").

#### Scenario: Self-correction detected
- **WHEN** a segment contains "We should — actually, we need to push the deadline"
- **THEN** the text is cleaned to "We need to push the deadline"

### Requirement: Configurable preprocessing steps
Each preprocessing transformation SHALL be individually toggleable via configuration. Users who need verbatim transcripts SHALL be able to disable any or all preprocessing steps.

#### Scenario: All preprocessing disabled
- **WHEN** all preprocessing steps are disabled in configuration
- **THEN** the transcript passes through unchanged

#### Scenario: Selective preprocessing
- **WHEN** filler removal is enabled but false start removal is disabled
- **THEN** only filler words are removed; false starts are preserved
