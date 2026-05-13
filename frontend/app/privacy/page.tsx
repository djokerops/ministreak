/* TODO: replace placeholder body with reviewed privacy copy before MiniPay submission. */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — MiniStreak",
};

export default function PrivacyPage() {
  return (
    <main className="pt-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-ink-mute hover:text-forest transition-colors"
      >
        <span aria-hidden>←</span> Back
      </Link>

      <header>
        <p className="eyebrow text-forest">Legal</p>
        <h1 className="font-display font-black text-4xl text-ink mt-1">
          Privacy Policy
        </h1>
      </header>

      <div className="card space-y-4 leading-relaxed">
        <span className="pill-gold">Placeholder — to be finalized</span>

        <p>
          MiniStreak is a non-custodial App and collects the minimum data
          required to run weekly streak competitions on Celo.
        </p>

        <h2 className="font-display font-bold text-xl text-ink pt-3">What we collect</h2>
        <ul className="list-disc pl-5 space-y-2 marker:text-ink-faint">
          <li>Public blockchain data: your wallet address, transactions, and on-chain streak state.</li>
          <li>Aggregated, anonymous usage analytics (no personally identifiable information).</li>
        </ul>

        <h2 className="font-display font-bold text-xl text-ink pt-3">What we do not collect</h2>
        <ul className="list-disc pl-5 space-y-2 marker:text-ink-faint">
          <li>Names, emails, phone numbers, or government-issued IDs.</li>
          <li>Private keys or seed phrases — these never leave your wallet.</li>
          <li>Off-chain tracking across other sites or apps.</li>
        </ul>

        <h2 className="font-display font-bold text-xl text-ink pt-3">Third-party services</h2>
        <p>
          The App connects to Celo RPC endpoints, The Graph hosted services for
          leaderboard indexing, and MiniPay&apos;s injected wallet. Each third
          party operates under its own privacy policy.
        </p>

        <h2 className="font-display font-bold text-xl text-ink pt-3">Contact</h2>
        <p>
          For privacy questions, contact us via the Support link on the home
          page.
        </p>

        <p className="text-ink-faint text-sm pt-2">
          Last updated: pending finalization.
        </p>
      </div>
    </main>
  );
}
