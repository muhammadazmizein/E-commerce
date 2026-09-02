"use client";

import { useTranslations } from "next-intl";
import type { Product } from "@/lib/products";

const KEYS: Record<NonNullable<Product["badge"]>, string> = {
  NEW: "new",
  HOT: "hot",
  SALE: "sale",
  "SOLD OUT": "soldOut",
  LIMITED: "limited",
};

export default function ProductBadge({ badge }: { badge: NonNullable<Product["badge"]> }) {
  const t = useTranslations("productBadge");
  const label = t(KEYS[badge]);

  if (badge !== "SALE") {
    return <>{label}</>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-orange-600">
      <span className="animate-flame inline-block" aria-hidden="true">
        🔥
      </span>
      {label}
    </span>
  );
}
