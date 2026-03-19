"use client";

import { useAccount } from "wagmi";
import { useCurrentRound } from "@/hooks/useCurrentRound";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { useTodayStreak } from "@/hooks/useTodayStreak";
import { useQuery } from "@tanstack/react-query";
import { fetchPlayerStats } from "@/lib/graphql";
import StreakCard from "@/components/StreakCard";
import StreakCalendar from "@/components/StreakCalendar";
import TxShortcut from "@/components/TxShortcut";
import WalletBadge from "@/components/WalletBadge";

export default function MyStatsPage() {
  const { address, isConnected } = useAccount();
  const { data: round } = useCurrentRound();

  const { stats, isLoading: statsLoading } = usePlayerStats(
    round?.roundId,
    address
  );

  const { data: todayData, refetch: refetchToday } = useTodayStreak(
    round?.roundId?.toString(),
    address
  );

  const { data: playerData } = useQuery({
    queryKey: ["playerStats", address],
    queryFn: () => fetchPlayerStats(address!),
    enabled: !!address,
    staleTime: 30_000,
  });

  if (!isConnected) {
    return (
      <main className="pt-6 space-y-4">
        <h1 className="text-2xl font-black">My Stats</h1>
        <div className="card text-center space-y-3">
          <p className="text-gray-400">Connect your wallet to see your stats</p>
          <WalletBadge />
        </div>
      </main>
    );
  }

  const player = playerData?.player;

  return (
    <main className="pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">My Stats</h1>
        <WalletBadge />
      </div>

      {/* All-time stats */}
      {player && (
        <div className="grid grid-cols-3 gap-2">
          <div className="card text-center">
            <p className="text-xs text-gray-500">Best Streak</p>
            <p className="text-2xl font-black text-white">{player.bestStreak}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500">Rounds</p>
            <p className="text-2xl font-black text-white">{player.totalRoundsEntered}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500">Winnings</p>
            <p className="text-xl font-black text-celo-gold">
              ${parseFloat(player.totalWinnings).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Current streak */}
      {stats?.entered ? (
        <>
          <StreakCard
            streak={Number(stats.streak)}
            todayDone={todayData?.todayDone ?? false}
            isLoading={statsLoading}
          />

          {/* 7-day calendar */}
          <StreakCalendar
            dailyStreaks={todayData?.dailyStreaks ?? []}
            isLoading={!todayData}
          />

          {/* Quick tx button */}
          {!todayData?.todayDone && (
            <TxShortcut onSuccess={refetchToday} />
          )}
        </>
      ) : (
        <div className="card text-center text-gray-500">
          {round?.isOpen
            ? "You haven't entered this round yet."
            : "No active round participation."}
        </div>
      )}

      {/* Past rounds */}
      {player && player.playerRounds.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
            Round History
          </h2>
          {player.playerRounds.map((pr) => (
            <div key={pr.round.id} className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Round #{pr.round.roundId}</p>
                <p className="text-xs text-gray-500 capitalize">{pr.round.status}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white">{pr.streak} day streak</p>
                {pr.rank && (
                  <p className="text-xs text-celo-gold">
                    Rank #{pr.rank}
                    {pr.payout ? ` — $${parseFloat(pr.payout).toFixed(2)}` : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
