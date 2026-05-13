import Link from "next/link";

/**
 * App footer with legal + support links required by MiniPay submission.
 *
 * TODO before submission: replace SUPPORT_HREF with the real support
 * channel (mailto: address, Telegram handle, or web portal URL).
 */
const SUPPORT_HREF = "mailto:support@example.com"; // TODO: real channel

export default function Footer() {
  return (
    <footer className="pt-6 pb-8 border-t border-arcade-dim mt-6">
      <div className="flex items-center justify-center gap-4 font-pixel text-arcade-muted" style={{ fontSize: "6px" }}>
        <Link href="/terms" className="hover:text-celo-green transition-colors">
          TERMS
        </Link>
        <span className="text-arcade-dim">|</span>
        <Link href="/privacy" className="hover:text-celo-green transition-colors">
          PRIVACY
        </Link>
        <span className="text-arcade-dim">|</span>
        <a
          href={SUPPORT_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-celo-green transition-colors"
        >
          SUPPORT
        </a>
      </div>
    </footer>
  );
}
