"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getReviews, createReview, type ReviewSummary } from "@/lib/api";
import { Star, StarRow } from "@/components/StarRating";

function StarPicker({ value, onChange, rateAria }: { value: number; onChange: (n: number) => void; rateAria: (n: number) => string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
          aria-label={rateAria(n)}
        >
          <span className="block h-6 w-6">
            <Star filled={n <= (hover || value)} />
          </span>
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }: { productId: string }) {
  const t = useTranslations("reviews");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReviews(productId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [productId]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (rating === 0) {
      setError(t("rateFirst"));
      toast(t("rateFirst"), "error");
      return;
    }
    setSubmitting(true);
    try {
      await createReview(productId, { rating, comment });
      const fresh = await getReviews(productId);
      setSummary(fresh);
      setRating(0);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendFailed"));
    } finally {
      setSubmitting(false);
    }
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
          <div className="mt-4 flex w-fit items-center gap-4 border border-border p-4">
            <span className="font-mono text-4xl font-bold text-accent">
              {summary && summary.count > 0 ? summary.average.toFixed(1) : "—"}
            </span>
            <div>
              <StarRow rating={summary?.average ?? 0} size="h-5 w-5" />
              <p className="mt-1 text-xs text-muted">{t("reviewCount", { count: summary?.count ?? 0 })}</p>
            </div>
          </div>

          <div className="clip-tag mt-8 max-w-xl border border-border bg-surface p-5">
            {user ? (
              <form
                onSubmit={handleSubmit}
                onInvalidCapture={() => toast(tAuth("requiredFieldsError"), "error")}
                className="flex flex-col gap-3"
              >
                <h3 className="font-display text-sm uppercase tracking-wide">{t("writeReview")}</h3>
                <StarPicker value={rating} onChange={setRating} rateAria={(n) => t("rateAria", { n })} />
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("commentPlaceholder")}
                  className="resize-none border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-tag w-fit bg-accent px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? t("sending") : t("send")}
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted">
                <Link href="/login" className="font-semibold text-accent hover:underline">
                  {t("login")}
                </Link>{" "}
                {t("loginToReview")}
              </p>
            )}
          </div>

          {summary && summary.reviews.length > 0 ? (
            <ul className="mt-8 flex flex-col gap-6">
              {summary.reviews.map((rv) => (
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
                      {new Date(rv.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { dateStyle: "medium" })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{rv.comment}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-sm text-muted">{t("empty")}</p>
          )}
        </>
      )}
    </section>
  );
}
