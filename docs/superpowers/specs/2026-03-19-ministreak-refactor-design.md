# MiniStreak Refactor Design

Refactor CeloGrind from USDT-streak-volume tracking to any-transaction tracking with tx count ranking and unique address tiebreaker. Rename core contract from CeloGrindVault to MiniStreak.

## Game Rules (Updated)

- **Entry fee:** 0.5 USDT (down from 1 USDT)
- **Round:** Monday 00:00 UTC to Sunday 23:59 UTC
- **Streak:** Player must make at least 1 outgoing transaction per day. Any tx where player wallet is `from` counts (sends, contract calls, approvals, etc.). Miss a day = streak broken = out of the game.
- **Entering counts as tx #1:** When a player calls `enterRound()`, their `txCount` is set to 1 in the contract's PlayerRecord and in the subgraph.
- **Ranking order:** streak DESC, then txCount DESC, then uniqueToCount DESC
- **Payout:** 50/30/20 split, 5% protocol fee, minimum 3 players or refund
- **No minimum tx value:** Any outgoing transaction counts regardless of value

## Section 1: Smart Contracts

### MiniStreak.sol (renamed from CeloGrindVault.sol)

- Contract name: `MiniStreak`
- Rename `cUSD` state variable to `usdt` for clarity
- `ENTRY_FEE` constant: 500_000 (0.5 USDT, 6 decimals)
- Remove `MIN_VOLUME` constant and `VolumeTooLow` error
- `PlayerRecord` struct:
  - `streak` (uint8) — consecutive days with >= 1 tx (unchanged behavior)
  - `lastValidDay` (uint8) — last day index for streak continuity (unchanged)
  - `txCount` (uint32) — cumulative transaction count this round (replaces `volume`)
  - `uniqueToCount` (uint16) — unique addresses interacted with (new)
  - `entered` (bool) — unchanged
- `enterRound()`: set `PlayerRecord.txCount = 1` on entry (entry tx counts as first)
- `_isBetter(uint8 streakA, uint32 txCountA, uint16 uniqueToA, uint8 streakB, uint32 txCountB, uint16 uniqueToB)`: three-way comparison — streak DESC -> txCount DESC -> uniqueToCount DESC
- `_rankTop3()`: pass txCount and uniqueToCount (instead of volume) to `_isBetter()`
- `recordStreak()` signature: `(address player, uint256 roundId, uint8 dayIndex, uint32 txCount, uint16 uniqueToCount)` — uses narrow types matching struct storage
- Remove volume validation check (`if (volume < 500_000) revert VolumeTooLow()`) from `recordStreak()`
- `getLeaderboard()`: return `txCounts` and `uniqueToCounts` arrays instead of `volumes`
- `getPlayerStats()`: return `txCount` and `uniqueToCount` instead of `volume`

#### Updated Event Signature

```solidity
event StreakRecorded(uint256 indexed roundId, address indexed player, uint8 dayIndex, uint32 txCount, uint16 uniqueToCount, uint8 newStreak);
```

### StreakOracle.sol

- `submitStreak()` and `batchSubmitStreaks()` pass `txCount` (uint32) and `uniqueToCount` (uint16) instead of `volume`
- Remove minimum volume validation (500_000 threshold)
- Rate limiting stays: one submission per (player, round, dayIndex)

### contracts/constants.ts

- Update `VAULT_ABI`: new `recordStreak` signature, `getLeaderboard` returns txCounts/uniqueToCounts, `getPlayerStats` returns txCount/uniqueToCount
- Update `ORACLE_ABI`: new `submitStreak`/`batchSubmitStreaks` signatures with txCount/uniqueToCount
- `GAME_CONSTANTS.ENTRY_FEE`: change from `1_000_000n` to `500_000n`
- Remove `GAME_CONSTANTS.MIN_STREAK_VOLUME`
- Update `StreakSubmitted` event: replace `volume` with `txCount`/`uniqueToCount`
- Remove `MIN_VOLUME` view function reference
- Rename `vault` keys in `DEPLOYED_ADDRESSES` to `miniStreak`

### Deploy Scripts

- `contracts/scripts/deploy.ts`: change `ethers.getContractFactory("CeloGrindVault")` to `ethers.getContractFactory("MiniStreak")`
- `contracts/scripts/deploy-local.ts`: same rename
- Update deployment output/logging to reference MiniStreak

## Section 2: Oracle Service

### scanner.ts
- Stop scanning USDT Transfer events
- Scan all blocks in lookback window for transactions where `tx.from === player`
- Per player per day: count total transactions, collect unique `tx.to` addresses
- Return `{ player, roundId, dayIndex, txCount, uniqueToCount }` (replaces volumeWei/txHash)

### submitter.ts
- `submitStreak()` sends `(player, roundId, dayIndex, txCount, uniqueToCount)`
- `batchSubmitStreaks()` sends arrays of txCount and uniqueToCount
- Fix chain import: change `celoAlfajores` to `celoSepolia` (existing bug)

### config.ts
- Remove `MIN_VOLUME_USDT` and `USDT_ADDRESS` (no longer needed)
- `BLOCKS_LOOKBACK` stays

### db.ts
- `submitted_streaks` table: replace `volume_wei` with `tx_count` and `unique_to_count`

### index.ts
- Update references from `volumeWei` to `txCount`/`uniqueToCount` in orchestration logic

## Section 3: Subgraph

### schema.graphql
- `PlayerRound`: replace `volume`/`volumeRaw` with `txCount` (Int), add `uniqueToCount` (Int)
- `DailyStreak`: replace `volume`/`volumeRaw` with `txCount` (Int), add `uniqueToCount` (Int)
- `Player.bestStreak` stays
- `Round.pot`/`potRaw` stays

### mapping.ts
- `handlePlayerEntered`: set `txCount = 1` on PlayerRound (entry tx counts)
- `handleStreakRecorded`: update `txCount` and `uniqueToCount` from event args (using new event signature)
- Fix `CUSD_DECIMALS`: change from `1e18` to `1e6` (USDT has 6 decimals, existing bug)
- Remove `formatCusd()` usage for volume fields (no longer needed for tx counts)

### subgraph.yaml
- Rename data source from `CeloGrindVault` to `MiniStreak`
- Update ABI file path from `./abis/CeloGrindVault.json` to `./abis/MiniStreak.json`
- Update `StreakRecorded` event signature to match new contract event

## Section 4: Frontend

### Navigation (BottomNav.tsx)
- Reduce from 5 tabs to 2: Home (`/`) and Board (`/leaderboard`)

### Leaderboard.tsx
- Columns: Rank, Wallet, Streak, Tx Count, Unique Addrs
- Tiebreaker note: "Ranked by streak, then tx count, then unique addresses"
- Players appear immediately on entry with tx count = 1

### leaderboard/page.tsx
- Keep round selector and stats cards (pot, players, status)
- Display new metrics

### page.tsx (Home)
- Update "How it works" to reflect new rules (any tx counts, 0.5 USDT entry)
- Update mini leaderboard to show tx count instead of volume
- Entry button shows 0.5 USDT

### lib/contracts.ts
- Update `ENTRY_FEE` from `BigInt("1000000")` to `BigInt("500000")`
- Remove `MIN_STREAK_VOLUME`
- Update `VAULT_ABI`: `getPlayerStats` returns txCount/uniqueToCount, `getLeaderboard` returns txCounts/uniqueToCounts
- Rename ABI references from CeloGrindVault to MiniStreak

### components/EntryButton.tsx
- Update label from "1 USDT" to "0.5 USDT"

### components/StreakCalendar.tsx
- Remove volume display per day, show tx count instead

### components/TxShortcut.tsx
- Update: no longer needs to send 0.50 USDT specifically. Any tx qualifies. Simplify or remove MIN_STREAK_VOLUME reference.

### components/StreakCard.tsx
- Update language from "qualifying tx" to reflect new rules (any outgoing tx)

### hooks/useLeaderboard.ts
- Fetch `txCount`, `uniqueToCount` instead of `volume`
- Update `LeaderboardEntry` type

### hooks/usePlayerStats.ts
- Read `txCount`/`uniqueToCount` instead of `volume` from contract

### hooks/useTodayStreak.ts
- Read `txCount` instead of `volume` from subgraph DailyStreak

### hooks/useEnterRound.ts
- No code changes needed (imports ENTRY_FEE from contracts.ts which will be updated)

### graphql.ts
- Replace volume fields with txCount/uniqueToCount in all queries

### Delete
- `/app/rules/page.tsx`
- `/app/me/page.tsx`
- `/app/rounds/page.tsx`

## Section 5: Tests

- Update all tests for new `recordStreak` signature (txCount, uniqueToCount)
- Update entry fee from 1e6 to 500_000
- Update ranking assertions: streak -> txCount -> uniqueToCount
- Replace volume-based tests with tx count and unique address tiebreaker tests
- Rename references from CeloGrindVault to MiniStreak
- Test `enterRound()` sets txCount = 1

## Files to Modify (Complete Checklist)

### Contracts
- [ ] `contracts/src/CeloGrindVault.sol` → rename to `contracts/src/MiniStreak.sol`
- [ ] `contracts/src/StreakOracle.sol`
- [ ] `contracts/constants.ts`
- [ ] `contracts/scripts/deploy.ts`
- [ ] `contracts/scripts/deploy-local.ts`
- [ ] `contracts/test/` (all test files)

### Oracle Service
- [ ] `oracle-service/src/scanner.ts`
- [ ] `oracle-service/src/submitter.ts`
- [ ] `oracle-service/src/config.ts`
- [ ] `oracle-service/src/db.ts`
- [ ] `oracle-service/src/index.ts`

### Subgraph
- [ ] `subgraph/schema.graphql`
- [ ] `subgraph/src/mapping.ts`
- [ ] `subgraph/subgraph.yaml`

### Frontend
- [ ] `frontend/components/BottomNav.tsx`
- [ ] `frontend/components/Leaderboard.tsx`
- [ ] `frontend/components/EntryButton.tsx`
- [ ] `frontend/components/StreakCalendar.tsx`
- [ ] `frontend/components/TxShortcut.tsx`
- [ ] `frontend/components/StreakCard.tsx`
- [ ] `frontend/app/leaderboard/page.tsx`
- [ ] `frontend/app/page.tsx`
- [ ] `frontend/hooks/useLeaderboard.ts`
- [ ] `frontend/hooks/usePlayerStats.ts`
- [ ] `frontend/hooks/useTodayStreak.ts`
- [ ] `frontend/lib/contracts.ts`
- [ ] `frontend/lib/graphql.ts`

### Delete
- [ ] `frontend/app/rules/page.tsx`
- [ ] `frontend/app/me/page.tsx`
- [ ] `frontend/app/rounds/page.tsx`
