const express = require("express");
const db = require("./db");

const router = express.Router();

// GET /api/markets - list all markets
router.get("/markets", (req, res) => {
  const markets = db.getAllMarkets();
  res.json(
    markets.map((m) => ({
      ...m,
      outcomes: JSON.parse(m.outcomes),
      resolved: !!m.resolved,
      cancelled: !!m.cancelled,
    }))
  );
});

// GET /api/markets/:id - full market details with bets and withdrawals
router.get("/markets/:id", (req, res) => {
  const market = db.getMarketById(Number(req.params.id));
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }

  const bets = db.getBetsByMarket(market.market_id);
  const withdrawals = db.getWithdrawalsByMarket(market.market_id);

  res.json({
    ...market,
    outcomes: JSON.parse(market.outcomes),
    resolved: !!market.resolved,
    cancelled: !!market.cancelled,
    bets,
    withdrawals,
  });
});

// GET /api/markets/:id/resolution - resolution state
router.get("/markets/:id/resolution", (req, res) => {
  const market = db.getMarketById(Number(req.params.id));
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }

  const outcomes = JSON.parse(market.outcomes);
  const resolved = !!market.resolved;
  const cancelled = !!market.cancelled;

  res.json({
    resolved,
    cancelled,
    winning_outcome: resolved ? market.winning_outcome : null,
    winning_outcome_label: resolved ? outcomes[market.winning_outcome] : null,
  });
});

// GET /api/users/:address/bets - all bets by a specific address
router.get("/users/:address/bets", (req, res) => {
  const bets = db.getBetsByUser(req.params.address);
  res.json(bets);
});

module.exports = router;
