"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SiteImage } from "@/lib/api";

export default function Hero({ siteImages }: { siteImages: Record<string, SiteImage> }) {
  const t = useTranslations("hero");
  const tNav = useTranslations("nav");
  const slides = [siteImages["hero-main"], siteImages["hero-secondary-1"], siteImages["hero-secondary-2"]].filter(
    (s): s is SiteImage => Boolean(s)
  );

  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const interval = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section className="relative h-[92vh] min-h-[600px] w-full overflow-hidden bg-black">
      {slides.map((slide, i) => (
        <div
          key={slide.slot}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className="object-cover"
          />
        </div>
      ))}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/50"
      />
      {/* Fully opaque fade at the very bottom so the hero's edge matches the
          solid black section below it exactly, instead of the ~90% overlay
          above leaving a faint seam where the photo shows through. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent"
      />

      <div className="relative z-10 flex h-full max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6 sm:pb-20 lg:mx-auto lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
          {t("tag")}
        </p>
        <h1
          className="mt-4 max-w-3xl font-[family-name:var(--font-editorial)] text-4xl uppercase leading-[0.95] tracking-wide text-white sm:text-5xl lg:text-6xl"
        >
          Stay Weird. Stay Freak.
        </h1>
        <p className="mt-4 text-sm text-white/50">{t("subtext")}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 bg-white px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-white/85"
          >
            {tNav("ourCollections")}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 right-4 z-10 flex items-center gap-2 sm:right-8">
          {slides.map((slide, i) => (
            <button
              key={slide.slot}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
