import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { getWriteContract } from "../contract";

export default function CreateMarket() {
  const navigate = useNavigate();
  const { account, signer, connectWallet, ensureSepolia } = useWallet();

  const [question, setQuestion] = useState("");
  const [outcomes, setOutcomes] = useState(["", ""]);
  const [bettingDeadline, setBettingDeadline] = useState("");
  const [resolutionDeadline, setResolutionDeadline] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  if (!account) {
    return (
      <div className="page">
        <h1>Create Market</h1>
        <p>Please connect your wallet to create a market.</p>
        <button onClick={connectWallet} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  const addOutcome = () => setOutcomes([...outcomes, ""]);

  const removeOutcome = (i) => {
    if (outcomes.length <= 2) return;
    setOutcomes(outcomes.filter((_, idx) => idx !== i));
  };

  const setOutcome = (i, val) => {
    const updated = [...outcomes];
    updated[i] = val;
    setOutcomes(updated);
  };

  const validate = () => {
    const filled = outcomes.filter((o) => o.trim());
    if (!question.trim()) return "Question is required.";
    if (filled.length < 2) return "At least 2 outcomes are required.";
    if (!bettingDeadline) return "Betting deadline is required.";
    if (!resolutionDeadline) return "Resolution deadline is required.";
    const now = Math.floor(Date.now() / 1000);
    const bettingTs = Math.floor(new Date(bettingDeadline).getTime() / 1000);
    const resolutionTs = Math.floor(new Date(resolutionDeadline).getTime() / 1000);
    if (bettingTs <= now) return "Betting deadline must be in the future.";
    if (resolutionTs <= bettingTs) return "Resolution deadline must be after the betting deadline.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    const ok = await ensureSepolia();
    if (!ok) return;

    const bettingTs = Math.floor(new Date(bettingDeadline).getTime() / 1000);
    const resolutionTs = Math.floor(new Date(resolutionDeadline).getTime() / 1000);
    const filledOutcomes = outcomes.filter((o) => o.trim());

    try {
      setPending(true);
      setError(null);
      const contract = getWriteContract(signer);
      const tx = await contract.createMarket(question, filledOutcomes, bettingTs, resolutionTs);
      const receipt = await tx.wait();

      // Extract marketId from MarketCreated event
      const event = receipt.logs
        .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "MarketCreated");

      const marketId = event ? Number(event.args[0]) : null;
      if (marketId !== null) {
        navigate(`/markets/${marketId}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="page">
      <h1>Create Market</h1>
      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label>Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will ETH hit $10,000 in 2025?"
          />
        </div>

        <div className="form-group">
          <label>Outcomes</label>
          {outcomes.map((o, i) => (
            <div key={i} className="outcome-input-row">
              <input
                type="text"
                value={o}
                onChange={(e) => setOutcome(i, e.target.value)}
                placeholder={`Outcome ${i + 1}`}
              />
              {outcomes.length > 2 && (
                <button type="button" onClick={() => removeOutcome(i)} className="btn-remove">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOutcome} className="btn-secondary">+ Add Outcome</button>
        </div>

        <div className="form-group">
          <label>Betting Deadline</label>
          <input
            type="datetime-local"
            value={bettingDeadline}
            onChange={(e) => setBettingDeadline(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Resolution Deadline</label>
          <input
            type="datetime-local"
            value={resolutionDeadline}
            onChange={(e) => setResolutionDeadline(e.target.value)}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create Market"}
        </button>
      </form>
    </div>
  );
}
