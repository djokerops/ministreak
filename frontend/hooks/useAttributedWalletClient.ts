"use client";

import { useWalletClient } from "wagmi";
import { erc8021Suffix } from "@/lib/wagmi";
import { useMemo } from "react";

/**
 * Wraps wagmi's useWalletClient to set viem's `dataSuffix` on the
 * wallet client instance. This causes viem's sendTransaction (and
 * writeContract which calls sendTransaction) to append the ERC-8021
 * builder code attribution to every outgoing transaction's calldata.
 *
 * This works with injected wallets (MiniPay, MetaMask) because the
 * suffix is appended to the data BEFORE it's sent to the provider.
 */
export function useAttributedWalletClient() {
  const result = useWalletClient();

  const data = useMemo(() => {
    if (!result.data) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.data as any).dataSuffix = erc8021Suffix;
    return result.data;
  }, [result.data]);

  return { ...result, data };
}
