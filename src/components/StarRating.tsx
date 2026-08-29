export function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${filled ? "fill-foreground text-foreground" : "fill-none text-border"}`}
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.3 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.3 6.1-.7z" strokeLinejoin="round" />
    </svg>
  );
}

export function StarRow({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={size}>
          <Star filled={n <= Math.round(rating)} />
        </span>
      ))}
    </div>
  );
}
