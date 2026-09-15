export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number;
  badge?: "NEW" | "HOT" | "SALE" | "SOLD OUT" | "LIMITED";
  colors?: string[];
  sizes?: string[];
  image: string;
  images?: string[];
  description?: string;
  highlights?: { title: string; desc: string }[];
  rating?: number;
  reviewCount?: number;
  stock: number;
};

export function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Product colors only carry a hex swatch (no name from the catalog), so we
// map to the closest of a small basic palette to show a readable label like
// "Black" instead of a raw hex code.
const BASIC_COLOR_NAMES: Record<string, [number, number, number]> = {
  Black: [0, 0, 0],
  White: [255, 255, 255],
  Gray: [128, 128, 128],
  Red: [220, 20, 20],
  Orange: [230, 126, 34],
  Yellow: [241, 196, 15],
  Green: [46, 139, 60],
  Blue: [41, 98, 220],
  Navy: [20, 30, 80],
  Purple: [142, 68, 173],
  Pink: [230, 130, 180],
  Brown: [110, 70, 40],
  Beige: [222, 202, 170],
};

export function nameFromHex(hex: string): string {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  let closest = "Black";
  let closestDistance = Infinity;
  for (const [name, [nr, ng, nb]] of Object.entries(BASIC_COLOR_NAMES)) {
    const distance = (r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2;
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = name;
    }
  }
  return closest;
}
