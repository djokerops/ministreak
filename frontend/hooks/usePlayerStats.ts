"use client";

import { useReadContract } from "wagmi";
import { VAULT_ABI, VAULT_ADDRESS } from "@/lib/contracts";
import { formatEther, type Address } from "viem";

export interface PlayerStats {
  streak: bigint;
  volume: bigint;
  volumeFormatted: string;
  lastValidDay: bigint;
  claimed: boolean;
  entered: boolean;
}

export function usePlayerStats(roundId: bigint | undefined, player: Address | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getPlayerStats",
    args: roundId && player ? [roundId, player] : undefined,
    query: { enabled: !!roundId && !!player },
  });

  let stats: PlayerStats | undefined;
  if (data) {
    const [streak, volume, lastValidDay, claimed, entered] = data as [
      bigint, bigint, bigint, boolean, boolean
    ];
    stats = {
      streak,
      volume,
      volumeFormatted: parseFloat(formatEther(volume)).toFixed(2),
      lastValidDay,
      claimed,
      entered,
    };
  }

  return { stats, isLoading, refetch };
}
