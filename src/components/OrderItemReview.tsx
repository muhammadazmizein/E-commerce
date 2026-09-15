"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { createReview } from "@/lib/api";
import { Star } from "@/components/StarRating";

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
          <Star filled={n <= (hover || value)} className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}

export default function OrderItemReview({ productId, productName }: { productId: string; productName: string }) {
  const t = useTranslations("reviews");
  const tCommon = useTranslations("common");
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return null;

  if (done) {
    return <p className="mt-1 text-xs text-muted">{t("reviewSubmitted")}</p>;
  }

  if (!user) {
    return (
      <p className="mt-1 text-xs text-muted">
        <Link href="/login" className="font-semibold text-accent hover:underline">
          {t("login")}
        </Link>{" "}
        {t("loginToReview")}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-xs font-semibold text-accent hover:underline"
      >
        {t("writeReviewForProduct", { product: productName })}
      </button>
    );
  }

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
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 border border-border bg-surface p-3">
      <StarPicker value={rating} onChange={setRating} rateAria={(n) => t("rateAria", { n })} />
      <textarea
        required
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("commentPlaceholder")}
        className="resize-none border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="btn-tag bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t("sending") : t("send")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted hover:text-foreground"
        >
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}
