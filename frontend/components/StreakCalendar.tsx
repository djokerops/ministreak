"use client";

interface DayEntry {
  dayIndex: number;
  txCount: number;
  newStreak: number;
  timestamp: number;
}

interface StreakCalendarProps {
  dailyStreaks: DayEntry[];
  isLoading?: boolean;
}

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function StreakCalendar({ dailyStreaks, isLoading }: StreakCalendarProps) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="h-20 bg-arcade-card rounded-sm animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card">
      <p className="font-pixel text-celo-green mb-3" style={{ fontSize: "7px" }}>
        THIS WEEK
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_LABELS.map((label, i) => {
          const streak = dailyStreaks.find((d) => d.dayIndex === i);
          const isCompleted = !!streak;

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-full aspect-square rounded-sm flex items-center justify-center font-pixel transition-colors ${
                  isCompleted
                    ? "bg-celo-green text-arcade-bg"
                    : "bg-arcade-card border border-arcade-dim text-arcade-dim"
                }`}
                style={{ fontSize: "10px" }}
              >
                {isCompleted ? "x" : ""}
              </div>
              <span className="font-pixel text-arcade-dim" style={{ fontSize: "4px" }}>
                {label}
              </span>
              {isCompleted && (
                <span className="font-pixel text-celo-green" style={{ fontSize: "4px" }}>
                  {streak.txCount}TX
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
