## ADDED Requirements

### Requirement: Speaker diarization from audio
The system SHALL analyze the audio file using pyannote.audio to identify distinct speakers and produce time-aligned speaker segments. Each speaker SHALL be assigned a consistent label (e.g., "Speaker 1", "Speaker 2") throughout the transcript.

#### Scenario: Multi-speaker meeting
- **WHEN** an audio file with multiple speakers is processed
- **THEN** each transcript segment is assigned a `speaker` field with a consistent label per speaker

#### Scenario: Single speaker
- **WHEN** an audio file with only one speaker is processed
- **THEN** all segments are assigned the same speaker label

### Requirement: Diarization-transcription alignment
The system SHALL align pyannote speaker segments with Whisper transcript segments using timestamp overlap. Each transcript segment SHALL be assigned the speaker whose pyannote segment covers the largest portion of the transcript segment's time range.

#### Scenario: Segment fully within one speaker's range
- **WHEN** a transcript segment falls entirely within one speaker's diarization segment
- **THEN** that transcript segment is assigned that speaker's label

#### Scenario: Segment spans a speaker boundary
- **WHEN** a transcript segment overlaps with two speakers' diarization segments
- **THEN** the segment is assigned to the speaker with the greater overlap duration

### Requirement: Diarization error reporting
The system SHALL report the number of detected speakers and flag segments where speaker assignment confidence is low (overlap ratio below 0.6).

#### Scenario: Low confidence speaker assignment
- **WHEN** a transcript segment has less than 60% overlap with any single speaker segment
- **THEN** the segment's metadata includes a `low_confidence_speaker` flag set to true
