import logging

from pyannote.audio import Pipeline

log = logging.getLogger(__name__)

_PIPELINE = None


def _get_pipeline():
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
        )
    return _PIPELINE


def diarize_audio(file_path: str, on_progress=None):
    """Run speaker diarization on an audio file.

    Returns a list of speaker segments: [{"start": float, "end": float, "speaker": str}]
    """
    if on_progress:
        on_progress(0, "Loading diarization model...")

    pipeline = _get_pipeline()

    if on_progress:
        on_progress(10, "Running speaker diarization...")

    # pyannote's hook callback provides per-step progress
    # Steps: segmentation → embeddings → clustering
    step_order = {"segmentation": 10, "embeddings": 40, "clustering": 70}
    def hook(step_name, step_artefact, file=None, completed=None, total=None, **kwargs):
        if completed is not None and total is not None:
            base = step_order.get(step_name, 10)
            next_base = min(v for v in step_order.values() if v > base) if base < 70 else 90
            pct = base + int((next_base - base) * completed / total)
            msg = f"Diarization: {step_name} ({completed}/{total})"
        else:
            pct = step_order.get(step_name, 50)
            msg = f"Diarization: {step_name}..."
        log.info(msg)
        if on_progress:
            on_progress(pct, msg)

    result = pipeline(file_path, hook=hook)

    # pyannote 3.x returns a DiarizeOutput dataclass
    speaker_segments = result.serialize()["diarization"]

    if on_progress:
        on_progress(100, "Diarization complete")

    return speaker_segments


def align_speakers(transcript_segments, speaker_segments):
    """Align speaker diarization segments with transcript segments using timestamp overlap.

    Adds 'speaker' and 'low_confidence_speaker' fields to each transcript segment.
    """
    for seg in transcript_segments:
        seg_start = seg["start"]
        seg_end = seg["end"]
        seg_duration = seg_end - seg_start

        if seg_duration <= 0:
            seg["speaker"] = "Unknown"
            seg["low_confidence_speaker"] = True
            continue

        # Calculate overlap with each speaker segment
        speaker_overlaps = {}
        for sp_seg in speaker_segments:
            overlap_start = max(seg_start, sp_seg["start"])
            overlap_end = min(seg_end, sp_seg["end"])
            overlap = max(0, overlap_end - overlap_start)
            if overlap > 0:
                speaker = sp_seg["speaker"]
                speaker_overlaps[speaker] = speaker_overlaps.get(speaker, 0) + overlap

        if not speaker_overlaps:
            seg["speaker"] = "Unknown"
            seg["low_confidence_speaker"] = True
            continue

        # Assign speaker with greatest overlap
        best_speaker = max(speaker_overlaps, key=speaker_overlaps.get)
        best_overlap = speaker_overlaps[best_speaker]
        overlap_ratio = best_overlap / seg_duration

        seg["speaker"] = best_speaker
        seg["low_confidence_speaker"] = bool(overlap_ratio < 0.6)

    # Normalize speaker labels to "Speaker 1", "Speaker 2", etc.
    unique_speakers = []
    for seg in transcript_segments:
        if seg["speaker"] not in unique_speakers and seg["speaker"] != "Unknown":
            unique_speakers.append(seg["speaker"])

    speaker_map = {sp: f"Speaker {i + 1}" for i, sp in enumerate(unique_speakers)}
    for seg in transcript_segments:
        if seg["speaker"] in speaker_map:
            seg["speaker"] = speaker_map[seg["speaker"]]

    return transcript_segments
