import { getTranslations } from "next-intl/server";
import type { Product } from "@/lib/products";
import FeaturedDropsScroller from "@/components/FeaturedDropsScroller";

export default async function FeaturedDrops({ products }: { products: Product[] }) {
  const t = await getTranslations("featuredDrops");
  const newDrops = products.filter((p) => p.badge === "NEW");
  const drops = (newDrops.length > 0 ? newDrops : products).slice(0, 8);
  if (drops.length === 0) return null;

  return (
    <section id="drop" className="bg-black pb-16 pt-6 sm:pb-20 sm:pt-8">
      <FeaturedDropsScroller
        drops={drops}
        kicker={t("kicker")}
        title={t("title")}
        releaseLabel={t("release")}
        scrollLeftLabel={t("scrollLeft")}
        scrollRightLabel={t("scrollRight")}
      />
    </section>
  );
}
