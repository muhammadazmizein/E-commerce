"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { searchCities, type City } from "@/lib/api";
import Select from "@/components/Select";

export type ResolvedLocation = {
  cityName: string;
  districtName: string;
  subdistrictName: string;
  postalCode: string;
  destinationId: string;
  label: string;
};

// Cascading Kabupaten/Kota -> Kecamatan -> Kelurahan picker. RajaOngkir's
// destination API only exposes a flat "search" endpoint (no "list all
// cities" / "list districts in a city" endpoints), so level 1 is a typed
// search and levels 2-3 are derived by pulling every row under the chosen
// kabupaten/kota in one call (large limit) and filtering client-side.
export default function LocationPicker({
  initialCityText,
  onChange,
}: {
  initialCityText?: string;
  onChange: (location: ResolvedLocation | null) => void;
}) {
  const t = useTranslations("locationPicker");
  const [kabKotaQuery, setKabKotaQuery] = useState("");
  const [kabKotaOptions, setKabKotaOptions] = useState<{ cityName: string; provinceName: string }[]>([]);
  const [isSearchingKabKota, setIsSearchingKabKota] = useState(false);
  const [kabKotaDropdownOpen, setKabKotaDropdownOpen] = useState(false);

  const [selectedCityName, setSelectedCityName] = useState("");
  const [cityRows, setCityRows] = useState<City[]>([]);
  const [isLoadingCityRows, setIsLoadingCityRows] = useState(false);

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedSubdistrictId, setSelectedSubdistrictId] = useState("");

  const districtOptions = Array.from(new Set(cityRows.map((r) => r.district_name))).sort();
  const subdistrictOptions = cityRows.filter((r) => r.district_name === selectedDistrict);

  // Best-effort auto-fill from a plain-text address already on file (e.g. a
  // saved address), so the buyer doesn't have to redo the picker from
  // scratch every time — it just pre-fills what it can guess.
  useEffect(() => {
    const text = initialCityText?.trim();
    if (!text) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await searchCities(text, 20);
        if (cancelled || result.cities.length === 0) return;
        const top = result.cities[0];
        setKabKotaQuery(top.city_name);
        setSelectedCityName(top.city_name);
        setIsLoadingCityRows(true);
        const full = await searchCities(top.city_name, 1000);
        if (cancelled) return;
        const rows = full.cities.filter((c) => c.city_name === top.city_name);
        setCityRows(rows);
        setIsLoadingCityRows(false);
        setSelectedDistrict(top.district_name);
        setSelectedSubdistrictId(String(top.id));
        onChange({
          cityName: top.city_name,
          districtName: top.district_name,
          subdistrictName: top.subdistrict_name,
          postalCode: top.zip_code,
          destinationId: String(top.id),
          label: `${top.subdistrict_name}, ${top.district_name}, ${top.city_name}`,
        });
      } catch {
        // best effort only — leave the picker empty for manual selection
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the source text itself changes (e.g. a different
    // saved address gets applied) — not on every internal state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCityText]);

  // Debounced typeahead for the kabupaten/kota name.
  useEffect(() => {
    const query = kabKotaQuery.trim();
    if (!query || query === selectedCityName) {
      setKabKotaOptions([]);
      return;
    }
    setIsSearchingKabKota(true);
    const timer = setTimeout(async () => {
      try {
        const result = await searchCities(query, 30);
        const seen = new Set<string>();
        const options: { cityName: string; provinceName: string }[] = [];
        for (const c of result.cities) {
          const key = `${c.city_name}|${c.province_name}`;
          if (!seen.has(key)) {
            seen.add(key);
            options.push({ cityName: c.city_name, provinceName: c.province_name });
          }
        }
        setKabKotaOptions(options);
      } catch {
        // transient network/backend hiccup — just show no suggestions,
        // the buyer can keep typing or try again
        setKabKotaOptions([]);
      } finally {
        setIsSearchingKabKota(false);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kabKotaQuery]);

  async function handleKabKotaPick(cityName: string) {
    setKabKotaOptions([]);
    setKabKotaDropdownOpen(false);
    setKabKotaQuery(cityName);
    setSelectedCityName(cityName);
    setSelectedDistrict("");
    setSelectedSubdistrictId("");
    setCityRows([]);
    onChange(null);
    setIsLoadingCityRows(true);
    try {
      const result = await searchCities(cityName, 1000);
      setCityRows(result.cities.filter((c) => c.city_name === cityName));
    } catch {
      // transient network/backend hiccup — leave Kecamatan/Kelurahan empty
      // so the buyer can retry by picking the kabupaten/kota again
      setCityRows([]);
    } finally {
      setIsLoadingCityRows(false);
    }
  }

  function handleDistrictPick(district: string) {
    setSelectedDistrict(district);
    setSelectedSubdistrictId("");
    onChange(null);
  }

  function handleSubdistrictPick(idStr: string) {
    setSelectedSubdistrictId(idStr);
    const row = cityRows.find((r) => String(r.id) === idStr);
    if (!row) {
      onChange(null);
      return;
    }
    onChange({
      cityName: row.city_name,
      districtName: row.district_name,
      subdistrictName: row.subdistrict_name,
      postalCode: row.zip_code,
      destinationId: String(row.id),
      label: `${row.subdistrict_name}, ${row.district_name}, ${row.city_name}`,
    });
  }

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <div className="relative flex flex-col gap-1.5 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-foreground">{t("cityLabel")}</span>
          <input
            required
            value={kabKotaQuery}
            onChange={(e) => {
              setKabKotaQuery(e.target.value);
              if (e.target.value !== selectedCityName) {
                setSelectedCityName("");
                setCityRows([]);
                setSelectedDistrict("");
                setSelectedSubdistrictId("");
                onChange(null);
              }
            }}
            onFocus={() => setKabKotaDropdownOpen(true)}
            onBlur={() => setTimeout(() => setKabKotaDropdownOpen(false), 150)}
            className="border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
            placeholder={t("cityPlaceholder")}
            autoComplete="off"
          />
        </label>
        {kabKotaDropdownOpen && (isSearchingKabKota || kabKotaOptions.length > 0) && (
          <ul className="absolute top-full z-10 mt-1 flex max-h-56 w-full flex-col gap-1 overflow-y-auto border border-border bg-surface p-2 shadow-edge-lg">
            {isSearchingKabKota ? (
              <li className="px-2 py-1.5 text-sm text-muted">{t("searching")}</li>
            ) : (
              kabKotaOptions.map((o) => (
                <li key={`${o.cityName}-${o.provinceName}`}>
                  <button
                    type="button"
                    onMouseDown={() => handleKabKotaPick(o.cityName)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                  >
                    {o.cityName}
                    <span className="ml-1.5 text-xs text-muted">{o.provinceName}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{t("districtLabel")}</span>
        <Select
          required
          value={selectedDistrict}
          onChange={handleDistrictPick}
          disabled={districtOptions.length === 0}
          placeholder={isLoadingCityRows ? t("loading") : t("selectDistrict")}
          options={districtOptions.map((d) => ({ value: d, label: d }))}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-semibold text-foreground">{t("subdistrictLabel")}</span>
        <Select
          required
          value={selectedSubdistrictId}
          onChange={handleSubdistrictPick}
          disabled={subdistrictOptions.length === 0}
          placeholder={t("selectSubdistrict")}
          options={subdistrictOptions.map((s) => ({
            value: String(s.id),
            label: `${s.subdistrict_name} (${s.zip_code})`,
          }))}
        />
      </label>
    </div>
  );
}
