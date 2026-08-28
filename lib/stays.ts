/** Stay ranges for overlap checks. Hotel dates are [check-in, check-out). */

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function quoteYear(quoteDates: string): number {
  const m = quoteDates.match(/(\d{4})/);
  return m ? Number(m[1]) : 2026;
}

export type Stay = { start: number; end: number };

export function parseStay(dates: string, year: number): Stay | null {
  const t = dates.replace(/[–—]/g, "-").trim();
  const range = t.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]+)/);
  if (range) {
    const month = MONTHS[range[3].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    return {
      start: Date.UTC(year, month, Number(range[1])),
      end: Date.UTC(year, month, Number(range[2])),
    };
  }
  const single = t.match(/^(\d{1,2})\s+([A-Za-z]+)/);
  if (single) {
    const month = MONTHS[single[2].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    const day = Number(single[1]);
    return { start: Date.UTC(year, month, day), end: Date.UTC(year, month, day + 1) };
  }
  return null;
}

export function staysOverlap(a: Stay, b: Stay): boolean {
  return a.start < b.end && b.start < a.end;
}
