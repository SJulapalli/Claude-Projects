import { Link } from "react-router-dom";
import { getMarketState, formatEth, formatDate } from "../utils";

const STATE_COLORS = {
  Active: "state-active",
  Closed: "state-closed",
  Resolved: "state-resolved",
  Cancelled: "state-cancelled",
  Expired: "state-expired",
};

export default function MarketCard({ market }) {
  const state = getMarketState(market);
  return (
    <Link to={`/markets/${market.market_id}`} className="market-card">
      <div className="market-card-header">
        <span className={`state-badge ${STATE_COLORS[state]}`}>{state}</span>
        <span className="market-pool">{formatEth(market.total_pool)}</span>
      </div>
      <p className="market-question">{market.question}</p>
      <p className="market-outcomes">{market.outcomes.length} outcomes</p>
      <p className="market-deadline">Betting closes: {formatDate(market.betting_deadline)}</p>
    </Link>
  );
}
