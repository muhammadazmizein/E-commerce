"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Select from "@/components/Select";
import { getRegions, type Store } from "@/lib/stores";

export default function StoresGrid({ stores }: { stores: Store[] }) {
  const t = useTranslations("stores");
  const regions = useMemo(() => getRegions(stores), [stores]);
  const [region, setRegion] = useState("all");
  const filtered = region === "all" ? stores : stores.filter((s) => s.region === region);

  return (
    <div>
      <div className="mx-auto max-w-xs">
        <Select
          value={region}
          onChange={setRegion}
          options={[
            { value: "all", label: t("allRegions") },
            ...regions.map((r) => ({ value: r, label: r })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 border border-border bg-surface px-4 py-16 text-center text-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className="clip-tag group block overflow-hidden border border-border bg-surface transition-colors hover:border-foreground"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>
              <div className="flex flex-col gap-1.5 p-5">
                <h3 className="text-lg font-semibold text-foreground">{store.name}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{store.region}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{store.address}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
