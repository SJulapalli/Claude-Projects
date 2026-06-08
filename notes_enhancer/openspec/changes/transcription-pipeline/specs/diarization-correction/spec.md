## ADDED Requirements

### Requirement: LLM-based diarization correction
The system SHALL pass the diarized transcript to an LLM to detect and correct speaker attribution errors that are identifiable from text context (e.g., a speaker asking and answering their own question, agreeing with themselves).

#### Scenario: Self-answering question detected
- **WHEN** the transcript shows the same speaker asking a question and immediately answering it
- **THEN** the correction pass reassigns the answer to a different speaker

#### Scenario: Conversational incoherence correction
- **WHEN** the same speaker is attributed consecutive turns that contradict each other or represent a dialogue pattern
- **THEN** the correction pass splits the attribution to the appropriate speakers

### Requirement: Text-only modification
The diarization correction pass SHALL only modify `speaker` labels. It SHALL NOT alter the `text`, `start`, `end`, or `confidence` fields of any segment.

#### Scenario: Text preservation
- **WHEN** the correction pass processes a transcript
- **THEN** every segment's `text`, `start`, `end`, and `confidence` values are identical before and after correction

### Requirement: Correction pass is optional
The diarization correction pass SHALL be skippable via configuration. When skipped, the pipeline proceeds with the audio-only diarization output.

#### Scenario: Correction disabled
- **WHEN** the pipeline runs with diarization correction disabled
- **THEN** the transcript passes directly from diarization to name resolution without modification
