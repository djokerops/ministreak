"use client";

import { useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { USDT_ADDRESS, ERC20_ABI, CHARITY_ADDRESS, MIN_STREAK_VOLUME } from "@/lib/contracts";

export default function TxShortcut({ onSuccess }: { onSuccess?: () => void }) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  async function sendQualifyingTx() {
    if (!walletClient || !publicClient) return;
    setStep("sending");
    setError("");

    try {
      // Transfer 0.50 USDT to the Celo charity address
      const hash = await walletClient.writeContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [CHARITY_ADDRESS, MIN_STREAK_VOLUME],
        gasPrice: BigInt(5_000_000_000),
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setStep("done");
      onSuccess?.();
    } catch (err: unknown) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  if (step === "done") {
    return (
      <div className="card border-celo-green/40 border">
        <div className="flex items-center gap-2 text-celo-green font-bold mb-1">
          <span>✓</span> Qualifying tx sent!
        </div>
        <p className="text-xs text-gray-400">
          0.50 USDT donated to Celo charity. The oracle will record your streak shortly.
        </p>
        {txHash && (
          <p className="text-xs text-gray-600 mt-1 truncate">Tx: {txHash}</p>
        )}
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <h3 className="font-bold text-sm">Quick Qualifying Tx</h3>

      {showDisclaimer && (
        <div className="p-2 bg-yellow-900/30 border border-yellow-800 rounded-xl text-xs text-yellow-200 space-y-1">
          <p className="font-semibold">Disclaimer</p>
          <p>
            This sends <strong>0.50 USDT</strong> to the{" "}
            <strong>Celo Community Fund</strong> (a legitimate Celo charity
            address). This is a real transfer — the funds are donated.
            This is a voluntary shortcut to ensure your daily streak is
            recorded.
          </p>
          <button
            onClick={() => setShowDisclaimer(false)}
            className="text-yellow-400 underline"
          >
            I understand, close this
          </button>
        </div>
      )}

      {step === "error" && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        className="btn-primary"
        onClick={sendQualifyingTx}
        disabled={step === "sending"}
      >
        {step === "sending" ? "Sending 0.50 USDT..." : "Send Today's Qualifying Tx (0.50 USDT)"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Sends 0.50 USDT to Celo Community Fund to satisfy streak requirements
      </p>
    </div>
  );
}
