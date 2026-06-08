# Implementation Plan: Local AI Meeting Notes Enhancer

## Overview

This plan works forward from the current implementation (MLX Whisper transcription + Claude API enhancement) toward a fully local pipeline. The work is organized into three phases:

1. **Phase 1 — Transcription Foundation:** Build the improved multi-pass transcription and diarization pipeline. This is independent of the enhancement logic and can be developed and validated in isolation.
2. **Phase 2 — Claude API Data Pipeline:** Implement the full multi-pass enhancement architecture using Claude as the model backend. This establishes the pipeline structure, prompt templates, data formats, and quality baselines while producing a dataset of intermediate outputs at each stage.
3. **Phase 3 — Ablation Study & Local Model Substitution:** Systematically replace each Claude-powered stage with local alternatives, measuring quality degradation at each step to determine which substitutions are viable and which stages genuinely require a large model.

---

## Phase 1: Transcription Foundation

This phase produces a high-quality, speaker-attributed transcript from raw meeting audio. It functions as a standalone module that feeds into the enhancement pipeline.

### Step 1.1: Baseline Transcription with MLX Whisper

**Goal:** Establish the current transcription quality as a baseline for measuring improvements.

**Work:**

- Formalize the existing MLX Whisper setup as a standalone module with a clean API: audio in, timestamped transcript out.
- Select a Whisper model size for the M4 Pro. Whisper Large-v3 is the quality ceiling; Whisper Medium is faster with modest quality loss. Benchmark both on representative meeting audio to find the right tradeoff.
- Define the output format. Recommended: a structured JSON per utterance containing the start timestamp, end timestamp, transcribed text, and a confidence score. This format is consumed by all downstream stages.
- Collect 5–10 representative test recordings spanning different meeting types (standup, planning, brainstorm, 1:1) with manually verified transcripts. These become the transcription ground truth for measuring all future improvements.

**Deliverable:** A transcription module that takes an audio file and returns a timestamped transcript, plus a small evaluation set with ground truth.

### Step 1.2: Audio-Based Speaker Diarization

**Goal:** Add speaker labels to the transcript using audio signal analysis.

**Work:**

- Evaluate diarization options that run locally on M4 Pro. Primary candidates:
  - **pyannote.audio 3.x** — The most widely used open-source diarization library. Has pre-trained models for speaker segmentation, embedding extraction, and clustering. Python-based, runs on CPU or MPS. Strong community support and well-documented.
  - **WhisperX** — Extends Whisper with forced alignment and diarization (uses pyannote under the hood). May be simpler to integrate since it wraps both transcription and diarization into one pipeline.
  - **NeMo MSDD (Multi-Scale Diarization Decoder)** — NVIDIA's offering, handles overlapping speech better than clustering-based approaches. Heavier but more accurate for complex multi-speaker scenarios.
- Integrate the chosen diarization system with the Whisper transcription output. The diarization system produces speaker segments from audio; these need to be aligned with the word-level timestamps from Whisper to assign speaker labels to each transcribed utterance.
- Build an evaluation harness: for the test recordings from Step 1.1, manually annotate who is speaking when (at minimum, mark speaker turns at the utterance level). Measure Diarization Error Rate (DER) and Word Diarization Error Rate (WDER) against this ground truth.
- Handle the common failure modes and document their frequency:
  - Short interjections ("yeah," "right") misattributed to the previous speaker.
  - Rapid turn-taking where two speakers are merged into one.
  - One speaker split into two segments after a pause.
  - Overlapping speech where two people talk simultaneously.

**Deliverable:** A diarized transcript with speaker labels per utterance, DER/WDER measurements on the test set, and a documented catalog of the types and frequency of diarization errors.

### Step 1.3: Text-Based Diarization Correction

**Goal:** Use an LLM to post-process the diarized transcript, catching errors that are detectable from text but invisible to audio analysis.

**Work:**

- Implement a DiarizationLM-style correction pass using Claude initially (this will be one of the substitution targets in Phase 3). The input is the full diarized transcript in a compact text format; the output is the same transcript with corrected speaker labels.
- Design the prompt for this pass. The LLM should:
  - Detect conversational incoherence — the same speaker asking and answering their own question, a speaker agreeing with themselves, a speaker contradicting themselves within two turns.
  - Flag segments where speaker attribution is uncertain rather than guessing.
  - Preserve all original text unchanged — this pass only modifies speaker labels, never transcript content.
- Build a transfer algorithm: the LLM's corrected speaker labels must be mapped back onto the original word sequence from the ASR output (the LLM may rephrase or reorder during generation; only the speaker labels should be extracted and transferred).
- Measure the improvement: compare DER/WDER before and after the correction pass on the test set.
- Document which error types the text-based correction reliably catches and which it misses. This informs which errors need to be addressed through other means (e.g., improved audio diarization, speaker enrollment).

**Deliverable:** A text-based diarization correction module, measured DER/WDER improvement, and an error analysis showing which correction types are reliable.

### Step 1.4: Name Resolution

**Goal:** Map generic speaker labels (Speaker 1, Speaker 2) to actual participant names, and correct Whisper's mangling of names in the transcript text.

**Work:**

- Build a participant roster interface. The user provides known participant names before or after the meeting — from a calendar invite, a manual list, or an accumulated contact database.
- Implement name resolution in two sub-tasks:
  - **Speaker label to name mapping:** Using context clues in the transcript (self-introductions, "thanks, Sarah," addressing by name) plus the provided roster, assign real names to speaker labels. This can be done by the LLM as part of the diarization correction prompt, or as a separate lightweight pass.
  - **Transcript name correction:** Find and fix instances where Whisper has mangled a known name. "Krishna Murphy" → "Krishnamurthy," "John Foe" → "John Pho," etc. This is primarily a fuzzy matching problem against the roster. Implement with edit distance / phonetic similarity (Soundex, Metaphone) first; if that's insufficient, use the LLM.
- Handle the edge case where a name is mentioned but the person isn't a participant (e.g., "I talked to Mike from legal about this" where Mike isn't in the meeting).
- Evaluate: on the test set, manually verify name assignments and transcript corrections. Measure precision (how often an assigned name is correct) and recall (how often the correct name is assigned at all).

**Deliverable:** A name resolution module that takes a diarized transcript + participant roster and outputs a transcript with real names, plus evaluation metrics.

### Step 1.5: Transcript Preprocessing

**Goal:** Clean the transcript before it enters the enhancement pipeline, reducing the burden on the LLM.

**Work:**

- Implement rule-based cleanup (no LLM needed):
  - Remove filler words and verbal tics ("um," "uh," "like," "you know," "I mean" when used as filler).
  - Merge fragmented speaker turns. If Speaker A has three consecutive short segments with no intervening speaker, merge them into one turn.
  - Remove false starts and self-corrections. "We should — actually, we need to push the deadline" → "We need to push the deadline."
  - Normalize formatting: consistent timestamp format, consistent speaker label format, remove duplicate whitespace.
- This is a pipeline of regex-based and heuristic transformations. Each transformation should be toggleable (some users may want verbatim transcripts for legal or compliance reasons).
- Evaluate: compare enhancement quality (in Phase 2) with and without preprocessing. The hypothesis is that cleaner input produces meaningfully better enhancement output from smaller models.

**Deliverable:** A configurable transcript preprocessing module and A/B evaluation data showing its impact on downstream enhancement quality.

---

## Phase 2: Claude API Data Pipeline

This phase builds the full multi-pass enhancement architecture using Claude as the model backend. The goals are to establish the pipeline structure, validate that the multi-pass approach produces quality comparable to single-pass Claude enhancement, and generate a dataset of intermediate outputs for the ablation study.

### Step 2.1: Data Collection Infrastructure

**Goal:** Build logging and storage infrastructure so that every intermediate output from every pipeline stage is captured for later analysis.

**Work:**

- Design a data schema for pipeline runs. Each meeting processing run stores:
  - The raw audio file path (or hash, for privacy — see below).
  - The raw Whisper transcript.
  - The diarized transcript (before and after text-based correction).
  - The name-resolved transcript.
  - The preprocessed transcript.
  - The topic segmentation output (boundaries + labels).
  - Each per-sprint enhancement output, including the rolling context that was passed in.
  - The final reconciled output.
  - The prompts used at each stage (including system prompts and any context injections).
  - The model, temperature, and other generation parameters at each stage.
  - Timing information for each stage.
- Implement this as a local SQLite or file-based store. Every field is stored locally; nothing is transmitted beyond the Claude API calls themselves.
- Build a simple comparison UI or report generator: for any two pipeline runs (e.g., before/after a prompt change), show the outputs side by side at each stage. This is essential for prompt iteration.
- **Privacy consideration:** The raw audio and transcripts contain participant speech. Store these in an encrypted local store with clear retention policies. For the ablation study, you'll need to retain this data; provide a mechanism for users to purge it after experimentation is complete.

**Deliverable:** A pipeline run storage system with logging at every stage and comparison tooling.

### Step 2.2: Topic Segmentation

**Goal:** Implement the pass that breaks the preprocessed transcript into topically coherent sprints.

**Work:**

- Implement two approaches and compare:
  - **Embedding-based segmentation (non-LLM):** Use a small local embedding model (e.g., all-MiniLM-L6-v2, which runs easily on M4 Pro) to embed sliding windows of the transcript. Compute cosine similarity between adjacent windows. Topic boundaries are where similarity drops below a threshold. Tune the window size and threshold on the test set.
  - **LLM-based segmentation (Claude):** Prompt Claude with the full preprocessed transcript and ask it to identify topic boundaries and label each segment. The output should be structured: a list of segments, each with a start index, end index, and topic label.
- Compare the two approaches on the test set. Manually annotate topic boundaries in the test recordings and measure boundary detection accuracy (precision, recall, F1) for each approach.
- The embedding-based approach may be sufficient and is preferable if so — it's faster, deterministic, and doesn't require an LLM call. But if the LLM-based approach produces meaningfully better boundaries, note this for the ablation study.
- Design the sprint output format: each sprint is a self-contained unit containing the sprint label/topic, the raw transcript for that segment, the list of speakers active in that segment, and the timestamp range.

**Deliverable:** A topic segmentation module (both embedding-based and LLM-based implementations), comparative evaluation, and a defined sprint data format.

### Step 2.3: Per-Sprint Enhancement with Rolling Context

**Goal:** Implement the core enhancement logic that transforms each sprint's raw transcript into polished notes, with awareness of previous sprints.

**Work:**

- Design the enhancement prompt template. This is the most important prompt in the entire pipeline. It should include:
  - A system prompt defining the role (meeting notes enhancer), output format requirements, and explicit structural schema (section headers, action item format, decision format, etc.).
  - The user's original notes for the meeting (if any — this is what Granola-style tools use as the skeleton to enhance around).
  - A compressed summary of previously enhanced sprints (rolling context). For sprint 1, this is empty. For sprint N, it includes the enhanced output of sprints 1 through N-1, or a summary thereof if they exceed a context budget.
  - The raw transcript for the current sprint.
  - The participant roster with roles (if known).
  - Explicit instructions for pronoun handling: convert first-person speech to third-person attribution using the speaker labels.
- Implement the rolling context mechanism:
  - Define a context budget (e.g., 2000 tokens for rolling context). If the accumulated enhanced output from previous sprints exceeds this, summarize it. The summarization can be a separate lightweight Claude call or a simple truncation strategy (keep the most recent sprint in full, summarize older ones).
  - Always include the raw transcript alongside the enhanced context for the current sprint, so the model can cross-reference.
- Implement the sequential processing loop: for each sprint in order, construct the prompt, call Claude, parse the response, add to rolling context, proceed to next sprint.
- Evaluate: compare the multi-pass sprint-based enhancement against the current single-pass Claude enhancement (where the entire transcript is sent in one prompt). Measure on the test set using:
  - **Completeness:** Are all key points, decisions, and action items captured?
  - **Attribution accuracy:** Are statements attributed to the correct speakers?
  - **Coherence:** Does the output read as a unified document, or are there jarring transitions between sprints?
  - **Hallucination rate:** Does the model introduce information not present in the transcript?

**Deliverable:** A per-sprint enhancement module with rolling context, prompt templates, and comparative evaluation against single-pass enhancement.

### Step 2.4: Final Reconciliation

**Goal:** Implement the pass that merges per-sprint enhanced outputs into a coherent final document.

**Work:**

- Design the reconciliation prompt. Input: all per-sprint enhanced outputs concatenated. The prompt should instruct the model to:
  - Deduplicate: if the same point appears in multiple sprints (common when a topic is revisited), merge them.
  - Consolidate action items into a single list with assignee, description, and deadline.
  - Consolidate decisions into a single list.
  - Generate a 2–3 sentence executive summary of the entire meeting.
  - Ensure consistent terminology throughout (e.g., if sprint 1 calls it "the migration project" and sprint 3 calls it "the cloud transition," pick one and use it consistently).
  - Fix any cross-sprint coherence issues in the narrative.
- The input to this pass is much shorter than the original transcript (just the enhanced notes), so it's well within context limits.
- Evaluate: compare the reconciled output against a human-edited "ideal" version of the meeting notes for the test set. This is the final quality benchmark.

**Deliverable:** A reconciliation module and the final quality benchmark for the complete pipeline.

### Step 2.5: End-to-End Pipeline Integration

**Goal:** Wire all stages together into a single callable pipeline and validate end-to-end quality.

**Work:**

- Build the orchestrator that takes raw audio + participant roster + user notes and runs the full pipeline:
  ```
  Audio → Whisper → Diarization → Diarization Correction → Name Resolution
  → Preprocessing → Topic Segmentation → Per-Sprint Enhancement → Reconciliation
  → Final Enhanced Notes
  ```
- Add error handling at each stage boundary. If any stage fails or produces unexpected output, the pipeline should log the failure, use the best available fallback (e.g., skip diarization correction and proceed with uncorrected diarization), and flag the degradation in the final output.
- Measure end-to-end latency on the test set. Record per-stage timing. Identify bottlenecks.
- Run the full pipeline on 20–30 real meetings to build up the intermediate output dataset needed for Phase 3. Each run stores all intermediate outputs via the logging infrastructure from Step 2.1.
- Conduct a qualitative review: for each test meeting, have the meeting participants review the enhanced notes and rate them on usefulness, accuracy, and completeness. This is the ultimate quality measure.

**Deliverable:** A fully integrated pipeline, end-to-end latency measurements, a dataset of 20–30 meetings with all intermediate outputs, and participant quality ratings.

---

## Phase 3: Ablation Study & Local Model Substitution

This phase systematically replaces each Claude-powered stage with local alternatives, measuring quality at each step. The dataset from Phase 2 provides the ground truth for comparison.

### Step 3.1: Establish Evaluation Framework

**Goal:** Before substituting anything, define exactly how you'll measure quality degradation.

**Work:**

- For each pipeline stage, define the metrics that will be used to compare Claude output against local model output:
  - **Diarization correction:** WDER improvement (delta from uncorrected baseline).
  - **Topic segmentation:** Boundary detection F1 against Claude-generated boundaries.
  - **Per-sprint enhancement:** ROUGE scores against Claude-enhanced output, plus manual ratings of completeness, attribution accuracy, coherence, and hallucination rate.
  - **Reconciliation:** Manual quality ratings against Claude-reconciled output.
- Define acceptance thresholds. For each metric, what level of degradation is acceptable? Recommendation:
  - Diarization correction: accept if WDER improvement is within 80% of Claude's improvement.
  - Topic segmentation: accept if boundary F1 is above 0.85 against Claude boundaries.
  - Enhancement: accept if manual quality ratings are within 1 point (on a 5-point scale) of Claude output, and hallucination rate does not increase.
  - Reconciliation: accept if manual quality ratings are within 1 point of Claude output.
- Build automated evaluation scripts that can compare any two pipeline runs stage-by-stage. This makes it fast to test new models or prompt variations.

**Deliverable:** An evaluation framework with per-stage metrics, acceptance thresholds, and automated comparison scripts.

### Step 3.2: Local Model Setup

**Goal:** Set up the local inference infrastructure for testing candidate models.

**Work:**

- Install mlx-lm and download candidate models in MLX format:
  - **Qwen 2.5 7B Instruct (Q4/Q8 quantized)** — Primary candidate for all stages.
  - **Qwen 2.5 14B Instruct (Q4 quantized)** — If RAM allows, test as a quality ceiling for local models.
  - **Phi-4 14B (Q4 quantized)** — Alternate candidate, particularly for reasoning-heavy stages.
  - **Llama 3.2 8B Instruct** — Baseline comparison.
  - **Mistral 7B Instruct** — Additional comparison point.
- Build a model abstraction layer: a common interface that accepts a prompt and returns a completion, with the backend switchable between Claude API and any local MLX model. This makes it trivial to swap models in and out of any pipeline stage.
- Benchmark raw inference speed for each model on the M4 Pro: tokens per second for generation, time to first token, and memory usage. This establishes the latency ceiling for each model independent of prompt quality.

**Deliverable:** Local model inference infrastructure with a common interface, and raw performance benchmarks for each candidate model.

### Step 3.3: Ablation — Non-LLM Stages First

**Goal:** Confirm which stages can be handled without any LLM at all.

**Work:**

- **Name correction without LLM:** Test the fuzzy matching approach (edit distance + phonetic similarity against the participant roster) on the dataset from Phase 2. Compare name correction accuracy against Claude-based name correction. If fuzzy matching achieves >95% accuracy, adopt it — it's faster and fully deterministic.
- **Topic segmentation without LLM:** Test the embedding-based segmentation (from Step 2.2) against Claude-based segmentation on the full dataset. If boundary F1 exceeds the acceptance threshold, adopt it. Note: even if the embedding approach is slightly worse at boundary detection, it may be worth adopting if the quality difference is small and the speed improvement is large.
- **Transcript preprocessing:** This is already rule-based (no LLM). Validate that the existing rules are working well across the full dataset. Look for edge cases where the rules are too aggressive (removing meaningful content) or too conservative (leaving noise that hurts downstream quality).

**Deliverable:** Go/no-go decisions on non-LLM alternatives for name correction, topic segmentation, and preprocessing, with supporting evaluation data.

### Step 3.4: Ablation — Diarization Correction

**Goal:** Determine if a local model can replace Claude for the text-based diarization correction pass.

**Work:**

- Run the diarization correction pass with each candidate local model, using the same prompt as Claude.
- Measure WDER improvement for each model against the Phase 2 dataset.
- If no local model meets the acceptance threshold with the Claude prompt, iterate on the prompt. Smaller models often need more explicit instructions — try:
  - Providing a few concrete examples of diarization errors and their corrections in the prompt (few-shot).
  - Breaking the correction task into two sub-steps: first identify likely errors, then fix them.
  - Reducing the input size (process shorter segments rather than the full transcript).
- Record which error types each local model catches and which it misses, compared to Claude. If a local model catches the high-impact errors (merged speakers, self-answering questions) but misses low-impact ones (misattributed filler words), that may be acceptable.
- **If no local model is acceptable:** This stage stays on Claude, or is dropped from the pipeline (relying on audio diarization alone). Measure the end-to-end impact of dropping this stage entirely.

**Deliverable:** Per-model evaluation of diarization correction quality, go/no-go decision, and if needed, revised prompts for local models.

### Step 3.5: Ablation — Per-Sprint Enhancement

**Goal:** This is the most critical substitution. Determine if a local model can produce enhancement quality close enough to Claude to be viable.

**Work:**

- Run per-sprint enhancement with each candidate local model on the full Phase 2 dataset. Use the same prompts initially.
- Evaluate using both automated metrics (ROUGE against Claude output) and manual quality ratings. The manual ratings are essential here — ROUGE alone won't capture whether action items are correctly attributed or whether the model hallucinated a decision that wasn't made.
- **Expect the initial results to show a quality gap.** The primary effort in this step is closing that gap through prompt engineering:
  - **Make the output schema more rigid.** Instead of "enhance these notes," provide an exact template: "Section 1: Key Discussion Points (write 2–3 sentences per point). Section 2: Decisions Made (format: [Decision] — proposed by [Name], agreed by [Names]). Section 3: Action Items (format: [Task] — Owner: [Name], Due: [Date])."
  - **Reduce generation length.** Smaller models degrade faster on longer outputs. If Claude produces 500-token sprint summaries, try constraining the local model to 300 tokens with a more focused prompt.
  - **Add explicit anti-hallucination instructions.** "Only include information that is explicitly stated in the transcript. If something is unclear, note it as unclear rather than inferring."
  - **Try chain-of-thought.** Have the model first list the key points it found in the transcript (extractive step), then generate the enhanced summary from that list (abstractive step). This two-step-within-one-prompt approach can improve smaller models significantly.
- Test each model at multiple quantization levels. Qwen 2.5 7B at Q8 vs Q4 may show a meaningful quality difference for this task.
- If the 7B models all fail the acceptance threshold, test the 14B models. If 14B at Q4 passes, evaluate whether the RAM and latency tradeoff is acceptable.
- **If no local model is acceptable for full enhancement:** Consider a hybrid approach where the local model handles "easy" sprints (clear discussion, few speakers, straightforward content) and Claude handles "hard" sprints (complex discussions, many speakers, ambiguous content). Define heuristics for routing: transcript complexity, number of speakers, density of cross-references.

**Deliverable:** Per-model enhancement quality evaluation, optimized prompts for the best-performing local model, and a go/no-go decision (potentially with a hybrid routing strategy).

### Step 3.6: Ablation — Reconciliation

**Goal:** Determine if reconciliation can be handled locally.

**Work:**

- Run reconciliation with each candidate local model on the Phase 2 dataset.
- This stage has a structural advantage for local models: the input is shorter (just enhanced notes, not raw transcript) and the task is more constrained (deduplication, consolidation, and formatting rather than open-ended enhancement).
- Evaluate using manual quality ratings against Claude-reconciled output.
- If the local model struggles with full reconciliation, try splitting it:
  - Action item consolidation (extract and deduplicate action items — more structured, easier for small models).
  - Decision consolidation (same pattern).
  - Executive summary generation (short, focused generation).
  - Terminology normalization (find inconsistencies and pick the preferred term — potentially rule-based).

**Deliverable:** Reconciliation quality evaluation and go/no-go decision.

### Step 3.7: End-to-End Local Pipeline Evaluation

**Goal:** Assemble the best configuration from the ablation results and evaluate the fully local (or maximally local) pipeline end-to-end.

**Work:**

- Based on Steps 3.3–3.6, assemble the pipeline using the best option for each stage — local model, non-LLM alternative, or Claude (where no local alternative met the threshold).
- Run the full pipeline on the test set and the broader Phase 2 dataset.
- Measure end-to-end quality against the all-Claude pipeline from Phase 2. If any stage is still using Claude, also measure quality for a fully-local variant (even if below threshold) to understand the full cost of going local-only.
- Measure end-to-end latency. Break down by stage. Identify whether the total processing time is acceptable for the target use case (post-meeting enhancement of a 30–60 minute meeting should complete in under 3 minutes for a good user experience).
- Measure peak memory usage during the full pipeline run. Ensure Whisper + the local LLM + any embedding models can coexist in the M4 Pro's unified memory without swapping.
- Conduct a final qualitative review with meeting participants, comparing the local pipeline output against the Claude pipeline output in a blind evaluation (participants don't know which is which).

**Deliverable:** Final pipeline configuration, end-to-end quality and latency measurements, memory profile, and participant blind evaluation results.

### Step 3.8: Optimization & Hardening

**Goal:** Optimize the chosen pipeline for production use.

**Work:**

- **Latency optimization:**
  - Pipeline stages that don't depend on each other can be parallelized (e.g., embedding-based segmentation can run while the name correction pass is still processing).
  - If using a single local LLM for multiple stages, batch the inference: load the model once, process all stages sequentially, then unload. Avoid repeated model loading/unloading.
  - For the per-sprint enhancement, sprints cannot be parallelized (each depends on the rolling context from previous ones). But the sprint prompts can be pre-constructed while the previous sprint is generating.
- **Memory optimization:**
  - Profile the actual memory usage during a full pipeline run. If Whisper and the LLM are used sequentially (not simultaneously), consider loading/unloading them to free memory.
  - If using a 14B model, test whether Q4 quantization is sufficient or whether Q8 is needed for acceptable quality. The difference is substantial in memory terms.
- **Reliability:**
  - Add retry logic for stages where the local model's output fails structural validation (e.g., the enhancement output doesn't match the expected schema).
  - Add a quality gate: after enhancement, run a lightweight check for common failure modes (empty sections, repeated content, action items without assignees). If failures are detected, re-run the stage with a more constrained prompt.
- **User experience:**
  - Display progress to the user during processing (stage-by-stage progress bar).
  - Allow the user to review and edit the output at each stage, not just the final output. If the segmentation is wrong, the user should be able to adjust sprint boundaries before enhancement runs.
  - Provide a "re-enhance this section" feature: if one sprint's enhancement is poor, the user can trigger a re-run of just that sprint with adjusted parameters.

**Deliverable:** An optimized, production-ready pipeline with progress reporting, user editing capabilities, and reliability safeguards.

---

## Dependency Graph

```
Phase 1 (Transcription) is fully independent.
Phase 2 depends on Phase 1 (needs transcripts as input).
Phase 3 depends on Phase 2 (needs the Claude baseline dataset and pipeline infrastructure).

Within Phase 1:
  1.1 (Whisper baseline) → 1.2 (Diarization) → 1.3 (Diarization Correction)
                                                → 1.4 (Name Resolution)
                                                → 1.5 (Preprocessing)

Within Phase 2:
  2.1 (Data infrastructure) can start in parallel with Phase 1
  2.2 (Segmentation) depends on Phase 1 outputs
  2.3 (Enhancement) depends on 2.2
  2.4 (Reconciliation) depends on 2.3
  2.5 (Integration) depends on 2.1–2.4

Within Phase 3:
  3.1 (Eval framework) + 3.2 (Model setup) can start as soon as 2.5 is complete
  3.3 (Non-LLM ablation) can start immediately after 3.1
  3.4–3.6 (LLM ablation) depend on 3.2 and run in parallel
  3.7 (End-to-end) depends on 3.3–3.6
  3.8 (Optimization) depends on 3.7
```

---

## Risk Register

**Risk: Local model quality is unacceptable for per-sprint enhancement, even with optimized prompts.**
Mitigation: The hybrid routing strategy (local for easy sprints, Claude for hard ones) provides a graceful degradation path. Even if 30% of sprints still require Claude, API costs drop by 70%. As local models improve (new releases are frequent), re-run the ablation to gradually reduce Claude dependency.

**Risk: End-to-end latency exceeds acceptable thresholds.**
Mitigation: The pipeline has several latency levers: smaller quantization, smaller model, fewer sprints (larger segments), skipping reconciliation for shorter meetings, or parallelizing independent stages. If all else fails, start processing while the meeting is still in progress (transcription and diarization can run in streaming mode; enhancement begins on early sprints before the meeting ends).

**Risk: Diarization quality is too poor to support accurate speaker attribution in notes.**
Mitigation: The text-based diarization correction pass is specifically designed to catch audio diarization errors. If the combined audio + text pipeline still produces unacceptable diarization, fall back to a simpler output format that doesn't require speaker attribution (topic-based summaries rather than speaker-attributed notes). Alternatively, integrate a speaker enrollment step where participants each say a few sentences at the start of the meeting to create voice profiles.

**Risk: Pipeline complexity makes debugging difficult.**
Mitigation: The logging infrastructure from Step 2.1 stores every intermediate output. The stage-by-stage comparison tooling makes it straightforward to identify which stage introduced a problem. Each stage is also independently testable with saved intermediate outputs as fixtures.

**Risk: Privacy-sensitive meeting content accumulates in the evaluation dataset.**
Mitigation: Define a data retention policy from the start. The evaluation dataset is needed during Phase 2 and 3 but should be purgeable once the pipeline is finalized. Provide a clear "delete all evaluation data" command. During development, consider using synthetic or anonymized meeting recordings for the bulk of testing, reserving real recordings for final validation only.
