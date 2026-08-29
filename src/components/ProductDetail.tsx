"use client";

import Image from "next/image";
import { useState } from "react";
import { formatIDR, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import Breadcrumb from "@/components/Breadcrumb";
import { cardAuraClass, hasShine } from "@/lib/badge-effects";
import ProductBadge from "@/components/ProductBadge";
import ProductReviews from "@/components/ProductReviews";
import RelatedProducts from "@/components/RelatedProducts";

export default function ProductDetail({
  product,
  related = [],
}: {
  product: Product;
  related?: Product[];
}) {
  const soldOut = product.badge === "SOLD OUT";
  const hasSizes = !!product.sizes && product.sizes.length > 0;
  const [size, setSize] = useState<string | undefined>(product.sizes?.[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const needsSize = hasSizes && !size;

  function handleAddToCart() {
    if (soldOut || needsSize) return;
    addItem(product, size, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/" },
            { label: "Semua Produk", href: "/products" },
            { label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` },
            { label: product.name },
          ]}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div
            className={`relative aspect-[4/5] overflow-hidden rounded-2xl border border-border shadow-lg ${cardAuraClass(product.badge)} ${hasShine(product.badge) ? "card-shine" : ""}`}
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={`object-cover ${soldOut ? "grayscale opacity-70" : ""}`}
              priority
            />
            {product.badge && (
              <ProductBadge badge={product.badge} className="absolute left-4 top-4" />
            )}
          </div>
        </div>

        <div className="lg:col-span-6">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            {product.category}
          </p>
          <h1 className="mt-2 font-display text-3xl uppercase leading-[0.95] tracking-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-2xl tracking-tight">
              {formatIDR(product.price)}
            </span>
            {product.compareAt && (
              <span className="text-base text-muted line-through">
                {formatIDR(product.compareAt)}
              </span>
            )}
          </div>

          {hasSizes && (
            <div className="mt-8">
              <p className="text-sm font-semibold text-foreground">Pilih Ukuran</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes!.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`h-11 min-w-11 rounded-lg border px-3 text-sm font-bold uppercase transition-colors ${
                      size === s
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border text-foreground hover:border-accent"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <p className="text-sm font-semibold text-foreground">Jumlah</p>
            <div className="mt-3 flex w-fit items-center rounded-full border border-border">
              <button
                aria-label="Kurangi jumlah"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-11 w-11 items-center justify-center text-lg text-foreground hover:text-accent"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button
                aria-label="Tambah jumlah"
                onClick={() => setQty((q) => q + 1)}
                className="flex h-11 w-11 items-center justify-center text-lg text-foreground hover:text-accent"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={soldOut || needsSize}
            className="mt-8 flex w-full items-center justify-center rounded-full bg-accent py-4 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted sm:w-auto sm:px-10"
          >
            {soldOut ? "Stok Habis" : added ? "Ditambahkan ✓" : "+ Keranjang"}
          </button>
          {needsSize && !soldOut && (
            <p className="mt-2 text-xs text-red-500">Pilih ukuran dulu ya.</p>
          )}

          {product.description && (
            <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted">
              {product.description}
            </p>
          )}

          {product.highlights && product.highlights.length > 0 && (
            <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
              {product.highlights.map((h) => (
                <div key={h.title}>
                  <h3 className="font-display text-sm uppercase tracking-tight">{h.title}</h3>
                  <p className="mt-1 text-xs text-muted">{h.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductReviews productId={product.id} />
      <RelatedProducts products={related} />
    </div>
  );
}
