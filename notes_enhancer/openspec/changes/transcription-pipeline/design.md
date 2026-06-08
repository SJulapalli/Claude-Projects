## Context

The current transcription module (`backend/transcribe.py`) calls MLX Whisper and returns a plain text string. The `/api/transcribe` endpoint streams progress via SSE and returns `{"transcript": "..."}`. The frontend displays this in an editable textarea. The `/api/enhance` endpoint sends the raw text transcript + user notes to Claude for enhancement.

This design covers the multi-stage transcription pipeline that replaces the current flat text output with a structured, speaker-attributed transcript.

## Goals / Non-Goals

**Goals:**
- Produce speaker-attributed, timestamped, name-resolved transcripts from raw meeting audio
- Output a structured JSON format that downstream enhancement can consume
- Make each pipeline stage independently testable and configurable
- Support a participant roster for name resolution
- Keep all processing local (except the diarization correction LLM pass, which uses Claude initially)

**Non-Goals:**
- Real-time / streaming transcription during a meeting (batch processing only for now)
- The multi-pass enhancement pipeline (Phase 2 of the implementation plan)
- Local model substitution for the LLM correction pass (Phase 3)
- Speaker enrollment / voice profiles
- Evaluation harness and ground truth dataset creation (important but separate work)

## Decisions

### 1. Diarization library: pyannote.audio 3.x

**Choice:** pyannote.audio as a standalone library, not WhisperX.

**Rationale:** WhisperX bundles transcription + alignment + diarization but replaces our MLX Whisper setup with standard Whisper, losing Apple Silicon GPU acceleration. pyannote.audio provides diarization independently, letting us keep MLX Whisper for transcription and align the outputs ourselves.

**Alternatives considered:**
- WhisperX — simpler integration but would replace our MLX Whisper pipeline
- NeMo MSDD — better overlapping speech handling but much heavier, NVIDIA-focused

### 2. Pipeline architecture: sequential function pipeline

**Choice:** A linear chain of Python functions, each taking the previous stage's output and returning transformed data. No framework, no DAG engine.

**Rationale:** The pipeline is strictly sequential (each stage depends on the previous). A simple function chain is easy to test, debug, and extend. Over-engineering with a pipeline framework adds complexity without benefit.

### 3. Structured transcript format: list of segment dicts

**Choice:** The canonical transcript format is a list of segment dictionaries:
```json
[
  {
    "start": 0.0,
    "end": 2.5,
    "text": "Let's get started with the standup.",
    "speaker": "Speaker 1",
    "speaker_name": "Sarah",
    "confidence": 0.92
  }
]
```

**Rationale:** Flat and simple. Each stage reads and writes this same format, adding or modifying fields (diarization adds `speaker`, name resolution adds `speaker_name`, preprocessing may merge segments). No nested structures needed.

### 4. Diarization-transcription alignment: timestamp overlap

**Choice:** Align pyannote speaker segments with Whisper word-level timestamps using majority overlap — each Whisper segment is assigned the speaker whose pyannote segment covers the largest portion of its time range.

**Alternatives considered:**
- Forced alignment (WhisperX approach) — more precise but requires replacing MLX Whisper
- Simple midpoint matching — simpler but less accurate for segments spanning speaker boundaries

### 5. Name resolution: fuzzy matching first, LLM fallback

**Choice:** Use edit distance + phonetic similarity (jellyfish library) against the participant roster for name correction in transcript text. Use the LLM diarization correction pass to also handle speaker-label-to-name mapping via context clues.

**Rationale:** Fuzzy matching is fast and deterministic for the common case (Whisper mangling known names). The harder problem of mapping "Speaker 1" to "Sarah" requires understanding conversational context, which the LLM correction pass already handles.

### 6. API change: new response format with backward compatibility

**Choice:** The `/api/transcribe` endpoint returns the structured segment list. Add a query parameter `?format=text` for plain text fallback during migration.

**Rationale:** The frontend needs to be updated regardless to render speaker-attributed segments. A clean break with a fallback option is simpler than versioning the API.

## Risks / Trade-offs

**pyannote.audio model download size (~1GB)** → Accept this; it's a one-time download. Document in setup instructions.

**Diarization quality on laptop microphone recordings** → Audio quality varies greatly. The text-based correction pass mitigates this, but poorly recorded audio will still produce errors. Document expected quality ranges.

**LLM correction pass adds latency and API cost** → This is explicitly temporary (Phase 3 replaces it with a local model). For now, it's an optional pipeline stage that can be skipped.

**Breaking API change for frontend** → Mitigated by the `?format=text` fallback. Frontend update is scoped as part of this work.
