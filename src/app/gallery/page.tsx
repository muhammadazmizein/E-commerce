import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { getProducts } from "@/lib/api";
import { formatIDR } from "@/lib/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("gallery");
  return {
    title: `${t("title")} — HEYFREAK`,
    description: "Galeri foto produk HEYFREAK.",
  };
}

export default async function GalleryPage() {
  const t = await getTranslations("gallery");
  const tBreadcrumb = await getTranslations("breadcrumb");
  const products = await getProducts().catch(() => []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: tBreadcrumb("home"), href: "/" }, { label: t("breadcrumb") }]} />
        <div className="mt-6 text-center">
          <h1 className="font-display text-3xl uppercase tracking-wide">{t("title")}</h1>
        </div>

        {products.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-0.5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group relative aspect-square overflow-hidden bg-surface-2"
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-black/0 p-3 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                  <p className="line-clamp-2 text-xs font-bold uppercase tracking-wide text-white">
                    {product.name}
                  </p>
                  <p className="font-mono text-xs text-white/90">{formatIDR(product.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
