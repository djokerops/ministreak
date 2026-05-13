"use client";

import { useEnterRound } from "@/hooks/useEnterRound";
import { useEntryEligibility } from "@/hooks/useEntryEligibility";
import { MINIPAY_DEPOSIT_DEEPLINK } from "@/lib/contracts";

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
  const { enterRound, step, error, reset } = useEnterRound();
  const eligibility = useEntryEligibility();

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
      <div className="flex items-center justify-center gap-2 py-3 bg-celo-green/20 border border-celo-green rounded-sm">
        <span className="font-pixel text-celo-green" style={{ fontSize: "9px" }}>
          ENTERED! GOOD LUCK!
        </span>
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

  // Insufficient USDT — MiniPay rule §2 + §6: show a clear explainer
  // and redirect to the Deposit deeplink rather than silently failing.
  if (eligibility.status === "swap_needed") {
    return (
      <div className="space-y-2">
        <div className="p-3 bg-celo-gold/10 border border-celo-gold/40 rounded-sm">
          <p className="font-pixel text-celo-gold mb-1" style={{ fontSize: "8px" }}>
            USDT NEEDED
          </p>
          <p className="text-xs text-gray-300">
            This game uses USDT. You hold other stablecoins — swap to USDT
            in MiniPay first, or add USDT directly.
          </p>
        </div>
        <a
          href={MINIPAY_DEPOSIT_DEEPLINK}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary block text-center"
        >
          GET USDT
        </a>
      </div>
    );
  }

  if (eligibility.status === "deposit_needed") {
    return (
      <div className="space-y-2">
        <div className="p-3 bg-celo-gold/10 border border-celo-gold/40 rounded-sm">
          <p className="font-pixel text-celo-gold mb-1" style={{ fontSize: "8px" }}>
            LOW BALANCE
          </p>
          <p className="text-xs text-gray-300">
            You need at least 0.10 USDT to enter this week&apos;s round.
          </p>
        </div>
        <a
          href={MINIPAY_DEPOSIT_DEEPLINK}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary block text-center"
        >
          DEPOSIT USDT
        </a>
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
      disabled={isLoading || !roundId || eligibility.status === "loading"}
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
