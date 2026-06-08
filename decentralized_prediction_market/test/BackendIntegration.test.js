const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const path = require("path");
const request = require("supertest");
const express = require("express");

const TEST_DB = path.join(__dirname, "../server/test_data.db");

describe("Backend Integration", function () {
  let predictionMarket, contractAddress;
  let owner, addr1, addr2;
  let db, routes, indexer;
  let app;
  let bettingDeadline, resolutionDeadline;

  before(async function () {
    // Deploy contract
    [owner, addr1, addr2] = await ethers.getSigners();
    const PM = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PM.deploy();
    await predictionMarket.waitForDeployment();
    contractAddress = await predictionMarket.getAddress();

    // Set env for DB path
    process.env.DB_PATH = TEST_DB;

    // Clear module cache so modules pick up fresh state
    delete require.cache[require.resolve("../server/db")];
    delete require.cache[require.resolve("../server/routes")];
    delete require.cache[require.resolve("../server/indexer")];

    db = require("../server/db");
    routes = require("../server/routes");
    indexer = require("../server/indexer");

    // Inject Hardhat's provider and contract into the indexer
    indexer.setProvider(ethers.provider);
    indexer.setContract(predictionMarket);

    // Initialize DB
    db.getDb();

    // Set up express app for testing
    app = express();
    app.use(express.json());
    app.use("/api", routes);
  });

  after(async function () {
    db.closeDb();
    const fs = require("fs");
    try {
      fs.unlinkSync(TEST_DB);
    } catch (_) {}
    try {
      fs.unlinkSync(TEST_DB + "-wal");
    } catch (_) {}
    try {
      fs.unlinkSync(TEST_DB + "-shm");
    } catch (_) {}
  });

  it("should index MarketCreated event and expose via API", async function () {
    const now = await time.latest();
    bettingDeadline = now + 3600;
    resolutionDeadline = now + 7200;

    await predictionMarket.createMarket(
      "Will ETH hit $10k?",
      ["Yes", "No"],
      bettingDeadline,
      resolutionDeadline
    );

    await indexer.backfill();

    const market = db.getMarketById(0);
    expect(market).to.not.be.undefined;
    expect(market.question).to.equal("Will ETH hit $10k?");
    expect(JSON.parse(market.outcomes)).to.deep.equal(["Yes", "No"]);
    expect(market.creator.toLowerCase()).to.equal(owner.address.toLowerCase());

    const res = await request(app).get("/api/markets");
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array").with.lengthOf(1);
    expect(res.body[0].question).to.equal("Will ETH hit $10k?");
  });

  it("should index BetPlaced events and expose via user bets API", async function () {
    await predictionMarket
      .connect(addr1)
      .placeBet(0, 0, { value: ethers.parseEther("1") });
    await predictionMarket
      .connect(addr2)
      .placeBet(0, 1, { value: ethers.parseEther("2") });

    await indexer.backfill();

    const bets = db.getBetsByMarket(0);
    expect(bets).to.have.lengthOf(2);

    const res = await request(app).get(`/api/users/${addr1.address}/bets`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array").with.lengthOf(1);
    expect(res.body[0].amount).to.equal(ethers.parseEther("1").toString());
    expect(res.body[0].question).to.equal("Will ETH hit $10k?");
  });

  it("should index MarketResolved and expose via resolution API", async function () {
    await time.increaseTo(bettingDeadline + 1);
    await predictionMarket.resolveMarket(0, 0);

    await indexer.backfill();

    const res = await request(app).get("/api/markets/0/resolution");
    expect(res.status).to.equal(200);
    expect(res.body.resolved).to.be.true;
    expect(res.body.cancelled).to.be.false;
    expect(res.body.winning_outcome).to.equal(0);
    expect(res.body.winning_outcome_label).to.equal("Yes");
  });

  it("should return full market details with bets and withdrawals", async function () {
    await predictionMarket.connect(addr1).withdraw(0);

    await indexer.backfill();

    const res = await request(app).get("/api/markets/0");
    expect(res.status).to.equal(200);
    expect(res.body.bets).to.be.an("array").with.lengthOf(2);
    expect(res.body.withdrawals).to.be.an("array").with.lengthOf(1);
    expect(res.body.resolved).to.be.true;
  });

  it("should return 404 for non-existent market", async function () {
    const res = await request(app).get("/api/markets/999");
    expect(res.status).to.equal(404);
  });

  it("should return 404 for non-existent market resolution", async function () {
    const res = await request(app).get("/api/markets/999/resolution");
    expect(res.status).to.equal(404);
  });

  it("should return empty array for user with no bets", async function () {
    const res = await request(app).get(
      "/api/users/0x0000000000000000000000000000000000000000/bets"
    );
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });

  it("should index cancellation events", async function () {
    const now = await time.latest();
    const bd = now + 3600;
    const rd = now + 7200;

    await predictionMarket.createMarket("Will it rain?", ["Yes", "No"], bd, rd);
    await time.increaseTo(rd + 1);
    await predictionMarket.cancelMarket(1);

    await indexer.backfill();

    const res = await request(app).get("/api/markets/1/resolution");
    expect(res.status).to.equal(200);
    expect(res.body.cancelled).to.be.true;
    expect(res.body.resolved).to.be.false;
    expect(res.body.winning_outcome).to.be.null;
  });
});
