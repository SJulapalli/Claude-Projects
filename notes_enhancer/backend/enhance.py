import os
import anthropic

_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

SYSTEM_PROMPT = """You are a meeting notes enhancer. You will receive:
1. A transcript of a meeting
2. Brief notes taken by the user after the meeting

Your job is to enhance the user's notes by filling in details, context, and key points
from the transcript that the notes are missing or only briefly mention.

Rules:
- Preserve the user's original structure and voice
- Add relevant details from the transcript that support or expand on each note
- Include specific names, numbers, dates, and action items from the transcript
- Do not add information that isn't in the transcript
- Keep the output concise and well-organized
- Use markdown formatting for readability"""


def enhance_notes(transcript: str, notes: str) -> str:
    message = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"## Meeting Transcript\n\n{transcript}\n\n## My Notes\n\n{notes}\n\n## Enhanced Notes",
            }
        ],
    )
    return message.content[0].text
