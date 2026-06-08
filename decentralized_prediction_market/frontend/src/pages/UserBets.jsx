import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { API_URL, formatEth } from "../utils";

export default function UserBets() {
  const { account, connectWallet } = useWallet();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    fetch(`${API_URL}/api/users/${account}/bets`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch bets");
        return r.json();
      })
      .then((data) => { setBets(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [account]);

  if (!account) {
    return (
      <div className="page">
        <h1>My Bets</h1>
        <p>Connect your wallet to view your betting history.</p>
        <button onClick={connectWallet} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  if (loading) return <div className="status-msg">Loading bets...</div>;
  if (error) return <div className="status-msg error-text">Error: {error}</div>;

  return (
    <div className="page">
      <h1>My Bets</h1>
      {bets.length === 0 ? (
        <p className="status-msg">No bets placed yet.</p>
      ) : (
        <div className="bets-list">
          {bets.map((bet, i) => (
            <Link key={i} to={`/markets/${bet.market_id}`} className="bet-card">
              <p className="bet-question">{bet.question}</p>
              <div className="bet-meta">
                <span>Outcome #{bet.outcome_index}</span>
                <span>{formatEth(bet.amount)}</span>
                <span className="bet-market-link">Market #{bet.market_id} →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
