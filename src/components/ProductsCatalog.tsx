"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

const PRICE_RANGES = [
  { label: "Di bawah Rp150.000", min: 0, max: 150000 },
  { label: "Rp150.000 – Rp180.000", min: 150000, max: 180000 },
  { label: "Rp180.000 – Rp210.000", min: 180000, max: 210000 },
  { label: "Di atas Rp210.000", min: 210000, max: Infinity },
] as const;

type TipeProduk = "semua" | "unggulan" | "diskon";
type Ketersediaan = "semua" | "stok";
type SortBy = "unggulan" | "harga-rendah" | "harga-tinggi";

export default function ProductsCatalog({
  products,
  initialCategory,
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const allCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(initialCategory ? [initialCategory] : [])
  );
  const [tipeProduk, setTipeProduk] = useState<TipeProduk>("semua");
  const [ketersediaan, setKetersediaan] = useState<Ketersediaan>("semua");
  const [priceRange, setPriceRange] = useState<(typeof PRICE_RANGES)[number] | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("unggulan");

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let result = products;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (selectedCategories.size > 0) {
      result = result.filter((p) => selectedCategories.has(p.category));
    }
    if (tipeProduk === "unggulan") {
      result = result.filter((p) => p.badge === "NEW" || p.badge === "HOT");
    } else if (tipeProduk === "diskon") {
      result = result.filter((p) => !!p.compareAt);
    }
    if (ketersediaan === "stok") {
      result = result.filter((p) => p.badge !== "SOLD OUT");
    }
    if (priceRange) {
      result = result.filter((p) => p.price >= priceRange.min && p.price < priceRange.max);
    }

    result = [...result];
    if (sortBy === "harga-rendah") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "harga-tinggi") result.sort((a, b) => b.price - a.price);

    return result;
  }, [products, search, selectedCategories, tipeProduk, ketersediaan, priceRange, sortBy]);

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
        </label>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Kategori</h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {allCategories.map((cat) => (
              <label key={cat} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCategories.has(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Tipe Produk</h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {(
              [
                ["semua", "Semua Produk"],
                ["unggulan", "Produk Unggulan"],
                ["diskon", "Diskon"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="tipeProduk"
                  checked={tipeProduk === value}
                  onChange={() => setTipeProduk(value)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Ketersediaan</h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {(
              [
                ["semua", "Semua"],
                ["stok", "Ada Stok"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="ketersediaan"
                  checked={ketersediaan === value}
                  onChange={() => setKetersediaan(value)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Harga</h3>
          <div className="mt-3 flex flex-col gap-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="harga"
                checked={priceRange === null}
                onChange={() => setPriceRange(null)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Semua Harga
            </label>
            {PRICE_RANGES.map((range) => (
              <label key={range.label} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="harga"
                  checked={priceRange?.label === range.label}
                  onChange={() => setPriceRange(range)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {range.label}
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div className="lg:col-span-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-2xl uppercase tracking-tight">
            Semua Produk <span className="text-base font-sans font-normal normal-case text-muted">({filtered.length})</span>
          </h1>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Urutan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-accent"
            >
              <option value="unggulan">Unggulan</option>
              <option value="harga-rendah">Harga Terendah</option>
              <option value="harga-tinggi">Harga Tertinggi</option>
            </select>
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-border bg-surface px-4 py-16 text-center text-sm text-muted">
            Nggak ada produk yang cocok sama filter ini.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
