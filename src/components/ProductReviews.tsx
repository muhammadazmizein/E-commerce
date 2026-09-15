"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { getReviews, type ReviewSummary } from "@/lib/api";
import { Star, StarRow } from "@/components/StarRating";

export default function ProductReviews({ productId }: { productId: string }) {
  const t = useTranslations("reviews");
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStar, setFilterStar] = useState<number | null>(null);

  useEffect(() => {
    getReviews(productId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [productId]);

  const counts = useMemo(() => {
    const byStar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const rv of summary?.reviews ?? []) {
      byStar[rv.rating] = (byStar[rv.rating] ?? 0) + 1;
    }
    return byStar;
  }, [summary]);

  const count = summary?.count ?? 0;
  const satisfiedPercent =
    count > 0 ? Math.round(((counts[5] + counts[4]) / count) * 100) : 0;

  const visibleReviews = useMemo(() => {
    const all = summary?.reviews ?? [];
    return filterStar ? all.filter((rv) => rv.rating === filterStar) : all;
  }, [summary, filterStar]);

  function StarBreakdownRow({ star }: { star: number }) {
    const barPercent = count > 0 ? (counts[star] / count) * 100 : 0;
    const active = filterStar === star;
    return (
      <button
        type="button"
        onClick={() => setFilterStar((prev) => (prev === star ? null : star))}
        disabled={counts[star] === 0}
        className={`flex items-center gap-2 text-xs disabled:cursor-not-allowed ${
          active ? "font-bold text-foreground" : "text-muted"
        }`}
      >
        <span className="flex w-3 shrink-0 items-center gap-1">
          <Star filled className="h-3.5 w-3.5" />
          {star}
        </span>
        <span className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-surface-2 sm:w-36">
          <span
            className={`block h-full rounded-full ${counts[star] > 0 ? "bg-green-600" : ""}`}
            style={{ width: `${barPercent}%` }}
          />
        </span>
        <span className="w-8 shrink-0 text-left">({counts[star]})</span>
      </button>
    );
  }

  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="font-display text-2xl uppercase tracking-wide">
        <span className="text-accent">/</span> {t("title")}
      </h2>

      {loading ? (
        <p className="mt-4 text-sm text-muted">{t("loading")}</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-6 rounded-lg border border-border p-5 sm:flex-row sm:items-start">
            <div className="shrink-0 sm:w-48">
              <div className="flex items-center gap-2">
                <Star filled={count > 0} className="h-7 w-7" />
                <span className="font-mono text-3xl font-bold text-foreground">
                  {count > 0 ? summary!.average.toFixed(1) : "—"}
                </span>
                <span className="text-sm text-muted">/ 5.0</span>
              </div>
              {count > 0 && (
                <p className="mt-2 text-sm text-foreground">
                  {t("satisfiedPercent", { percent: satisfiedPercent })}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">{t("ratingsAndReviews", { count })}</p>
            </div>

            <div className="flex flex-1 flex-wrap gap-x-10 gap-y-1.5">
              <div className="flex flex-col gap-1.5">
                {[5, 4, 3].map((star) => (
                  <StarBreakdownRow key={star} star={star} />
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                {[2, 1].map((star) => (
                  <StarBreakdownRow key={star} star={star} />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted">
            {t("writeFromOrderNote")}{" "}
            <Link href="/account" className="font-semibold text-accent hover:underline">
              {t("writeFromOrderLink")}
            </Link>
          </p>

          {visibleReviews.length > 0 ? (
            <ul className="mt-8 flex flex-col gap-6">
              {visibleReviews.map((rv) => (
                <li key={rv.id} className="border-b border-border pb-6 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRow rating={rv.rating} />
                    <span className="text-sm font-semibold text-foreground">{rv.userName}</span>
                    {rv.verifiedPurchase && (
                      <span className="border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        {t("verifiedPurchase")}
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      {new Date(rv.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{rv.comment}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-sm text-muted">
              {count > 0 ? t("noneForFilter") : t("empty")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
