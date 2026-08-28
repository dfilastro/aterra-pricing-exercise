"use client";

import { useEffect, useState } from "react";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  danger?: boolean;
  disabled?: boolean;
  pending?: boolean;
};

export default function PercentControl({
  value,
  onChange,
  min = -90,
  max = 99,
  step = 1,
  danger = false,
  disabled = false,
  pending = false,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = (raw: string) => {
    if (disabled) return;
    const n = Number(raw.replace(/[^\d.-]/g, ""));
    if (Number.isNaN(n)) {
      setDraft(null);
      return;
    }
    onChange(clamp(n));
    setDraft(null);
  };

  const locked = disabled;

  return (
    <div
      aria-busy={locked || undefined}
      className={`inline-flex items-center rounded-md border bg-paper ${
        locked
          ? "border-terracotta/40 opacity-60"
          : pending
            ? "border-terracotta/50"
            : danger
              ? "border-danger/40"
              : "border-line"
      }`}
    >
      <button
        type="button"
        aria-label="Decrease"
        className="px-1.5 py-1 text-[12px] text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        disabled={locked || value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        aria-label="Percentage"
        disabled={locked}
        className={`w-11 bg-transparent py-1 text-center text-[12px] tabular-nums outline-none disabled:cursor-not-allowed ${
          danger ? "text-danger font-medium" : "text-ink"
        }`}
        value={draft ?? display}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <span className="pr-0.5 text-[11px] text-muted">%</span>
      <button
        type="button"
        aria-label="Increase"
        className="px-1.5 py-1 text-[12px] text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        disabled={locked || value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}
