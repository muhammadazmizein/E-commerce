export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number;
  badge?: "NEW" | "HOT" | "SALE" | "SOLD OUT" | "LIMITED";
  colorway: [string, string];
  sizes?: string[];
  image: string;
  description?: string;
  highlights?: { title: string; desc: string }[];
  rating?: number;
  reviewCount?: number;
  stock: number;
};

export function badgeLabel(badge: NonNullable<Product["badge"]>) {
  return badge
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
