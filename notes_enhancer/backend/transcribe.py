import mlx_whisper

_MODEL = "mlx-community/whisper-medium-mlx-fp32"


def transcribe_audio(file_path: str, on_progress=None):
    """Transcribe an audio file using mlx-whisper on Apple Silicon GPU.

    Returns a list of segment dicts with keys: start, end, text, confidence.
    on_progress: optional callback(percent: int, message: str)
    """
    if on_progress:
        on_progress(10, "Loading model...")

    result = mlx_whisper.transcribe(
        file_path,
        path_or_hf_repo=_MODEL,
        verbose=False,
        fp16=False,
        word_timestamps=True,
    )

    if on_progress:
        on_progress(90, "Finalizing transcript...")

    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "start": round(seg["start"], 2),
            "end": round(seg["end"], 2),
            "text": seg["text"].strip(),
            "confidence": round(1.0 - seg.get("no_speech_prob", 0.0), 3),
        })

    if on_progress:
        on_progress(100, "Done")

    return segments
