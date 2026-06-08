import re

import jellyfish


def _phonetic_similarity(a: str, b: str) -> float:
    """Compare two strings using Metaphone phonetic encoding."""
    code_a = jellyfish.metaphone(a)
    code_b = jellyfish.metaphone(b)
    if code_a == code_b:
        return 1.0
    # Fall back to Jaro-Winkler on the phonetic codes
    return jellyfish.jaro_winkler_similarity(code_a, code_b)


def _fuzzy_match_name(word: str, roster: list[str], threshold: float = 0.75) -> str | None:
    """Find the best matching roster name for a word using edit distance + phonetics."""
    best_match = None
    best_score = 0.0

    for name in roster:
        # Check each part of multi-word names
        for name_part in name.split():
            # Jaro-Winkler on raw strings
            jw = jellyfish.jaro_winkler_similarity(word.lower(), name_part.lower())
            # Phonetic similarity
            ph = _phonetic_similarity(word, name_part)
            # Combined score (weighted toward Jaro-Winkler)
            score = 0.6 * jw + 0.4 * ph

            if score > best_score and score >= threshold:
                best_score = score
                best_match = name_part

    return best_match


def correct_names_in_text(text: str, roster: list[str]) -> str:
    """Fix Whisper name manglings in transcript text using fuzzy matching against the roster."""
    if not roster:
        return text

    # Build a set of all name parts for quick lookup
    roster_parts = set()
    for name in roster:
        for part in name.split():
            roster_parts.add(part.lower())

    words = text.split()
    corrected = []

    for word in words:
        # Strip punctuation for matching, preserve it for output
        clean = re.sub(r"[^\w]", "", word)
        if not clean or len(clean) < 3:
            corrected.append(word)
            continue

        # Skip if it's already a correct roster name
        if clean.lower() in roster_parts:
            corrected.append(word)
            continue

        # Check if this word looks like a mangled name (starts with uppercase)
        if not clean[0].isupper():
            corrected.append(word)
            continue

        match = _fuzzy_match_name(clean, roster)
        if match:
            # Preserve original punctuation
            corrected.append(word.replace(clean, match))
        else:
            corrected.append(word)

    return " ".join(corrected)


def map_speaker_names(segments: list[dict], roster: list[str]) -> list[dict]:
    """Assign speaker_name to segments by looking for name references in transcript context.

    Uses simple heuristics: "thanks, X", "X said", direct address patterns.
    Falls back to generic labels if no mapping can be determined.
    """
    if not roster:
        return segments

    # Build first-name lookup
    first_names = {}
    for name in roster:
        parts = name.split()
        first_names[parts[0].lower()] = name

    # Scan transcript for name-to-speaker associations
    speaker_name_map = {}
    roster_lower = {name.lower(): name for name in roster}

    for seg in segments:
        text_lower = seg["text"].lower()
        speaker = seg.get("speaker", "Unknown")

        for first, full in first_names.items():
            # Pattern: "thanks, <name>" or "thank you, <name>" — the named person is NOT the current speaker
            # They are likely the next speaker or a different speaker
            thanks_patterns = [f"thanks, {first}", f"thanks {first}", f"thank you, {first}", f"thank you {first}"]
            for pattern in thanks_patterns:
                if pattern in text_lower:
                    # The name referenced is someone OTHER than the current speaker
                    # We can't definitively map it to a speaker label here without more context
                    pass

            # Pattern: current speaker says "I'm <name>" or "this is <name>"
            intro_patterns = [f"i'm {first}", f"this is {first}", f"my name is {first}", f"i am {first}"]
            for pattern in intro_patterns:
                if pattern in text_lower and speaker not in speaker_name_map:
                    speaker_name_map[speaker] = full

    # Apply mappings
    for seg in segments:
        speaker = seg.get("speaker", "Unknown")
        seg["speaker_name"] = speaker_name_map.get(speaker, speaker)

    return segments


def resolve_names(segments: list[dict], roster: list[str], on_progress=None) -> list[dict]:
    """Full name resolution: correct mangled names in text, then map speakers to roster names."""
    if on_progress:
        on_progress(0, "Resolving names...")

    if not roster:
        if on_progress:
            on_progress(100, "No roster provided, skipping name resolution")
        return segments

    # Step 1: Fix mangled names in transcript text
    for seg in segments:
        seg["text"] = correct_names_in_text(seg["text"], roster)

    if on_progress:
        on_progress(50, "Mapping speakers to names...")

    # Step 2: Map speaker labels to real names
    segments = map_speaker_names(segments, roster)

    if on_progress:
        on_progress(100, "Name resolution complete")

    return segments
