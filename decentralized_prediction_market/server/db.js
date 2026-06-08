const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS markets (
      market_id INTEGER PRIMARY KEY,
      creator TEXT NOT NULL,
      question TEXT NOT NULL,
      outcomes TEXT NOT NULL,
      betting_deadline INTEGER NOT NULL,
      resolution_deadline INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      cancelled INTEGER NOT NULL DEFAULT 0,
      winning_outcome INTEGER,
      total_pool TEXT NOT NULL DEFAULT '0'
    );

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL,
      bettor TEXT NOT NULL,
      outcome_index INTEGER NOT NULL,
      amount TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      UNIQUE(tx_hash, outcome_index)
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL,
      user_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      UNIQUE(tx_hash)
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
    CREATE INDEX IF NOT EXISTS idx_bets_bettor ON bets(bettor);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_market ON withdrawals(market_id);
  `);
}

// Market helpers
function insertMarket(market) {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO markets (market_id, creator, question, outcomes, betting_deadline, resolution_deadline, resolved, cancelled, winning_outcome, total_pool)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    market.market_id,
    market.creator,
    market.question,
    JSON.stringify(market.outcomes),
    market.betting_deadline,
    market.resolution_deadline,
    market.resolved ? 1 : 0,
    market.cancelled ? 1 : 0,
    market.winning_outcome ?? null,
    market.total_pool
  );
}

function updateMarketResolved(marketId, winningOutcome) {
  getDb()
    .prepare("UPDATE markets SET resolved = 1, winning_outcome = ? WHERE market_id = ?")
    .run(winningOutcome, marketId);
}

function updateMarketCancelled(marketId) {
  getDb()
    .prepare("UPDATE markets SET cancelled = 1 WHERE market_id = ?")
    .run(marketId);
}

function updateMarketPool(marketId, amount) {
  const market = getDb()
    .prepare("SELECT total_pool FROM markets WHERE market_id = ?")
    .get(marketId);
  if (market) {
    const newPool = (BigInt(market.total_pool) + BigInt(amount)).toString();
    getDb()
      .prepare("UPDATE markets SET total_pool = ? WHERE market_id = ?")
      .run(newPool, marketId);
  }
}

// Bet helpers
function insertBet(bet) {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO bets (market_id, bettor, outcome_index, amount, tx_hash) VALUES (?, ?, ?, ?, ?)"
    )
    .run(bet.market_id, bet.bettor, bet.outcome_index, bet.amount, bet.tx_hash);
}

// Withdrawal helpers
function insertWithdrawal(withdrawal) {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO withdrawals (market_id, user_address, amount, tx_hash) VALUES (?, ?, ?, ?)"
    )
    .run(withdrawal.market_id, withdrawal.user_address, withdrawal.amount, withdrawal.tx_hash);
}

// Sync state helpers
function getLastSyncedBlock() {
  const row = getDb()
    .prepare("SELECT value FROM sync_state WHERE key = 'last_synced_block'")
    .get();
  return row ? parseInt(row.value, 10) : 0;
}

function setLastSyncedBlock(blockNumber) {
  getDb()
    .prepare("INSERT OR REPLACE INTO sync_state (key, value) VALUES ('last_synced_block', ?)")
    .run(blockNumber.toString());
}

// Query helpers (used by routes)
function getAllMarkets() {
  return getDb().prepare("SELECT * FROM markets ORDER BY market_id ASC").all();
}

function getMarketById(marketId) {
  return getDb().prepare("SELECT * FROM markets WHERE market_id = ?").get(marketId);
}

function getBetsByMarket(marketId) {
  return getDb().prepare("SELECT * FROM bets WHERE market_id = ?").all(marketId);
}

function getWithdrawalsByMarket(marketId) {
  return getDb().prepare("SELECT * FROM withdrawals WHERE market_id = ?").all(marketId);
}

function getBetsByUser(address) {
  return getDb()
    .prepare(
      `SELECT b.*, m.question FROM bets b
       JOIN markets m ON b.market_id = m.market_id
       WHERE LOWER(b.bettor) = LOWER(?)
       ORDER BY b.market_id ASC`
    )
    .all(address);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  insertMarket,
  updateMarketResolved,
  updateMarketCancelled,
  updateMarketPool,
  insertBet,
  insertWithdrawal,
  getLastSyncedBlock,
  setLastSyncedBlock,
  getAllMarkets,
  getMarketById,
  getBetsByMarket,
  getWithdrawalsByMarket,
  getBetsByUser,
  closeDb,
};
