const express = require("express");
const cors = require("cors");
require("dotenv").config();

const routes = require("./routes");
const db = require("./db");
const indexer = require("./indexer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api", routes);

async function main() {
  // Initialize database
  db.getDb();
  console.log("Database initialized.");

  // Start event indexer (backfill + live listeners)
  if (process.env.CONTRACT_ADDRESS && process.env.RPC_URL) {
    await indexer.start();
  } else {
    console.log("CONTRACT_ADDRESS or RPC_URL not set — skipping indexer.");
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});

module.exports = app;
