import json
import os

import anthropic

_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

CORRECTION_PROMPT = """You are a diarization correction system. You will receive a meeting transcript with speaker labels.

Your job is to detect and fix speaker attribution errors by analyzing conversational coherence. Look for:
- A speaker asking and answering their own question (likely two different speakers)
- A speaker agreeing with or thanking themselves
- A speaker contradicting themselves within consecutive turns
- Dialogue patterns that only make sense with different speakers

Rules:
- ONLY change speaker labels. Never modify the text content.
- If you are uncertain about a correction, keep the original label.
- Output the corrected transcript in the exact JSON format provided.

Input transcript (JSON array of segments):
{transcript_json}

Output the corrected segments as a JSON array. Each element must have exactly these fields:
- "index": the segment index (0-based, matching input order)
- "speaker": the corrected speaker label

Output ONLY the JSON array, no other text."""


def get_default_prompt():
    """Return the default correction prompt template."""
    return CORRECTION_PROMPT


def correct_diarization(segments, on_progress=None, custom_prompt=None):
    """Use Claude to detect and fix speaker attribution errors in the transcript.

    Only modifies 'speaker' fields. All other fields are preserved.
    Returns the segments list with corrected speaker labels.
    """
    if on_progress:
        on_progress(0, "Analyzing speaker attribution...")

    # Build compact transcript for the LLM
    transcript_for_llm = []
    for i, seg in enumerate(segments):
        transcript_for_llm.append({
            "index": i,
            "speaker": seg.get("speaker", "Unknown"),
            "text": seg["text"],
        })

    template = custom_prompt if custom_prompt else CORRECTION_PROMPT
    prompt = template.format(
        transcript_json=json.dumps(transcript_for_llm, indent=2)
    )

    if on_progress:
        on_progress(30, "Running diarization correction...")

    message = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text.strip()

    # Parse the corrected labels
    try:
        # Handle potential markdown code block wrapping
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            response_text = response_text.rsplit("```", 1)[0]

        corrections = json.loads(response_text)
    except (json.JSONDecodeError, IndexError):
        # If parsing fails, return segments unchanged
        if on_progress:
            on_progress(100, "Correction parse failed, keeping original labels")
        return segments

    # Transfer corrected labels back onto original segments
    correction_map = {c["index"]: c["speaker"] for c in corrections}
    for i, seg in enumerate(segments):
        if i in correction_map:
            seg["speaker"] = correction_map[i]

    if on_progress:
        on_progress(100, "Diarization correction complete")

    return segments
