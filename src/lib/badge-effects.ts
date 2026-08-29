import type { Product } from "@/lib/products";

// Maps a product's badge to an ambient "aura" glow class applied to the
// whole card, instead of a text label chip.
const cardAura: Partial<Record<NonNullable<Product["badge"]>, string>> = {
  NEW: "card-aura-new",
  HOT: "card-aura-hot",
  SALE: "card-aura-sale",
  LIMITED: "card-aura-limited",
};

export function cardAuraClass(badge?: Product["badge"]) {
  if (!badge) return "";
  return cardAura[badge] ?? "";
}

export function hasShine(badge?: Product["badge"]) {
  return badge === "NEW";
}
