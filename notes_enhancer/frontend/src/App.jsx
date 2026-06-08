import { useState } from "react";
import FileUpload from "./components/FileUpload";
import RosterInput from "./components/RosterInput";
import CorrectionPrompt from "./components/CorrectionPrompt";
import NotesInput from "./components/NotesInput";
import EnhancedNotes from "./components/EnhancedNotes";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState([]);
  const [notes, setNotes] = useState("");
  const [enhancedNotes, setEnhancedNotes] = useState("");
  const [stages, setStages] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [roster, setRoster] = useState("");
  const [correctionPrompt, setCorrectionPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState("");

  function handleTranscript(text, segs) {
    setError("");
    setTranscript(text);
    setSegments(segs || []);
  }

  function handleStage(stageName, segs) {
    setStages((prev) => [...prev, { name: stageName, segments: segs }]);
  }

  function handleTranscribeError(e) {
    setError(e.message);
  }

  async function handleEnhance() {
    setIsEnhancing(true);
    setError("");
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, segments, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Enhancement failed");
      }
      const data = await res.json();
      setEnhancedNotes(data.enhanced_notes);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsEnhancing(false);
    }
  }

  return (
    <div className="container">
      <h1>Notes Enhancer</h1>
      <p className="subtitle">
        Upload a meeting recording, add your notes, and let AI enhance them.
      </p>

      {error && <div className="error">{error}</div>}

      <RosterInput roster={roster} onChange={setRoster} />

      <CorrectionPrompt prompt={correctionPrompt} onChange={setCorrectionPrompt} />

      <FileUpload
        onTranscript={handleTranscript}
        onError={handleTranscribeError}
        isLoading={isTranscribing}
        setIsLoading={(v) => {
          setIsTranscribing(v);
          if (v) setStages([]);
        }}
        roster={roster}
        correctionPrompt={correctionPrompt}
        onStage={handleStage}
      />

      {transcript && (
        <section className="step">
          <h2>Transcript</h2>
          {segments.length > 0 ? (
            <div className="transcript-segments">
              {segments.map((seg, i) => (
                <div key={i} className="segment">
                  <span className="segment-time">
                    {formatTime(seg.start)}
                  </span>
                  {seg.speaker_name || seg.speaker ? (
                    <span className="segment-speaker">
                      {seg.speaker_name || seg.speaker}
                    </span>
                  ) : null}
                  <span className="segment-text">{seg.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <textarea
              className="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
            />
          )}
        </section>
      )}

      {stages.length > 0 && (
        <section className="step">
          <h2>Pipeline Stages</h2>
          {stages.map((stage, i) => (
            <details key={i} className="stage-dropdown">
              <summary className="stage-summary">
                {stage.name}
                <span className="stage-count">{stage.segments.length} segments</span>
              </summary>
              <div className="transcript-segments">
                {stage.segments.map((seg, j) => (
                  <div key={j} className="segment">
                    <span className="segment-time">
                      {formatTime(seg.start)}
                    </span>
                    {seg.speaker_name || seg.speaker ? (
                      <span className="segment-speaker">
                        {seg.speaker_name || seg.speaker}
                      </span>
                    ) : null}
                    <span className="segment-text">{seg.text}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
      )}

      <NotesInput
        notes={notes}
        onChange={setNotes}
        disabled={!transcript}
      />

      {transcript && notes.trim() && (
        <button
          className="enhance-btn"
          onClick={handleEnhance}
          disabled={isEnhancing}
        >
          {isEnhancing ? "Enhancing…" : "Enhance Notes"}
        </button>
      )}

      <EnhancedNotes enhancedNotes={enhancedNotes} />
    </div>
  );
}
