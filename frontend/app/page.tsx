"use client";

import { useAccount } from "wagmi";
import { useCurrentRound } from "@/hooks/useCurrentRound";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { useTodayStreak } from "@/hooks/useTodayStreak";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import StreakCard from "@/components/StreakCard";
import RoundTimer from "@/components/RoundTimer";
import EntryButton from "@/components/EntryButton";
import Leaderboard from "@/components/Leaderboard";
import WalletBadge from "@/components/WalletBadge";
import { useState } from "react";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const [howToOpen, setHowToOpen] = useState(false);

  const { data: round, isLoading: roundLoading, isError: roundError, refetch: refetchRound } =
    useCurrentRound();

  const { stats, isLoading: statsLoading } = usePlayerStats(
    round?.roundId,
    address
  );

  const { data: todayData } = useTodayStreak(
    round?.roundId?.toString(),
    address
  );

  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(
    round?.roundId?.toString()
  );

  return (
    <main className="pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-pixel text-lg text-celo-green glow-green">
            MINISTREAK
          </h1>
          <p className="font-pixel text-arcade-muted" style={{ fontSize: "6px" }}>
            WEEKLY STREAK GAME
          </p>
        </div>
        <WalletBadge />
      </div>

      {/* Round Status Banner */}
      {round && (
        <div
          className="rounded-sm p-4 border-2 border-celo-green pixel-shadow"
          style={{ background: "linear-gradient(135deg, #1a2332, #0d1117)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-pixel text-celo-green" style={{ fontSize: "8px" }}>
                ROUND #{round.roundId.toString()}
              </p>
              <p className="font-pixel text-2xl text-celo-gold glow-gold mt-1">
                {round.potFormatted} USDT
              </p>
              <p className="font-pixel text-arcade-muted mt-1" style={{ fontSize: "7px" }}>
                {round.playerCount.toString()} PLAYERS IN POT
              </p>
            </div>
            <div className="text-right">
              <span
                className={`font-pixel rounded-sm py-1 px-3 border ${
                  round.isOpen
                    ? "bg-celo-green/20 text-celo-green border-celo-green/30"
                    : "bg-arcade-card text-arcade-muted border-arcade-dim"
                }`}
                style={{ fontSize: "7px" }}
              >
                {round.isOpen ? "OPEN" : "CLOSED"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Round Timer */}
      <RoundTimer endTime={round?.endTime} />

      {/* Streak Card (only when connected and entered) */}
      {isConnected && stats?.entered && (
        <StreakCard
          streak={Number(stats.streak)}
          todayDone={todayData?.todayDone ?? false}
          isLoading={statsLoading}
        />
      )}

      {/* Entry Button */}
      {isConnected ? (
        roundLoading || !round ? (
          roundError ? (
            <div className="card text-center space-y-2">
              <p className="text-red-400 font-pixel" style={{ fontSize: "8px" }}>
                CONTRACT UNREACHABLE
              </p>
              <p className="text-arcade-muted text-xs">
                Make sure you&apos;re connected to Celo and the contract is deployed.
              </p>
            </div>
          ) : (
            <button className="btn-secondary cursor-wait" disabled>
              <span className="font-pixel" style={{ fontSize: "8px" }}>
                CONNECTING...
              </span>
            </button>
          )
        ) : (
          <EntryButton
            roundId={round.roundId}
            isEntered={stats?.entered ?? false}
            isOpen={round.isOpen}
            onSuccess={refetchRound}
          />
        )
      ) : (
        <div className="card text-center space-y-3">
          <p className="text-arcade-muted font-pixel" style={{ fontSize: "7px" }}>
            CONNECT WALLET TO ENTER
          </p>
          <WalletBadge />
        </div>
      )}

      {/* Mini Leaderboard */}
      <div className="space-y-2">
        <h2 className="font-pixel text-celo-green" style={{ fontSize: "8px" }}>
          TOP 5 THIS WEEK
        </h2>
        <Leaderboard
          entries={leaderboard?.entries ?? []}
          isLoading={lbLoading}
          showPrizes
          maxRows={5}
          highlightAddress={address}
        />
      </div>

      {/* How it works */}
      <div className="card">
        <button
          onClick={() => setHowToOpen(!howToOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-pixel text-celo-green" style={{ fontSize: "8px" }}>
            HOW TO PLAY
          </span>
          <span className="font-pixel text-celo-green" style={{ fontSize: "8px" }}>
            {howToOpen ? "<<" : ">>"}
          </span>
        </button>

        {howToOpen && (
          <div className="mt-3 space-y-2 text-sm text-arcade-muted">
            <p>
              <span className="font-pixel text-celo-green" style={{ fontSize: "7px" }}>01. </span>
              Pay <strong className="text-white">0.1 USDT</strong> to enter each
              week&apos;s round (Mon 00:00 — Sun 23:59 UTC).
            </p>
            <p>
              <span className="font-pixel text-celo-green" style={{ fontSize: "7px" }}>02. </span>
              Send <strong className="text-white">any outgoing transaction</strong>{" "}
              every day to build your streak.
            </p>
            <p>
              <span className="font-pixel text-celo-green" style={{ fontSize: "7px" }}>03. </span>
              Ranking: <strong className="text-white">longest streak</strong>,
              then <strong className="text-white">tx count</strong>,
              then <strong className="text-white">unique addresses</strong>.
            </p>
            <p>
              <span className="font-pixel text-celo-green" style={{ fontSize: "7px" }}>04. </span>
              Miss a day? <strong className="text-white">You&apos;re out</strong> — streak resets to zero.
            </p>
            <p>
              <span className="font-pixel text-celo-green" style={{ fontSize: "7px" }}>05. </span>
              Winners split the pot:{" "}
              <strong className="text-white">50% / 30% / 20%</strong> (minus 5% fee).
            </p>
            <p>
              <span className="font-pixel text-celo-green" style={{ fontSize: "7px" }}>06. </span>
              Fewer than 3 players? All entry fees are refunded.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
