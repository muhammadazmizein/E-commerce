"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type SelectOption = { value: string; label: string; disabled?: boolean };

const SEARCH_THRESHOLD = 8;

// Fully custom listbox — a native <select>'s closed box can be restyled,
// but the opened options list is drawn by the OS and ignores CSS entirely
// (that's the default blue-highlight Windows/Chrome list every native
// <select> in the app used to fall back to). This renders both the trigger
// and the open panel ourselves, cut-corner framed to match the rest of the
// site, with a visually-hidden required input alongside so native form
// validation still blocks submission until a value is picked. Long lists
// (e.g. a kabupaten's 30+ kecamatan, or hundreds of kelurahan) get a filter
// box inside the panel instead of forcing a scroll-and-squint.
export default function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
  searchable,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  className?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;
  const filteredOptions = useMemo(() => {
    if (!showSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, showSearch]);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlighted(0);
    if (showSearch) {
      // Let the panel mount before stealing focus into the search box.
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setHighlighted(0);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  function commit(index: number) {
    const opt = filteredOptions[index];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(filteredOptions.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(highlighted);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        className={`btn-tag flex w-full items-center justify-between gap-2 border bg-surface px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
          disabled
            ? "cursor-not-allowed border-border text-muted opacity-50"
            : open
              ? "border-pop text-foreground"
              : "border-border text-foreground hover:border-foreground/30"
        }`}
      >
        <span className={`truncate ${!selected ? "font-normal text-muted" : ""}`}>
          {selected ? selected.label : (placeholder ?? t("select"))}
        </span>
        <svg
          aria-hidden
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 transition-transform ${open ? "rotate-180 text-pop" : "text-muted"}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 border border-border bg-surface shadow-edge-lg">
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleListKeyDown}
                placeholder={t("search")}
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
            </div>
          )}
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={showSearch ? -1 : 0}
            onKeyDown={showSearch ? undefined : handleListKeyDown}
            className="max-h-60 overflow-y-auto p-1.5 outline-none"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">{t("noMatch")}</li>
            ) : (
              filteredOptions.map((o, idx) => (
                <li key={o.value} role="option" aria-selected={o.value === value}>
                  <button
                    type="button"
                    disabled={o.disabled}
                    onMouseEnter={() => setHighlighted(idx)}
                    onClick={() => commit(idx)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      o.disabled
                        ? "cursor-not-allowed text-muted/60"
                        : idx === highlighted
                          ? "bg-pop font-semibold text-pop-foreground"
                          : o.value === value
                            ? "bg-surface-2 font-semibold text-foreground"
                            : "text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === value && (
                      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0 w-full opacity-0"
        />
      )}
    </div>
  );
}
