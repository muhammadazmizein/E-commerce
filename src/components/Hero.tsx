"use client";

import Link from "next/link";
import { Cinzel, Inter, Space_Mono } from "next/font/google";
import { useTranslations } from "next-intl";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400"] });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["700"] });

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative h-[calc(100vh-140px)] min-h-[500px] w-full overflow-hidden bg-black sm:h-[92vh] sm:min-h-[600px]">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/vidio-home-web.mp4" type="video/mp4" />
      </video>

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/50"
      />
      {/* Fully opaque fade at the very bottom so the hero's edge matches the
          solid black section below it exactly, instead of the ~90% overlay
          above leaving a faint seam where the video shows through. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent"
      />

      <div className="relative z-10 flex h-full max-w-7xl flex-col justify-end px-6 pb-20 sm:px-8 sm:pb-24 lg:mx-auto lg:px-10">
        <h1
          className={`${cinzel.className} mb-4 max-w-3xl text-[36px] uppercase text-white`}
        >
          New Release: Shirt Vespera
        </h1>

        <p className={`${inter.className} mb-7 text-[13px] text-[#B0B0B0]`}>
          Release 05.10.2026
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/products"
            className={`${spaceMono.className} group flex w-full items-center justify-center gap-2 bg-white px-[45px] py-[14px] text-[11px] font-bold uppercase tracking-wide text-black transition-colors hover:bg-white/85 sm:inline-flex sm:w-auto`}
          >
            {t("cta")}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
