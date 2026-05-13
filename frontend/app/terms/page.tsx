/* TODO: replace placeholder body with reviewed legal copy before MiniPay submission. */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — MiniStreak",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
      </header>

      <div className="card space-y-4 leading-relaxed">
        <span className="pill-gold">Placeholder — to be finalized</span>

        <p>
          MiniStreak (&ldquo;the App&rdquo;) is a non-custodial weekly streak
          competition on the Celo blockchain. By using the App you agree to the
          following:
        </p>

        <ol className="list-decimal pl-5 space-y-3 marker:text-ink-faint">
          <li>
            <strong>Eligibility.</strong> You must be of legal age in your
            jurisdiction and capable of entering binding agreements.
          </li>
          <li>
            <strong>Game mechanics.</strong> Entry fees and prize pools are
            governed entirely by audited on-chain smart contracts. The App
            cannot modify, refund, or override on-chain outcomes outside of the
            contract&apos;s defined refund logic.
          </li>
          <li>
            <strong>No financial advice.</strong> Participation is at your own
            risk. Stablecoin payments are denominated in USDT and subject to
            blockchain network conditions.
          </li>
          <li>
            <strong>No warranty.</strong> The App is provided &ldquo;as
            is&rdquo; with no warranties, express or implied. We are not liable
            for losses arising from smart contract bugs, blockchain
            reorganizations, wallet errors, or third-party services (including
            MiniPay).
          </li>
          <li>
            <strong>Prohibited use.</strong> You agree not to use the App for
            money laundering, sanctions evasion, or activity prohibited by
            applicable law.
          </li>
          <li>
            <strong>Changes.</strong> These terms may be updated. Continued use
            after an update constitutes acceptance.
          </li>
        </ol>

        <p className="text-ink-faint text-sm pt-2">
          Last updated: pending finalization.
        </p>
      </div>
    </main>
  );
}
