import type { Product } from "@/lib/products";

const badgeStyles: Record<NonNullable<Product["badge"]>, string> = {
  NEW: "bg-accent text-accent-foreground",
  HOT: "bg-foreground text-background",
  SALE: "bg-foreground text-background",
  LIMITED: "border-2 border-foreground bg-background text-foreground",
  "SOLD OUT": "border-2 border-border bg-surface-2 text-muted",
};

const badgeIcons: Partial<Record<NonNullable<Product["badge"]>, { icon: string; animation: string }>> = {
  NEW: { icon: "✨", animation: "animate-badge-sparkle" },
  HOT: { icon: "🔥", animation: "animate-flame" },
  SALE: { icon: "🔻", animation: "animate-badge-bounce" },
  LIMITED: { icon: "⏳", animation: "animate-badge-shake" },
};

export default function ProductBadge({
  badge,
  className = "",
}: {
  badge: NonNullable<Product["badge"]>;
  className?: string;
}) {
  const iconData = badgeIcons[badge];

  return (
    <span
      className={`clip-tag-sm relative inline-flex -rotate-3 items-center gap-1 overflow-hidden px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-edge ${badgeStyles[badge]} ${className}`}
    >
      {iconData && (
        <span aria-hidden className={`inline-block grayscale ${iconData.animation}`}>
          {iconData.icon}
        </span>
      )}
      {badge}
    </span>
  );
}
