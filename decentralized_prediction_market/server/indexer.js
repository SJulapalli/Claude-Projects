const { ethers } = require("ethers");
const path = require("path");
const db = require("./db");

const artifact = require(
  path.join(__dirname, "../artifacts/contracts/PredictionMarket.sol/PredictionMarket.json")
);
const ABI = artifact.abi;

let provider;
let contract;

function setProvider(p) {
  provider = p;
}

function setContract(c) {
  contract = c;
}

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  }
  return provider;
}

function getContract() {
  if (!contract) {
    contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, getProvider());
  }
  return contract;
}

async function fetchMarketData(marketId) {
  const c = getContract();
  const m = await c.markets(marketId);
  const outcomes = await c.getOutcomes(marketId);
  return {
    market_id: Number(marketId),
    creator: m.creator,
    question: m.question,
    outcomes: Array.from(outcomes),
    betting_deadline: Number(m.bettingDeadline),
    resolution_deadline: Number(m.resolutionDeadline),
    resolved: m.resolved,
    cancelled: m.cancelled,
    winning_outcome: Number(m.winningOutcome),
    total_pool: m.totalPool.toString(),
  };
}

async function processEvent(event) {
  const name = event.fragment?.name || event.eventName;
  const txHash = event.log?.transactionHash || event.transactionHash;

  switch (name) {
    case "MarketCreated": {
      const marketId = event.args[0];
      const market = await fetchMarketData(marketId);
      db.insertMarket(market);
      console.log(`  Indexed MarketCreated #${market.market_id}`);
      break;
    }
    case "BetPlaced": {
      const [marketId, bettor, outcomeIndex, amount] = event.args;
      db.insertBet({
        market_id: Number(marketId),
        bettor: bettor,
        outcome_index: Number(outcomeIndex),
        amount: amount.toString(),
        tx_hash: txHash,
      });
      db.updateMarketPool(Number(marketId), amount.toString());
      console.log(`  Indexed BetPlaced on market #${Number(marketId)}`);
      break;
    }
    case "MarketResolved": {
      const [marketId, winningOutcome] = event.args;
      db.updateMarketResolved(Number(marketId), Number(winningOutcome));
      console.log(`  Indexed MarketResolved #${Number(marketId)}`);
      break;
    }
    case "MarketCancelled": {
      const [marketId] = event.args;
      db.updateMarketCancelled(Number(marketId));
      console.log(`  Indexed MarketCancelled #${Number(marketId)}`);
      break;
    }
    case "Withdrawal": {
      const [marketId, user, amount] = event.args;
      db.insertWithdrawal({
        market_id: Number(marketId),
        user_address: user,
        amount: amount.toString(),
        tx_hash: txHash,
      });
      console.log(`  Indexed Withdrawal on market #${Number(marketId)}`);
      break;
    }
  }
}

async function backfill() {
  const c = getContract();
  const fromBlock = db.getLastSyncedBlock();
  const currentBlock = await getProvider().getBlockNumber();

  console.log(`Backfilling events from block ${fromBlock} to ${currentBlock}...`);

  const eventNames = [
    "MarketCreated",
    "BetPlaced",
    "MarketResolved",
    "MarketCancelled",
    "Withdrawal",
  ];

  const allEvents = [];

  for (const name of eventNames) {
    const filter = c.filters[name]();
    const events = await c.queryFilter(filter, fromBlock, currentBlock);
    allEvents.push(...events);
  }

  // Sort by block number then log index for correct ordering
  allEvents.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
    return a.index - b.index;
  });

  for (const event of allEvents) {
    await processEvent(event);
  }

  db.setLastSyncedBlock(currentBlock);
  console.log(`Backfill complete. ${allEvents.length} events processed.`);
}

function startListening() {
  const c = getContract();

  c.on("MarketCreated", async (marketId, creator, event) => {
    await processEvent(event);
    db.setLastSyncedBlock(event.log.blockNumber);
  });

  c.on("BetPlaced", async (marketId, bettor, outcomeIndex, amount, event) => {
    await processEvent(event);
    db.setLastSyncedBlock(event.log.blockNumber);
  });

  c.on("MarketResolved", async (marketId, winningOutcome, event) => {
    await processEvent(event);
    db.setLastSyncedBlock(event.log.blockNumber);
  });

  c.on("MarketCancelled", async (marketId, event) => {
    await processEvent(event);
    db.setLastSyncedBlock(event.log.blockNumber);
  });

  c.on("Withdrawal", async (marketId, user, amount, event) => {
    await processEvent(event);
    db.setLastSyncedBlock(event.log.blockNumber);
  });

  console.log("Live event listeners started.");
}

async function start() {
  console.log(`Connecting to contract at ${process.env.CONTRACT_ADDRESS}...`);
  db.getDb(); // ensure DB is initialized
  await backfill();
  startListening();
}

module.exports = { start, backfill, startListening, getContract, getProvider, setProvider, setContract, ABI };
