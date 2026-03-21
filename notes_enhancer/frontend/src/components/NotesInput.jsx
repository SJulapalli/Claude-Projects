export default function NotesInput({ notes, onChange, disabled }) {
  return (
    <section className="step">
      <h2>2. Your Notes</h2>
      <textarea
        placeholder="Paste or type your meeting notes here…"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={10}
      />
    </section>
  );
}
