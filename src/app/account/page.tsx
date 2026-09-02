"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast-context";
import { useWishlist } from "@/lib/wishlist-context";
import Breadcrumb from "@/components/Breadcrumb";
import LocationPicker from "@/components/LocationPicker";
import Logo from "@/components/Logo";
import ProductCard from "@/components/ProductCard";
import Select from "@/components/Select";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getMyOrders,
  getProducts,
  type Address,
  type AddressInput,
  type Order,
} from "@/lib/api";
import { formatIDR, type Product } from "@/lib/products";

const emptyForm: AddressInput = {
  label: "",
  recipientName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  isDefault: false,
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  paid: { label: "Berhasil", className: "bg-green-100 text-green-700" },
  pending: { label: "Berlangsung", className: "bg-amber-100 text-amber-700" },
  failed: { label: "Tidak Berhasil", className: "bg-red-100 text-red-600" },
};

const STATUS_TABS: { key: "semua" | "pending" | "paid" | "failed"; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "pending", label: "Berlangsung" },
  { key: "paid", label: "Berhasil" },
  { key: "failed", label: "Tidak Berhasil" },
];

export default function AccountPage() {
  const { user, isLoading, logout } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { items: wishlistItems, isLoading: loadingWishlist } = useWishlist();
  const router = useRouter();
  const [tab, setTab] = useState<"alamat" | "wishlist" | "transaksi">("alamat");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Captured once when a saved address is opened for editing — the location
  // picker uses this to seed itself, but must not track the picker's own
  // live edits to form.city or it'd re-trigger its auto-resolve in a loop.
  const [editingInitialCity, setEditingInitialCity] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua Produk");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | "pending" | "paid" | "failed">("semua");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    getAddresses()
      .then(setAddresses)
      .finally(() => setLoadingAddresses(false));
    getMyOrders()
      .then(setOrders)
      .finally(() => setLoadingOrders(false));
    getProducts().then(setProducts);
  }, [user]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  const hasActiveFilters =
    search.trim() !== "" || categoryFilter !== "Semua Produk" || dateFilter !== "" || statusFilter !== "semua";

  function resetFilters() {
    setSearch("");
    setCategoryFilter("Semua Produk");
    setDateFilter("");
    setStatusFilter("semua");
  }

  function handleBuyAgain(order: Order) {
    for (const item of order.items) {
      const product = productMap.get(item.productId);
      if (product) addItem(product, item.size, item.qty);
    }
  }

  const filteredOrders = orders.filter((o) => {
    const items = o.items ?? [];
    if (statusFilter !== "semua" && o.status !== statusFilter) return false;
    if (dateFilter && new Date(o.createdAt).toISOString().slice(0, 10) !== dateFilter) return false;
    if (categoryFilter !== "Semua Produk") {
      const hasCategory = items.some((item) => productMap.get(item.productId)?.category === categoryFilter);
      if (!hasCategory) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matches = o.id.toLowerCase().includes(q) || items.some((item) => item.productName.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });

  function openNewForm() {
    setForm(emptyForm);
    setEditingId(null);
    setEditingInitialCity(undefined);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(a: Address) {
    setForm({
      label: a.label,
      recipientName: a.recipientName,
      phone: a.phone,
      address: a.address,
      city: a.city,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    });
    setEditingId(a.id);
    setEditingInitialCity(a.city);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      if (editingId) {
        await updateAddress(editingId, form);
      } else {
        await createAddress(form);
      }
      const fresh = await getAddresses();
      setAddresses(fresh);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan alamat");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  if (isLoading || !user) {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="min-h-screen">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/">
            <Logo className="h-6 w-auto" />
          </Link>
          <button
            onClick={() => logout().then(() => router.push("/"))}
            className="text-sm font-semibold uppercase tracking-wide text-muted hover:text-foreground"
          >
            Keluar
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Akun Saya" }]} />
        <h1 className="mt-4 font-display text-3xl uppercase tracking-tight">Akun Saya</h1>
        <p className="mt-1 text-muted">
          {user.name} — {user.email}
        </p>

        <div className="mt-8 flex gap-2 border-b border-border">
          {(
            [
              ["alamat", "Alamat"],
              ["wishlist", "Wishlist"],
              ["transaksi", "Transaksi"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-b px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${
                tab === key
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "alamat" && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl uppercase tracking-tight">Alamat Tersimpan</h2>
              <button
                onClick={openNewForm}
                className="btn-tag border border-border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors hover:border-accent hover:text-accent"
              >
                + Tambah Alamat
              </button>
            </div>

            {loadingAddresses ? (
              <p className="mt-6 text-sm text-muted">Memuat alamat...</p>
            ) : addresses.length === 0 ? (
              <p className="mt-6 border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
                Belum ada alamat tersimpan.
              </p>
            ) : (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {addresses.map((a) => (
                  <li
                    key={a.id}
                    className="clip-tag border border-border bg-surface p-4 shadow-edge"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm uppercase tracking-tight">{a.label}</span>
                        {a.isDefault && (
                          <span className="btn-tag bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                            Utama
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs font-semibold uppercase">
                        <button onClick={() => openEditForm(a)} className="text-muted hover:text-accent">
                          Ubah
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="text-muted hover:text-red-500">
                          Hapus
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{a.recipientName}</p>
                    <p className="text-sm text-muted">{a.phone}</p>
                    <p className="mt-1 text-sm text-muted">
                      {a.address}, {a.city} {a.postalCode}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {showForm && (
              <form
                onSubmit={handleSubmit}
                onInvalidCapture={() => toast("Lengkapi dulu semua data yang wajib diisi ya", "error")}
                className="clip-tag mt-8 flex flex-col gap-4 border border-border bg-surface p-5"
              >
                <h3 className="font-display text-lg uppercase tracking-tight">
                  {editingId ? "Ubah Alamat" : "Alamat Baru"}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-semibold text-foreground">Label</span>
                    <input
                      required
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      placeholder="Rumah / Kantor"
                      className="border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-semibold text-foreground">Nama Penerima</span>
                    <input
                      required
                      value={form.recipientName}
                      onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                      className="border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-semibold text-foreground">No. WhatsApp</span>
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                    <span className="font-semibold text-foreground">Alamat Lengkap</span>
                    <textarea
                      required
                      rows={2}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="resize-none border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                    />
                  </label>
                  <LocationPicker
                    key={editingId ?? "new"}
                    initialCityText={editingInitialCity}
                    onChange={(location) => {
                      if (!location) return;
                      setForm((f) => ({ ...f, city: location.label, postalCode: location.postalCode }));
                    }}
                  />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-semibold text-foreground">Kode Pos</span>
                    <input
                      required
                      value={form.postalCode}
                      onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      className="border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="font-semibold text-foreground">Jadikan alamat utama</span>
                  </label>
                </div>

                {error && (
                  <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-tag bg-accent px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Menyimpan..." : "Simpan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-tag border border-border px-6 py-2.5 text-sm font-bold uppercase tracking-wide hover:border-accent hover:text-accent"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === "wishlist" && (
          <div className="mt-8">
            <h2 className="font-display text-xl uppercase tracking-tight">Wishlist</h2>
            {loadingWishlist ? (
              <p className="mt-6 text-sm text-muted">Memuat wishlist...</p>
            ) : wishlistItems.length === 0 ? (
              <p className="mt-6 border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
                Belum ada produk di wishlist. Buka halaman produk dan klik ikon hati buat nyimpen.
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
                {wishlistItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "transaksi" && (
          <div className="mt-8">
            <h2 className="font-display text-xl uppercase tracking-tight">Daftar Transaksi</h2>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative flex-1 sm:min-w-[220px]">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari transaksimu di sini"
                  className="w-full border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: "Semua Produk", label: "Semua Produk" },
                  ...categories.map((c) => ({ value: c, label: c })),
                ]}
              />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={`btn-tag border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                    statusFilter === t.key
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-muted hover:border-accent hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {loadingOrders ? (
              <p className="mt-6 text-sm text-muted">Memuat transaksi...</p>
            ) : orders.length === 0 ? (
              <p className="mt-6 border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
                Belum ada transaksi.
              </p>
            ) : filteredOrders.length === 0 ? (
              <p className="mt-6 border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
                Tidak ada transaksi yang cocok dengan filter.
              </p>
            ) : (
              <ul className="mt-6 flex flex-col gap-4">
                {filteredOrders.map((o) => {
                  const status = STATUS_STYLES[o.status] ?? {
                    label: o.status,
                    className: "bg-surface-2 text-muted",
                  };
                  const items = o.items ?? [];
                  const firstItem = items[0];
                  const product = firstItem ? productMap.get(firstItem.productId) : undefined;
                  const extraCount = items.length - 1;

                  return (
                    <li key={o.id} className="clip-tag border border-border bg-surface p-4 shadow-edge sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <span aria-hidden className="text-base">
                            🛍️
                          </span>
                          <span className="text-sm font-bold uppercase tracking-wide text-foreground">Belanja</span>
                          <span className="text-xs text-muted">
                            {new Date(o.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                          </span>
                          <span className={`clip-tag-sm px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted">{o.id}</span>
                      </div>

                      {firstItem && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-border bg-surface-2">
                            {product && (
                              <Image src={product.image} alt={firstItem.productName} fill sizes="56px" className="object-cover" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {firstItem.productName}
                              {firstItem.size ? ` (${firstItem.size})` : ""}
                            </p>
                            <p className="text-xs text-muted">
                              {firstItem.qty} barang x {formatIDR(firstItem.price)}
                            </p>
                            {extraCount > 0 && (
                              <p className="text-xs text-muted">+{extraCount} produk lainnya</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-muted">Total Belanja</p>
                            <p className="font-display text-base tracking-tight">{formatIDR(o.total)}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/order/${o.id}`}
                          className="btn-tag border border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent"
                        >
                          Lihat Detail Transaksi
                        </Link>
                        <button
                          onClick={() => handleBuyAgain(o)}
                          className="btn-tag bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5"
                        >
                          Beli Lagi
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
