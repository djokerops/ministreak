"use client";

import { useAccount, useReadContract } from "wagmi";
import {
  USDT_ADDRESS,
  USDC_ADDRESS,
  USDM_ADDRESS,
  ERC20_ABI,
  ENTRY_FEE,
  ENTRY_FEE_18,
} from "@/lib/contracts";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export type EligibilityState =
  | { status: "loading" }
  | { status: "no_wallet" }
  | { status: "ready"; usdt: bigint }
  | { status: "swap_needed"; usdt: bigint; usdc: bigint; usdm: bigint }
  | { status: "deposit_needed"; usdt: bigint; usdc: bigint; usdm: bigint };

/**
 * Determine whether the connected wallet can enter the round and what
 * the user needs to do otherwise. Used by EntryButton to choose between
 * the entry CTA, the "swap to USDT" explainer, and the deposit deeplink.
 *
 * MiniPay rule §2: adapt to the user's preferred stablecoin or show a
 * clear explainer instead of a broken interface.
 */
export function useEntryEligibility(): EligibilityState {
  const { address } = useAccount();

  const usdtQuery = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const usdcQuery = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && USDC_ADDRESS !== ZERO_ADDR },
  });

  const usdmQuery = useReadContract({
    address: USDM_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && USDM_ADDRESS !== ZERO_ADDR },
  });

  if (!address) return { status: "no_wallet" };

  const usdtLoading = usdtQuery.isLoading;
  if (usdtLoading) return { status: "loading" };

  const usdt = (usdtQuery.data as bigint | undefined) ?? BigInt(0);
  const usdc = (usdcQuery.data as bigint | undefined) ?? BigInt(0);
  const usdm = (usdmQuery.data as bigint | undefined) ?? BigInt(0);

  if (usdt >= ENTRY_FEE) {
    return { status: "ready", usdt };
  }

  // Insufficient USDT — check the other stables for swap eligibility.
  // USDC is 6 decimals (same as USDT), USDm is 18 decimals.
  const hasUsdcEquiv = usdc >= ENTRY_FEE;
  const hasUsdmEquiv = usdm >= ENTRY_FEE_18;

  if (hasUsdcEquiv || hasUsdmEquiv) {
    return { status: "swap_needed", usdt, usdc, usdm };
  }

  return { status: "deposit_needed", usdt, usdc, usdm };
}
