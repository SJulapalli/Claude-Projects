import { useState, useEffect } from "react";
import MarketCard from "../components/MarketCard";
import { API_URL, getMarketState } from "../utils";

const FILTERS = ["All", "Active", "Closed", "Resolved", "Cancelled"];

export default function MarketList() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetch(`${API_URL}/api/markets`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch markets");
        return r.json();
      })
      .then((data) => {
        setMarkets(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered =
    filter === "All" ? markets : markets.filter((m) => getMarketState(m) === filter);

  if (loading) return <div className="status-msg">Loading markets...</div>;
  if (error) return <div className="status-msg error-text">Error: {error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Prediction Markets</h1>
        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-btn${filter === f ? " active" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="status-msg">No markets found.</p>
      ) : (
        <div className="market-grid">
          {filtered.map((m) => (
            <MarketCard key={m.market_id} market={m} />
          ))}
        </div>
      )}
    </div>
  );
}
