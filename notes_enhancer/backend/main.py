import asyncio
import json
import logging
import os
import tempfile
import traceback

logging.basicConfig(level=logging.INFO, format="%(name)s | %(message)s")

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from diarization_correction import get_default_prompt
from enhance import enhance_notes
from pipeline import run_pipeline

app = FastAPI(title="Notes Enhancer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/correction-prompt")
async def get_correction_prompt():
    return {"prompt": get_default_prompt()}


@app.post("/api/transcribe")
async def transcribe_endpoint(
    file: UploadFile = File(...),
    format: str = "structured",
    roster: str = Form(""),
    correction_prompt: str = Form(""),
):
    suffix = os.path.splitext(file.filename or ".wav")[1]

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    queue = asyncio.Queue()

    def on_progress(percent, message):
        queue.put_nowait(("progress", {"percent": percent, "message": message}))

    def on_stage_complete(stage_name, segments):
        queue.put_nowait(("stage", {"stage": stage_name, "segments": segments}))

    roster_list = [name.strip() for name in roster.split(",") if name.strip()] if roster else []
    custom_prompt = correction_prompt.strip() or None

    async def event_generator():
        loop = asyncio.get_event_loop()

        task = loop.run_in_executor(
            None, run_pipeline, tmp_path, roster_list,
            True, True, True, on_progress, on_stage_complete,
            custom_prompt,
        )

        # Send initial progress
        yield {"event": "progress", "data": json.dumps({"percent": 0, "message": "Starting transcription..."})}

        while True:
            # Check if the transcription task is done
            done = task.done()

            # Drain all queued events
            while not queue.empty():
                event_type, event_data = queue.get_nowait()
                yield {"event": event_type, "data": json.dumps(event_data)}

            if done:
                break

            await asyncio.sleep(0.3)

        try:
            segments = task.result()
            full_text = " ".join(seg["text"] for seg in segments)
            yield {"event": "progress", "data": json.dumps({"percent": 100, "message": "Done"})}
            if format == "text":
                yield {"event": "result", "data": json.dumps({"transcript": full_text})}
            else:
                yield {"event": "result", "data": json.dumps({"segments": segments, "transcript": full_text})}
        except Exception as e:
            traceback.print_exc()
            yield {"event": "error", "data": json.dumps({"detail": str(e)})}
        finally:
            os.unlink(tmp_path)

    return EventSourceResponse(event_generator())


class EnhanceRequest(BaseModel):
    transcript: str
    segments: list[dict] | None = None
    notes: str


@app.post("/api/enhance")
async def enhance_endpoint(req: EnhanceRequest):
    if not req.notes.strip():
        raise HTTPException(status_code=400, detail="Notes are required")

    # Build transcript text from segments if available, otherwise use plain text
    if req.segments:
        transcript_text = "\n".join(
            f"[{seg.get('speaker_name') or seg.get('speaker', '')}] {seg['text']}"
            for seg in req.segments
        )
    elif req.transcript.strip():
        transcript_text = req.transcript
    else:
        raise HTTPException(status_code=400, detail="Transcript or segments are required")

    try:
        enhanced = enhance_notes(transcript_text, req.notes)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    return {"enhanced_notes": enhanced}
