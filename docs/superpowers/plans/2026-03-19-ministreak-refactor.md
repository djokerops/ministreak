# MiniStreak Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor CeloGrind from USDT-streak-volume tracking to any-transaction tracking with tx count ranking and unique address tiebreaker, rename contract to MiniStreak, reduce frontend to 2 tabs.

**Architecture:** Contracts track daily streaks (consecutive days with ≥1 outgoing tx), rank by streak DESC → txCount DESC → uniqueToCount DESC. Oracle scans all outgoing transactions (not just USDT transfers). Frontend shows 2 tabs: Home and Board.

**Tech Stack:** Solidity 0.8.20, Hardhat, ethers v6, viem, Next.js 14, The Graph (AssemblyScript), SQLite, node-cron

**Spec:** `docs/superpowers/specs/2026-03-19-ministreak-refactor-design.md`

---

### Task 1: Rename and refactor MiniStreak.sol (core contract)

**Files:**
- Rename: `contracts/src/CeloGrindVault.sol` → `contracts/src/MiniStreak.sol`
- Test: `contracts/test/CeloGrindVault.test.ts`

- [ ] **Step 1: Rename the file**

```bash
cd /Users/arua/Desktop/celo-grind
mv contracts/src/CeloGrindVault.sol contracts/src/MiniStreak.sol
```

- [ ] **Step 2: Update contract name, entry fee, state variable, and remove volume**

In `contracts/src/MiniStreak.sol`:
- Line 17: `contract CeloGrindVault` → `contract MiniStreak`
- Line 12: Update natdoc: "Players pay 0.5 USDT to enter"
- Line 27-28: Change `ENTRY_FEE` from `1_000_000` to `500_000`, update comment to "0.5 USDT"
- Line 74: `IERC20 public immutable cUSD` → `IERC20 public immutable usdt`
- Line 124: Remove `error VolumeTooLow();`
- Lines 63-69: Update `PlayerRecord` struct:

```solidity
struct PlayerRecord {
    uint8 streak;          // current consecutive-day streak count
    uint8 lastValidDay;    // last day index (0-6) a valid tx was recorded; 255 = sentinel
    uint32 txCount;        // cumulative transaction count this round
    uint16 uniqueToCount;  // unique "to" addresses interacted with
    bool claimed;          // refund claimed flag (only used in Refunded rounds)
    bool entered;          // has this player entered this round
}
```

- Line 136-139: Constructor: rename `_cUSD` → `_usdt`, `cUSD = IERC20(_cUSD)` → `usdt = IERC20(_usdt)`
- Lines 156-177: In `enterRound()`:
  - Line 167: `cUSD.safeTransferFrom(...)` → `usdt.safeTransferFrom(...)`
  - After line 169 `record.entered = true;`, add: `record.txCount = 1;`
  - Line 170: `record.lastValidDay = type(uint256).max` → `record.lastValidDay = 255;` (uint8 max)
- Line 192: `cUSD.safeTransfer(...)` → `usdt.safeTransfer(...)`

- [ ] **Step 3: Update recordStreak() signature and logic**

In `contracts/src/MiniStreak.sol`, replace lines 208-245:

```solidity
function recordStreak(
    address player,
    uint256 roundId,
    uint8 dayIndex,
    uint32 txCount,
    uint16 uniqueToCount
) external onlyRole(ORACLE_ROLE) {
    if (dayIndex >= DAYS_IN_ROUND) revert InvalidDayIndex();

    Round storage round = rounds[roundId];
    if (round.status == RoundStatus.Resolved || round.status == RoundStatus.Refunded) {
        revert RoundAlreadyResolved();
    }

    PlayerRecord storage record = playerRecords[roundId][player];
    if (!record.entered) revert NotRegistered();

    // Prevent double-submission for the same day
    if (record.lastValidDay == dayIndex) revert DayAlreadySubmitted();

    // Update streak: if lastValidDay was the previous day, increment; otherwise reset to 1
    if (record.lastValidDay == 255) {
        // First submission
        record.streak = 1;
    } else if (dayIndex == record.lastValidDay + 1) {
        record.streak++;
    } else {
        record.streak = 1;
    }

    record.lastValidDay = dayIndex;
    record.txCount += txCount;
    record.uniqueToCount += uniqueToCount;

    emit StreakRecorded(roundId, player, dayIndex, txCount, uniqueToCount, record.streak);
}
```

- [ ] **Step 4: Update StreakRecorded event**

Replace lines 94-100:

```solidity
event StreakRecorded(
    uint256 indexed roundId,
    address indexed player,
    uint8 dayIndex,
    uint32 txCount,
    uint16 uniqueToCount,
    uint8 newStreak
);
```

- [ ] **Step 5: Update _isBetter() to three-way comparison**

Replace lines 464-472:

```solidity
function _isBetter(
    uint8 streakA,
    uint32 txCountA,
    uint16 uniqueToA,
    uint8 streakB,
    uint32 txCountB,
    uint16 uniqueToB
) internal pure returns (bool) {
    if (streakA != streakB) return streakA > streakB;
    if (txCountA != txCountB) return txCountA > txCountB;
    return uniqueToA > uniqueToB;
}
```

- [ ] **Step 6: Update _rankTop3() for three-way ranking**

Replace lines 478-515:

```solidity
function _rankTop3(
    uint256 roundId,
    address[] storage players
)
    internal
    view
    returns (
        address first,
        address second,
        address third
    )
{
    uint256 n = players.length;

    uint8 s1; uint32 t1; uint16 u1;
    uint8 s2; uint32 t2; uint16 u2;
    uint8 s3; uint32 t3; uint16 u3;

    for (uint256 i = 0; i < n; i++) {
        address p = players[i];
        PlayerRecord storage rec = playerRecords[roundId][p];
        uint8 s = rec.streak;
        uint32 t = rec.txCount;
        uint16 u = rec.uniqueToCount;

        if (_isBetter(s, t, u, s1, t1, u1)) {
            third = second; s3 = s2; t3 = t2; u3 = u2;
            second = first; s2 = s1; t2 = t1; u2 = u1;
            first = p; s1 = s; t1 = t; u1 = u;
        } else if (_isBetter(s, t, u, s2, t2, u2)) {
            third = second; s3 = s2; t3 = t2; u3 = u2;
            second = p; s2 = s; t2 = t; u2 = u;
        } else if (_isBetter(s, t, u, s3, t3, u3)) {
            third = p; s3 = s; t3 = t; u3 = u;
        }
    }

    return (first, second, third);
}
```

- [ ] **Step 7: Update getPlayerStats() return values**

Replace lines 314-330:

```solidity
function getPlayerStats(
    uint256 roundId,
    address player
)
    external
    view
    returns (
        uint8 streak,
        uint32 txCount,
        uint16 uniqueToCount,
        uint8 lastValidDay,
        bool claimed,
        bool entered
    )
{
    PlayerRecord storage r = playerRecords[roundId][player];
    return (r.streak, r.txCount, r.uniqueToCount, r.lastValidDay, r.claimed, r.entered);
}
```

- [ ] **Step 8: Update getLeaderboard() return values**

Replace lines 353-411:

```solidity
function getLeaderboard(
    uint256 roundId
)
    external
    view
    returns (
        address[] memory addresses,
        uint8[] memory streaks,
        uint32[] memory txCounts,
        uint16[] memory uniqueToCounts,
        uint256[] memory ranks
    )
{
    address[] storage players = roundPlayers[roundId];
    uint256 n = players.length;

    addresses = new address[](n);
    streaks = new uint8[](n);
    txCounts = new uint32[](n);
    uniqueToCounts = new uint16[](n);
    ranks = new uint256[](n);

    for (uint256 i = 0; i < n; i++) {
        addresses[i] = players[i];
        PlayerRecord storage r = playerRecords[roundId][players[i]];
        streaks[i] = r.streak;
        txCounts[i] = r.txCount;
        uniqueToCounts[i] = r.uniqueToCount;
    }

    // Insertion sort
    for (uint256 i = 1; i < n; i++) {
        for (uint256 j = i; j > 0; j--) {
            if (_isBetter(streaks[j], txCounts[j], uniqueToCounts[j], streaks[j - 1], txCounts[j - 1], uniqueToCounts[j - 1])) {
                (addresses[j], addresses[j - 1]) = (addresses[j - 1], addresses[j]);
                (streaks[j], streaks[j - 1]) = (streaks[j - 1], streaks[j]);
                (txCounts[j], txCounts[j - 1]) = (txCounts[j - 1], txCounts[j]);
                (uniqueToCounts[j], uniqueToCounts[j - 1]) = (uniqueToCounts[j - 1], uniqueToCounts[j]);
            } else {
                break;
            }
        }
    }

    // Assign ranks
    uint256 currentRank = 1;
    for (uint256 i = 0; i < n; i++) {
        if (
            i > 0 &&
            streaks[i] == streaks[i - 1] &&
            txCounts[i] == txCounts[i - 1] &&
            uniqueToCounts[i] == uniqueToCounts[i - 1]
        ) {
            ranks[i] = ranks[i - 1];
        } else {
            ranks[i] = currentRank;
        }
        currentRank++;
    }

    return (addresses, streaks, txCounts, uniqueToCounts, ranks);
}
```

- [ ] **Step 9: Update _distributePrizes and all remaining cUSD → usdt references**

In `_distributePrizes` (lines 525-549): replace all `cUSD.safeTransfer` with `usdt.safeTransfer`.
In `resolveRound` line 290: `cUSD.safeTransfer(treasury, protocolFee)` → `usdt.safeTransfer(treasury, protocolFee)`.

- [ ] **Step 10: Compile to verify**

```bash
cd /Users/arua/Desktop/celo-grind/contracts && npx hardhat compile
```

Expected: Successful compilation.

- [ ] **Step 11: Commit**

```bash
git add contracts/src/MiniStreak.sol
git rm contracts/src/CeloGrindVault.sol 2>/dev/null || true
git commit -m "refactor: rename CeloGrindVault to MiniStreak, change to tx count tracking"
```

---

### Task 2: Update StreakOracle.sol

**Files:**
- Modify: `contracts/src/StreakOracle.sol`

- [ ] **Step 1: Update IVault interface**

Replace lines 8-29:

```solidity
interface IMiniStreak {
    function recordStreak(
        address player,
        uint256 roundId,
        uint8 dayIndex,
        uint32 txCount,
        uint16 uniqueToCount
    ) external;

    function playerRecords(
        uint256 roundId,
        address player
    )
        external
        view
        returns (
            uint8 streak,
            uint8 lastValidDay,
            uint32 txCount,
            uint16 uniqueToCount,
            bool claimed,
            bool entered
        );
}
```

- [ ] **Step 2: Remove MIN_VOLUME, update state and types**

- Line 47-48: Remove `uint256 public constant MIN_VOLUME = 500_000;`
- Line 55: `IVault public vault` → `IMiniStreak public vault`
- Line 66-71: Update `StreakSubmitted` event:

```solidity
event StreakSubmitted(
    address indexed player,
    uint256 indexed roundId,
    uint8 dayIndex,
    uint32 txCount,
    uint16 uniqueToCount
);
```

- Line 78: Remove `error VolumeTooLow(uint256 provided, uint256 minimum);`
- Line 90-93: Constructor: rename `_vault` type to `IMiniStreak`, `vault = IVault(_vault)` → `vault = IMiniStreak(_vault)`

- [ ] **Step 3: Update submitStreak()**

Replace lines 114-138:

```solidity
function submitStreak(
    address player,
    uint256 roundId,
    uint8 dayIndex,
    uint32 txCount,
    uint16 uniqueToCount
) external {
    if (msg.sender != trustedSubmitter) revert Unauthorized();
    if (dayIndex >= DAYS_IN_ROUND) revert InvalidDayIndex(dayIndex);
    if (submitted[roundId][player][dayIndex]) {
        revert AlreadySubmitted(player, roundId, dayIndex);
    }

    // Check player is registered
    (, , , , , bool entered) = vault.playerRecords(roundId, player);
    if (!entered) revert PlayerNotRegistered(player, roundId);

    submitted[roundId][player][dayIndex] = true;

    vault.recordStreak(player, roundId, dayIndex, txCount, uniqueToCount);

    emit StreakSubmitted(player, roundId, dayIndex, txCount, uniqueToCount);
}
```

- [ ] **Step 4: Update batchSubmitStreaks()**

Replace lines 151-188:

```solidity
function batchSubmitStreaks(
    address[] calldata players,
    uint256[] calldata roundIds,
    uint8[] calldata dayIndexes,
    uint32[] calldata txCounts,
    uint16[] calldata uniqueToCounts
) external {
    if (msg.sender != trustedSubmitter) revert Unauthorized();

    uint256 n = players.length;
    require(
        roundIds.length == n && dayIndexes.length == n && txCounts.length == n && uniqueToCounts.length == n,
        "Array length mismatch"
    );

    for (uint256 i = 0; i < n; i++) {
        address player = players[i];
        uint256 roundId = roundIds[i];
        uint8 dayIndex = dayIndexes[i];
        uint32 txCount = txCounts[i];
        uint16 uniqueToCount = uniqueToCounts[i];

        if (dayIndex >= DAYS_IN_ROUND) continue;
        if (submitted[roundId][player][dayIndex]) continue;

        (, , , , , bool entered) = vault.playerRecords(roundId, player);
        if (!entered) continue;

        submitted[roundId][player][dayIndex] = true;

        try vault.recordStreak(player, roundId, dayIndex, txCount, uniqueToCount) {
            emit StreakSubmitted(player, roundId, dayIndex, txCount, uniqueToCount);
        } catch {
            submitted[roundId][player][dayIndex] = false;
        }
    }
}
```

- [ ] **Step 5: Update setVault()**

Line 208-209: `vault = IVault(_vault)` → `vault = IMiniStreak(_vault)`

- [ ] **Step 6: Compile**

```bash
cd /Users/arua/Desktop/celo-grind/contracts && npx hardhat compile
```

- [ ] **Step 7: Commit**

```bash
git add contracts/src/StreakOracle.sol
git commit -m "refactor: update StreakOracle for txCount/uniqueToCount params"
```

---

### Task 3: Update contract tests

**Files:**
- Rename: `contracts/test/CeloGrindVault.test.ts` → `contracts/test/MiniStreak.test.ts`

> **First:** `mv contracts/test/CeloGrindVault.test.ts contracts/test/MiniStreak.test.ts`

- [ ] **Step 1: Update imports, constants, and fixture**

- Line 4: `import { CeloGrindVault, StreakOracle }` → `import { MiniStreak, StreakOracle }`
- Line 9: `ONE_USDT` stays but add `const ENTRY_FEE = ethers.parseUnits("0.5", 6);`
- Lines 40-41: `ethers.getContractFactory("CeloGrindVault")` → `ethers.getContractFactory("MiniStreak")`
- Lines 58-64: Update `enterRound` helper to approve `ENTRY_FEE` instead of `ONE_USDT`:

```typescript
const enterRound = async (player: SignerWithAddress, roundId: bigint) => {
  await cusd.connect(player).approve(vaultAddress, ENTRY_FEE);
  await vault.connect(player).enterRound(roundId);
};
```

- [ ] **Step 2: Update enterRound tests**

- Line 89: `describe("CeloGrindVault"` → `describe("MiniStreak"`
- Line 108: Update `CeloGrindVault` factory reference
- Lines 123-135: Update "accepts 1 cUSD" test to use `ENTRY_FEE`, check `txCount = 1`:

```typescript
it("accepts 0.5 USDT and registers player with txCount=1", async () => {
  const { vault, cusd, alice, vaultAddress, enterRound } =
    await loadFixture(deployFixture);

  const balanceBefore = await cusd.balanceOf(alice.address);
  await enterRound(alice, 1n);
  const balanceAfter = await cusd.balanceOf(alice.address);

  expect(balanceBefore - balanceAfter).to.equal(ENTRY_FEE);

  const [streak, txCount, uniqueToCount, , , entered] = await vault.getPlayerStats(1n, alice.address);
  expect(entered).to.be.true;
  expect(txCount).to.equal(1n);
});
```

- Line 143: `expect(round.pot).to.equal(2n * ONE_USDT)` → `expect(round.pot).to.equal(2n * ENTRY_FEE)`
- Lines 150-153: Update PlayerEntered event test to use `ENTRY_FEE`
- Lines 160, 171: Update approval amounts to `ENTRY_FEE`

- [ ] **Step 3: Update recordStreak tests — new signature (txCount, uniqueToCount)**

All `submitStreak` calls change from 4 args to 5 args. Replace `volume` param with `txCount` (uint32) and `uniqueToCount` (uint16).

Example — "records first streak correctly" (lines 198-208):

```typescript
it("records first streak correctly", async () => {
  const { vault, oracle, oracleHotWallet, alice, enterRound } =
    await loadFixture(deployFixture);

  await enterRound(alice, 1n);
  // txCount=5, uniqueToCount=3
  await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, 0, 5, 3);

  const [streak, txCount, uniqueToCount] = await vault.getPlayerStats(1n, alice.address);
  expect(streak).to.equal(1n);
  // txCount = 1 (from entry) + 5 (from oracle) = 6
  expect(txCount).to.equal(6n);
  expect(uniqueToCount).to.equal(3n);
});
```

Apply similar pattern to all recordStreak tests:
- "extends streak on consecutive days": submit day 0, 1, 2 with txCount=3 each, verify streak=3
- "resets streak on gap day": submit day 0, 1, skip 2, submit day 3, verify streak=1
- "accumulates txCount correctly": submit day 0 with txCount=5, day 1 with txCount=8, verify total = 1 + 5 + 8 = 14
- "emits StreakRecorded event": verify new event args (dayIndex, txCount, uniqueToCount, newStreak)
- "reverts on duplicate day submission": same as before but with new args
- Remove "reverts when volume is below minimum" test (no volume threshold anymore)
- "reverts when player not registered": same with new args
- "reverts when day index is out of range": same with new args
- "reverts if caller is not oracle role": update args

- [ ] **Step 4: Update resolveRound / tiebreaker tests**

- "threePlayerRound" fixture: update all `submitStreak` calls to use `(address, roundId, dayIndex, txCount, uniqueToCount)`. E.g., Alice: 7-day streak with txCount=10/day; Bob: 5-day with txCount=5/day; Carol: 3-day with txCount=3/day.
- "distributes 50/30/20 split correctly": change pot calculation from `3n * ONE_USDT` to `3n * ENTRY_FEE`
- Tiebreaker test: "breaks tie using txCount" — Alice and Bob both have 5-day streaks, Alice has higher txCount. Verify Alice wins.
- Add new test: "breaks tie using uniqueToCount when streak and txCount are equal" — Alice and Bob both have same streak and txCount, Alice has higher uniqueToCount.
- Update refund amounts from `ONE_USDT` to `ENTRY_FEE`
- Update 2-winner payout test to use `ENTRY_FEE` for pot calculation

- [ ] **Step 5: Update getLeaderboard test**

```typescript
it("returns sorted leaderboard", async () => {
  const { vault, oracle, oracleHotWallet, alice, bob, carol, enterRound } =
    await loadFixture(deployFixture);

  await enterRound(alice, 1n);
  await enterRound(bob, 1n);
  await enterRound(carol, 1n);

  // Carol: 7 days, Alice: 5 days, Bob: 3 days
  for (let d = 0; d < 7; d++)
    await oracle.connect(oracleHotWallet).submitStreak(carol.address, 1n, d, 10, 5);
  for (let d = 0; d < 5; d++)
    await oracle.connect(oracleHotWallet).submitStreak(alice.address, 1n, d, 10, 5);
  for (let d = 0; d < 3; d++)
    await oracle.connect(oracleHotWallet).submitStreak(bob.address, 1n, d, 10, 5);

  const [addresses, streaks, , , ranks] = await vault.getLeaderboard(1n);

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
```

- [ ] **Step 6: Update batchSubmitStreaks test**

Change batch calls from `[ONE_USDT, ONE_USDT, ONE_USDT]` volumes to txCounts `[5, 5, 5]` and uniqueToCounts `[3, 3, 3]`.

Update "skips invalid entries" test: remove volume-too-low case (no longer applies), keep duplicate-day skip test.

- [ ] **Step 7: Run all tests**

```bash
cd /Users/arua/Desktop/celo-grind/contracts && npx hardhat test
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add contracts/test/MiniStreak.test.ts
git rm contracts/test/CeloGrindVault.test.ts 2>/dev/null || true
git commit -m "test: update all tests for MiniStreak refactor"
```

---

### Task 4: Update deploy scripts and constants.ts

**Files:**
- Modify: `contracts/scripts/deploy.ts`
- Modify: `contracts/scripts/deploy-local.ts`
- Modify: `contracts/constants.ts`

- [ ] **Step 1: Update deploy.ts**

- Line 34: `"=== Celo Grind Deployment ==="` → `"=== MiniStreak Deployment ==="`
- Line 82-87: `ethers.getContractFactory("CeloGrindVault")` → `ethers.getContractFactory("MiniStreak")`, update log messages from "CeloGrindVault" to "MiniStreak"
- Line 146: Remove `USDT_ADDRESS=` from Next Steps (frontend no longer needs it for oracle scanning)

- [ ] **Step 2: Update deploy-local.ts**

- Line 48: `ethers.getContractFactory("CeloGrindVault")` → `ethers.getContractFactory("MiniStreak")`
- Line 52: Log message: `"CeloGrindVault"` → `"MiniStreak"`
- Line 108: `"CeloGrindVault"` → `"MiniStreak"` in summary output

- [ ] **Step 3: Update constants.ts**

- Lines 46-60: Rename `vault` to `miniStreak` in `DEPLOYED_ADDRESSES` type and values
- Lines 64-92: Update `VAULT_ABI`:
  - Line 68: `recordStreak` signature → `"function recordStreak(address player, uint256 roundId, uint8 dayIndex, uint32 txCount, uint16 uniqueToCount) external"`
  - Line 75: `getPlayerStats` returns → `"function getPlayerStats(uint256 roundId, address player) external view returns (uint8 streak, uint32 txCount, uint16 uniqueToCount, uint8 lastValidDay, bool claimed, bool entered)"`
  - Line 78: `getLeaderboard` returns → `"function getLeaderboard(uint256 roundId) external view returns (address[] addresses, uint8[] streaks, uint32[] txCounts, uint16[] uniqueToCounts, uint256[] ranks)"`
  - Line 80: `playerRecords` returns → `"function playerRecords(uint256 roundId, address player) external view returns (uint8 streak, uint8 lastValidDay, uint32 txCount, uint16 uniqueToCount, bool claimed, bool entered)"`
  - Line 81: `ENTRY_FEE` stays
  - Line 84: `"function token()..."` → `"function usdt() external view returns (address)"` (renamed state variable)
  - Line 87: `StreakRecorded` event → `"event StreakRecorded(uint256 indexed roundId, address indexed player, uint8 dayIndex, uint32 txCount, uint16 uniqueToCount, uint8 newStreak)"`
- Lines 94-108: Update `ORACLE_ABI`:
  - Line 96: `submitStreak` → `"function submitStreak(address player, uint256 roundId, uint8 dayIndex, uint32 txCount, uint16 uniqueToCount) external"`
  - Line 97: `batchSubmitStreaks` → `"function batchSubmitStreaks(address[] calldata players, uint256[] calldata roundIds, uint8[] calldata dayIndexes, uint32[] calldata txCounts, uint16[] calldata uniqueToCounts) external"`
  - Line 104: Remove `MIN_VOLUME` view function
  - Line 106: `StreakSubmitted` event → `"event StreakSubmitted(address indexed player, uint256 indexed roundId, uint8 dayIndex, uint32 txCount, uint16 uniqueToCount)"`
- Lines 122-128: Update `GAME_CONSTANTS`:
  - `ENTRY_FEE: 500_000n` (was 1_000_000n)
  - Remove `MIN_STREAK_VOLUME`

- [ ] **Step 4: Compile to verify nothing broke**

```bash
cd /Users/arua/Desktop/celo-grind/contracts && npx hardhat compile && npx hardhat test
```

- [ ] **Step 5: Commit**

```bash
git add contracts/scripts/deploy.ts contracts/scripts/deploy-local.ts contracts/constants.ts
git commit -m "refactor: update deploy scripts and constants for MiniStreak"
```

---

### Task 5: Refactor oracle-service

**Files:**
- Modify: `oracle-service/src/config.ts`
- Modify: `oracle-service/src/scanner.ts`
- Modify: `oracle-service/src/submitter.ts`
- Modify: `oracle-service/src/db.ts`
- Modify: `oracle-service/src/index.ts`

- [ ] **Step 1: Update config.ts — remove volume/USDT config**

Remove lines 15-20 (`usdtAddress`, `minVolumeUsdt`, `minVolumeWei`). Keep everything else.

Updated `config.ts`:

```typescript
import * as dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  privateKey: required("ORACLE_PRIVATE_KEY") as `0x${string}`,
  rpcUrl: process.env.CELO_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org",
  vaultAddress: required("VAULT_ADDRESS") as `0x${string}`,
  oracleAddress: required("ORACLE_ADDRESS") as `0x${string}`,
  dbPath: process.env.DB_PATH || "./oracle.db",
  webhookUrl: process.env.WEBHOOK_ALERT_URL || "",
  minCeloBalance: parseFloat(process.env.MIN_CELO_BALANCE || "0.1"),
  blocksLookback: parseInt(process.env.BLOCKS_LOOKBACK || "720"),
  cronSchedule: process.env.CRON_SCHEDULE || "0 * * * *",
  logLevel: process.env.LOG_LEVEL || "info",
};

export type Config = typeof config;
```

- [ ] **Step 2: Update db.ts — replace volume_wei with tx_count and unique_to_count**

Replace `initSchema` (lines 20-45):

```typescript
function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS submitted_streaks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id        TEXT    NOT NULL,
      player          TEXT    NOT NULL,
      day_index       INTEGER NOT NULL,
      tx_count        INTEGER NOT NULL,
      unique_to_count INTEGER NOT NULL,
      tx_hash         TEXT,
      submitted_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      UNIQUE(round_id, player, day_index)
    );

    CREATE TABLE IF NOT EXISTS oracle_runs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at  INTEGER NOT NULL,
      finished_at INTEGER,
      players_scanned INTEGER DEFAULT 0,
      streaks_submitted INTEGER DEFAULT 0,
      errors      TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_submitted_round_player
      ON submitted_streaks(round_id, player);
  `);
}
```

Update `recordSubmission` (lines 61-74):

```typescript
export function recordSubmission(
  roundId: string,
  player: string,
  dayIndex: number,
  txCount: number,
  uniqueToCount: number,
  txHash: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO submitted_streaks
       (round_id, player, day_index, tx_count, unique_to_count, tx_hash)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(roundId, player.toLowerCase(), dayIndex, txCount, uniqueToCount, txHash);
}
```

- [ ] **Step 3: Rewrite scanner.ts — scan all outgoing transactions via Blockscout API**

Replace the entire file. Key changes:
- Remove USDT Transfer event scanning and ERC20 ABI
- Use Blockscout REST API (`/api/v2/addresses/{address}/transactions`) to fetch outgoing txs (1 HTTP call per player, not per block)
- Count total transactions and unique `to` addresses per player per day
- Return `{ player, roundId, dayIndex, txCount, uniqueToCount }`

> **Why Blockscout API instead of block-by-block RPC?** Scanning 720+ blocks with `getBlock({ includeTransactions: true })` per player would make thousands of RPC calls per cycle and get rate-limited. Blockscout indexes transactions by address and returns them in a single paginated query.

```typescript
import {
  createPublicClient,
  http,
  parseAbi,
  type Address,
  type PublicClient,
} from "viem";
import { defineChain } from "viem";

const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
    public: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
});
import { config } from "./config";
import { log } from "./logger";

const BLOCKSCOUT_API = "https://celo-sepolia.blockscout.com/api/v2";

const VAULT_ABI = parseAbi([
  "function getCurrentRoundId() external view returns (uint256)",
  "function getRoundPlayers(uint256 roundId) external view returns (address[])",
  "function rounds(uint256) external view returns (uint256 startTime, uint256 endTime, uint256 pot, uint8 status, uint256 playerCount)",
]);

export interface QualifyingTx {
  player: Address;
  roundId: bigint;
  dayIndex: number;
  txCount: number;
  uniqueToCount: number;
}

export interface RoundInfo {
  roundId: bigint;
  startTime: bigint;
  endTime: bigint;
  players: Address[];
}

let client: PublicClient | null = null;

function getClient(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: celoSepolia,
      transport: http(config.rpcUrl),
    }) as PublicClient;
  }
  return client;
}

function getDayIndex(timestamp: bigint, roundStartTime: bigint): number {
  const secondsIntoRound = Number(timestamp - roundStartTime);
  return Math.floor(secondsIntoRound / 86400);
}

function getTodayUTCWindow(): { start: number; end: number } {
  const now = Date.now();
  const startOfDay = Math.floor(now / 86400000) * 86400;
  return {
    start: startOfDay,
    end: startOfDay + 86399,
  };
}

export async function getCurrentRound(): Promise<RoundInfo> {
  const c = getClient();

  const roundId = await c.readContract({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    functionName: "getCurrentRoundId",
  });

  const [startTime, endTime] = await c.readContract({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    functionName: "rounds",
    args: [roundId],
  }) as [bigint, bigint, bigint, number, bigint];

  const players = await c.readContract({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    functionName: "getRoundPlayers",
    args: [roundId],
  }) as Address[];

  log.info(`Current round: ${roundId}, players: ${players.length}`);
  return { roundId, startTime, endTime, players };
}

/**
 * Fetch outgoing transactions for an address from Blockscout API.
 * Returns all txs where the address is the sender, paginated.
 */
async function fetchOutgoingTxs(
  address: Address,
  todayStart: number,
  todayEnd: number
): Promise<Array<{ to: string | null; timestamp: number }>> {
  const txs: Array<{ to: string | null; timestamp: number }> = [];
  let nextPageParams: string | null = null;

  // Paginate through Blockscout results until we go past today's window
  while (true) {
    const url = nextPageParams
      ? `${BLOCKSCOUT_API}/addresses/${address}/transactions?filter=from${nextPageParams}`
      : `${BLOCKSCOUT_API}/addresses/${address}/transactions?filter=from`;

    const res = await fetch(url);
    if (!res.ok) {
      log.warn(`Blockscout API error for ${address}: ${res.status}`);
      break;
    }

    const data = await res.json();
    const items = data.items || [];

    let foundOlderThanToday = false;
    for (const item of items) {
      const ts = Math.floor(new Date(item.timestamp).getTime() / 1000);

      if (ts < todayStart) {
        foundOlderThanToday = true;
        break;
      }

      if (ts >= todayStart && ts <= todayEnd) {
        txs.push({ to: item.to?.hash || null, timestamp: ts });
      }
    }

    if (foundOlderThanToday || !data.next_page_params) break;

    // Build next page query string from Blockscout pagination params
    const params = data.next_page_params;
    nextPageParams = `&block_number=${params.block_number}&index=${params.index}`;
  }

  return txs;
}

/**
 * Scan a player's outgoing transactions for today.
 * Uses Blockscout API — 1 paginated query per player.
 */
export async function scanPlayerToday(
  player: Address,
  roundInfo: RoundInfo
): Promise<QualifyingTx | null> {
  const { roundId, startTime } = roundInfo;
  const { start: todayStart, end: todayEnd } = getTodayUTCWindow();

  const dayIndex = getDayIndex(BigInt(todayStart), startTime);
  if (dayIndex < 0 || dayIndex > 6) {
    log.debug(`Player ${player}: dayIndex ${dayIndex} out of range, skipping`);
    return null;
  }

  const txs = await fetchOutgoingTxs(player, todayStart, todayEnd);

  if (txs.length === 0) {
    log.debug(`Player ${player}: no outgoing txs found today`);
    return null;
  }

  const uniqueToAddresses = new Set<string>();
  for (const tx of txs) {
    if (tx.to) {
      uniqueToAddresses.add(tx.to.toLowerCase());
    }
  }

  log.info(
    `Player ${player}: ${txs.length} txs, ${uniqueToAddresses.size} unique addrs, day=${dayIndex}`
  );

  return {
    player,
    roundId,
    dayIndex,
    txCount: txs.length,
    uniqueToCount: uniqueToAddresses.size,
  };
}

export async function scanAllPlayers(
  roundInfo: RoundInfo,
  isAlreadySubmitted: (roundId: string, player: string, dayIndex: number) => boolean
): Promise<QualifyingTx[]> {
  const results: QualifyingTx[] = [];

  for (const player of roundInfo.players) {
    try {
      const qualifying = await scanPlayerToday(player, roundInfo);
      if (!qualifying) continue;

      if (isAlreadySubmitted(roundInfo.roundId.toString(), player, qualifying.dayIndex)) {
        log.debug(`Player ${player} day ${qualifying.dayIndex}: already submitted, skipping`);
        continue;
      }

      results.push(qualifying);
    } catch (err) {
      log.warn(`Error scanning player ${player}: ${err}`);
    }
  }

  return results;
}
```

- [ ] **Step 4: Update submitter.ts**

- Line 16: `import { celoAlfajores } from "viem/chains"` → use the local `celoSepolia` chain definition (or import from scanner). For simplicity, define it locally or import from a shared module. Simplest fix: define inline like in scanner.ts.
- Lines 23-27: Update `ORACLE_ABI`:

```typescript
const ORACLE_ABI = parseAbi([
  "function submitStreak(address player, uint256 roundId, uint8 dayIndex, uint32 txCount, uint16 uniqueToCount) external",
  "function batchSubmitStreaks(address[] calldata players, uint256[] calldata roundIds, uint8[] calldata dayIndexes, uint32[] calldata txCounts, uint16[] calldata uniqueToCounts) external",
  "function isSubmitted(address player, uint256 roundId, uint256 dayIndex) external view returns (bool)",
]);
```

- Lines 42-44, 47-49: Replace `celoAlfajores` with `celoSepolia` (define chain locally or share from scanner)
- Lines 73-74: Update alert text: `[CeloGrind Oracle]` → `[MiniStreak Oracle]`
- Lines 101-146: Update `submitStreak()`:
  - Remove `formatEther(qualifying.volumeWei)` log
  - Change args from `[player, roundId, dayIndex, volumeWei]` to `[player, roundId, BigInt(dayIndex), qualifying.txCount, qualifying.uniqueToCount]`
  - Update log message to show txCount/uniqueToCount

- Lines 152-184: Update `batchSubmitStreaks()`:
  - Change `volumes = qualifyingList.map(q => q.volumeWei)` to:
    ```typescript
    const txCounts = qualifyingList.map((q) => q.txCount);
    const uniqueToCounts = qualifyingList.map((q) => q.uniqueToCount);
    ```
  - Change args from `[players, roundIds, dayIndexes, volumes]` to `[players, roundIds, dayIndexes, txCounts, uniqueToCounts]`

- [ ] **Step 5: Update index.ts**

- Line 67: `q.volumeWei.toString()` → `q.txCount, q.uniqueToCount`

Replace the `recordSubmission` call (lines 63-69):

```typescript
recordSubmission(
  q.roundId.toString(),
  q.player,
  q.dayIndex,
  q.txCount,
  q.uniqueToCount,
  txHash
);
```

- Line 101: Update startup log: `CeloGrind Oracle Service` → `MiniStreak Oracle Service`

- [ ] **Step 6: Update .env.example (if exists) and add migration note**

- Remove `USDT_ADDRESS` and `MIN_VOLUME_USDT` from any `.env.example` file in `oracle-service/`
- **Note for developers:** Delete existing `oracle.db` file before running the updated oracle — the schema has changed (`volume_wei` → `tx_count` + `unique_to_count`). `CREATE TABLE IF NOT EXISTS` won't alter existing tables.

- [ ] **Step 7: Remove unused `formatEther` import from submitter.ts**

Line 12 of `submitter.ts` imports `formatEther` which was used for volume logging. Remove it from the import statement.

- [ ] **Step 8: Commit**

```bash
git add oracle-service/src/
git commit -m "refactor: oracle scans all outgoing txs, submits txCount/uniqueToCount"
```

---

### Task 6: Update subgraph

**Files:**
- Modify: `subgraph/schema.graphql`
- Modify: `subgraph/src/mapping.ts`
- Modify: `subgraph/subgraph.yaml`

- [ ] **Step 1: Update schema.graphql**

In `PlayerRound` entity: replace `volume: BigDecimal!` and `volumeRaw: BigInt!` with:
```graphql
txCount: Int!
uniqueToCount: Int!
```

In `DailyStreak` entity: replace `volume: BigDecimal!` and `volumeRaw: BigInt!` with:
```graphql
txCount: Int!
uniqueToCount: Int!
```

- [ ] **Step 2: Generate and rename ABI file**

After contracts compile, copy the new ABI:

```bash
cp /Users/arua/Desktop/celo-grind/contracts/artifacts/contracts/src/MiniStreak.sol/MiniStreak.json /Users/arua/Desktop/celo-grind/subgraph/abis/MiniStreak.json
rm -f /Users/arua/Desktop/celo-grind/subgraph/abis/CeloGrindVault.json
```

- [ ] **Step 3: Update subgraph.yaml**

- Line 4 (or data source name): `CeloGrindVault` → `MiniStreak`
- ABI file path: `./abis/CeloGrindVault.json` → `./abis/MiniStreak.json`
- Update `StreakRecorded` event signature:
  `StreakRecorded(indexed uint256,indexed address,uint8,uint32,uint16,uint8)`
- Update network to `celo-sepolia` if currently `celo-alfajores`

- [ ] **Step 4: Update mapping.ts**

- Remove `CUSD_DECIMALS` constant and `formatCusd()` helper
- In `handlePlayerEntered`: set `playerRound.txCount = 1` (entry counts as first tx), `playerRound.uniqueToCount = 0`
- In `handleStreakRecorded`:
  - Read `event.params.txCount` and `event.params.uniqueToCount` instead of `event.params.volume`
  - `playerRound.txCount = playerRound.txCount + event.params.txCount.toI32()`
  - `playerRound.uniqueToCount = playerRound.uniqueToCount + event.params.uniqueToCount.toI32()`
  - Create `DailyStreak` with `txCount` and `uniqueToCount` instead of volume
  - `dailyStreak.newStreak = event.params.newStreak.toI32()`

- In `handleRoundResolved`: pot formatting still uses USDT decimals for the pot value — keep but fix decimals from `1e18` to `1e6`

- [ ] **Step 5: Commit**

```bash
git add subgraph/
git commit -m "refactor: update subgraph schema and mappings for txCount/uniqueToCount"
```

---

### Task 7: Update frontend — contracts.ts, hooks, graphql

**Files:**
- Modify: `frontend/lib/contracts.ts`
- Modify: `frontend/lib/graphql.ts`
- Modify: `frontend/hooks/useLeaderboard.ts`
- Modify: `frontend/hooks/usePlayerStats.ts`
- Modify: `frontend/hooks/useTodayStreak.ts`

- [ ] **Step 1: Update frontend/lib/contracts.ts**

- Update `ENTRY_FEE` from `BigInt("1000000")` to `BigInt("500000")`
- Remove `MIN_STREAK_VOLUME`
- Update `VAULT_ABI` to match new contract signatures
  - **Important:** This file uses JSON object-style ABI (`{ name, type, inputs, outputs }` objects), NOT the human-readable string ABI used in `contracts/constants.ts`. Update accordingly — match the function signatures but keep the object format.
  - Update `recordStreak`, `getPlayerStats`, `getLeaderboard`, `playerRecords` entries with new param types (uint8/uint32/uint16)
  - Update `StreakRecorded` event with new params
  - Rename `token()` getter to `usdt()`
- Rename any `CeloGrindVault` references to `MiniStreak`

- [ ] **Step 2: Update frontend/lib/graphql.ts**

In all queries, replace `volume`/`volumeRaw` fields with `txCount` and `uniqueToCount`.

`LEADERBOARD_QUERY`: change `playerRounds` fields from `streak volume` to `streak txCount uniqueToCount`.
`PLAYER_STATS_QUERY`: same field changes.
`PLAYER_DAILY_STREAKS_QUERY`: change DailyStreak fields from `volume` to `txCount uniqueToCount`.
`CURRENT_ROUND_QUERY`: change top-5 fields.

- [ ] **Step 3: Update useLeaderboard.ts**

- Update `LeaderboardEntry` type: replace `volume: string` and `volumeRaw: string` with `txCount: number` and `uniqueToCount: number`
- Update transform logic: no more volume formatting, just use integer values from subgraph

- [ ] **Step 4: Update usePlayerStats.ts**

- Update return type: `volume` → `txCount`, add `uniqueToCount`
- Update contract read to match new `getPlayerStats` return signature (6 values instead of 5)

- [ ] **Step 5: Update useTodayStreak.ts**

- Update DailyStreak fields: read `txCount` instead of `volume`

- [ ] **Step 6: Fix useCurrentRound.ts — formatEther bug**

This file uses `formatEther(pot)` to format the USDT pot, but USDT has 6 decimals (not 18). This is a pre-existing bug. Fix by using `formatUnits(pot, 6)` from viem/ethers instead of `formatEther`.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/ frontend/hooks/
git commit -m "refactor: update frontend data layer for txCount/uniqueToCount"
```

---

### Task 8: Update frontend — components and pages

**Files:**
- Modify: `frontend/components/BottomNav.tsx`
- Modify: `frontend/components/Leaderboard.tsx`
- Modify: `frontend/components/EntryButton.tsx`
- Modify: `frontend/components/StreakCalendar.tsx`
- Modify: `frontend/components/TxShortcut.tsx`
- Modify: `frontend/components/StreakCard.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/leaderboard/page.tsx`
- Delete: `frontend/app/rules/page.tsx`
- Delete: `frontend/app/me/page.tsx`
- Delete: `frontend/app/rounds/page.tsx` (if exists)

- [ ] **Step 1: Update BottomNav.tsx — reduce to 2 tabs**

Replace the 5-tab navigation with 2 tabs:

```tsx
const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/leaderboard", label: "Board", icon: "🏆" },
];
```

- [ ] **Step 2: Update Leaderboard.tsx — show txCount and uniqueToCount**

- Replace Volume column header with "Tx Count" and add "Unique Addrs" column
- Display `entry.txCount` and `entry.uniqueToCount` instead of `entry.volume`
- Update tie detection: check streak + txCount + uniqueToCount
- Update tiebreaker note: "Ranked by streak, then tx count, then unique addresses"

- [ ] **Step 3: Update EntryButton.tsx — 0.5 USDT label**

- Change any "1 USDT" or "1 cUSD" text to "0.5 USDT"
- Entry fee is read from `ENTRY_FEE` import (already updated)

- [ ] **Step 4: Update StreakCalendar.tsx — show txCount instead of volume**

- Replace volume display per day with tx count
- Change `${streak.volume}` to `${streak.txCount} txs`

- [ ] **Step 5: Update TxShortcut.tsx — simplify**

- Remove the 0.50 USDT send logic and `MIN_STREAK_VOLUME` reference
- Simplify: any outgoing tx qualifies. Change the shortcut to send a minimal CELO transaction (e.g., 0 value self-tx or small tx) since any outgoing tx counts.
- Update text/labels to reflect "any transaction counts"

- [ ] **Step 6: Update StreakCard.tsx — update language**

- Change "qualifying tx" to "transaction" or "tx today"
- Keep streak display logic as-is

- [ ] **Step 7: Update page.tsx (Home) — rules and mini leaderboard**

- Update "How it works" section: reflect new rules (any tx, 0.5 USDT entry, tx count ranking)
- Update mini leaderboard to show txCount instead of volume
- Entry button already updated via EntryButton.tsx

- [ ] **Step 8: Update leaderboard/page.tsx**

- Update tiebreaker note text
- Update stat labels if they reference volume

- [ ] **Step 9: Delete removed pages**

```bash
rm -f /Users/arua/Desktop/celo-grind/frontend/app/rules/page.tsx
rm -f /Users/arua/Desktop/celo-grind/frontend/app/me/page.tsx
rm -rf /Users/arua/Desktop/celo-grind/frontend/app/rounds/ 2>/dev/null
```

- [ ] **Step 10: Verify frontend builds**

```bash
cd /Users/arua/Desktop/celo-grind/frontend && npm run build
```

- [ ] **Step 11: Commit**

```bash
git add frontend/
git commit -m "refactor: update frontend components for MiniStreak, reduce to 2 tabs"
```

---

### Task 9: Final verification

**Files:** All

- [ ] **Step 1: Run contract tests**

```bash
cd /Users/arua/Desktop/celo-grind/contracts && npx hardhat test
```

Expected: All tests pass.

- [ ] **Step 2: Verify frontend builds**

```bash
cd /Users/arua/Desktop/celo-grind/frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Final commit (if any remaining changes)**

```bash
cd /Users/arua/Desktop/celo-grind
git status
```

If any unstaged changes remain, stage and commit.
