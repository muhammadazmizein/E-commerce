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
    <section id="story" className="border-y-2 border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
        <div className="lg:col-span-5">
          {image && (
            <div className="clip-tag relative aspect-square overflow-hidden border-2 border-border shadow-edge-lg">
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
          <span className="btn-tag inline-block border-2 border-accent px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-accent">
            Cerita Kami
          </span>
          <h2 className="mt-4 font-display text-4xl uppercase leading-[0.9] tracking-tight sm:text-5xl">
            Dibuat buat yang
            <br />
            <span className="text-stroke">nggak takut beda.</span>
          </h2>
          <p className="mt-5 max-w-xl border-l-2 border-accent pl-4 text-muted">
            HEYFREAK lahir dari jalanan — dari orang-orang yang capek pakai
            desain pasaran. Kami bikin kaos dan aksesoris dengan karakter
            kuat, kualitas jujur, dan produksi terbatas biar tetap eksklusif.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden border-2 border-border bg-border sm:grid-cols-3">
            {points.map((p) => (
              <div key={p.title} className="bg-surface p-4">
                <h3 className="font-display text-base uppercase tracking-tight text-accent">
                  {p.title}
                </h3>
                <p className="mt-1 text-sm text-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
