import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { getStore } from "@/lib/stores";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = getStore(id);
  if (!store) return {};

  return {
    title: `${store.name} — HEYFREAK`,
    description: store.address,
  };
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore(id);
  if (!store) notFound();

  const t = await getTranslations("stores");
  const tBreadcrumb = await getTranslations("breadcrumb");
  const images = store.images && store.images.length > 0 ? store.images : [store.image];
  const mapsQuery = encodeURIComponent(store.address);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: tBreadcrumb("home"), href: "/" },
            { label: t("breadcrumb"), href: "/stores" },
            { label: store.name },
          ]}
        />

        <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <div
              key={img + i}
              className="clip-tag-sm relative aspect-square w-56 shrink-0 overflow-hidden bg-surface-2 sm:w-64"
            >
              <Image src={img} alt={`${store.name} photo ${i + 1}`} fill sizes="256px" className="object-cover" />
            </div>
          ))}
        </div>

        <div className="relative mt-6">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tag absolute left-3 top-3 z-10 flex items-center gap-1.5 border border-border bg-surface px-3 py-2 text-xs font-bold uppercase tracking-wide text-foreground shadow-edge transition-colors hover:border-foreground"
          >
            {t("openInMaps")}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
          <div className="clip-tag h-56 w-full overflow-hidden border border-border sm:h-64">
            <iframe
              title={`${store.name} location`}
              src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
