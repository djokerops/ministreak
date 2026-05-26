"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavIcon({ src, active }: { src: string; active: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={22}
      height={22}
      className={active ? "opacity-100" : "opacity-60"}
    />
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Home", iconSrc: "/home.svg" },
  { href: "/leaderboard", label: "Board", iconSrc: "/leaderboard.svg" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm"
      style={{ boxShadow: "0 -1px 0 #E5DEC8, 0 -8px 24px -16px rgba(27,26,23,0.08)" }}
    >
      <div className="max-w-md mx-auto flex">
        {NAV_ITEMS.map(({ href, label, iconSrc }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
                isActive ? "text-forest" : "text-ink-mute"
              }`}
            >
              <NavIcon src={iconSrc} active={isActive} />
              <span className="text-[11px] font-semibold tracking-cap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
