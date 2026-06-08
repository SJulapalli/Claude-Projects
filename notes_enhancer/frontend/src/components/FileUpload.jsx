import { useRef, useState } from "react";

export default function FileUpload({ onTranscript, onError, isLoading, setIsLoading, roster, correctionPrompt, onStage }) {
  const fileRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setProgress(0);
    setProgressMsg("Uploading...");

    const formData = new FormData();
    formData.append("file", file);
    if (roster?.trim()) {
      formData.append("roster", roster.trim());
    }
    if (correctionPrompt?.trim()) {
      formData.append("correction_prompt", correctionPrompt.trim());
    }

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Transcription failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const data = JSON.parse(line.slice(5).trim());

            if (eventType === "progress") {
              setProgress(data.percent);
              setProgressMsg(data.message);
            } else if (eventType === "stage") {
              onStage?.(data.stage, data.segments);
            } else if (eventType === "result") {
              onTranscript(data.transcript, data.segments || []);
            } else if (eventType === "error") {
              throw new Error(data.detail);
            }
          }
        }
      }
    } catch (e) {
      onError?.(e);
    } finally {
      setIsLoading(false);
      setProgress(0);
      setProgressMsg("");
    }
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
      {isLoading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progressMsg}</span>
        </div>
      )}
    </section>
  );
}
