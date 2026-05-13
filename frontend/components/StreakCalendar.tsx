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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StreakCalendar({ dailyStreaks, isLoading }: StreakCalendarProps) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="h-20 bg-paper-tint rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card">
      <p className="eyebrow mb-3">This week</p>
      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label, i) => {
          const streak = dailyStreaks.find((d) => d.dayIndex === i);
          const isCompleted = !!streak;

          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-full aspect-square rounded-lg flex items-center justify-center transition-colors ${
                  isCompleted
                    ? "bg-forest text-paper"
                    : "bg-paper-tint border border-rule text-ink-faint"
                }`}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </div>
              <span className="text-[10px] uppercase tracking-cap text-ink-mute">
                {label}
              </span>
              {isCompleted && (
                <span className="text-[10px] font-semibold text-forest num">
                  {streak.txCount}tx
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
