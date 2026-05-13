"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
  const stroke = active ? "#1B6B3F" : "#6B6452";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "#DEEDE2" : "none"}
      />
    </svg>
  );
}

function TrophyIcon({ active }: { active: boolean }) {
  const stroke = active ? "#1B6B3F" : "#6B6452";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4h10v4a5 5 0 0 1-10 0V4Z"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "#FBEFC9" : "none"}
      />
      <path d="M7 5H4v2a3 3 0 0 0 3 3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 20h6M12 14v6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/leaderboard", label: "Board", Icon: TrophyIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm"
      style={{ boxShadow: "0 -1px 0 #E5DEC8, 0 -8px 24px -16px rgba(27,26,23,0.08)" }}
    >
      <div className="max-w-md mx-auto flex">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
                isActive ? "text-forest" : "text-ink-mute"
              }`}
            >
              <Icon active={isActive} />
              <span className="text-[11px] font-semibold tracking-cap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
