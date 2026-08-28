import type { Quote } from "./types";

export type LinePatch = {
  commPct?: number;
  mrkpPct?: number;
  included?: boolean;
};

export async function patchLine(lineId: string, patch: LinePatch): Promise<Quote> {
  const res = await fetch("/api/quote", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineId, ...patch }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Save failed (${res.status})`);
  }
  return res.json();
}

export async function resetQuote(): Promise<Quote> {
  const res = await fetch("/api/quote", { method: "DELETE" });
  if (!res.ok) throw new Error("Reset failed");
  return res.json();
}
