"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Select from "@/components/Select";
import { getRegions, type Store } from "@/lib/stores";

export default function StoresGrid({ stores }: { stores: Store[] }) {
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
            { value: "all", label: "Semua Wilayah" },
            ...regions.map((r) => ({ value: r, label: r })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 border border-border bg-surface px-4 py-16 text-center text-sm text-muted">
          Belum ada toko di wilayah ini.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => (
            <div key={store.id} className="border border-border bg-surface">
              <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col gap-1 p-4">
                <h3 className="text-base font-semibold text-foreground">{store.name}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{store.region}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{store.address}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
