import { badgeLabel, type Product } from "@/lib/products";

export default function ProductBadge({ badge }: { badge: NonNullable<Product["badge"]> }) {
  if (badge !== "SALE") {
    return <>{badgeLabel(badge)}</>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-orange-600">
      <span className="animate-flame inline-block" aria-hidden="true">
        🔥
      </span>
      {badgeLabel(badge)}
    </span>
  );
}
