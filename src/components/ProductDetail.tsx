"use client";

import Image from "next/image";
import { useState } from "react";
import { formatIDR, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
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
  const soldOut = product.badge === "SOLD OUT" || product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;
  const hasSizes = !!product.sizes && product.sizes.length > 0;
  const [size, setSize] = useState<string | undefined>(product.sizes?.[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product.id);

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
            className={`clip-tag relative aspect-[4/5] overflow-hidden border-2 border-border shadow-edge-lg ${cardAuraClass(product.badge)} ${hasShine(product.badge) ? "card-shine" : ""}`}
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
          <p className="btn-tag inline-block border-2 border-accent px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-accent">
            {product.category}
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase leading-[0.9] tracking-tight sm:text-5xl">
            {product.name}
          </h1>

          <div className="mt-5 flex items-baseline gap-3 border-b-2 border-border pb-5">
            <span className="font-display text-3xl tracking-tight text-accent">
              {formatIDR(product.price)}
            </span>
            {product.compareAt && (
              <span className="text-base text-muted line-through">
                {formatIDR(product.compareAt)}
              </span>
            )}
          </div>
          <p className={`mt-3 text-xs font-bold uppercase tracking-widest ${soldOut ? "text-red-500" : lowStock ? "text-red-500" : "text-muted"}`}>
            {soldOut ? "Stok Habis" : lowStock ? `Sisa ${product.stock} — buruan!` : `Stok tersedia: ${product.stock}`}
          </p>

          {hasSizes && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">Pilih Ukuran</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes!.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`h-11 min-w-11 border-2 px-3 text-sm font-bold uppercase transition-colors ${
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

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Jumlah</p>
            <div className="mt-3 flex w-fit items-center border-2 border-border">
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
                disabled={qty >= product.stock}
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="flex h-11 w-11 items-center justify-center text-lg text-foreground hover:text-accent disabled:cursor-not-allowed disabled:text-muted"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={handleAddToCart}
              disabled={soldOut || needsSize}
              className="btn-tag flex flex-1 items-center justify-center bg-accent py-4 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted sm:flex-none sm:px-10"
            >
              {soldOut ? "Stok Habis" : added ? "Ditambahkan ✓" : "+ Keranjang"}
            </button>
            <button
              type="button"
              aria-label={wishlisted ? "Hapus dari wishlist" : "Simpan ke wishlist"}
              onClick={() => toggle(product)}
              className={`btn-tag flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center border-2 bg-surface transition-colors ${
                wishlisted ? "border-red-400 text-red-500" : "border-border text-foreground hover:border-red-400 hover:text-red-500"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.4 1.5 6.9 4.4 5.3c2.3-1.3 5-0.6 6.6 1.4l1 1.2 1-1.2c1.6-2 4.3-2.7 6.6-1.4 2.9 1.6 3.4 5.1 1.7 7.6C18.7 16.65 12 21 12 21z" />
              </svg>
            </button>
          </div>
          {needsSize && !soldOut && (
            <p className="mt-2 text-xs text-red-500">Pilih ukuran dulu ya.</p>
          )}

          {product.description && (
            <p className="mt-8 max-w-xl border-l-2 border-border pl-4 text-sm leading-relaxed text-muted">
              {product.description}
            </p>
          )}

          {product.highlights && product.highlights.length > 0 && (
            <div className="mt-8 grid gap-px overflow-hidden border-2 border-border bg-border sm:grid-cols-3">
              {product.highlights.map((h) => (
                <div key={h.title} className="bg-surface p-4">
                  <h3 className="font-display text-sm uppercase tracking-tight text-accent">
                    {h.title}
                  </h3>
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
