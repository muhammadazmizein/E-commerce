"use client";

function getPageList(current: number, total: number): (number | "...")[] {
  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const range: (number | "...")[] = [1];

  if (left > 2) range.push("...");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("...");
  if (total > 1) range.push(total);

  return range;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Navigasi halaman" className="mt-10 flex items-center justify-center gap-1 border border-border p-1 w-fit mx-auto">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
        className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
      >
        ‹
      </button>

      {getPageList(page, totalPages).map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="w-9 text-center text-sm text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`btn-tag flex h-9 w-9 items-center justify-center text-sm font-bold transition-colors ${
              p === page
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-surface-2"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Halaman berikutnya"
        className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
      >
        ›
      </button>
    </nav>
  );
}
