import type { LineItem, Quote, SectionName } from "./types";
import { parseStay, quoteYear, staysOverlap } from "./stays";

/**
 * Pricing formula — per line, USD.
 *
 *   COST + VAT   = NETT × (1 + VAT%)
 *   DMC RECEIVES = (COST + VAT) × (1 + MRKP%)
 *   CLIENT PAYS  = DMC RECEIVES ÷ (1 − COMM%)
 *   GP           = DMC RECEIVES − (COST + VAT)
 *   GP %         = GP ÷ DMC RECEIVES
 *
 * Markup is added to cost. Commission is taken out of the sell price.
 * They do not combine. GP is on what the DMC banks, not what the traveller pays.
 *
 * Worked example (acc-1): NETT 487, VAT 16%, COMM 10%, MRKP 18%
 *   COST+VAT 564.92 · DMC 666.61 · CLIENT 740.67 · GP 101.69 · GP% 15.3%
 */

export const SECTIONS: SectionName[] = ["ACCOMMODATION", "TRANSPORT", "ACTIVITIES"];

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type LineComputed = {
  priced: boolean;
  nett: number | null;
  vatAmount: number | null;
  costVat: number | null;
  dmcReceives: number | null;
  clientPays: number | null;
  gp: number | null;
  gpPct: number | null;
  agentCommission: number | null;
  belowCost: boolean;
};

export type MoneyTotals = {
  nett: number;
  vatAmount: number;
  costVat: number;
  dmcReceives: number;
  clientPays: number;
  gp: number;
  gpPct: number;
};

export type QuoteIssues = {
  overCeiling: boolean;
  amountOver: number;
  headroom: number;
  unpriced: LineItem[];
  lossLines: { line: LineItem; gp: number }[];
  thinMargin: boolean;
  overlaps: { a: LineItem; b: LineItem }[];
};

export type SectionComputed = {
  name: SectionName;
  lines: LineItem[];
  totals: MoneyTotals;
  /** Markup weighted by cost+VAT. A simple mean of 18%, 18%, −15% would lie. */
  avgMrkpPct: number;
  avgCommPct: number;
  unpricedCount: number;
  lossCount: number;
  includedCount: number;
};

export type QuoteComputed = {
  byId: Record<string, LineComputed>;
  sections: SectionComputed[];
  totals: MoneyTotals;
  issues: QuoteIssues;
};

function emptyTotals(): MoneyTotals {
  return { nett: 0, vatAmount: 0, costVat: 0, dmcReceives: 0, clientPays: 0, gp: 0, gpPct: 0 };
}

function withGpPct(t: MoneyTotals): MoneyTotals {
  return { ...t, gpPct: t.dmcReceives === 0 ? 0 : t.gp / t.dmcReceives };
}

export function computeLine(line: LineItem): LineComputed {
  if (line.nett === null) {
    return {
      priced: false,
      nett: null,
      vatAmount: null,
      costVat: null,
      dmcReceives: null,
      clientPays: null,
      gp: null,
      gpPct: null,
      agentCommission: null,
      belowCost: false,
    };
  }

  const vat = line.vatPct / 100;
  const mrkp = line.mrkpPct / 100;
  const comm = line.commPct / 100;

  const costVat = line.nett * (1 + vat);
  const dmcReceives = costVat * (1 + mrkp);
  const clientPays = comm >= 1 ? Number.POSITIVE_INFINITY : dmcReceives / (1 - comm);
  const gp = dmcReceives - costVat;
  const gpPct = dmcReceives === 0 ? 0 : gp / dmcReceives;

  return {
    priced: true,
    nett: line.nett,
    vatAmount: line.nett * vat,
    costVat,
    dmcReceives,
    clientPays,
    gp,
    gpPct,
    agentCommission: clientPays - dmcReceives,
    belowCost: gp < -0.005,
  };
}

export function inQuote(line: LineItem): boolean {
  return line.included !== false;
}

function findOverlaps(quote: Quote): { a: LineItem; b: LineItem }[] {
  const year = quoteYear(quote.dates);
  const stays = quote.lines.filter((l) => l.section === "ACCOMMODATION" && inQuote(l));
  const pairs: { a: LineItem; b: LineItem }[] = [];
  for (let i = 0; i < stays.length; i++) {
    for (let j = i + 1; j < stays.length; j++) {
      const a = parseStay(stays[i].dates, year);
      const b = parseStay(stays[j].dates, year);
      if (a && b && staysOverlap(a, b)) pairs.push({ a: stays[i], b: stays[j] });
    }
  }
  return pairs;
}
function addLine(t: MoneyTotals, c: LineComputed): void {
  if (!c.priced || c.nett === null) return;
  t.nett += c.nett;
  t.vatAmount += c.vatAmount ?? 0;
  t.costVat += c.costVat ?? 0;
  t.dmcReceives += c.dmcReceives ?? 0;
  t.clientPays += c.clientPays ?? 0;
  t.gp += c.gp ?? 0;
}

export function computeQuote(quote: Quote): QuoteComputed {
  const byId: Record<string, LineComputed> = {};
  for (const line of quote.lines) {
    byId[line.id] = computeLine(line);
  }

  const sections = SECTIONS.map((name) => {
    const lines = quote.lines.filter((l) => l.section === name);
    const totals = emptyTotals();
    let mrkpWeight = 0;
    let commWeight = 0;
    for (const line of lines) {
      if (!inQuote(line)) continue;
      const c = byId[line.id];
      addLine(totals, c);
      if (c.priced && c.costVat) {
        mrkpWeight += (line.mrkpPct / 100) * c.costVat;
        commWeight += (line.commPct / 100) * c.costVat;
      }
    }
    const cost = totals.costVat;
    const quoted = lines.filter(inQuote);
    return {
      name,
      lines,
      totals: withGpPct(totals),
      avgMrkpPct: cost === 0 ? 0 : mrkpWeight / cost,
      avgCommPct: cost === 0 ? 0 : commWeight / cost,
      unpricedCount: quoted.filter((l) => l.nett === null).length,
      lossCount: quoted.filter((l) => byId[l.id].belowCost).length,
      includedCount: quoted.length,
    };
  }).filter((s) => s.lines.length > 0);

  const totals = emptyTotals();
  for (const line of quote.lines) {
    if (inQuote(line)) addLine(totals, byId[line.id]);
  }
  const rounded = withGpPct(totals);

  const quoted = quote.lines.filter(inQuote);
  const unpriced = quoted.filter((l) => l.nett === null);
  const lossLines = quoted
    .map((line) => ({ line, gp: byId[line.id].gp ?? 0 }))
    .filter(({ line }) => byId[line.id].belowCost);
  const overlaps = findOverlaps(quote);

  const headroom = quote.clientCeiling - rounded.clientPays;
  const overCeiling = rounded.clientPays - quote.clientCeiling > 0.005;

  return {
    byId,
    sections,
    totals: rounded,
    issues: {
      overCeiling,
      amountOver: overCeiling ? rounded.clientPays - quote.clientCeiling : 0,
      headroom,
      unpriced,
      overlaps,
      lossLines,
      thinMargin: !overCeiling && lossLines.length === 0 && rounded.gpPct > 0 && rounded.gpPct < 0.1,
    },
  };
}
