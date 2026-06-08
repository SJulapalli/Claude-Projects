import { useEffect, useState } from "react";

export default function CorrectionPrompt({ prompt, onChange }) {
  const [open, setOpen] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState("");

  useEffect(() => {
    fetch("/api/correction-prompt")
      .then((res) => res.json())
      .then((data) => {
        setDefaultPrompt(data.prompt);
        if (!prompt) onChange(data.prompt);
      })
      .catch(() => {});
  }, []);

  function handleReset() {
    onChange(defaultPrompt);
  }

  return (
    <section className="step">
      <details open={open} onToggle={(e) => setOpen(e.target.open)}>
        <summary className="stage-summary">
          Diarization Correction Prompt (optional)
        </summary>
        <div style={{ padding: "12px" }}>
          <textarea
            value={prompt}
            onChange={(e) => onChange(e.target.value)}
            rows={12}
            style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
          />
          <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
            <button
              className="copy-btn"
              type="button"
              onClick={handleReset}
            >
              Reset to Default
            </button>
            <span style={{ fontSize: "0.8rem", color: "#86868b", alignSelf: "center" }}>
              Use {"{transcript_json}"} as the placeholder for the transcript data.
            </span>
          </div>
        </div>
      </details>
    </section>
  );
}
