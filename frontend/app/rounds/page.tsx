"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPastRounds, fetchLeaderboard } from "@/lib/graphql";
import Leaderboard from "@/components/Leaderboard";

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Resolved"
      ? "text-celo-green bg-celo-green/10 border-celo-green/30"
      : status === "Refunded"
      ? "text-yellow-400 bg-yellow-900/20 border-yellow-800"
      : "text-gray-400 bg-gray-800 border-gray-700";
  return (
    <span className={`badge border ${color}`}>{status}</span>
  );
}

function RoundCard({ round }: { round: Awaited<ReturnType<typeof fetchPastRounds>>["rounds"][0] }) {
  const [expanded, setExpanded] = useState(false);
  const { data: lb, isLoading } = useQuery({
    queryKey: ["lb", round.roundId],
    queryFn: () => fetchLeaderboard(round.roundId),
    enabled: expanded,
    staleTime: Infinity, // past rounds don't change
  });

  const startDate = new Date(parseInt(round.startTime) * 1000).toLocaleDateString();
  const endDate = new Date(parseInt(round.endTime) * 1000).toLocaleDateString();

  return (
    <div className="card space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Round #{round.roundId}</p>
            <p className="text-xs text-gray-500">
              {startDate} — {endDate}
            </p>
          </div>
          <div className="text-right space-y-1">
            <StatusBadge status={round.status} />
            <p className="text-xs text-celo-gold">{round.pot} USDT pot</p>
          </div>
        </div>

        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-gray-400">
            {round.playerCount} players
          </span>
          {round.winner && (
            <span className="text-gray-400">
              Winner:{" "}
              <span className="text-celo-green font-mono text-xs">
                {round.winner.id.slice(0, 10)}...
              </span>
            </span>
          )}
        </div>

        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-500">
            {expanded ? "▲ Hide" : "▼ Show full leaderboard"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 pt-3">
          <Leaderboard
            entries={lb?.round?.playerRounds.map((pr, i) => ({
              rank: pr.rank ? parseInt(pr.rank) : i + 1,
              address: pr.player.address || pr.player.id,
              streak: parseInt(pr.streak),
              volume: parseFloat(pr.volume).toFixed(2),
              volumeRaw: pr.volume,
              estimatedPrize: pr.payout
                ? parseFloat(pr.payout).toFixed(2)
                : "0.00",
            })) ?? []}
            isLoading={isLoading}
            showPrizes
          />
        </div>
      )}
    </div>
  );
}

export default function RoundsPage() {
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pastRounds", page],
    queryFn: () => fetchPastRounds(PER_PAGE, page * PER_PAGE),
    staleTime: 60_000,
  });

  return (
    <main className="pt-6 space-y-4">
      <h1 className="text-2xl font-black">Past Rounds</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !data?.rounds.length ? (
        <div className="card text-center text-gray-500 py-8">
          No completed rounds yet.
        </div>
      ) : (
        <div className="space-y-3">
          {data.rounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex gap-2">
        <button
          className="btn-secondary"
          disabled={page === 0 || isFetching}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </button>
        <button
          className="btn-secondary"
          disabled={(data?.rounds.length ?? 0) < PER_PAGE || isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
