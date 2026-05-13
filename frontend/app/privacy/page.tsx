/* TODO: replace placeholder body with reviewed privacy copy before MiniPay submission. */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — MiniStreak",
};

export default function PrivacyPage() {
  return (
    <main className="pt-6 space-y-4">
      <Link href="/" className="font-pixel text-celo-green" style={{ fontSize: "8px" }}>
        {"<<"} BACK
      </Link>

      <h1 className="font-pixel text-lg text-white">PRIVACY POLICY</h1>

      <div className="card space-y-3 text-sm text-gray-300">
        <p className="font-pixel text-celo-gold" style={{ fontSize: "7px" }}>
          PLACEHOLDER — TO BE FINALIZED
        </p>

        <p>
          MiniStreak is a non-custodial App and collects the minimum data
          required to run weekly streak competitions on Celo.
        </p>

        <h2 className="font-pixel text-celo-green pt-2" style={{ fontSize: "8px" }}>
          WHAT WE COLLECT
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Public blockchain data: your wallet address, transactions, and on-chain streak state.</li>
          <li>Aggregated, anonymous usage analytics (no personally identifiable information).</li>
        </ul>

        <h2 className="font-pixel text-celo-green pt-2" style={{ fontSize: "8px" }}>
          WHAT WE DO NOT COLLECT
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Names, emails, phone numbers, or government-issued IDs.</li>
          <li>Private keys or seed phrases — these never leave your wallet.</li>
          <li>Off-chain off-app tracking across other sites or apps.</li>
        </ul>

        <h2 className="font-pixel text-celo-green pt-2" style={{ fontSize: "8px" }}>
          THIRD-PARTY SERVICES
        </h2>
        <p>
          The App connects to Celo RPC endpoints, The Graph hosted services
          for leaderboard indexing, and MiniPay&apos;s injected wallet. Each
          third party operates under its own privacy policy.
        </p>

        <h2 className="font-pixel text-celo-green pt-2" style={{ fontSize: "8px" }}>
          CONTACT
        </h2>
        <p>
          For privacy questions, contact us via the support link in the App
          footer.
        </p>

        <p className="text-arcade-muted text-xs pt-2">
          Last updated: pending finalization.
        </p>
      </div>
    </main>
  );
}
