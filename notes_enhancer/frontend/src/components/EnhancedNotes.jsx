export default function EnhancedNotes({ enhancedNotes }) {
  if (!enhancedNotes) return null;

  function handleCopy() {
    navigator.clipboard.writeText(enhancedNotes);
  }

  return (
    <section className="step">
      <div className="output-header">
        <h2>3. Enhanced Notes</h2>
        <button className="copy-btn" onClick={handleCopy}>
          Copy
        </button>
      </div>
      <div className="output">{enhancedNotes}</div>
    </section>
  );
}
