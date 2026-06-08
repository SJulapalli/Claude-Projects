"""Quick check that pyannote.audio can load the diarization model."""
from pyannote.audio import Pipeline

print("Loading pyannote speaker-diarization-3.1...")
pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
)
print("Success! Model loaded.")
