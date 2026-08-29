const items = [
  "ORIGINAL DESIGN",
  "COTTON COMBED 24S",
  "SABLON PLASTISOL",
  "STOK TERBATAS",
  "FREE ONGKIR JABODETABEK",
];

export default function Marquee() {
  const track = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-border bg-accent py-2.5 text-accent-foreground">
      <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap">
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-8 text-sm font-bold uppercase tracking-wider">
            {item}
            <span aria-hidden className="text-lg leading-none">
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
