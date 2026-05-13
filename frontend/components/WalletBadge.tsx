"use client";

import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { pseudonymFor } from "@/lib/pseudonym";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    ethereum?: any;
  }
}

export default function WalletBadge() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const isMiniPay =
    typeof window !== "undefined" && window.ethereum?.isMiniPay === true;

  useEffect(() => {
    if (isMiniPay && !isConnected) {
      connect({ connector: injected() });
    }
  }, [isMiniPay, isConnected, connect]);

  if (isMiniPay && isConnected) {
    return (
      <div className="badge bg-celo-green/20 text-celo-green border border-celo-green/30" style={{ fontSize: "6px" }}>
        {address ? pseudonymFor(address) : "CONNECTED"}
      </div>
    );
  }

  if (!isConnected) {
    if (isMiniPay) return null;

    return (
      <button
        onClick={() => connect({ connector: injected() })}
        className="badge bg-arcade-card text-gray-300 border border-arcade-dim hover:border-celo-green transition-colors py-1.5 px-3"
        style={{ fontSize: "6px" }}
      >
        CONNECT
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="badge bg-arcade-card text-gray-300 border border-arcade-dim"
      style={{ fontSize: "6px" }}
    >
      {address ? pseudonymFor(address) : "CONNECTED"}
    </button>
  );
}
