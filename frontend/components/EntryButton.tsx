"use client";

import { useEnterRound } from "@/hooks/useEnterRound";

interface EntryButtonProps {
  roundId: bigint | undefined;
  isEntered: boolean;
  isOpen: boolean;
  onSuccess?: () => void;
}

export default function EntryButton({
  roundId,
  isEntered,
  isOpen,
  onSuccess,
}: EntryButtonProps) {
  const { enterRound, step, txHash, error, reset } = useEnterRound();

  if (isEntered) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-6 bg-celo-green/20 border border-celo-green rounded-sm">
        <span className="font-pixel text-celo-green" style={{ fontSize: "9px" }}>
          [x] YOU&apos;RE IN THIS WEEK
        </span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button className="btn-secondary cursor-not-allowed" disabled>
        ROUND CLOSED
      </button>
    );
  }

  if (step === "done") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 py-3 bg-celo-green/20 border border-celo-green rounded-sm">
          <span className="font-pixel text-celo-green" style={{ fontSize: "9px" }}>
            ENTERED! GOOD LUCK!
          </span>
        </div>
        {txHash && (
          <p className="text-xs text-arcade-muted text-center truncate">
            Tx: {txHash.slice(0, 20)}...
          </p>
        )}
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="space-y-2">
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-sm text-xs text-red-300">
          {error || "Transaction failed"}
        </div>
        <button onClick={reset} className="btn-secondary">
          TRY AGAIN
        </button>
      </div>
    );
  }

  const isLoading = step === "approving" || step === "entering";
  const label =
    step === "approving"
      ? "APPROVING..."
      : step === "entering"
      ? "ENTERING..."
      : "ENTER - 0.1 USDT";

  return (
    <button
      className="btn-primary"
      disabled={isLoading || !roundId}
      onClick={() => {
        if (roundId) {
          enterRound(roundId).then(() => onSuccess?.());
        }
      }}
    >
      {isLoading && (
        <span className="animate-pulse mr-1">...</span>
      )}
      {label}
    </button>
  );
}
