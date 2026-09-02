export type Store = {
  id: string;
  name: string;
  region: string;
  address: string;
  image: string;
};

export const STORES: Store[] = [
  {
    id: "banten",
    name: "HEYFREAK Store",
    region: "Banten",
    address:
      "Ruko Alegro Blok A18 Citraland, Serang, Kec. Serang, Kota Serang, Banten 42116",
    image: "/store.png",
  },
];

export function getRegions(stores: Store[]) {
  return Array.from(new Set(stores.map((s) => s.region))).sort();
}
