"use client";

import Image from "next/image";
import Link from "next/link";
import { formatIDR, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
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
  const soldOut = product.badge === "SOLD OUT";
  const hasSizes = !!product.sizes && product.sizes.length > 0;
  const { addItem } = useCart();
  const href = `/product/${product.id}`;
  const aura = variant === "grid" ? cardAuraClass(product.badge) : "";
  const shine = variant === "grid" && hasShine(product.badge);

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-xl ${aura}`}
    >
      <div className={`relative aspect-[4/5] overflow-hidden ${shine ? "card-shine" : ""}`}>
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
        {hasSizes ? (
          <Link
            href={href}
            aria-disabled={soldOut}
            className={`absolute inset-x-3 bottom-3 z-10 translate-y-2 rounded-full bg-foreground py-2.5 text-center text-sm font-bold uppercase tracking-wide text-background opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 ${
              soldOut ? "pointer-events-none bg-surface-2 text-muted" : ""
            }`}
          >
            {soldOut ? "Habis" : "Pilih Ukuran"}
          </Link>
        ) : (
          <button
            disabled={soldOut}
            onClick={() => addItem(product)}
            className="absolute inset-x-3 bottom-3 z-10 translate-y-2 rounded-full bg-foreground py-2.5 text-sm font-bold uppercase tracking-wide text-background opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
          >
            {soldOut ? "Habis" : "+ Keranjang"}
          </button>
        )}
      </div>

      <Link href={href} className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wide text-muted">{product.category}</p>
        <h3 className="line-clamp-2 min-h-[2.75rem] font-semibold leading-snug text-foreground">
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
        <div className="mt-auto flex items-center gap-2 pt-2">
          <span className="font-display text-lg tracking-tight">{formatIDR(product.price)}</span>
          {product.compareAt && (
            <span className="text-sm text-muted line-through">{formatIDR(product.compareAt)}</span>
          )}
        </div>
        {product.sizes && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.sizes.map((size) => (
              <span
                key={size}
                className="rounded border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted"
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
