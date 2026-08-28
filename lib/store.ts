import type { Quote } from "./types";
import { seedQuote } from "./seed";

/**
 * Server-side store for the quote.
 *
 * Deliberately simple: an in-memory object held on the server. It works
 * locally and on Vercel. On Vercel it resets when the instance goes cold,
 * which is fine for this exercise.
 *
 * You are welcome to replace this with anything you prefer.
 */

declare global {
  // eslint-disable-next-line no-var
  var __aterraQuote: Quote | undefined;
}

export function getQuote(): Quote {
  if (!global.__aterraQuote) {
    global.__aterraQuote = JSON.parse(JSON.stringify(seedQuote)) as Quote;
  }
  return global.__aterraQuote;
}

export function saveQuote(next: Quote): Quote {
  global.__aterraQuote = next;
  return global.__aterraQuote;
}

/**
 * Update the editable fields of a single line.
 * Returns the whole quote so the client can re-render from one source.
 */
export function updateLine(
  lineId: string,
  patch: Partial<{ commPct: number; mrkpPct: number; nett: number | null }>
): Quote {
  const quote = getQuote();
  const line = quote.lines.find((l) => l.id === lineId);
  if (!line) throw new Error(`No line with id ${lineId}`);
  Object.assign(line, patch);
  return quote;
}

export function resetQuote(): Quote {
  global.__aterraQuote = JSON.parse(JSON.stringify(seedQuote)) as Quote;
  return global.__aterraQuote;
}
