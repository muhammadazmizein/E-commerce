import type { Product } from "@/lib/products";

const badgeStyles: Record<NonNullable<Product["badge"]>, string> = {
  NEW: "bg-accent text-accent-foreground",
  HOT: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
  SALE: "bg-red-500 text-white",
  LIMITED: "border border-foreground bg-background text-foreground",
  "SOLD OUT": "bg-surface-2 text-muted",
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
      className={`relative inline-flex items-center gap-1 overflow-hidden rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${badgeStyles[badge]} ${className}`}
    >
      {iconData && (
        <span aria-hidden className={`inline-block ${iconData.animation}`}>
          {iconData.icon}
        </span>
      )}
      {badge}
    </span>
  );
}
