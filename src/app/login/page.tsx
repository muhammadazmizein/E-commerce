"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <Link href="/" className="mx-auto font-display text-2xl tracking-wide">
        HEY<span className="text-accent">FREAK</span>
      </Link>
      <h1 className="mt-8 text-center font-display text-3xl uppercase tracking-tight">Masuk</h1>
      <p className="mt-2 text-center text-sm text-muted">Belum punya akun? {" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Daftar di sini
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Email</span>
          <input
            required
            type="email"
            name="email"
            className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
            placeholder="kamu@email.com"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Password</span>
          <input
            required
            type="password"
            name="password"
            className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center rounded-full bg-accent py-3 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}
