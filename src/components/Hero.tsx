import Image from "next/image";
import type { SiteImage } from "@/lib/api";

export default function Hero({ siteImages }: { siteImages: Record<string, SiteImage> }) {
  const main = siteImages["hero-main"];
  const secondary1 = siteImages["hero-secondary-1"];
  const secondary2 = siteImages["hero-secondary-2"];

  return (
    <section id="drop" className="relative overflow-hidden border-b-2 border-border">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
        <span className="font-display whitespace-nowrap text-[28vw] uppercase leading-none">
          FREAK FREAK
        </span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-pop/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-6 lg:py-0 lg:px-8">
        <div className="lg:col-span-7 lg:border-r-2 lg:border-border lg:py-16 lg:pr-10">
          <span className="btn-tag inline-flex items-center gap-2 bg-pop px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-pop-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-pop-foreground" />
            </span>
            New Drop — S-Shirt Boxy Series
          </span>
          <h1 className="mt-6 font-display text-[19vw] leading-[0.8] uppercase tracking-tight sm:text-8xl lg:text-[7.5vw]">
            Stay
            <br />
            Weird.
            <br />
            <span className="text-stroke-pop">Stay Freak.</span>
          </h1>
          <p className="mt-6 max-w-md border-l-2 border-pop pl-4 text-base text-muted sm:text-lg">
            Kaos oversize cotton combed 24s dan aksesoris statement — desain
            original buat lo yang nggak mau nyampur sama yang lain. Stok
            terbatas, nggak di-restock.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#products"
              className="btn-tag group inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-background transition-transform hover:-translate-y-0.5"
            >
              Belanja New Drop
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#story"
              className="btn-tag border-2 border-border px-7 py-3.5 text-sm font-bold uppercase tracking-wide transition-colors hover:border-foreground hover:bg-pop hover:text-pop-foreground"
            >
              Cerita Kami
            </a>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 divide-x-2 divide-border border-y-2 border-border">
            {[
              ["4.9/5", "Rating toko"],
              ["12K+", "Freak terjual"],
              ["100%", "Original design"],
            ].map(([value, label]) => (
              <div key={label} className="px-4 py-3 first:pl-0">
                <dt className="font-display text-2xl">{value}</dt>
                <dd className="text-xs uppercase tracking-wide text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative lg:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            {main && (
              <div className="clip-tag group relative col-span-2 aspect-video overflow-hidden border-2 border-border shadow-edge-lg">
                <Image
                  src={main.image}
                  alt={main.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              </div>
            )}
            {secondary1 && (
              <div className="clip-tag group relative aspect-square overflow-hidden border-2 border-border shadow-edge-lg">
                <Image
                  src={secondary1.image}
                  alt={secondary1.alt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
            {secondary2 && (
              <div className="clip-tag group relative aspect-square overflow-hidden border-2 border-border shadow-edge-lg">
                <Image
                  src={secondary2.image}
                  alt={secondary2.alt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
          </div>
          <div className="btn-tag animate-drift absolute bottom-4 left-4 hidden rotate-[-6deg] border-2 border-foreground bg-pop px-4 py-3 shadow-edge-lg sm:block">
            <p className="font-display text-lg leading-none text-pop-foreground">Rp 109K</p>
            <p className="text-xs uppercase tracking-wide text-pop-foreground/70">Oversize Tee</p>
          </div>
        </div>
      </div>
    </section>
  );
}
