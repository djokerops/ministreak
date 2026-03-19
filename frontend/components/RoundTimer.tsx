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
    return <div className="h-16 bg-gray-800 rounded-xl animate-pulse" />;
  }

  if (secondsLeft === 0) {
    return (
      <div className="card text-center">
        <p className="text-gray-400 text-sm">Round ended — awaiting resolution</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 text-center">
        Round ends in
      </p>
      <div className="flex justify-center gap-3">
        {[
          { label: "Days", value: days },
          { label: "Hrs", value: hours },
          { label: "Min", value: minutes },
          { label: "Sec", value: seconds },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <span className="text-3xl font-black text-white tabular-nums">
              {value}
            </span>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
