"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useEffect, useState, type FormEvent } from "react";
import { useCart } from "@/lib/cart-context";
import Breadcrumb from "@/components/Breadcrumb";
import { formatIDR } from "@/lib/products";
import {
  createOrder,
  createQRPayment,
  createVAPayment,
  createInvoicePayment,
  simulateTestPayment,
  getAddresses,
  getConfigStatus,
  getOrder,
  getShippingCost,
  searchCities,
  type Address,
  type City,
  type ConfigStatus,
  type ShippingService,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const SHIPPING_FLAT_RATE = 15000;

const BANKS = [
  { code: "BCA", name: "BCA" },
  { code: "BNI", name: "BNI" },
  { code: "MANDIRI", name: "Mandiri" },
  { code: "BRI", name: "BRI" },
  { code: "PERMATA", name: "Permata" },
];

type ActivePayment =
  | { type: "qris"; orderId: string; qrString: string; expiresAt: string }
  | {
      type: "va";
      orderId: string;
      bankCode: string;
      accountNumber: string;
      expiresAt: string;
    };

const emptyFields = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  notes: "",
};

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [payment, setPayment] = useState<"qris" | "va" | "card" | "ewallet" | "cod">("qris");
  const [vaBank, setVaBank] = useState(BANKS[0].code);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<ActivePayment | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [fields, setFields] = useState(emptyFields);
  const [config, setConfig] = useState<ConfigStatus | null>(null);

  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [shippingServices, setShippingServices] = useState<ShippingService[]>([]);
  const [selectedService, setSelectedService] = useState<ShippingService | null>(null);
  const [isLoadingCost, setIsLoadingCost] = useState(false);

  useEffect(() => {
    getConfigStatus()
      .then((status) => {
        setConfig(status);
        if (!status.xenditConfigured) setPayment("cod");
      })
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (!activePayment) return;
    const interval = setInterval(async () => {
      const order = await getOrder(activePayment.orderId).catch(() => null);
      if (order && order.status !== "pending") {
        clearInterval(interval);
        finishOrder(activePayment.orderId);
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePayment]);

  useEffect(() => {
    if (!user) return;
    getAddresses().then((addresses) => {
      setFields((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email }));
      setSavedAddresses(addresses);
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      if (def) applyAddress(def);
    });
  }, [user]);

  function applyAddress(a: Address) {
    setSelectedAddressId(a.id);
    setFields((f) => ({
      ...f,
      name: a.recipientName,
      phone: a.phone,
      address: a.address,
      city: a.city,
      postalCode: a.postalCode,
    }));
  }

  function handleAddressPick(id: string) {
    if (id === "new") {
      setSelectedAddressId("new");
      setFields((f) => ({ ...f, phone: "", address: "", city: "", postalCode: "" }));
      return;
    }
    const a = savedAddresses.find((addr) => addr.id === id);
    if (a) applyAddress(a);
  }

  async function handleCitySearch() {
    if (!citySearch.trim()) return;
    setIsSearchingCities(true);
    setShippingServices([]);
    setSelectedService(null);
    try {
      const result = await searchCities(citySearch);
      setCityResults(result.cities);
    } finally {
      setIsSearchingCities(false);
    }
  }

  async function handleCityPick(city: City) {
    setCityResults([]);
    setCitySearch(city.city_name);
    setFields((f) => ({ ...f, city: city.city_name }));
    setIsLoadingCost(true);
    setSelectedService(null);
    try {
      const totalQty = items.reduce((sum, line) => sum + line.qty, 0);
      const weightGrams = Math.max(500, totalQty * 300);
      const result = await getShippingCost(city.city_id, weightGrams);
      setShippingServices(result.services);
    } finally {
      setIsLoadingCost(false);
    }
  }

  const shipping =
    items.length === 0 ? 0 : selectedService ? selectedService.cost : SHIPPING_FLAT_RATE;
  const total = subtotal + shipping;

  function finishOrder(id: string) {
    setActivePayment(null);
    setOrderId(id);
    clearCart();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const order = await createOrder({
        ...fields,
        paymentMethod: payment,
        shipping: selectedService?.cost,
        items: items.map((line) => ({
          productId: line.productId,
          size: line.size,
          qty: line.qty,
        })),
      });

      if (payment === "qris" && config?.xenditConfigured) {
        const qr = await createQRPayment(order.id);
        clearCart();
        setActivePayment({
          type: "qris",
          orderId: order.id,
          qrString: qr.qr_string,
          expiresAt: qr.expires_at,
        });
        return;
      }

      if (payment === "va" && config?.xenditConfigured) {
        const va = await createVAPayment(order.id, vaBank);
        clearCart();
        setActivePayment({
          type: "va",
          orderId: order.id,
          bankCode: va.bank_code,
          accountNumber: va.account_number,
          expiresAt: va.expiration_date,
        });
        return;
      }

      if ((payment === "card" || payment === "ewallet") && config?.xenditConfigured) {
        const invoice = await createInvoicePayment(order.id, payment);
        clearCart();
        window.location.href = invoice.invoice_url;
        return;
      }

      finishOrder(order.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal membuat pesanan");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSimulate() {
    if (!activePayment) return;
    setIsSimulating(true);
    try {
      await simulateTestPayment(activePayment.orderId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal simulasi pembayaran");
    } finally {
      setIsSimulating(false);
    }
  }

  if (activePayment) {
    const bank = BANKS.find((b) => b.code === (activePayment.type === "va" ? activePayment.bankCode : ""));
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <p className="font-display text-2xl uppercase tracking-tight">
          {activePayment.type === "qris" ? "Scan QRIS Ini" : "Transfer ke Virtual Account"}
        </p>
        <p className="mt-1 text-sm text-muted">Pesanan {activePayment.orderId}</p>

        {activePayment.type === "qris" ? (
          <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-lg">
            <QRCode value={activePayment.qrString} size={220} />
          </div>
        ) : (
          <div className="mt-6 w-full rounded-2xl border border-border bg-surface p-6">
            <p className="text-xs uppercase tracking-wide text-muted">{bank?.name ?? activePayment.bankCode}</p>
            <p className="mt-2 font-display text-3xl tracking-tight">{activePayment.accountNumber}</p>
            <button
              onClick={() => navigator.clipboard.writeText(activePayment.accountNumber)}
              className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wide hover:border-accent hover:text-accent"
            >
              Salin Nomor
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Menunggu pembayaran...
        </div>

        {config?.xenditTestMode && (
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-accent-foreground disabled:opacity-60"
          >
            {isSimulating ? "Memproses..." : "Simulasikan Pembayaran (mode testing)"}
          </button>
        )}

        {errorMessage && <p className="mt-4 text-sm text-red-500">{errorMessage}</p>}

        <button
          onClick={() => finishOrder(activePayment.orderId)}
          className="mt-8 text-sm font-semibold uppercase text-muted hover:text-foreground"
        >
          Bayar nanti, lihat status pesanan →
        </button>
      </main>
    );
  }

  if (orderId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h1 className="mt-6 font-display text-3xl uppercase tracking-tight">Pesanan Diterima</h1>
        <p className="mt-3 text-muted">
          Nomor pesanan lo: <span className="font-semibold text-foreground">{orderId}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          Kami akan konfirmasi via WhatsApp/email begitu pembayaran diverifikasi.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5"
        >
          Balik ke Toko
        </Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-3xl uppercase tracking-tight">Keranjang Kosong</h1>
        <p className="mt-3 text-muted">Belum ada barang buat di-checkout.</p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5"
        >
          Mulai Belanja
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-display text-2xl tracking-wide">
            HEY<span className="text-accent">FREAK</span>
          </Link>
          <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-muted hover:text-foreground">
            ← Lanjut Belanja
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Checkout" }]} />
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-14">
        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-8 lg:col-span-7"
        >
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl uppercase tracking-tight">Data Pembeli</h2>
              {!user && (
                <Link href="/login" className="text-xs font-semibold uppercase text-accent hover:underline">
                  Masuk buat pakai alamat tersimpan
                </Link>
              )}
            </div>

            {user && savedAddresses.length > 0 && (
              <div className="mt-4 flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-foreground">Alamat Tersimpan</span>
                <select
                  value={selectedAddressId}
                  onChange={(e) => handleAddressPick(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                >
                  {savedAddresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} — {a.recipientName}
                    </option>
                  ))}
                  <option value="new">Alamat lain...</option>
                </select>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-semibold text-foreground">Nama Lengkap</span>
                <input
                  required
                  value={fields.name}
                  onChange={(e) => setFields({ ...fields, name: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                  placeholder="Nama kamu"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-foreground">No. WhatsApp</span>
                <input
                  required
                  type="tel"
                  value={fields.phone}
                  onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                  placeholder="08xxxxxxxxxx"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-foreground">Email</span>
                <input
                  required
                  type="email"
                  value={fields.email}
                  onChange={(e) => setFields({ ...fields, email: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                  placeholder="kamu@email.com"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-semibold text-foreground">Alamat Pengiriman</span>
                <textarea
                  required
                  rows={3}
                  value={fields.address}
                  onChange={(e) => setFields({ ...fields, address: e.target.value })}
                  className="resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                  placeholder="Jalan, nomor rumah, kelurahan, kecamatan"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-foreground">Kota</span>
                <input
                  required
                  value={fields.city}
                  onChange={(e) => setFields({ ...fields, city: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                  placeholder="Jakarta Selatan"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-foreground">Kode Pos</span>
                <input
                  required
                  value={fields.postalCode}
                  onChange={(e) => setFields({ ...fields, postalCode: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                  placeholder="12345"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-semibold text-foreground">Catatan (opsional)</span>
                <textarea
                  rows={2}
                  value={fields.notes}
                  onChange={(e) => setFields({ ...fields, notes: e.target.value })}
                  className="resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                  placeholder="Contoh: titip satpam, dsb."
                />
              </label>
            </div>
          </section>

          {config?.rajaongkirConfigured && (
            <section>
              <h2 className="font-display text-xl uppercase tracking-tight">Cek Ongkir</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCitySearch())}
                  placeholder="Cari kota tujuan..."
                  className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-foreground outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleCitySearch}
                  disabled={isSearchingCities}
                  className="rounded-lg border border-border px-4 text-sm font-bold uppercase hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  {isSearchingCities ? "..." : "Cari"}
                </button>
              </div>

              {cityResults.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-border bg-surface p-2">
                  {cityResults.map((c) => (
                    <li key={c.city_id}>
                      <button
                        type="button"
                        onClick={() => handleCityPick(c)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                      >
                        {c.city_name} <span className="text-muted">— {c.province}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {isLoadingCost && <p className="mt-3 text-sm text-muted">Menghitung ongkir...</p>}

              {shippingServices.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {shippingServices.map((s) => (
                    <label
                      key={`${s.courier}-${s.service}`}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                        selectedService?.courier === s.courier && selectedService?.service === s.service
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingService"
                          checked={
                            selectedService?.courier === s.courier && selectedService?.service === s.service
                          }
                          onChange={() => setSelectedService(s)}
                          className="h-4 w-4 accent-[var(--accent)]"
                        />
                        <span className="text-sm font-semibold uppercase">
                          {s.courier} {s.service}{" "}
                          <span className="font-normal normal-case text-muted">— {s.etd} hari</span>
                        </span>
                      </span>
                      <span className="text-sm font-semibold">{formatIDR(s.cost)}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="font-display text-xl uppercase tracking-tight">Metode Pembayaran</h2>
            <div className="mt-4 flex flex-col gap-2.5">
              {config?.xenditConfigured && (
                <>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      payment === "qris" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === "qris"}
                      onChange={() => setPayment("qris")}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm font-semibold">
                      QRIS <span className="text-muted">(scan di halaman ini)</span>
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      payment === "va" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === "va"}
                        onChange={() => setPayment("va")}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      <span className="text-sm font-semibold">
                        Transfer Bank <span className="text-muted">(Virtual Account)</span>
                      </span>
                    </span>
                    {payment === "va" && (
                      <div className="ml-7 flex flex-wrap gap-2">
                        {BANKS.map((b) => (
                          <button
                            key={b.code}
                            type="button"
                            onClick={() => setVaBank(b.code)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                              vaBank === b.code
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-border text-foreground hover:border-accent"
                            }`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      payment === "ewallet" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === "ewallet"}
                      onChange={() => setPayment("ewallet")}
                      className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">E-Wallet</span>
                      <span className="text-xs text-muted">
                        OVO, DANA, ShopeePay, atau LinkAja — buka langsung di app kamu (perlu keluar
                        sebentar dari halaman ini, cara kerja semua e-wallet begitu)
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      payment === "card" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === "card"}
                      onChange={() => setPayment("card")}
                      className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">Kartu Kredit / Debit</span>
                      <span className="text-xs text-muted">
                        Perlu verifikasi 3D Secure dari bank kamu, jadi diarahkan sebentar ke halaman
                        aman Xendit
                      </span>
                    </span>
                  </label>
                </>
              )}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  payment === "cod" ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={payment === "cod"}
                  onChange={() => setPayment("cod")}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm font-semibold">COD (Bayar di Tempat)</span>
              </label>
              {!config?.xenditConfigured && config && (
                <p className="text-xs text-muted">
                  Pembayaran online belum aktif — sementara cuma bisa COD.
                </p>
              )}
            </div>
          </section>
        </form>

        <aside className="lg:col-span-5">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-xl uppercase tracking-tight">Ringkasan Pesanan</h2>
            <ul className="mt-4 flex flex-col gap-4">
              {items.map((line) => (
                <li key={`${line.productId}-${line.size ?? "x"}`} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
                    <Image src={line.image} alt={line.name} fill sizes="56px" className="object-cover" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                      {line.qty}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <p className="text-sm font-semibold leading-snug">{line.name}</p>
                    {line.size && <p className="text-xs text-muted">Size: {line.size}</p>}
                  </div>
                  <span className="text-sm font-semibold">{formatIDR(line.price * line.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="text-foreground">{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Ongkir {selectedService ? `(${selectedService.courier} ${selectedService.service})` : "(estimasi)"}</span>
                <span className="text-foreground">{formatIDR(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span className="font-display text-lg">{formatIDR(total)}</span>
              </div>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="mt-5 flex w-full items-center justify-center rounded-full bg-accent py-3.5 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Memproses..." : "Buat Pesanan"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
