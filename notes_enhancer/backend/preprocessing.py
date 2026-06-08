import re


# Filler patterns — matched as whole words, case-insensitive
_FILLER_PATTERNS = [
    r"\bum\b",
    r"\buh\b",
    r"\blike\b(?=\s*,)",  # "like" followed by comma (filler usage)
    r"\byou know\b",
    r"\bi mean\b(?=\s*,)",  # "I mean" as filler (followed by comma)
    r"\bkind of\b(?=\s*,)",
    r"\bsort of\b(?=\s*,)",
]

_FILLER_RE = re.compile("|".join(_FILLER_PATTERNS), re.IGNORECASE)

# False start pattern: text before a dash/correction marker followed by the correction
_FALSE_START_RE = re.compile(
    r"(\b\w+(?:\s+\w+){0,4})\s*[—–-]+\s*(?:actually|no|wait|sorry|I mean)\s*,?\s*",
    re.IGNORECASE,
)


def remove_fillers(text: str) -> str:
    """Remove filler words from text."""
    result = _FILLER_RE.sub("", text)
    # Clean up leftover artifacts: double commas, leading commas, extra spaces
    result = re.sub(r",\s*,", ",", result)
    result = re.sub(r"^\s*,\s*", "", result)
    result = re.sub(r"\s{2,}", " ", result)
    return result.strip()


def remove_false_starts(text: str) -> str:
    """Remove false starts and self-corrections from text."""
    result = _FALSE_START_RE.sub("", text)
    # Capitalize first letter if it was lowered by the removal
    if result and result[0].islower():
        result = result[0].upper() + result[1:]
    return result.strip()


def merge_speaker_turns(segments: list[dict]) -> list[dict]:
    """Merge consecutive segments from the same speaker into single segments."""
    if not segments:
        return segments

    merged = [segments[0].copy()]

    for seg in segments[1:]:
        prev = merged[-1]
        if seg.get("speaker") and seg.get("speaker") == prev.get("speaker"):
            prev["end"] = seg["end"]
            prev["text"] = prev["text"] + " " + seg["text"]
            # Keep the higher confidence
            prev["confidence"] = max(
                prev.get("confidence", 0),
                seg.get("confidence", 0),
            )
            # Preserve other fields from first segment
            if seg.get("low_confidence_speaker") and not prev.get("low_confidence_speaker"):
                pass  # Keep prev's flag (False is better)
        else:
            merged.append(seg.copy())

    return merged


def preprocess_segments(
    segments: list[dict],
    enable_filler_removal: bool = True,
    enable_turn_merging: bool = True,
    enable_false_start_removal: bool = True,
    on_progress=None,
) -> list[dict]:
    """Apply configurable preprocessing steps to transcript segments."""
    if on_progress:
        on_progress(0, "Preprocessing transcript...")

    result = [seg.copy() for seg in segments]

    if enable_filler_removal:
        for seg in result:
            seg["text"] = remove_fillers(seg["text"])

    if enable_false_start_removal:
        for seg in result:
            seg["text"] = remove_false_starts(seg["text"])

    # Remove empty segments after text cleanup
    result = [seg for seg in result if seg["text"].strip()]

    if enable_turn_merging:
        result = merge_speaker_turns(result)

    if on_progress:
        on_progress(100, "Preprocessing complete")

    return result
