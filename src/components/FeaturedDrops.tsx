import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Product } from "@/lib/products";
import { formatIDR } from "@/lib/products";

export default async function FeaturedDrops({ products }: { products: Product[] }) {
  const t = await getTranslations("featuredDrops");
  const newDrops = products.filter((p) => p.badge === "NEW");
  const drops = (newDrops.length > 0 ? newDrops : products).slice(0, 8);
  if (drops.length === 0) return null;

  return (
    <section id="drop" className="bg-black py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
          <span className="h-px w-6 bg-red-600" />
          {t("kicker")}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-editorial)] text-4xl uppercase tracking-wide text-white sm:text-5xl">
          {t("title")}
        </h2>
      </div>

      <div className="mt-8 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:px-6 lg:mx-auto lg:max-w-7xl lg:px-8">
        {drops.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="group w-[240px] flex-none sm:w-[280px]"
          >
            <div className="relative aspect-square overflow-hidden bg-surface-2">
              <span className="absolute left-0 top-0 z-10 bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                {t("release")}
              </span>
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 240px, 280px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <p className="mt-3 text-sm font-semibold uppercase leading-snug text-white">{product.name}</p>
            <p className="mt-1 text-sm text-white/60">{formatIDR(product.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
