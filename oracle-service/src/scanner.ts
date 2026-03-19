/**
 * scanner.ts
 * Scans the Celo blockchain for each registered player's transactions
 * and identifies qualifying streak transactions for the current round.
 *
 * A qualifying streak tx is:
 *   - Not a self-send (from !== to)
 *   - USDT transfer value >= 0.50 USDT sent OR received
 *   - Occurred on today's UTC calendar day
 */

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

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const VAULT_ABI = parseAbi([
  "function getCurrentRoundId() external view returns (uint256)",
  "function getRoundPlayers(uint256 roundId) external view returns (address[])",
  "function rounds(uint256) external view returns (uint256 startTime, uint256 endTime, uint256 pot, uint8 status, uint256 playerCount)",
  "function getPlayerStats(uint256 roundId, address player) external view returns (uint256 streak, uint256 volume, uint256 lastValidDay, bool claimed, bool entered)",
]);

const ERC20_TRANSFER_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QualifyingTx {
  player: Address;
  roundId: bigint;
  dayIndex: number;
  volumeWei: bigint;
  txHash: `0x${string}`;
}

export interface RoundInfo {
  roundId: bigint;
  startTime: bigint;
  endTime: bigint;
  players: Address[];
}

// ─── Client ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the UTC day index (0-6) from a given Unix timestamp,
 * relative to a round's start time (which is always a Monday).
 */
function getDayIndex(timestamp: bigint, roundStartTime: bigint): number {
  const secondsIntoRound = Number(timestamp - roundStartTime);
  return Math.floor(secondsIntoRound / 86400); // 86400 = seconds per day
}

/**
 * Returns the start and end Unix timestamps for today (UTC).
 */
function getTodayUTCWindow(): { start: bigint; end: bigint } {
  const now = Date.now();
  const startOfDay = Math.floor(now / 86400000) * 86400;
  return {
    start: BigInt(startOfDay),
    end: BigInt(startOfDay + 86399),
  };
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

/**
 * Fetch current round info from the vault contract.
 */
export async function getCurrentRound(): Promise<RoundInfo> {
  const client = getClient();

  const roundId = await client.readContract({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    functionName: "getCurrentRoundId",
  });

  const [startTime, endTime] = await client.readContract({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    functionName: "rounds",
    args: [roundId],
  }) as [bigint, bigint, bigint, number, bigint];

  const players = await client.readContract({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    functionName: "getRoundPlayers",
    args: [roundId],
  }) as Address[];

  log.info(`Current round: ${roundId}, players: ${players.length}`);

  return { roundId, startTime, endTime, players };
}

/**
 * Scan a single player's USDT transfers for today and find qualifying txns.
 * Returns the qualifying tx with the highest volume if found.
 */
export async function scanPlayerToday(
  player: Address,
  roundInfo: RoundInfo
): Promise<QualifyingTx | null> {
  const client = getClient();
  const { roundId, startTime } = roundInfo;
  const { start: todayStart, end: todayEnd } = getTodayUTCWindow();

  // dayIndex relative to round start
  const dayIndex = getDayIndex(todayStart, startTime);
  if (dayIndex < 0 || dayIndex > 6) {
    log.debug(`Player ${player}: dayIndex ${dayIndex} out of range, skipping`);
    return null;
  }

  const latestBlock = await client.getBlockNumber();
  const fromBlock = latestBlock > BigInt(config.blocksLookback)
    ? latestBlock - BigInt(config.blocksLookback)
    : 0n;

  // Get all USDT Transfer events where player is sender or receiver
  const [sentLogs, receivedLogs] = await Promise.all([
    client.getLogs({
      address: config.usdtAddress as Address,
      event: ERC20_TRANSFER_ABI[0],
      args: { from: player },
      fromBlock,
      toBlock: "latest",
    }),
    client.getLogs({
      address: config.usdtAddress as Address,
      event: ERC20_TRANSFER_ABI[0],
      args: { to: player },
      fromBlock,
      toBlock: "latest",
    }),
  ]);

  const allLogs = [...sentLogs, ...receivedLogs];
  log.debug(`Player ${player}: found ${allLogs.length} USDT transfer logs`);

  let bestVolume = 0n;
  let bestTxHash: `0x${string}` | null = null;

  for (const log_ of allLogs) {
    const { from, to, value } = log_.args as {
      from: Address;
      to: Address;
      value: bigint;
    };

    // Rule: no self-sends
    if (from.toLowerCase() === to.toLowerCase()) continue;

    // Rule: minimum 0.50 USDT
    if (value < config.minVolumeWei) continue;

    // Get block timestamp to check it's today UTC
    const block = await client.getBlock({ blockNumber: log_.blockNumber! });
    const blockTs = block.timestamp;

    if (blockTs < todayStart || blockTs > todayEnd) continue;

    // Track the highest-volume qualifying tx
    if (value > bestVolume) {
      bestVolume = value;
      bestTxHash = log_.transactionHash!;
    }
  }

  if (!bestTxHash) {
    log.debug(`Player ${player}: no qualifying tx found today`);
    return null;
  }

  log.info(
    `Player ${player}: qualifying tx found. vol=${bestVolume}, day=${dayIndex}, tx=${bestTxHash}`
  );

  return {
    player,
    roundId,
    dayIndex,
    volumeWei: bestVolume,
    txHash: bestTxHash,
  };
}

/**
 * Scan all players in the current round for today's qualifying tx.
 * Returns all qualifying txns that haven't been submitted yet.
 */
export async function scanAllPlayers(
  roundInfo: RoundInfo,
  isAlreadySubmitted: (
    roundId: string,
    player: string,
    dayIndex: number
  ) => boolean
): Promise<QualifyingTx[]> {
  const results: QualifyingTx[] = [];

  for (const player of roundInfo.players) {
    try {
      const qualifying = await scanPlayerToday(player, roundInfo);
      if (!qualifying) continue;

      const { dayIndex } = qualifying;
      if (isAlreadySubmitted(roundInfo.roundId.toString(), player, dayIndex)) {
        log.debug(`Player ${player} day ${dayIndex}: already submitted, skipping`);
        continue;
      }

      results.push(qualifying);
    } catch (err) {
      log.warn(`Error scanning player ${player}: ${err}`);
    }
  }

  return results;
}
