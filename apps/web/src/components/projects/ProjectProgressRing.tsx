export function ProjectProgressRing({ percent, size = 44 }: { percent: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 90 ? '#10b981' : clamped >= 50 ? '#3b82f6' : '#f59e0b';

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={5} fill="none" className="text-ink-100 dark:text-ink-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={5}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-ink-900 dark:text-white">{clamped}%</span>
    </span>
  );
}
