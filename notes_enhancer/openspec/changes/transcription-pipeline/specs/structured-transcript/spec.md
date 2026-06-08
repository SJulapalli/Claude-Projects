## ADDED Requirements

### Requirement: Structured segment output format
The transcription module SHALL return a JSON array of segment objects. Each segment object SHALL contain: `start` (float, seconds), `end` (float, seconds), `text` (string), and `confidence` (float, 0-1). Additional fields (`speaker`, `speaker_name`) are added by downstream pipeline stages.

#### Scenario: Basic transcription output
- **WHEN** an audio file is transcribed by the Whisper module
- **THEN** the output is a JSON array where each element has `start`, `end`, `text`, and `confidence` fields

#### Scenario: Timestamp accuracy
- **WHEN** a segment is produced
- **THEN** `start` is less than `end`, both are non-negative floats representing seconds from audio start

### Requirement: API returns structured transcript
The `/api/transcribe` endpoint SHALL return the structured segment list as the `segments` field in the SSE result event. The legacy `transcript` field SHALL contain the concatenated plain text for backward compatibility.

#### Scenario: SSE result event format
- **WHEN** transcription completes successfully
- **THEN** the result event contains `{"segments": [...], "transcript": "full text"}`

#### Scenario: Plain text fallback
- **WHEN** the client sends `?format=text`
- **THEN** the result event contains only `{"transcript": "full text"}` without the `segments` field
