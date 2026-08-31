"use client";

import Image from "next/image";
import Link from "next/link";
import { formatIDR, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { cardAuraClass, hasShine } from "@/lib/badge-effects";
import ProductBadge from "@/components/ProductBadge";
import { StarRow } from "@/components/StarRating";

export default function ProductCard({
  product,
  variant = "grid",
}: {
  product: Product;
  variant?: "grid" | "compact";
}) {
  const soldOut = product.badge === "SOLD OUT" || product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;
  const hasSizes = !!product.sizes && product.sizes.length > 0;
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const href = `/product/${product.id}`;
  const aura = variant === "grid" ? cardAuraClass(product.badge) : "";
  const shine = variant === "grid" && hasShine(product.badge);
  const discountPct = product.compareAt
    ? Math.round((1 - product.price / product.compareAt) * 100)
    : null;

  return (
    <div
      className={`clip-tag group flex h-full flex-col overflow-hidden border-2 border-border bg-surface shadow-edge transition-all duration-300 hover:-translate-y-1 hover:border-accent ${aura}`}
    >
      <div className={`relative aspect-[4/5] overflow-hidden border-b-2 border-border ${shine ? "card-shine" : ""}`}>
        <Link href={href} className="absolute inset-0 z-0">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? "grayscale opacity-70" : ""}`}
          />
        </Link>
        {product.badge && (
          <ProductBadge badge={product.badge} className="pointer-events-none absolute left-3 top-3 z-10" />
        )}
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
          {discountPct !== null && (
            <span className="btn-tag pointer-events-none rotate-3 bg-foreground px-2 py-1 text-[11px] font-bold text-background shadow-edge">
              -{discountPct}%
            </span>
          )}
          <button
            type="button"
            aria-label={wishlisted ? "Hapus dari wishlist" : "Simpan ke wishlist"}
            onClick={(e) => {
              e.preventDefault();
              toggle(product);
            }}
            className={`btn-tag flex h-8 w-8 items-center justify-center border-2 bg-surface shadow-edge transition-colors ${
              wishlisted ? "border-red-400 text-red-500" : "border-border text-foreground hover:border-red-400 hover:text-red-500"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.4 1.5 6.9 4.4 5.3c2.3-1.3 5-0.6 6.6 1.4l1 1.2 1-1.2c1.6-2 4.3-2.7 6.6-1.4 2.9 1.6 3.4 5.1 1.7 7.6C18.7 16.65 12 21 12 21z" />
            </svg>
          </button>
        </div>
        {hasSizes ? (
          <Link
            href={href}
            aria-disabled={soldOut}
            className={`btn-tag absolute inset-x-3 bottom-3 z-10 translate-y-2 bg-accent py-2.5 text-center text-sm font-bold uppercase tracking-wide text-accent-foreground opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 ${
              soldOut ? "pointer-events-none bg-surface-2 text-muted" : ""
            }`}
          >
            {soldOut ? "Habis" : "Pilih Ukuran"}
          </Link>
        ) : (
          <button
            disabled={soldOut}
            onClick={() => addItem(product)}
            className="btn-tag absolute inset-x-3 bottom-3 z-10 translate-y-2 bg-accent py-2.5 text-sm font-bold uppercase tracking-wide text-accent-foreground opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
          >
            {soldOut ? "Habis" : "+ Keranjang"}
          </button>
        )}
      </div>

      <Link href={href} className="flex flex-1 flex-col gap-1 p-4">
        <p className="w-fit border border-border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
          {product.category}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] font-semibold leading-snug text-foreground">
          {product.name}
        </h3>
        {product.rating != null && product.reviewCount ? (
          <div className="flex items-center gap-1.5">
            <StarRow rating={product.rating} size="h-3.5 w-3.5" />
            <span className="text-xs text-muted">
              {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        ) : null}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-display text-xl tracking-tight text-accent">
            {formatIDR(product.price)}
          </span>
          {product.compareAt && (
            <span className="text-sm text-muted line-through">{formatIDR(product.compareAt)}</span>
          )}
        </div>
        {lowStock && (
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-500">
            Sisa {product.stock}
          </p>
        )}
        {product.sizes && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.sizes.map((size) => (
              <span
                key={size}
                className="border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted"
              >
                {size}
              </span>
            ))}
          </div>
        )}
      </Link>
    </div>
  );
}
