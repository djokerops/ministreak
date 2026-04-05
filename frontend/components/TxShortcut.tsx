"use client";

import { useState } from "react";
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import { parseEther } from "viem";
import { CHARITY_ADDRESS } from "@/lib/contracts";

export default function TxShortcut({ onSuccess }: { onSuccess?: () => void }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  async function sendQuickTx() {
    if (!walletClient || !publicClient || !address) return;
    setStep("sending");
    setError("");

    try {
      const gasPrice = await publicClient.getGasPrice();
      const gasPriceWithBuffer = (gasPrice * BigInt(120)) / BigInt(100);

      const hash = await walletClient.sendTransaction({
        to: CHARITY_ADDRESS,
        value: parseEther("0.001"),
        gasPrice: gasPriceWithBuffer,
        type: "legacy" as const,
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
        <p className="font-pixel text-celo-green mb-1" style={{ fontSize: "8px" }}>
          [x] TX SENT!
        </p>
        <p className="text-xs text-arcade-muted">
          Your transaction has been recorded. The oracle will update your streak shortly.
        </p>
        {txHash && (
          <p className="text-xs text-arcade-dim mt-1 truncate">Tx: {txHash}</p>
        )}
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <h3 className="font-pixel text-celo-green" style={{ fontSize: "8px" }}>
        QUICK STREAK TX
      </h3>

      <p className="text-xs text-arcade-muted">
        Any outgoing transaction (not self-send) counts toward your daily streak.
        This sends a tiny amount of CELO (0.001) as a quick way to keep your streak alive.
      </p>

      {step === "error" && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        className="btn-primary"
        onClick={sendQuickTx}
        disabled={step === "sending"}
      >
        {step === "sending" ? "SENDING..." : "SEND QUICK TX (0.001 CELO)"}
      </button>

      <p className="font-pixel text-arcade-dim text-center" style={{ fontSize: "5px" }}>
        SENDS 0.001 CELO — ANY OUTGOING TX COUNTS
      </p>
    </div>
  );
}
