const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PredictionMarket", function () {
  let predictionMarket;
  let owner, addr1, addr2, addr3;
  let bettingDeadline, resolutionDeadline;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarket.deploy();
    await predictionMarket.waitForDeployment();

    const now = await time.latest();
    bettingDeadline = now + 3600; // 1 hour from now
    resolutionDeadline = now + 7200; // 2 hours from now
  });

  // 4.1 Market Creation Tests
  describe("Market Creation", function () {
    it("should create a market with valid parameters", async function () {
      const tx = await predictionMarket.createMarket(
        "Who will win?",
        ["Team A", "Team B"],
        bettingDeadline,
        resolutionDeadline
      );

      await expect(tx)
        .to.emit(predictionMarket, "MarketCreated")
        .withArgs(0, owner.address);

      const market = await predictionMarket.markets(0);
      expect(market.creator).to.equal(owner.address);
      expect(market.question).to.equal("Who will win?");
      expect(market.bettingDeadline).to.equal(bettingDeadline);
      expect(market.resolutionDeadline).to.equal(resolutionDeadline);

      const outcomes = await predictionMarket.getOutcomes(0);
      expect(outcomes.length).to.equal(2);
      expect(outcomes[0]).to.equal("Team A");
      expect(outcomes[1]).to.equal("Team B");
    });

    it("should revert with fewer than 2 outcomes", async function () {
      await expect(
        predictionMarket.createMarket("Q?", ["Only one"], bettingDeadline, resolutionDeadline)
      ).to.be.revertedWith("Need at least 2 outcomes");
    });

    it("should revert with betting deadline in the past", async function () {
      const pastDeadline = (await time.latest()) - 100;
      await expect(
        predictionMarket.createMarket("Q?", ["A", "B"], pastDeadline, resolutionDeadline)
      ).to.be.revertedWith("Betting deadline must be in the future");
    });

    it("should revert with resolution deadline before betting deadline", async function () {
      await expect(
        predictionMarket.createMarket("Q?", ["A", "B"], bettingDeadline, bettingDeadline - 1)
      ).to.be.revertedWith("Resolution deadline must be after betting deadline");
    });

    it("should revert with resolution deadline equal to betting deadline", async function () {
      await expect(
        predictionMarket.createMarket("Q?", ["A", "B"], bettingDeadline, bettingDeadline)
      ).to.be.revertedWith("Resolution deadline must be after betting deadline");
    });
  });

  // 4.2 Betting Tests
  describe("Betting", function () {
    beforeEach(async function () {
      await predictionMarket.createMarket(
        "Who will win?",
        ["Team A", "Team B"],
        bettingDeadline,
        resolutionDeadline
      );
    });

    it("should place a valid bet", async function () {
      const betAmount = ethers.parseEther("1");
      const tx = await predictionMarket.connect(addr1).placeBet(0, 0, { value: betAmount });

      await expect(tx)
        .to.emit(predictionMarket, "BetPlaced")
        .withArgs(0, addr1.address, 0, betAmount);

      expect(await predictionMarket.bets(0, addr1.address, 0)).to.equal(betAmount);
      const market = await predictionMarket.markets(0);
      expect(market.totalPool).to.equal(betAmount);
    });

    it("should revert when betting after deadline", async function () {
      await time.increaseTo(bettingDeadline + 1);
      await expect(
        predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Betting deadline has passed");
    });

    it("should revert when betting with zero value", async function () {
      await expect(
        predictionMarket.connect(addr1).placeBet(0, 0, { value: 0 })
      ).to.be.revertedWith("Bet must be greater than zero");
    });

    it("should revert when betting on invalid outcome", async function () {
      await expect(
        predictionMarket.connect(addr1).placeBet(0, 5, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Invalid outcome index");
    });

    it("should revert when betting on resolved market", async function () {
      // Place a bet, advance time, resolve
      await predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await time.increaseTo(bettingDeadline + 1);
      await predictionMarket.resolveMarket(0, 0);

      // Betting deadline check fires first since time has passed
      await expect(
        predictionMarket.connect(addr2).placeBet(0, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Betting deadline has passed");
    });

    it("should revert when betting on cancelled market", async function () {
      await time.increaseTo(resolutionDeadline + 1);
      await predictionMarket.cancelMarket(0);

      await expect(
        predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Betting deadline has passed");
    });
  });

  // 4.3 Resolution Tests
  describe("Resolution", function () {
    beforeEach(async function () {
      await predictionMarket.createMarket(
        "Who will win?",
        ["Team A", "Team B"],
        bettingDeadline,
        resolutionDeadline
      );
      await predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") });
    });

    it("should allow creator to resolve after betting deadline", async function () {
      await time.increaseTo(bettingDeadline + 1);
      const tx = await predictionMarket.resolveMarket(0, 0);

      await expect(tx)
        .to.emit(predictionMarket, "MarketResolved")
        .withArgs(0, 0);

      const market = await predictionMarket.markets(0);
      expect(market.resolved).to.be.true;
      expect(market.winningOutcome).to.equal(0);
    });

    it("should revert when non-creator tries to resolve", async function () {
      await time.increaseTo(bettingDeadline + 1);
      await expect(
        predictionMarket.connect(addr1).resolveMarket(0, 0)
      ).to.be.revertedWith("Only creator can resolve");
    });

    it("should revert when resolving before betting deadline", async function () {
      await expect(
        predictionMarket.resolveMarket(0, 0)
      ).to.be.revertedWith("Betting deadline has not passed");
    });

    it("should revert when resolving already resolved market", async function () {
      await time.increaseTo(bettingDeadline + 1);
      await predictionMarket.resolveMarket(0, 0);

      await expect(
        predictionMarket.resolveMarket(0, 1)
      ).to.be.revertedWith("Market already resolved");
    });
  });

  // 4.4 Withdrawal Tests
  describe("Withdrawal", function () {
    beforeEach(async function () {
      await predictionMarket.createMarket(
        "Who will win?",
        ["Team A", "Team B"],
        bettingDeadline,
        resolutionDeadline
      );
    });

    it("should allow winner to withdraw proportional share", async function () {
      // addr1 bets 1 ETH on outcome 0, addr2 bets 3 ETH on outcome 0, addr3 bets 2 ETH on outcome 1
      await predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await predictionMarket.connect(addr2).placeBet(0, 0, { value: ethers.parseEther("3") });
      await predictionMarket.connect(addr3).placeBet(0, 1, { value: ethers.parseEther("2") });

      await time.increaseTo(bettingDeadline + 1);
      await predictionMarket.resolveMarket(0, 0); // outcome 0 wins

      // Total pool = 6 ETH, winning total = 4 ETH
      // addr1 payout = (1/4) * 6 = 1.5 ETH
      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      const tx = await predictionMarket.connect(addr1).withdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(addr1.address);

      const payout = balanceAfter - balanceBefore + gasUsed;
      expect(payout).to.equal(ethers.parseEther("1.5"));

      await expect(tx)
        .to.emit(predictionMarket, "Withdrawal")
        .withArgs(0, addr1.address, ethers.parseEther("1.5"));
    });

    it("should revert for non-winner", async function () {
      await predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await predictionMarket.connect(addr2).placeBet(0, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(bettingDeadline + 1);
      await predictionMarket.resolveMarket(0, 0);

      await expect(
        predictionMarket.connect(addr2).withdraw(0)
      ).to.be.revertedWith("No winning bet");
    });

    it("should revert on double withdrawal", async function () {
      await predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await time.increaseTo(bettingDeadline + 1);
      await predictionMarket.resolveMarket(0, 0);

      await predictionMarket.connect(addr1).withdraw(0);

      await expect(
        predictionMarket.connect(addr1).withdraw(0)
      ).to.be.revertedWith("Already withdrawn");
    });

    it("should revert on unresolved market", async function () {
      await predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await expect(
        predictionMarket.connect(addr1).withdraw(0)
      ).to.be.revertedWith("Market not resolved or cancelled");
    });
  });

  // 4.5 Cancellation Tests
  describe("Cancellation", function () {
    beforeEach(async function () {
      await predictionMarket.createMarket(
        "Who will win?",
        ["Team A", "Team B"],
        bettingDeadline,
        resolutionDeadline
      );
    });

    it("should allow cancellation after resolution deadline", async function () {
      await time.increaseTo(resolutionDeadline + 1);
      const tx = await predictionMarket.connect(addr1).cancelMarket(0);

      await expect(tx)
        .to.emit(predictionMarket, "MarketCancelled")
        .withArgs(0);

      const market = await predictionMarket.markets(0);
      expect(market.cancelled).to.be.true;
    });

    it("should revert cancellation before resolution deadline", async function () {
      await expect(
        predictionMarket.connect(addr1).cancelMarket(0)
      ).to.be.revertedWith("Resolution deadline has not passed");
    });

    it("should revert cancellation on resolved market", async function () {
      await predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await time.increaseTo(bettingDeadline + 1);
      await predictionMarket.resolveMarket(0, 0);

      await time.increaseTo(resolutionDeadline + 1);
      await expect(
        predictionMarket.cancelMarket(0)
      ).to.be.revertedWith("Market already resolved");
    });

    it("should allow full refund after cancellation", async function () {
      const betAmount = ethers.parseEther("2");
      await predictionMarket.connect(addr1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await predictionMarket.connect(addr1).placeBet(0, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(resolutionDeadline + 1);
      await predictionMarket.cancelMarket(0);

      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      const tx = await predictionMarket.connect(addr1).withdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(addr1.address);

      const refund = balanceAfter - balanceBefore + gasUsed;
      expect(refund).to.equal(betAmount);

      await expect(tx)
        .to.emit(predictionMarket, "Withdrawal")
        .withArgs(0, addr1.address, betAmount);
    });
  });
});
