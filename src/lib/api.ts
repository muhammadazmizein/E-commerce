import type { Product } from "@/lib/products";

// Server-side rendering runs inside the same Next.js process as the
// deployed box, so it should hit the backend directly over localhost
// instead of round-tripping out through the public URL and back in —
// that hairpin path isn't guaranteed to work on every VPS/NAT setup, and
// is pointless latency even when it does. The browser (client-side fetch)
// has no such shortcut and always needs the public NEXT_PUBLIC_API_URL.
const API_URL =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080");

// `new URL(path, base)` treats a leading "/" in `path` as root-absolute,
// which silently discards any path segment `base` itself has (e.g.
// new URL("/auth/login", "http://host/api") resolves to
// "http://host/auth/login", dropping "/api" entirely). API_URL can carry a
// path segment (reverse-proxied deployments use e.g. ".../api"), so every
// call needs to go through here instead of the URL constructor directly.
function apiURL(path: string): URL {
  const base = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return new URL(base + suffix);
}

export async function getProducts(category?: string): Promise<Product[]> {
  const url = apiURL("/products");
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function getProduct(id: string): Promise<Product | null> {
  const res = await fetch(apiURL(`/products/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load product");
  return res.json();
}

export type Category = {
  name: string;
  blurb: string;
  image: string;
};

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(apiURL("/categories"), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

export type Banner = {
  id: number;
  title: string;
  subtitle?: string;
  image: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export async function getBanners(): Promise<Banner[]> {
  const res = await fetch(apiURL("/banners"), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load banners");
  return res.json();
}

export type SiteImage = {
  slot: string;
  image: string;
  alt: string;
};

export async function getSiteImages(): Promise<Record<string, SiteImage>> {
  const res = await fetch(apiURL("/site-images"), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load site images");
  return res.json();
}

export type CreateOrderItem = {
  productId: string;
  size?: string;
  qty: number;
};

export type CreateOrderPayload = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  notes?: string;
  paymentMethod: string;
  shipping?: number;
  items: CreateOrderItem[];
};

export type OrderResult = {
  id: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: {
    productId: string;
    productName: string;
    size?: string;
    price: number;
    qty: number;
  }[];
};

export type Order = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  notes?: string;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  paymentChannel?: string;
  createdAt: string;
  items: {
    productId: string;
    productName: string;
    size?: string;
    price: number;
    qty: number;
  }[];
};

export async function getOrder(id: string): Promise<Order | null> {
  const res = await fetch(apiURL(`/orders/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load order");
  return res.json();
}

export async function getMyOrders(): Promise<Order[]> {
  const res = await fetch(apiURL("/orders/mine"), { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

export async function createOrder(payload: CreateOrderPayload): Promise<OrderResult> {
  const res = await fetch(apiURL("/orders"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Gagal membuat pesanan");
  }

  return res.json();
}

export type User = {
  id: string;
  name: string;
  email: string;
};

async function authRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiURL(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Gagal memproses permintaan");
  }
  return res.json();
}

export function register(name: string, email: string, password: string): Promise<User> {
  return authRequest("/auth/register", { name, email, password });
}

export function login(email: string, password: string): Promise<User> {
  return authRequest("/auth/login", { email, password });
}

export async function logout(): Promise<void> {
  await fetch(apiURL("/auth/logout"), { method: "POST", credentials: "include" });
}

export async function getMe(): Promise<User | null> {
  const res = await fetch(apiURL("/auth/me"), { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load session");
  return res.json();
}

export type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
};

export type AddressInput = Omit<Address, "id">;

export async function getAddresses(): Promise<Address[]> {
  const res = await fetch(apiURL("/addresses"), { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load addresses");
  return res.json();
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const res = await fetch(apiURL("/addresses"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Gagal menyimpan alamat");
  }
  return res.json();
}

export async function updateAddress(id: string, input: AddressInput): Promise<void> {
  const res = await fetch(apiURL(`/addresses/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Gagal memperbarui alamat");
  }
}

export async function deleteAddress(id: string): Promise<void> {
  const res = await fetch(apiURL(`/addresses/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Gagal menghapus alamat");
}

export async function getWishlist(): Promise<Product[]> {
  const res = await fetch(apiURL("/wishlist"), { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat wishlist");
  return res.json();
}

export async function addToWishlist(productId: string): Promise<void> {
  const res = await fetch(apiURL("/wishlist"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) throw new Error("Gagal menyimpan ke wishlist");
}

export async function removeFromWishlist(productId: string): Promise<void> {
  const res = await fetch(apiURL(`/wishlist/${productId}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Gagal menghapus dari wishlist");
}

export type ConfigStatus = {
  paymentConfigured: boolean;
  paymentTestMode: boolean;
  rajaongkirConfigured: boolean;
};

export async function getConfigStatus(): Promise<ConfigStatus> {
  const res = await fetch(apiURL("/config/status"), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load config status");
  return res.json();
}

async function postPayment<T>(orderId: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiURL(`/orders/${orderId}/${path}`), {
    method: "POST",
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Gagal memproses pembayaran");
  }
  return res.json();
}

export type QRPayment = {
  id: string;
  qr_string: string;
  expires_at: string;
};

export function createQRPayment(orderId: string): Promise<QRPayment> {
  return postPayment(orderId, "pay/qris");
}

export type VAPayment = {
  id: string;
  external_id: string;
  bank_code: string;
  account_number: string;
  name: string;
  expiration_date: string;
};

export function createVAPayment(orderId: string, bankCode: string): Promise<VAPayment> {
  return postPayment(orderId, "pay/va", { bankCode });
}

export type Invoice = {
  id: string;
  invoice_url: string;
  status: string;
};

export function createInvoicePayment(orderId: string, channel: "card" | "ewallet"): Promise<Invoice> {
  return postPayment(orderId, `pay/invoice/${channel}`);
}

export async function simulateTestPayment(orderId: string): Promise<void> {
  await postPayment(orderId, "simulate-payment");
}

// A destination search result from RajaOngkir. Despite the historical name
// "City", this is actually subdistrict-level (the granularity the shipping
// cost API requires) since RajaOngkir's 2025 API migration.
export type City = {
  id: number;
  label: string;
  subdistrict_name: string;
  district_name: string;
  city_name: string;
  province_name: string;
  zip_code: string;
};

export async function searchCities(
  query: string,
  limit?: number
): Promise<{ configured: boolean; cities: City[] }> {
  const url = apiURL("/shipping/cities");
  url.searchParams.set("search", query);
  if (limit) url.searchParams.set("limit", String(limit));
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to search cities");
  return res.json();
}

export type ShippingService = {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

export async function getShippingCost(
  destinationCityId: string,
  weightGrams: number
): Promise<{ configured: boolean; services: ShippingService[] }> {
  const res = await fetch(apiURL("/shipping/cost"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destinationCityId, weightGrams }),
  });
  if (!res.ok) throw new Error("Failed to get shipping cost");
  return res.json();
}

export type Review = {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

export type ReviewSummary = {
  average: number;
  count: number;
  reviews: Review[];
};

export async function getReviews(productId: string): Promise<ReviewSummary> {
  const res = await fetch(apiURL(`/products/${productId}/reviews`), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load reviews");
  return res.json();
}

export async function createReview(
  productId: string,
  input: { rating: number; comment: string }
): Promise<Review> {
  const res = await fetch(apiURL(`/products/${productId}/reviews`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Gagal mengirim ulasan");
  }
  return res.json();
}
