"use client";

import { useEffect, useState } from "react";

interface RoundTimerProps {
  endTime: bigint | undefined;
}

function formatDuration(seconds: number): {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
} {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    days: String(d).padStart(2, "0"),
    hours: String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
  };
}

export default function RoundTimer({ endTime }: RoundTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!endTime) return;

    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      setSecondsLeft(Math.max(0, Number(endTime) - now));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const { days, hours, minutes, seconds } = formatDuration(secondsLeft);

  if (!endTime) {
    return <div className="h-16 bg-arcade-card rounded-sm animate-pulse" />;
  }

  if (secondsLeft === 0) {
    return (
      <div className="card text-center">
        <p className="text-arcade-muted font-pixel" style={{ fontSize: "8px" }}>
          ROUND ENDED — AWAITING RESOLUTION
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="font-pixel text-celo-green text-center mb-2" style={{ fontSize: "7px" }}>
        ROUND ENDS IN
      </p>
      <div className="flex justify-center gap-3">
        {[
          { label: "DAYS", value: days },
          { label: "HRS", value: hours },
          { label: "MIN", value: minutes },
          { label: "SEC", value: seconds },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center bg-arcade-timer border border-celo-green rounded-sm px-2 py-1"
            style={{ minWidth: "52px" }}
          >
            <span className="font-pixel text-xl text-white tabular-nums">
              {value}
            </span>
            <span className="font-pixel text-celo-green" style={{ fontSize: "5px" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
