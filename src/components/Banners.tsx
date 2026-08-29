import Image from "next/image";
import type { Banner } from "@/lib/api";

export default function Banners({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {banners.map((banner) => (
          <a
            key={banner.id}
            href={banner.ctaHref ?? "#products"}
            className="group relative flex aspect-[4/5] overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:aspect-[3/4]"
          >
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="relative mt-auto flex flex-col gap-2 p-5">
              <h3 className="font-display text-xl uppercase leading-tight text-white sm:text-2xl">
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p className="max-w-xs text-sm text-white/75">{banner.subtitle}</p>
              )}
              {banner.ctaLabel && (
                <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-accent-foreground transition-transform group-hover:translate-x-1">
                  {banner.ctaLabel} →
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
