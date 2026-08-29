import Image from "next/image";
import type { SiteImage } from "@/lib/api";

export default function Hero({ siteImages }: { siteImages: Record<string, SiteImage> }) {
  const main = siteImages["hero-main"];
  const secondary1 = siteImages["hero-secondary-1"];
  const secondary2 = siteImages["hero-secondary-2"];

  return (
    <section id="drop" className="relative overflow-hidden border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:items-center lg:py-20 lg:px-8">
        <div className="lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
            Drop 003 — Static Riot
          </span>
          <h1 className="mt-5 font-display text-[15vw] leading-[0.85] uppercase tracking-tight sm:text-7xl lg:text-8xl">
            Stay
            <br />
            Weird.
            <br />
            <span className="text-accent">Stay Freak.</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-muted sm:text-lg">
            Kaos oversize cotton combed 24s dan aksesoris statement — desain
            original buat lo yang nggak mau nyampur sama yang lain. Stok
            terbatas, nggak di-restock.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#products"
              className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5"
            >
              Belanja New Drop
            </a>
            <a
              href="#story"
              className="rounded-full border border-border px-7 py-3.5 text-sm font-bold uppercase tracking-wide transition-colors hover:border-accent hover:text-accent"
            >
              Cerita Kami
            </a>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6">
            {[
              ["4.9/5", "Rating toko"],
              ["12K+", "Freak terjual"],
              ["100%", "Original design"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl text-foreground">{value}</dt>
                <dd className="text-xs uppercase tracking-wide text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative lg:col-span-6">
          <div className="grid grid-cols-2 gap-4">
            {main && (
              <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-2xl border border-border shadow-lg">
                <Image
                  src={main.image}
                  alt={main.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
            )}
            {secondary1 && (
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border shadow-lg">
                <Image
                  src={secondary1.image}
                  alt={secondary1.alt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
            )}
            {secondary2 && (
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border shadow-lg">
                <Image
                  src={secondary2.image}
                  alt={secondary2.alt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
            )}
          </div>
          <div className="absolute -bottom-5 -left-5 hidden rotate-[-6deg] rounded-xl border border-border bg-surface px-4 py-3 shadow-2xl sm:block">
            <p className="font-display text-lg leading-none">Rp 189K</p>
            <p className="text-xs uppercase tracking-wide text-muted">Oversize Tee</p>
          </div>
        </div>
      </div>
    </section>
  );
}
