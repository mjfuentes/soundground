interface ActivityDotProps {
  size?: number;
}

/** Pulsing dot signalling recent activity. */
export function ActivityDot({ size = 6 }: ActivityDotProps) {
  return (
    <span
      aria-hidden
      className="rounded-full bg-sg-ink animate-sgpulse"
      style={{ width: size, height: size }}
    />
  );
}
