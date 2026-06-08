import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { getWriteContract } from "../contract";
import { API_URL, getMarketState, formatEth, formatDate } from "../utils";
import { ethers } from "ethers";

// ─── PlaceBet ────────────────────────────────────────────────────────────────
function PlaceBet({ market, onSuccess }) {
  const { account, signer, connectWallet, ensureSepolia } = useWallet();
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) { connectWallet(); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid ETH amount."); return; }
    const ok = await ensureSepolia();
    if (!ok) return;
    try {
      setPending(true);
      setError(null);
      const contract = getWriteContract(signer);
      const tx = await contract.placeBet(market.market_id, outcomeIndex, {
        value: ethers.parseEther(amount),
      });
      await tx.wait();
      setAmount("");
      onSuccess();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="action-panel">
      <h3>Place a Bet</h3>
      <form onSubmit={handleSubmit}>
        <label>Outcome</label>
        <select value={outcomeIndex} onChange={(e) => setOutcomeIndex(Number(e.target.value))}>
          {market.outcomes.map((o, i) => <option key={i} value={i}>{o}</option>)}
        </select>
        <label>Amount (ETH)</label>
        <input
          type="number"
          min="0"
          step="0.0001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.01"
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Pending…" : account ? "Place Bet" : "Connect Wallet to Bet"}
        </button>
      </form>
    </div>
  );
}

// ─── ResolveMarket ────────────────────────────────────────────────────────────
function ResolveMarket({ market, onSuccess }) {
  const { signer, ensureSepolia } = useWallet();
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await ensureSepolia();
    if (!ok) return;
    try {
      setPending(true);
      setError(null);
      const contract = getWriteContract(signer);
      const tx = await contract.resolveMarket(market.market_id, outcomeIndex);
      await tx.wait();
      onSuccess();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="action-panel">
      <h3>Resolve Market</h3>
      <form onSubmit={handleSubmit}>
        <label>Winning Outcome</label>
        <select value={outcomeIndex} onChange={(e) => setOutcomeIndex(Number(e.target.value))}>
          {market.outcomes.map((o, i) => <option key={i} value={i}>{o}</option>)}
        </select>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Pending…" : "Resolve Market"}
        </button>
      </form>
    </div>
  );
}

// ─── CancelMarket ─────────────────────────────────────────────────────────────
function CancelMarket({ market, onSuccess }) {
  const { signer, ensureSepolia } = useWallet();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleCancel = async () => {
    const ok = await ensureSepolia();
    if (!ok) return;
    try {
      setPending(true);
      setError(null);
      const contract = getWriteContract(signer);
      const tx = await contract.cancelMarket(market.market_id);
      await tx.wait();
      onSuccess();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="action-panel">
      <h3>Cancel Market</h3>
      <p>The resolution deadline has passed without resolution. Anyone can cancel this market.</p>
      {error && <p className="error-text">{error}</p>}
      <button onClick={handleCancel} className="btn-danger" disabled={pending}>
        {pending ? "Pending…" : "Cancel Market"}
      </button>
    </div>
  );
}

// ─── Withdraw ─────────────────────────────────────────────────────────────────
function Withdraw({ market, onSuccess }) {
  const { signer, ensureSepolia } = useWallet();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleWithdraw = async () => {
    const ok = await ensureSepolia();
    if (!ok) return;
    try {
      setPending(true);
      setError(null);
      const contract = getWriteContract(signer);
      const tx = await contract.withdraw(market.market_id);
      await tx.wait();
      onSuccess();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setPending(false);
    }
  };

  const label = market.cancelled ? "Reclaim Funds" : "Withdraw Winnings";

  return (
    <div className="action-panel">
      <h3>{label}</h3>
      {error && <p className="error-text">{error}</p>}
      <button onClick={handleWithdraw} className="btn-primary" disabled={pending}>
        {pending ? "Pending…" : label}
      </button>
    </div>
  );
}

// ─── MarketDetail ─────────────────────────────────────────────────────────────
export default function MarketDetail() {
  const { id } = useParams();
  const { account } = useWallet();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMarket = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/api/markets/${id}`)
      .then((r) => {
        if (r.status === 404) throw new Error("not_found");
        if (!r.ok) throw new Error("Failed to fetch market");
        return r.json();
      })
      .then((data) => { setMarket(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  useEffect(() => { fetchMarket(); }, [fetchMarket]);

  if (loading) return <div className="status-msg">Loading market...</div>;
  if (error === "not_found") return <div className="status-msg error-text">Market not found.</div>;
  if (error) return <div className="status-msg error-text">Error: {error}</div>;
  if (!market) return null;

  const now = Math.floor(Date.now() / 1000);
  const state = getMarketState(market);
  const isActive = state === "Active";
  const isCreator = account && account.toLowerCase() === market.creator.toLowerCase();
  const afterBettingDeadline = now > market.betting_deadline;
  const beforeResolutionDeadline = now < market.resolution_deadline;
  const afterResolutionDeadline = now >= market.resolution_deadline;

  // Per-outcome bet totals
  const outcomeTotals = market.outcomes.map((_, i) =>
    market.bets
      .filter((b) => b.outcome_index === i)
      .reduce((sum, b) => sum + BigInt(b.amount), 0n)
  );
  const totalPool = BigInt(market.total_pool || "0");

  // User-specific state
  const userBets = account
    ? market.bets.filter((b) => b.bettor.toLowerCase() === account.toLowerCase())
    : [];
  const hasWithdrawn = account
    ? market.withdrawals.some((w) => w.user_address.toLowerCase() === account.toLowerCase())
    : false;
  const hasWinningBet =
    market.resolved &&
    userBets.some((b) => b.outcome_index === market.winning_outcome);
  const hasBets = userBets.length > 0;
  const canWithdraw =
    !hasWithdrawn &&
    ((market.resolved && hasWinningBet) || (market.cancelled && hasBets));

  return (
    <div className="page">
      <div className="market-detail-header">
        <span className={`state-badge state-${state.toLowerCase()}`}>{state}</span>
        <h1>{market.question}</h1>
      </div>

      <div className="market-meta">
        <span>Creator: <code>{market.creator}</code></span>
        <span>Pool: {formatEth(market.total_pool)}</span>
        <span>Betting deadline: {formatDate(market.betting_deadline)}</span>
        <span>Resolution deadline: {formatDate(market.resolution_deadline)}</span>
        {market.resolved && (
          <span>Winner: <strong>{market.outcomes[market.winning_outcome]}</strong></span>
        )}
      </div>

      <div className="outcomes-list">
        <h2>Outcomes</h2>
        {market.outcomes.map((outcome, i) => {
          const total = outcomeTotals[i];
          const pct = totalPool > 0n ? Number((total * 100n) / totalPool) : 0;
          const isWinner = market.resolved && market.winning_outcome === i;
          return (
            <div key={i} className={`outcome-row${isWinner ? " outcome-winner" : ""}`}>
              <span className="outcome-label">{outcome}{isWinner ? " ✓" : ""}</span>
              <span className="outcome-total">{formatEth(total.toString())}</span>
              <div className="outcome-bar-bg">
                <div className="outcome-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="outcome-pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="actions">
        {isActive && <PlaceBet market={market} onSuccess={fetchMarket} />}
        {isCreator && !market.resolved && !market.cancelled && afterBettingDeadline && beforeResolutionDeadline && (
          <ResolveMarket market={market} onSuccess={fetchMarket} />
        )}
        {!market.resolved && !market.cancelled && afterResolutionDeadline && account && (
          <CancelMarket market={market} onSuccess={fetchMarket} />
        )}
        {canWithdraw && account && (
          <Withdraw market={market} onSuccess={fetchMarket} />
        )}
      </div>
    </div>
  );
}
