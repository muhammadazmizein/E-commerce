import Image from "next/image";
import Link from "next/link";
import { badgeLabel, formatIDR, type Product } from "@/lib/products";

export default function ProductCard({
  product,
}: {
  product: Product;
  variant?: "grid" | "compact";
}) {
  const soldOut = product.badge === "SOLD OUT" || product.stock <= 0;
  const href = `/product/${product.id}`;

  return (
    <Link href={href} className="group flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className={`object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
            soldOut ? "grayscale opacity-60" : ""
          }`}
        />
        {product.badge && (
          <span className="absolute left-2 top-2 text-xs font-medium text-foreground">
            {badgeLabel(product.badge)}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <h3 className="line-clamp-2 text-sm text-foreground">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{formatIDR(product.price)}</span>
          {product.compareAt && (
            <span className="text-sm text-muted line-through">{formatIDR(product.compareAt)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
