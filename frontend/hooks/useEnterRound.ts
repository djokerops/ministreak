"use client";

import { useState } from "react";
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import {
  VAULT_ADDRESS,
  VAULT_ABI,
  USDT_ADDRESS,
  ERC20_ABI,
  ENTRY_FEE,
} from "@/lib/contracts";

type Step = "idle" | "approving" | "entering" | "done" | "error";

export function useEnterRound() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const [step, setStep] = useState<Step>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterRound(roundId: bigint) {
    if (!walletClient || !publicClient || !address) return;

    setStep("idle");
    setError(null);
    setTxHash(null);

    try {
      // Step 1: Check allowance
      const allowance = await publicClient.readContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, VAULT_ADDRESS],
      });

      // Step 2: Approve if needed
      if ((allowance as bigint) < ENTRY_FEE) {
        setStep("approving");

        const approveTx = await walletClient.writeContract({
          address: USDT_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [VAULT_ADDRESS, ENTRY_FEE],
          // Legacy tx mode for Celo / MiniPay
          gasPrice: BigInt(5_000_000_000),
        });

        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // Step 3: Enter the round
      setStep("entering");

      const enterTx = await walletClient.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "enterRound",
        args: [roundId],
        gasPrice: BigInt(5_000_000_000),
      });

      await publicClient.waitForTransactionReceipt({ hash: enterTx });

      setTxHash(enterTx);
      setStep("done");
    } catch (err: unknown) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  function reset() {
    setStep("idle");
    setError(null);
    setTxHash(null);
  }

  return { enterRound, step, txHash, error, reset };
}
