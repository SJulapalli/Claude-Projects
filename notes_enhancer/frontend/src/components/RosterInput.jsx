export default function RosterInput({ roster, onChange }) {
  return (
    <section className="step">
      <h2>Participants (optional)</h2>
      <textarea
        className="roster-input"
        placeholder="Enter participant names, one per line (e.g., Sarah Chen, Mike Johnson)..."
        value={roster}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </section>
  );
}
