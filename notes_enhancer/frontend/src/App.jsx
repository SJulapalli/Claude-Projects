import { useState } from "react";
import FileUpload from "./components/FileUpload";
import NotesInput from "./components/NotesInput";
import EnhancedNotes from "./components/EnhancedNotes";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [enhancedNotes, setEnhancedNotes] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState("");

  async function handleTranscript(text) {
    setIsTranscribing(true);
    setError("");
    try {
      setTranscript(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleEnhance() {
    setIsEnhancing(true);
    setError("");
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, notes }),
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

      <FileUpload onTranscript={handleTranscript} isLoading={isTranscribing} />

      {transcript && (
        <section className="step">
          <h2>Transcript</h2>
          <textarea
            className="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
          />
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
