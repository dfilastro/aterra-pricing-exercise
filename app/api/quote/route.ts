import { NextResponse } from "next/server";
import { getQuote, updateLine, resetQuote } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/quote  ->  the current quote */
export async function GET() {
  return NextResponse.json(getQuote());
}

/**
 * PATCH /api/quote
 * Body: { lineId: string, commPct?: number, mrkpPct?: number, included?: boolean }
 * Returns the updated quote.
 *
 * The small delay is deliberate. Saving is not instant in the real product.
 */
export async function PATCH(request: Request) {
  const body = await request.json();
  const { lineId, ...patch } = body ?? {};

  if (!lineId) {
    return NextResponse.json({ error: "lineId is required" }, { status: 400 });
  }

  await new Promise((r) => setTimeout(r, 600));

  try {
    const quote = updateLine(lineId, patch);
    return NextResponse.json(quote);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}

/** DELETE /api/quote  ->  restore the seed data */
export async function DELETE() {
  return NextResponse.json(resetQuote());
}
