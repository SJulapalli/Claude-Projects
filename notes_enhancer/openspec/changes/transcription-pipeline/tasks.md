## 1. Structured Transcript Format

- [x] 1.1 Refactor `transcribe.py` to return a list of segment dicts (`start`, `end`, `text`, `confidence`) instead of plain text
- [x] 1.2 Update `/api/transcribe` SSE result event to return `{"segments": [...], "transcript": "..."}` with `?format=text` fallback
- [x] 1.3 Update frontend `FileUpload.jsx` to handle the new structured response and store segments
- [x] 1.4 Update frontend transcript display to render segments (show timestamps) instead of a plain text blob

## 2. Speaker Diarization

- [x] 2.1 Add `pyannote.audio` to backend dependencies and verify it runs on Apple Silicon (MPS)
- [x] 2.2 Create `diarize.py` module that takes an audio file path and returns speaker segments with time ranges
- [x] 2.3 Implement timestamp-overlap alignment to merge pyannote speaker segments with Whisper transcript segments, adding `speaker` field
- [x] 2.4 Flag low-confidence speaker assignments (overlap ratio < 0.6) with `low_confidence_speaker` metadata
- [x] 2.5 Update frontend transcript display to show speaker labels per segment

## 3. Diarization Correction

- [x] 3.1 Create `diarization_correction.py` module with Claude API call to detect and fix speaker attribution errors from text context
- [x] 3.2 Implement the transfer algorithm: extract corrected speaker labels from LLM output and map back onto original segments (preserving text/timestamps)
- [x] 3.3 Add configuration flag to enable/disable the correction pass

## 4. Name Resolution

- [x] 4.1 Add `jellyfish` to backend dependencies for phonetic matching
- [x] 4.2 Create `name_resolution.py` module with fuzzy matching (edit distance + phonetic similarity) to correct Whisper name manglings against a participant roster
- [x] 4.3 Integrate speaker-label-to-name mapping into the diarization correction LLM prompt, adding `speaker_name` field to segments
- [x] 4.4 Add participant roster input to the API (new field on transcribe request or separate endpoint)
- [x] 4.5 Add participant roster input UI to the frontend

## 5. Transcript Preprocessing

- [x] 5.1 Create `preprocessing.py` module with filler word removal (um, uh, like, you know, I mean)
- [x] 5.2 Implement speaker turn merging for consecutive same-speaker segments
- [x] 5.3 Implement false start / self-correction removal
- [x] 5.4 Add configuration for toggling each preprocessing step independently

## 6. Pipeline Integration

- [x] 6.1 Create `pipeline.py` orchestrator that chains: transcribe → diarize → align → correct → name-resolve → preprocess
- [x] 6.2 Update `/api/transcribe` endpoint to run the full pipeline instead of just Whisper
- [x] 6.3 Add per-stage progress reporting through the existing SSE progress events
- [x] 6.4 Update the `/api/enhance` endpoint to accept and use structured transcript segments instead of plain text
