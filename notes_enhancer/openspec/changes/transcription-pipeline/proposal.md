## Why

The current transcription module produces a flat text blob from MLX Whisper with no speaker attribution, no diarization, and no cleanup. Meeting notes enhancement quality is fundamentally limited by transcript quality — Claude can't attribute statements to speakers or resolve names if the transcript doesn't contain that information. Building a robust, multi-stage transcription pipeline is the foundation for all downstream enhancement improvements.

## What Changes

- Formalize the Whisper transcription module to output structured JSON (timestamped segments with confidence scores) instead of plain text
- Add audio-based speaker diarization (pyannote.audio or WhisperX) to attribute transcript segments to speakers
- Add an LLM-powered diarization correction pass to fix attribution errors detectable from text context
- Add name resolution to map generic speaker labels to real participant names using a roster and transcript context clues
- Add transcript preprocessing (filler word removal, turn merging, false start cleanup) as a configurable pipeline step
- Introduce a structured transcript output format consumed by the enhancement endpoint

## Capabilities

### New Capabilities
- `speaker-diarization`: Audio-based speaker segmentation and labeling using pyannote.audio, integrated with Whisper timestamp output
- `diarization-correction`: LLM-powered post-processing pass that fixes speaker attribution errors by analyzing conversational coherence
- `name-resolution`: Maps speaker labels to real names using a participant roster and transcript context clues, plus fuzzy matching for Whisper name corrections
- `transcript-preprocessing`: Configurable rule-based cleanup pipeline (filler removal, turn merging, false start removal, formatting normalization)
- `structured-transcript`: Defines the structured JSON transcript format with timestamps, speaker labels, and confidence scores used across all pipeline stages

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Backend**: New Python modules for diarization, correction, name resolution, and preprocessing in the backend
- **Dependencies**: pyannote.audio (or WhisperX), potentially phonetic matching libraries (jellyfish/fuzzy)
- **API**: The `/api/transcribe` endpoint response format changes from plain text to structured JSON with speaker-attributed segments — **BREAKING** for the current frontend consumer
- **Frontend**: Must be updated to render speaker-attributed transcript segments instead of a plain text blob
- **Models**: Diarization correction pass requires Claude API calls (will be substituted with local models in a future phase)
