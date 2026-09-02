const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const APPAREL_CM: Record<string, [chest: number, length: number, sleeve: number]> = {
  S: [50, 67, 22],
  M: [52, 69, 23],
  L: [54, 71, 24],
  XL: [56, 73, 25],
  XXL: [58, 75, 26],
  XXXL: [60, 77, 27],
};

const PANTS_CM: Record<string, [waist: number, length: number, thigh: number]> = {
  S: [72, 96, 58],
  M: [76, 98, 60],
  L: [80, 100, 62],
  XL: [84, 102, 64],
  XXL: [88, 104, 66],
  XXXL: [92, 106, 68],
};

export type SizeChart = {
  columns: string[];
  rows: { size: string; values: string[] }[];
};

export function getSizeChart(category: string, sizes: string[]): SizeChart | null {
  const isPants = category.toLowerCase() === "pants";
  const isApparel = ["t-shirt", "s-shirt", "polo"].includes(category.toLowerCase());
  if (!isPants && !isApparel) return null;

  const table = isPants ? PANTS_CM : APPAREL_CM;
  const columns = isPants
    ? ["Ukuran", "Lingkar Pinggang (cm)", "Panjang (cm)", "Lingkar Paha (cm)"]
    : ["Ukuran", "Lebar Dada (cm)", "Panjang Baju (cm)", "Panjang Lengan (cm)"];

  const rows = sizes
    .filter((s) => table[s.toUpperCase()])
    .sort((a, b) => SIZE_ORDER.indexOf(a.toUpperCase()) - SIZE_ORDER.indexOf(b.toUpperCase()))
    .map((s) => ({ size: s, values: table[s.toUpperCase()].map(String) }));

  return rows.length > 0 ? { columns, rows } : null;
}
