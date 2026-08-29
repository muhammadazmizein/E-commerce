import Image from "next/image";
import type { SiteImage } from "@/lib/api";

const points = [
  {
    title: "Cotton Combed 24s",
    desc: "Bahan adem, jatuh bagus, dan tetap nyaman dipakai seharian.",
  },
  {
    title: "Sablon Plastisol",
    desc: "Warna tahan lama, nggak gampang retak walau dicuci berkali-kali.",
  },
  {
    title: "Desain Original",
    desc: "Setiap motif digambar sendiri sama tim kami — bukan asal jiplak tren.",
  },
];

export default function BrandStory({ image }: { image?: SiteImage }) {
  return (
    <section id="story" className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
        <div className="lg:col-span-5">
          {image && (
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border shadow-lg">
              <Image
                src={image.image}
                alt={image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          )}
        </div>
        <div className="lg:col-span-7">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            Cerita Kami
          </span>
          <h2 className="mt-2 font-display text-3xl uppercase leading-[0.95] tracking-tight sm:text-5xl">
            Dibuat buat yang
            <br />
            nggak takut beda.
          </h2>
          <p className="mt-5 max-w-xl text-muted">
            HEYFREAK lahir dari jalanan — dari orang-orang yang capek pakai
            desain pasaran. Kami bikin kaos dan aksesoris dengan karakter
            kuat, kualitas jujur, dan produksi terbatas biar tetap eksklusif.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {points.map((p) => (
              <div key={p.title} className="border-t border-border pt-4">
                <h3 className="font-display text-base uppercase tracking-tight">{p.title}</h3>
                <p className="mt-1 text-sm text-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
