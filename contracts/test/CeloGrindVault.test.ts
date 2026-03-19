import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { CeloGrindVault, StreakOracle } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// ─── Test helpers ─────────────────────────────────────────────────────────────

const ONE_USDT = ethers.parseUnits("1", 6);
const HALF_USDT = ethers.parseUnits("0.5", 6);
const SEVEN_DAYS = 7 * 24 * 60 * 60;

// Minimal ERC20 mock
const ERC20_MOCK_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

// ─── Fixtures ─────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, treasury, oracleHotWallet, keeper, alice, bob, carol, dave] =
    await ethers.getSigners();

  // Deploy mock USDT (6 decimals to match real USDT)
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const cusd = await MockERC20Factory.deploy("Tether USD", "USDT", 6);
  const cusdAddress = await cusd.getAddress();

  // Mint USDT to test players
  for (const player of [alice, bob, carol, dave]) {
    await cusd.mint(player.address, ethers.parseUnits("1000", 6));
  }

  // Deploy Vault
  const VaultFactory = await ethers.getContractFactory("CeloGrindVault");
  const vault = await VaultFactory.deploy(cusdAddress, treasury.address);
  const vaultAddress = await vault.getAddress();

  // Deploy Oracle
  const OracleFactory = await ethers.getContractFactory("StreakOracle");
  const oracle = await OracleFactory.deploy(vaultAddress, oracleHotWallet.address);
  const oracleAddress = await oracle.getAddress();

  // Grant ORACLE_ROLE to StreakOracle on the vault
  const ORACLE_ROLE = await vault.ORACLE_ROLE();
  await vault.grantRole(ORACLE_ROLE, oracleAddress);

  // Grant KEEPER_ROLE to keeper
  const KEEPER_ROLE = await vault.KEEPER_ROLE();
  await vault.grantRole(KEEPER_ROLE, keeper.address);

  // Helper: approve + enter round for a player
  const enterRound = async (
    player: SignerWithAddress,
    roundId: bigint
  ) => {
    await cusd.connect(player).approve(vaultAddress, ONE_USDT);
    await vault.connect(player).enterRound(roundId);
  };

  return {
    vault,
    oracle,
    cusd,
    owner,
    treasury,
    oracleHotWallet,
    keeper,
    alice,
    bob,
    carol,
    dave,
    vaultAddress,
    oracleAddress,
    cusdAddress,
    ORACLE_ROLE,
    KEEPER_ROLE,
    enterRound,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CeloGrindVault", () => {
  // ── Deployment ──────────────────────────────────────────────────────────────
  describe("Deployment", () => {
    it("starts on round 1", async () => {
      const { vault } = await loadFixture(deployFixture);
      expect(await vault.getCurrentRoundId()).to.equal(1n);
    });

    it("round 1 has Open status", async () => {
      const { vault } = await loadFixture(deployFixture);
      expect(await vault.getRoundStatus(1n)).to.equal(0); // 0 = Open
    });

    it("stores correct treasury address", async () => {
      const { vault, treasury } = await loadFixture(deployFixture);
      expect(await vault.treasury()).to.equal(treasury.address);
    });

    it("reverts if cUSD is zero address", async () => {
      const VaultFactory = await ethers.getContractFactory("CeloGrindVault");
      await expect(
        VaultFactory.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(
        await VaultFactory.deploy(
          ethers.ZeroAddress,
          ethers.ZeroAddress
        ).catch(() => ({ interface: VaultFactory.interface })),
        "InvalidTreasury"
      );
    });
  });

  // ── enterRound ──────────────────────────────────────────────────────────────
  describe("enterRound", () => {
    it("accepts 1 cUSD and registers player", async () => {
      const { vault, cusd, alice, vaultAddress, enterRound } =
        await loadFixture(deployFixture);

      const balanceBefore = await cusd.balanceOf(alice.address);
      await enterRound(alice, 1n);
      const balanceAfter = await cusd.balanceOf(alice.address);

      expect(balanceBefore - balanceAfter).to.equal(ONE_USDT);

      const [, , , , entered] = await vault.getPlayerStats(1n, alice.address);
      expect(entered).to.be.true;
    });

    it("updates round pot", async () => {
      const { vault, enterRound, alice, bob } = await loadFixture(deployFixture);
      await enterRound(alice, 1n);
      await enterRound(bob, 1n);

      const round = await vault.rounds(1n);
      expect(round.pot).to.equal(2n * ONE_USDT);
    });

    it("emits PlayerEntered event", async () => {
      const { vault, cusd, alice, vaultAddress, enterRound } =
        await loadFixture(deployFixture);

      await cusd.connect(alice).approve(vaultAddress, ONE_USDT);
      await expect(vault.connect(alice).enterRound(1n))
        .to.emit(vault, "PlayerEntered")
        .withArgs(1n, alice.address, ONE_USDT);
    });

    it("reverts on double entry", async () => {
      const { vault, cusd, alice, vaultAddress } =
        await loadFixture(deployFixture);

      await cusd.connect(alice).approve(vaultAddress, ONE_USDT * 2n);
      await vault.connect(alice).enterRound(1n);
      await expect(
        vault.connect(alice).enterRound(1n)
      ).to.be.revertedWithCustomError(vault, "AlreadyEntered");
    });

    it("reverts on wrong round ID", async () => {
      const { vault, cusd, alice, vaultAddress } =
        await loadFixture(deployFixture);

      await cusd.connect(alice).approve(vaultAddress, ONE_USDT);
      await expect(
        vault.connect(alice).enterRound(99n)
      ).to.be.revertedWithCustomError(vault, "InvalidRoundId");
    });

    it("reverts when round has ended", async () => {
      const { vault, cusd, alice, vaultAddress } =
        await loadFixture(deployFixture);

      await time.increase(SEVEN_DAYS + 1);
      await cusd.connect(alice).approve(vaultAddress, ONE_USDT);
      await expect(
        vault.connect(alice).enterRound(1n)
      ).to.be.revertedWithCustomError(vault, "RoundNotOpen");
    });

    it("reverts without sufficient cUSD approval", async () => {
      const { vault, alice } = await loadFixture(deployFixture);
      await expect(
        vault.connect(alice).enterRound(1n)
      ).to.be.reverted;
    });
  });

  // ── recordStreak ─────────────────────────────────────────────────────────────
  describe("recordStreak", () => {
    it("records first streak correctly", async () => {
      const { vault, oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, HALF_USDT);

      const [streak, volume] = await vault.getPlayerStats(1n, alice.address);
      expect(streak).to.equal(1n);
      expect(volume).to.equal(HALF_USDT);
    });

    it("extends streak on consecutive days", async () => {
      const { vault, oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);

      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, ONE_USDT);
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 1n, ONE_USDT);
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 2n, ONE_USDT);

      const [streak] = await vault.getPlayerStats(1n, alice.address);
      expect(streak).to.equal(3n);
    });

    it("resets streak on gap day", async () => {
      const { vault, oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);

      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, ONE_USDT);
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 1n, ONE_USDT);
      // Gap: skip day 2
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 3n, ONE_USDT);

      const [streak] = await vault.getPlayerStats(1n, alice.address);
      expect(streak).to.equal(1n); // reset to 1 after gap
    });

    it("accumulates volume correctly", async () => {
      const { vault, oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      const vol1 = ethers.parseUnits("1.5", 6);
      const vol2 = ethers.parseUnits("2.3", 6);
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, vol1);
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 1n, vol2);

      const [, volume] = await vault.getPlayerStats(1n, alice.address);
      expect(volume).to.equal(vol1 + vol2);
    });

    it("emits StreakRecorded event", async () => {
      const { vault, oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await expect(
        oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, HALF_USDT)
      )
        .to.emit(vault, "StreakRecorded")
        .withArgs(1n, alice.address, 0n, HALF_USDT, 1n);
    });

    it("reverts on duplicate day submission", async () => {
      const { oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, HALF_USDT);

      await expect(
        oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, HALF_USDT)
      ).to.be.revertedWithCustomError(oracle, "AlreadySubmitted");
    });

    it("reverts when volume is below minimum", async () => {
      const { oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      const tooLow = ethers.parseUnits("0.49", 6);
      await expect(
        oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, tooLow)
      ).to.be.revertedWithCustomError(oracle, "VolumeTooLow");
    });

    it("reverts when player not registered", async () => {
      const { oracle, oracleHotWallet, dave } =
        await loadFixture(deployFixture);

      await expect(
        oracle.connect(oracleHotWallet).submitStreak(dave.address, 1n, 0n, HALF_USDT)
      ).to.be.revertedWithCustomError(oracle, "PlayerNotRegistered");
    });

    it("reverts when day index is out of range", async () => {
      const { oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await expect(
        oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 7n, HALF_USDT)
      ).to.be.revertedWithCustomError(oracle, "InvalidDayIndex");
    });

    it("reverts if caller is not the oracle role (direct vault call)", async () => {
      const { vault, alice, bob, enterRound } = await loadFixture(deployFixture);
      await enterRound(alice, 1n);

      await expect(
        vault.connect(bob).recordStreak(alice.address, 1n, 0n, HALF_USDT)
      ).to.be.reverted;
    });
  });

  // ── resolveRound — happy path ──────────────────────────────────────────────
  describe("resolveRound — 3 players", () => {
    async function threePlayerRound() {
      const f = await loadFixture(deployFixture);
      const { alice, bob, carol, oracle, oracleHotWallet, enterRound } = f;

      await enterRound(alice, 1n);
      await enterRound(bob, 1n);
      await enterRound(carol, 1n);

      // Alice: 7-day streak, vol = 7 cUSD
      for (let d = 0; d < 7; d++) {
        await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, BigInt(d), ONE_USDT);
      }

      // Bob: 5-day streak, vol = 5 cUSD
      for (let d = 0; d < 5; d++) {
        await oracle.connect(oracleHotWallet).submitStreak(bob.address, 1n, BigInt(d), ONE_USDT);
      }

      // Carol: 3-day streak, vol = 3 cUSD
      for (let d = 0; d < 3; d++) {
        await oracle.connect(oracleHotWallet).submitStreak(carol.address, 1n, BigInt(d), ONE_USDT);
      }

      await time.increase(SEVEN_DAYS + 1);
      return f;
    }

    it("resolves to correct winners", async () => {
      const { vault, keeper, alice, bob, carol } = await threePlayerRound();
      const tx = await vault.connect(keeper).resolveRound(1n);
      const receipt = await tx.wait();

      // Check winners via the RoundResolved event args
      const event = receipt!.logs
        .map((log: any) => { try { return vault.interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "RoundResolved");

      expect(event).to.not.be.null;
      expect(event!.args.first).to.equal(alice.address);  // 1st: 7-streak
      expect(event!.args.second).to.equal(bob.address);   // 2nd: 5-streak
      expect(event!.args.third).to.equal(carol.address);  // 3rd: 3-streak
    });

    it("distributes 50/30/20 split correctly", async () => {
      const { vault, cusd, keeper, alice, bob, carol, treasury } =
        await threePlayerRound();

      const pot = 3n * ONE_USDT;
      const protocolFee = (pot * 500n) / 10000n; // 5%
      const distributable = pot - protocolFee;

      const aliceBefore = await cusd.balanceOf(alice.address);
      const bobBefore = await cusd.balanceOf(bob.address);
      const carolBefore = await cusd.balanceOf(carol.address);
      const treasuryBefore = await cusd.balanceOf(treasury.address);

      await vault.connect(keeper).resolveRound(1n);

      const aliceAfter = await cusd.balanceOf(alice.address);
      const bobAfter = await cusd.balanceOf(bob.address);
      const carolAfter = await cusd.balanceOf(carol.address);
      const treasuryAfter = await cusd.balanceOf(treasury.address);

      expect(aliceAfter - aliceBefore).to.equal((distributable * 50n) / 100n);
      expect(bobAfter - bobBefore).to.equal((distributable * 30n) / 100n);
      expect(carolAfter - carolBefore).to.equal((distributable * 20n) / 100n);
      expect(treasuryAfter - treasuryBefore).to.equal(protocolFee);
    });

    it("marks round as Resolved", async () => {
      const { vault, keeper } = await threePlayerRound();
      await vault.connect(keeper).resolveRound(1n);
      expect(await vault.getRoundStatus(1n)).to.equal(2); // Resolved
    });

    it("starts round 2 after resolution", async () => {
      const { vault, keeper } = await threePlayerRound();
      await vault.connect(keeper).resolveRound(1n);
      expect(await vault.getCurrentRoundId()).to.equal(2n);
      expect(await vault.getRoundStatus(2n)).to.equal(0); // Open
    });

    it("emits RoundResolved event", async () => {
      const { vault, keeper, alice, bob, carol } = await threePlayerRound();
      await expect(vault.connect(keeper).resolveRound(1n))
        .to.emit(vault, "RoundResolved");
    });

    it("reverts if already resolved", async () => {
      const { vault, keeper } = await threePlayerRound();
      await vault.connect(keeper).resolveRound(1n);
      await expect(
        vault.connect(keeper).resolveRound(1n)
      ).to.be.revertedWithCustomError(vault, "RoundAlreadyResolved");
    });

    it("reverts if called by non-keeper non-admin", async () => {
      const { vault, alice, enterRound, bob, carol } =
        await loadFixture(deployFixture);
      await enterRound(alice, 1n);
      await enterRound(bob, 1n);
      await enterRound(carol, 1n);
      await time.increase(SEVEN_DAYS + 1);
      await expect(
        vault.connect(alice).resolveRound(1n)
      ).to.be.reverted;
    });
  });

  // ── resolveRound — tiebreaker ─────────────────────────────────────────────
  describe("resolveRound — tiebreaker by volume", () => {
    it("breaks tie using cumulative volume", async () => {
      const { vault, oracle, oracleHotWallet, keeper, alice, bob, carol, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await enterRound(bob, 1n);
      await enterRound(carol, 1n);

      // Alice and Bob both have 5-day streaks, but Alice has higher volume
      for (let d = 0; d < 5; d++) {
        await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, BigInt(d), ethers.parseUnits("2", 6));
      }
      for (let d = 0; d < 5; d++) {
        await oracle.connect(oracleHotWallet).submitStreak(bob.address, 1n, BigInt(d), ONE_USDT);
      }
      // Carol: lower streak
      for (let d = 0; d < 3; d++) {
        await oracle.connect(oracleHotWallet).submitStreak(carol.address, 1n, BigInt(d), ONE_USDT);
      }

      await time.increase(SEVEN_DAYS + 1);
      const tx = await vault.connect(keeper).resolveRound(1n);
      const receipt = await tx.wait();

      // Check winners via the RoundResolved event args
      const event = receipt!.logs
        .map((log: any) => { try { return vault.interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === "RoundResolved");

      expect(event).to.not.be.null;
      expect(event!.args.first).to.equal(alice.address);  // Alice wins tiebreak (10 > 5 cUSD vol)
      expect(event!.args.second).to.equal(bob.address);
      expect(event!.args.third).to.equal(carol.address);
    });
  });

  // ── resolveRound — <3 players ─────────────────────────────────────────────
  describe("resolveRound — fewer than 3 players", () => {
    it("refunds when only 2 players entered", async () => {
      const { vault, cusd, keeper, alice, bob, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await enterRound(bob, 1n);

      const aliceBefore = await cusd.balanceOf(alice.address);
      const bobBefore = await cusd.balanceOf(bob.address);

      await time.increase(SEVEN_DAYS + 1);
      await vault.connect(keeper).resolveRound(1n);

      expect(await vault.getRoundStatus(1n)).to.equal(3); // Refunded

      // Players claim refunds
      await vault.connect(alice).claimRefund(1n);
      await vault.connect(bob).claimRefund(1n);

      const aliceAfter = await cusd.balanceOf(alice.address);
      const bobAfter = await cusd.balanceOf(bob.address);

      expect(aliceAfter - aliceBefore).to.equal(ONE_USDT);
      expect(bobAfter - bobBefore).to.equal(ONE_USDT);
    });

    it("refunds when only 1 player entered", async () => {
      const { vault, keeper, alice, enterRound } = await loadFixture(deployFixture);
      await enterRound(alice, 1n);
      await time.increase(SEVEN_DAYS + 1);
      await vault.connect(keeper).resolveRound(1n);
      expect(await vault.getRoundStatus(1n)).to.equal(3);
    });

    it("refunds when 0 players entered", async () => {
      const { vault, keeper } = await loadFixture(deployFixture);
      await time.increase(SEVEN_DAYS + 1);
      await vault.connect(keeper).resolveRound(1n);
      expect(await vault.getRoundStatus(1n)).to.equal(3);
    });

    it("emits RoundRefunded event", async () => {
      const { vault, keeper, alice, bob, enterRound } =
        await loadFixture(deployFixture);
      await enterRound(alice, 1n);
      await enterRound(bob, 1n);
      await time.increase(SEVEN_DAYS + 1);
      await expect(vault.connect(keeper).resolveRound(1n))
        .to.emit(vault, "RoundRefunded");
    });

    it("still advances to round 2 after refund", async () => {
      const { vault, keeper } = await loadFixture(deployFixture);
      await time.increase(SEVEN_DAYS + 1);
      await vault.connect(keeper).resolveRound(1n);
      expect(await vault.getCurrentRoundId()).to.equal(2n);
    });
  });

  // ── claimRefund ────────────────────────────────────────────────────────────
  describe("claimRefund", () => {
    it("reverts if round is not in Refunded status", async () => {
      const { vault, alice, enterRound } = await loadFixture(deployFixture);
      await enterRound(alice, 1n);
      await expect(
        vault.connect(alice).claimRefund(1n)
      ).to.be.revertedWithCustomError(vault, "RoundNotRefunded");
    });

    it("reverts on double claim", async () => {
      const { vault, keeper, alice, enterRound } = await loadFixture(deployFixture);
      await enterRound(alice, 1n);
      await time.increase(SEVEN_DAYS + 1);
      await vault.connect(keeper).resolveRound(1n);

      await vault.connect(alice).claimRefund(1n);
      await expect(
        vault.connect(alice).claimRefund(1n)
      ).to.be.revertedWithCustomError(vault, "RefundAlreadyClaimed");
    });

    it("reverts if player did not enter", async () => {
      const { vault, keeper, alice, bob, enterRound } =
        await loadFixture(deployFixture);
      await enterRound(alice, 1n);
      await time.increase(SEVEN_DAYS + 1);
      await vault.connect(keeper).resolveRound(1n);

      await expect(
        vault.connect(bob).claimRefund(1n)
      ).to.be.revertedWithCustomError(vault, "NotRegistered");
    });
  });

  // ── getLeaderboard ─────────────────────────────────────────────────────────
  describe("getLeaderboard", () => {
    it("returns sorted leaderboard", async () => {
      const { vault, oracle, oracleHotWallet, alice, bob, carol, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await enterRound(bob, 1n);
      await enterRound(carol, 1n);

      // Carol: 7 days, Alice: 5 days, Bob: 3 days
      for (let d = 0; d < 7; d++)
        await oracle.connect(oracleHotWallet).submitStreak(carol.address, 1n, BigInt(d), ONE_USDT);
      for (let d = 0; d < 5; d++)
        await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, BigInt(d), ONE_USDT);
      for (let d = 0; d < 3; d++)
        await oracle.connect(oracleHotWallet).submitStreak(bob.address, 1n, BigInt(d), ONE_USDT);

      const [addresses, streaks, , ranks] = await vault.getLeaderboard(1n);

      expect(addresses[0]).to.equal(carol.address);
      expect(streaks[0]).to.equal(7n);
      expect(ranks[0]).to.equal(1n);

      expect(addresses[1]).to.equal(alice.address);
      expect(streaks[1]).to.equal(5n);
      expect(ranks[1]).to.equal(2n);

      expect(addresses[2]).to.equal(bob.address);
      expect(streaks[2]).to.equal(3n);
      expect(ranks[2]).to.equal(3n);
    });
  });

  // ── Admin functions ────────────────────────────────────────────────────────
  describe("Admin", () => {
    it("owner can update treasury", async () => {
      const { vault, owner, dave } = await loadFixture(deployFixture);
      await vault.connect(owner).setTreasury(dave.address);
      expect(await vault.treasury()).to.equal(dave.address);
    });

    it("non-owner cannot update treasury", async () => {
      const { vault, alice, dave } = await loadFixture(deployFixture);
      await expect(
        vault.connect(alice).setTreasury(dave.address)
      ).to.be.reverted;
    });

    it("owner can pause and unpause", async () => {
      const { vault, owner, cusd, alice, vaultAddress } =
        await loadFixture(deployFixture);

      await vault.connect(owner).pause();
      await cusd.connect(alice).approve(vaultAddress, ONE_USDT);
      await expect(
        vault.connect(alice).enterRound(1n)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await vault.connect(owner).unpause();
      await vault.connect(alice).enterRound(1n);
      const [, , , , entered] = await vault.getPlayerStats(1n, alice.address);
      expect(entered).to.be.true;
    });
  });

  // ── batchSubmitStreaks ─────────────────────────────────────────────────────
  describe("StreakOracle.batchSubmitStreaks", () => {
    it("submits multiple players in one tx", async () => {
      const { vault, oracle, oracleHotWallet, alice, bob, carol, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await enterRound(bob, 1n);
      await enterRound(carol, 1n);

      await oracle.connect(oracleHotWallet).batchSubmitStreaks(
        [alice.address, bob.address, carol.address],
        [1n, 1n, 1n],
        [0n, 0n, 0n],
        [ONE_USDT, ONE_USDT, ONE_USDT]
      );

      const [aliceStreak] = await vault.getPlayerStats(1n, alice.address);
      const [bobStreak] = await vault.getPlayerStats(1n, bob.address);
      const [carolStreak] = await vault.getPlayerStats(1n, carol.address);

      expect(aliceStreak).to.equal(1n);
      expect(bobStreak).to.equal(1n);
      expect(carolStreak).to.equal(1n);
    });

    it("skips invalid entries in batch without reverting", async () => {
      const { vault, oracle, oracleHotWallet, alice, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);

      // Mix valid and invalid (volume too low, unregistered player)
      await oracle.connect(oracleHotWallet).batchSubmitStreaks(
        [alice.address, alice.address], // second is a dup (same day)
        [1n, 1n],
        [0n, 0n],
        [ONE_USDT, ethers.parseUnits("0.1", 6)] // second has volume too low
      );

      const [streak] = await vault.getPlayerStats(1n, alice.address);
      expect(streak).to.equal(1n); // only one succeeded
    });

    it("reverts if caller is not trusted submitter", async () => {
      const { oracle, alice } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(alice).batchSubmitStreaks([], [], [], [])
      ).to.be.revertedWithCustomError(oracle, "Unauthorized");
    });
  });

  // ── StreakOracle admin ─────────────────────────────────────────────────────
  describe("StreakOracle admin", () => {
    it("owner can update trusted submitter", async () => {
      const { oracle, owner, alice } = await loadFixture(deployFixture);
      await oracle.connect(owner).setTrustedSubmitter(alice.address);
      expect(await oracle.trustedSubmitter()).to.equal(alice.address);
    });

    it("non-owner cannot update trusted submitter", async () => {
      const { oracle, alice, bob } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(alice).setTrustedSubmitter(bob.address)
      ).to.be.reverted;
    });

    it("owner can update vault address", async () => {
      const { oracle, owner, alice } = await loadFixture(deployFixture);
      await oracle.connect(owner).setVault(alice.address); // use any non-zero address
      expect(await oracle.vault()).to.equal(alice.address);
    });
  });

  // ── 2-winner payout ──────────────────────────────────────────────────────
  describe("resolveRound — exactly 3 players, 2 with streaks", () => {
    it("distributes 625/375 when only 2 have streaks", async () => {
      const { vault, cusd, oracle, oracleHotWallet, keeper, alice, bob, carol, enterRound } =
        await loadFixture(deployFixture);

      await enterRound(alice, 1n);
      await enterRound(bob, 1n);
      await enterRound(carol, 1n);

      // Only alice and bob have streaks; carol has 0 streak
      await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0n, ONE_USDT);
      await oracle.connect(oracleHotWallet).submitStreak(bob.address, 1n, 0n, HALF_USDT);

      const pot = 3n * ONE_USDT;
      const fee = (pot * 500n) / 10000n;
      const dist = pot - fee;

      const aliceBefore = await cusd.balanceOf(alice.address);
      const bobBefore = await cusd.balanceOf(bob.address);

      await time.increase(SEVEN_DAYS + 1);
      await vault.connect(keeper).resolveRound(1n);

      const aliceAfter = await cusd.balanceOf(alice.address);
      const bobAfter = await cusd.balanceOf(bob.address);

      // 1st: 62.5%, 2nd: 37.5%
      expect(aliceAfter - aliceBefore).to.equal((dist * 625n) / 1000n);
      expect(bobAfter - bobBefore).to.equal((dist * 375n) / 1000n);
    });
  });
});
