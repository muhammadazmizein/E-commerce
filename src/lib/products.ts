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
};

export function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
