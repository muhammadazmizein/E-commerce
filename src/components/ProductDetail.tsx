"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatIDR, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import Breadcrumb from "@/components/Breadcrumb";
import ProductBadge from "@/components/ProductBadge";
import ProductReviews from "@/components/ProductReviews";
import RelatedProducts from "@/components/RelatedProducts";
import { getSizeChart } from "@/lib/size-chart";

function AccordionSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-foreground"
      >
        {title}
        <span className="text-base text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="pb-5 text-sm leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export default function ProductDetail({
  product,
  related = [],
}: {
  product: Product;
  related?: Product[];
}) {
  const t = useTranslations("productDetail");
  const tBreadcrumb = useTranslations("breadcrumb");
  const tSizeChart = useTranslations("sizeChart");
  const router = useRouter();
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
  const sizeChart = hasSizes
    ? getSizeChart(product.category, product.sizes!, {
        size: tSizeChart("size"),
        chest: tSizeChart("chest"),
        length: tSizeChart("length"),
        sleeve: tSizeChart("sleeve"),
        waist: tSizeChart("waist"),
        pantsLength: tSizeChart("pantsLength"),
        thigh: tSizeChart("thigh"),
      })
    : null;

  function handleAddToCart() {
    if (soldOut || needsSize) return;
    addItem(product, size, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (soldOut || needsSize) return;
    addItem(product, size, qty);
    router.push("/checkout");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: tBreadcrumb("home"), href: "/" },
            { label: tBreadcrumb("allProducts"), href: "/products" },
            { label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` },
            { label: product.name },
          ]}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div className="clip-tag relative aspect-[4/5] overflow-hidden border border-border bg-surface-2">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={`object-cover ${soldOut ? "grayscale opacity-70" : ""}`}
              priority
            />
            {product.badge && (
              <span className="absolute left-4 top-4 text-xs font-medium text-foreground">
                <ProductBadge badge={product.badge} />
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 lg:max-w-md">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            {product.category}
          </p>
          <h1 className="mt-1.5 text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            {product.name}
          </h1>

          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-xl font-bold text-foreground">
              {formatIDR(product.price)}
            </span>
            {product.compareAt && (
              <span className="text-sm text-muted line-through">
                {formatIDR(product.compareAt)}
              </span>
            )}
          </div>
          <p className={`mt-2 text-xs font-medium ${soldOut || lowStock ? "text-red-500" : "text-muted"}`}>
            {soldOut
              ? t("outOfStock")
              : lowStock
                ? t("lowStock", { stock: product.stock })
                : t("inStock", { stock: product.stock })}
          </p>

          {hasSizes && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-foreground">{t("size")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes!.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`h-9 min-w-9 border px-2.5 text-xs font-semibold transition-colors ${
                      size === s
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="text-xs font-semibold text-foreground">{t("quantity")}</p>
            <div className="mt-2 flex w-fit items-center border border-border">
              <button
                aria-label={t("decreaseQty")}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center text-base text-foreground hover:text-accent"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <button
                aria-label={t("increaseQty")}
                disabled={qty >= product.stock}
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="flex h-9 w-9 items-center justify-center text-base text-foreground hover:text-accent disabled:cursor-not-allowed disabled:text-muted"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleAddToCart}
                disabled={soldOut || needsSize}
                className="flex h-11 flex-1 items-center justify-center border border-foreground text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
              >
                {soldOut ? t("outOfStockButton") : added ? t("added") : t("addToCart")}
              </button>
              <button
                type="button"
                aria-label={wishlisted ? t("removeFromWishlist") : t("saveToWishlist")}
                onClick={() => toggle(product)}
                className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-colors ${
                  wishlisted ? "border-red-400 text-red-500" : "border-border text-foreground hover:border-red-400 hover:text-red-500"
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.4 1.5 6.9 4.4 5.3c2.3-1.3 5-0.6 6.6 1.4l1 1.2 1-1.2c1.6-2 4.3-2.7 6.6-1.4 2.9 1.6 3.4 5.1 1.7 7.6C18.7 16.65 12 21 12 21z" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleBuyNow}
              disabled={soldOut || needsSize}
              className="flex h-11 items-center justify-center bg-foreground text-xs font-semibold uppercase tracking-wide text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
            >
              {t("buyItNow")}
            </button>
          </div>
          {needsSize && !soldOut && (
            <p className="mt-2 text-xs text-red-500">{t("pickSizeFirst")}</p>
          )}

          <div className="mt-8">
            <AccordionSection title={t("detail")}>
              {product.description && <p>{product.description}</p>}
              {product.highlights && product.highlights.length > 0 && (
                <ul className="mt-3 list-disc space-y-1.5 pl-4">
                  {product.highlights.map((h) => (
                    <li key={h.title}>
                      <span className="font-medium text-foreground">{h.title}:</span> {h.desc}
                    </li>
                  ))}
                </ul>
              )}
            </AccordionSection>
            {hasSizes && (
              <AccordionSection title={t("sizeGuide")}>
                {sizeChart ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[380px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-border">
                            {sizeChart.columns.map((col) => (
                              <th key={col} className="whitespace-nowrap py-2 pr-4 text-xs font-semibold text-foreground">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sizeChart.rows.map((row) => (
                            <tr key={row.size} className="border-b border-border last:border-0">
                              <td className="whitespace-nowrap py-2 pr-4 font-medium text-foreground">{row.size}</td>
                              {row.values.map((v, i) => (
                                <td key={i} className="whitespace-nowrap py-2 pr-4">
                                  {v}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-xs text-muted">{t("sizeGuideNote")}</p>
                  </>
                ) : (
                  <p>{t("sizeGuideFallback", { sizes: product.sizes!.join(", ") })}</p>
                )}
              </AccordionSection>
            )}
            <AccordionSection title={t("shippingReturns")}>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-semibold text-foreground">{t("shippingPolicyTitle")}</p>
                  <p className="mt-1.5">{t("shippingPolicyBody")}</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t("returnPolicyTitle")}</p>
                  <ul className="mt-1.5 list-disc space-y-1.5 pl-4">
                    <li>{t("returnPolicyItem1")}</li>
                    <li>{t("returnPolicyItem2")}</li>
                  </ul>
                </div>
                <p>{t("contactNote")}</p>
              </div>
            </AccordionSection>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />
      <RelatedProducts products={related} />
    </div>
  );
}
