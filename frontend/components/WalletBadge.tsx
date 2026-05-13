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
      <div className="pill-forest">
        <span className="h-1.5 w-1.5 rounded-full bg-forest" />
        {address ? pseudonymFor(address) : "Connected"}
      </div>
    );
  }

  if (!isConnected) {
    if (isMiniPay) return null;

    return (
      <button
        onClick={() => connect({ connector: injected() })}
        className="pill bg-ink text-paper hover:bg-forest-deep transition-colors"
      >
        Connect
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="pill-muted hover:bg-paper-deep transition-colors"
      title="Tap to disconnect"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-forest" />
      {address ? pseudonymFor(address) : "Connected"}
    </button>
  );
}
