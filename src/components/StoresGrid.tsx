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
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((store) => (
            <div key={store.id} className="border border-border bg-surface">
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col gap-1 p-3">
                <h3 className="text-sm font-semibold text-foreground">{store.name}</h3>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{store.region}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{store.address}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
