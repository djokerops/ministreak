"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "@/lib/graphql";
import { formatEther } from "viem";

export interface LeaderboardEntry {
  rank: number;
  address: string;
  streak: number;
  volume: string;
  volumeRaw: string;
  estimatedPrize: string;
}

export function useLeaderboard(roundId: string | undefined) {
  return useQuery({
    queryKey: ["leaderboard", roundId],
    queryFn: async () => {
      if (!roundId) return null;
      const { round } = await fetchLeaderboard(roundId);
      if (!round) return null;

      const pot = parseFloat(round.pot);
      const distributable = pot * 0.95; // after 5% protocol fee

      const entries: LeaderboardEntry[] = round.playerRounds.map((pr, i) => {
        const rank = pr.rank ? parseInt(pr.rank) : i + 1;
        let prize = "0.00";
        if (rank === 1) prize = (distributable * 0.5).toFixed(2);
        else if (rank === 2) prize = (distributable * 0.3).toFixed(2);
        else if (rank === 3) prize = (distributable * 0.2).toFixed(2);

        return {
          rank,
          address: pr.player.address || pr.player.id,
          streak: parseInt(pr.streak),
          volume: parseFloat(pr.volume).toFixed(2),
          volumeRaw: pr.volume,
          estimatedPrize: prize,
        };
      });

      return {
        round,
        entries,
      };
    },
    enabled: !!roundId,
    refetchInterval: 30_000,
  });
}
