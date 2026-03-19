export default function RulesPage() {
  return (
    <main className="pt-6 space-y-6 pb-8">
      <h1 className="text-2xl font-black">How to Play</h1>

      {/* Quick summary */}
      <div className="card bg-gradient-to-br from-celo-purple/30 to-gray-900">
        <p className="text-lg font-bold mb-2">
          Build the longest daily streak on Celo. Win USDT.
        </p>
        <p className="text-sm text-gray-400">
          Every week, players compete to make the most consecutive on-chain
          transactions. The longest streak wins the pot.
        </p>
      </div>

      {/* Step by step */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
          Game Rules
        </h2>

        {[
          {
            step: "1",
            title: "Pay to Enter",
            body: "Pay exactly 1 USDT to enter each week's round. Entry closes Monday 00:00 UTC. A new round starts immediately.",
          },
          {
            step: "2",
            title: "Build Your Daily Streak",
            body: "Make at least 1 qualifying on-chain transaction every day (UTC). A qualifying tx is any USDT transfer of 0.50 USDT or more — sent or received — that is NOT a self-send.",
          },
          {
            step: "3",
            title: "Round Ends Sunday",
            body: "The round closes at Sunday 23:59 UTC. Chainlink Automation triggers the resolution automatically.",
          },
          {
            step: "4",
            title: "Winner Determination",
            body: "Primary: longest consecutive streak wins. Tiebreaker: highest cumulative USDT volume across all qualifying txns. If still tied, the prize is split equally.",
          },
          {
            step: "5",
            title: "Payout Split",
            body: "After a 5% protocol fee: 1st place gets 50%, 2nd place gets 30%, 3rd place gets 20%. If fewer than 3 players, the split redistributes proportionally.",
          },
          {
            step: "6",
            title: "Minimum Players",
            body: "If fewer than 3 players enter in a week, no round takes place and all entry fees are fully refunded.",
          },
        ].map(({ step, title, body }) => (
          <div key={step} className="card flex gap-4">
            <div className="w-8 h-8 rounded-full bg-celo-green/20 border border-celo-green/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-celo-green text-sm font-bold">{step}</span>
            </div>
            <div>
              <p className="font-bold text-sm mb-1">{title}</p>
              <p className="text-sm text-gray-400">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
          FAQ
        </h2>

        {[
          {
            q: "What counts as a valid streak transaction?",
            a: "Any on-chain USDT transfer where the value sent or received is at least 0.50 USDT, on that UTC calendar day. Self-sends (sending to your own address) do NOT count.",
          },
          {
            q: "When does the week reset?",
            a: "Each round runs Monday 00:00 UTC through Sunday 23:59 UTC (7 days). A new round starts immediately after the previous one resolves.",
          },
          {
            q: "How does the oracle know about my transactions?",
            a: "An off-chain oracle service scans Celo blockchain events every hour, checks for qualifying USDT transfers, and submits proofs to the StreakOracle smart contract.",
          },
          {
            q: "What if the oracle misses my transaction?",
            a: "The oracle scans hourly. If your transaction was made before the round ends and meets all criteria, it will be picked up. You can also use the 'Quick Qualifying Tx' shortcut on the My Stats page.",
          },
          {
            q: "Can I enter multiple rounds?",
            a: "Yes! Each round is independent. Pay 1 USDT to enter each week.",
          },
          {
            q: "Is the contract audited?",
            a: "The contracts are open-source and built with OpenZeppelin libraries. They are deployed on Celo Sepolia testnet for now. A full audit is recommended before mainnet launch.",
          },
          {
            q: "How do I submit this app to MiniPay?",
            a: "Visit minipay.to/mini-apps to submit your app for the MiniPay listing. You'll need a live Vercel deployment URL and compliance with MiniPay integration guidelines.",
          },
        ].map(({ q, a }) => (
          <details key={q} className="card group">
            <summary className="text-sm font-bold cursor-pointer list-none flex items-center justify-between">
              {q}
              <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-sm text-gray-400 mt-2">{a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
