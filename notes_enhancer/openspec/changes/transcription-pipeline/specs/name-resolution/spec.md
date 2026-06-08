## ADDED Requirements

### Requirement: Participant roster input
The system SHALL accept an optional participant roster (list of names) provided by the user before or after transcription. The roster is used for both speaker label mapping and transcript name correction.

#### Scenario: Roster provided
- **WHEN** a user provides a participant roster with names ["Sarah Chen", "Mike Johnson"]
- **THEN** the name resolution module uses these names for speaker mapping and transcript correction

#### Scenario: No roster provided
- **WHEN** no participant roster is provided
- **THEN** the pipeline skips name resolution and retains generic speaker labels

### Requirement: Speaker label to name mapping
The system SHALL map generic speaker labels to real participant names using context clues in the transcript (self-introductions, direct address by name) combined with the participant roster.

#### Scenario: Name mentioned in transcript
- **WHEN** the transcript contains "thanks, Sarah" directed at Speaker 2
- **THEN** Speaker 2's `speaker_name` field is set to "Sarah Chen" (matched from roster)

#### Scenario: No context clues for a speaker
- **WHEN** a speaker has no identifiable name references in the transcript
- **THEN** the speaker retains their generic label (e.g., "Speaker 3") as `speaker_name`

### Requirement: Transcript name correction
The system SHALL detect and correct Whisper's misspellings of known participant names in the transcript text using fuzzy matching (edit distance and phonetic similarity) against the roster.

#### Scenario: Whisper name mangling
- **WHEN** the transcript contains "Krishna Murphy" and the roster includes "Krishnamurthy"
- **THEN** the text is corrected to "Krishnamurthy"

#### Scenario: Non-participant name mentioned
- **WHEN** a name is mentioned that refers to someone not in the meeting (e.g., "I talked to Mike from legal")
- **THEN** the name is NOT corrected or mapped to a participant, and the text is left unchanged
