"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect");
  const registerHref = redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      router.push(redirectTo || "/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-foreground lg:block">
        <Image
          src="/photos/heyfreak/banners/banner-1.webp"
          alt="HEYFREAK streetwear"
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/70" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-background xl:p-14">
          <Link href="/" className="font-display text-3xl tracking-tight">
            HEYFREAK
          </Link>

          <div>
            <span className="btn-tag inline-block border-2 border-background px-3 py-1 text-xs font-bold uppercase tracking-widest">
              Member Area
            </span>
            <h1 className="mt-5 font-display text-6xl uppercase leading-[0.88] xl:text-7xl">
              Masuk Ke
              <br />
              Dunia Freak.
            </h1>
            <p className="mt-5 max-w-sm text-sm text-background/70">
              Lacak pesanan, simpan alamat, dan checkout lebih cepat tiap kali belanja drop
              terbaru HEYFREAK.
            </p>
          </div>

          <p className="text-xs uppercase tracking-widest text-background/50">
            © {new Date().getFullYear()} HEYFREAK — Not for everyone
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-4 py-16 sm:px-6 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="block font-display text-2xl tracking-tight lg:hidden">
            HEY<span className="text-accent">FREAK</span>
          </Link>

          <span className="btn-tag mt-8 inline-block border-2 border-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent lg:mt-0">
            Member Area
          </span>
          <h1 className="mt-4 font-display text-4xl uppercase tracking-tight sm:text-5xl">
            Masuk
          </h1>
          <p className="mt-2 text-sm text-muted">
            Belum punya akun?{" "}
            <Link href={registerHref} className="font-semibold text-accent hover:underline">
              Daftar di sini
            </Link>
          </p>

          <form
            onSubmit={handleSubmit}
            onInvalidCapture={() => toast("Lengkapi dulu semua data yang wajib diisi ya", "error")}
            className="mt-8 flex flex-col gap-5"
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-bold uppercase tracking-widest text-muted">Email</span>
              <input
                required
                type="email"
                name="email"
                className="border-2 border-border bg-surface px-4 py-3 text-base text-foreground outline-none focus:border-accent"
                placeholder="kamu@email.com"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-bold uppercase tracking-widest text-muted">Password</span>
              <input
                required
                type="password"
                name="password"
                className="border-2 border-border bg-surface px-4 py-3 text-base text-foreground outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="border-2 border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-tag mt-2 flex w-full items-center justify-center bg-accent py-3.5 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
