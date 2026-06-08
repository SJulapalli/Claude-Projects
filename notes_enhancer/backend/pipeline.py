import copy
import logging

from transcribe import transcribe_audio
from diarize import diarize_audio, align_speakers
from diarization_correction import correct_diarization
from name_resolution import resolve_names
from preprocessing import preprocess_segments

log = logging.getLogger(__name__)


def run_pipeline(
    file_path: str,
    roster: list[str] | None = None,
    enable_diarization: bool = True,
    enable_correction: bool = True,
    enable_preprocessing: bool = True,
    on_progress=None,
    on_stage_complete=None,
    correction_prompt: str | None = None,
):
    """Run the full transcription pipeline.

    Stages: transcribe → diarize → align → correct → name-resolve → preprocess

    on_progress: callback(percent: int, message: str) for stage-level progress.
    on_stage_complete: callback(stage_name: str, segments: list) called after each stage.
    Returns a list of processed segment dicts.
    """
    roster = roster or []

    def stage_progress(stage_start, stage_end):
        """Create a sub-progress callback scoped to a pipeline stage."""
        def cb(pct, msg):
            if on_progress:
                overall = stage_start + (stage_end - stage_start) * pct / 100
                on_progress(int(overall), msg)
        return cb

    def emit_stage(name, segs):
        log.info(f"Stage complete: {name} ({len(segs)} segments)")
        if on_stage_complete:
            on_stage_complete(name, copy.deepcopy(segs))

    # Stage 1: Transcription (0-30%)
    if on_progress:
        on_progress(0, "Starting transcription...")
    segments = transcribe_audio(file_path, on_progress=stage_progress(0, 30))
    emit_stage("Transcription", segments)

    if not enable_diarization:
        if enable_preprocessing:
            segments = preprocess_segments(segments, on_progress=stage_progress(80, 95))
            emit_stage("Preprocessing", segments)
        if on_progress:
            on_progress(100, "Pipeline complete")
        return segments

    # Stage 2: Diarization (30-50%)
    if on_progress:
        on_progress(30, "Running speaker diarization...")
    speaker_segments = diarize_audio(file_path, on_progress=stage_progress(30, 50))

    # Stage 3: Alignment (50-55%)
    if on_progress:
        on_progress(50, "Aligning speakers with transcript...")
    segments = align_speakers(segments, speaker_segments)
    emit_stage("Speaker Diarization", segments)

    # Stage 4: Diarization correction (55-70%)
    if enable_correction:
        if on_progress:
            on_progress(55, "Correcting speaker attribution...")
        segments = correct_diarization(segments, on_progress=stage_progress(55, 70), custom_prompt=correction_prompt)
        emit_stage("Diarization Correction", segments)

    # Stage 5: Name resolution (70-85%)
    if roster:
        if on_progress:
            on_progress(70, "Resolving participant names...")
        segments = resolve_names(segments, roster, on_progress=stage_progress(70, 85))
        emit_stage("Name Resolution", segments)

    # Stage 6: Preprocessing (85-95%)
    if enable_preprocessing:
        if on_progress:
            on_progress(85, "Preprocessing transcript...")
        segments = preprocess_segments(segments, on_progress=stage_progress(85, 95))
        emit_stage("Preprocessing", segments)

    if on_progress:
        on_progress(100, "Pipeline complete")

    return segments
