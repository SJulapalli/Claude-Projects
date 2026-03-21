import { useRef } from "react";

export default function FileUpload({ onTranscript, isLoading }) {
  const fileRef = useRef(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Transcription failed");
    }

    const data = await res.json();
    onTranscript(data.transcript);
  }

  return (
    <section className="step">
      <h2>1. Upload Meeting Recording</h2>
      <div className="upload-row">
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,video/*"
          disabled={isLoading}
        />
        <button onClick={handleUpload} disabled={isLoading}>
          {isLoading ? "Transcribing…" : "Transcribe"}
        </button>
      </div>
    </section>
  );
}
